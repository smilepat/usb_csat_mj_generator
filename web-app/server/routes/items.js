/**
 * server/routes/items.js
 * 문항 생성 및 관리 API
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { generateItemPipeline, saveItemResults } = require('../services/itemPipeline');
const logger = require('../services/logger');
const { validatePromptBundle, generateSuggestions } = require('../services/promptValidator');
const { updatePromptPerformance } = require('../services/promptMetricsService');
const { getMetricsByRequestId } = require('../services/metricsService');

/**
 * GET /api/items/requests
 * 모든 요청 조회
 */
router.get('/requests', (req, res) => {
  try {
    const { status, setId, limit = 100, offset = 0 } = req.query;
    const db = getDb();

    let query = 'SELECT * FROM item_requests WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (setId) {
      query += ' AND set_id = ?';
      params.push(setId);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const rows = db.prepare(query).all(...params);

    // 총 개수 조회
    let countQuery = 'SELECT COUNT(*) as count FROM item_requests WHERE 1=1';
    const countParams = [];
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (setId) {
      countQuery += ' AND set_id = ?';
      countParams.push(setId);
    }
    const total = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: total.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/items/requests/:id
 * 특정 요청 조회 (메트릭스 포함)
 */
router.get('/requests/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const request = db.prepare('SELECT * FROM item_requests WHERE request_id = ?').get(id);
    if (!request) {
      return res.status(404).json({ success: false, error: '요청을 찾을 수 없습니다.' });
    }

    // 관련 결과도 함께 조회
    const results = db.prepare('SELECT * FROM item_json WHERE request_id = ?').all(id);
    const output = db.prepare('SELECT * FROM item_output WHERE request_id = ?').get(id);

    // 메트릭스 조회
    const metrics = getMetricsByRequestId(id);

    // 프롬프트 정보 조회 (prompt_id가 있는 경우)
    let promptInfo = null;
    if (request.prompt_id) {
      promptInfo = db.prepare(`
        SELECT p.prompt_key, p.title, pm.total_score, pm.grade
        FROM prompts p
        LEFT JOIN prompt_metrics pm ON p.id = pm.prompt_id
        WHERE p.id = ?
      `).get(request.prompt_id);
    }

    res.json({
      success: true,
      data: {
        request,
        results,
        output,
        metrics,
        promptInfo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/items/requests
 * 새 요청 생성
 */
router.post('/requests', (req, res) => {
  try {
    const {
      item_no,
      passage,
      level,
      extra,
      chart_id,
      set_id,
      passage_source,
      topic,
      prompt_id
    } = req.body;

    if (!item_no) {
      return res.status(400).json({ success: false, error: 'item_no는 필수입니다.' });
    }

    const requestId = uuidv4();
    const db = getDb();

    db.prepare(`
      INSERT INTO item_requests (
        request_id, status, item_no, passage, level, extra,
        chart_id, set_id, passage_source, topic, prompt_id
      ) VALUES (?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      requestId,
      item_no,
      passage || '',
      level || '',
      extra || '',
      chart_id || null,
      set_id || null,
      passage_source || '',
      topic || '',
      prompt_id || null
    );

    res.json({
      success: true,
      message: '요청이 생성되었습니다.',
      data: { requestId }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/items/generate/:id
 * 특정 요청에 대해 문항 생성 실행
 */
router.post('/generate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const row = db.prepare('SELECT * FROM item_requests WHERE request_id = ?').get(id);
    if (!row) {
      return res.status(404).json({ success: false, error: '요청을 찾을 수 없습니다.' });
    }

    // 세트 문항은 별도 API 사용
    if (row.set_id) {
      return res.status(400).json({
        success: false,
        error: '세트 문항입니다. /api/sets/:setId/generate를 사용하세요.'
      });
    }

    // 프롬프트 버전 정보 조회 및 저장
    let promptVersion = null;
    let promptTextSnapshot = null;
    if (row.prompt_id) {
      const promptInfo = db.prepare(`
        SELECT p.prompt_text,
               COALESCE((SELECT MAX(version) FROM prompt_versions WHERE prompt_id = p.id), 0) + 1 as current_version
        FROM prompts p WHERE p.id = ?
      `).get(row.prompt_id);

      if (promptInfo) {
        promptVersion = promptInfo.current_version;
        promptTextSnapshot = promptInfo.prompt_text;

        // 프롬프트 버전 정보를 item_requests에 저장
        db.prepare(`
          UPDATE item_requests
          SET prompt_version = ?, prompt_text_snapshot = ?
          WHERE request_id = ?
        `).run(promptVersion, promptTextSnapshot, id);
      }
    }

    // 상태 업데이트: RUNNING
    db.prepare(`
      UPDATE item_requests
      SET status = 'RUNNING', updated_at = CURRENT_TIMESTAMP
      WHERE request_id = ?
    `).run(id);

    const request = {
      requestId: row.request_id,
      status: row.status,
      itemNo: row.item_no,
      passage: row.passage,
      level: row.level,
      extra: row.extra,
      chartId: row.chart_id,
      setId: row.set_id,
      passageSource: row.passage_source,
      topic: row.topic
    };

    // 문항 생성 파이프라인 실행
    const result = await generateItemPipeline(request);

    // 결과 저장
    await saveItemResults(id, result, row.item_no);

    // 상태 업데이트
    const finalStatus = result.validationResult === 'PASS' ? 'OK' : 'FAIL';
    db.prepare(`
      UPDATE item_requests
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE request_id = ?
    `).run(finalStatus, id);

    logger.info('문항 생성 완료', id, result.validationLog);

    // 프롬프트 성능 자동 업데이트 (prompt_id가 있는 경우)
    if (row.prompt_id) {
      try {
        const performance = updatePromptPerformance(row.prompt_id);
        if (performance) {
          logger.info('프롬프트 성능 업데이트', `prompt_id:${row.prompt_id}`,
            `승인율: ${(performance.approve_rate * 100).toFixed(1)}%`);
        }
      } catch (perfError) {
        logger.warn('프롬프트 성능 업데이트 실패', `prompt_id:${row.prompt_id}`, perfError.message);
      }
    }

    res.json({
      success: true,
      data: {
        requestId: id,
        status: finalStatus,
        validationResult: result.validationResult,
        validationLog: result.validationLog,
        finalJson: result.finalJson,
        metrics: result.metrics || null
      }
    });
  } catch (error) {
    logger.error('문항 생성 오류', req.params.id, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/items/generate-pending
 * PENDING 상태인 모든 요청 처리
 */
router.post('/generate-pending', async (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM item_requests
      WHERE status = 'PENDING' AND (set_id IS NULL OR set_id = '')
    `).all();

    if (rows.length === 0) {
      return res.json({
        success: true,
        message: '처리할 PENDING 요청이 없습니다.',
        data: { processed: 0 }
      });
    }

    let okCount = 0;
    let failCount = 0;

    for (const row of rows) {
      db.prepare(`
        UPDATE item_requests
        SET status = 'RUNNING', updated_at = CURRENT_TIMESTAMP
        WHERE request_id = ?
      `).run(row.request_id);

      const request = {
        requestId: row.request_id,
        itemNo: row.item_no,
        passage: row.passage,
        level: row.level,
        extra: row.extra,
        chartId: row.chart_id,
        setId: row.set_id,
        passageSource: row.passage_source,
        topic: row.topic
      };

      try {
        const result = await generateItemPipeline(request);
        await saveItemResults(row.request_id, result, row.item_no);

        const finalStatus = result.validationResult === 'PASS' ? 'OK' : 'FAIL';
        db.prepare(`
          UPDATE item_requests
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE request_id = ?
        `).run(finalStatus, row.request_id);

        if (finalStatus === 'OK') okCount++;
        else failCount++;

        // 프롬프트 성능 자동 업데이트
        if (row.prompt_id) {
          try {
            updatePromptPerformance(row.prompt_id);
          } catch (perfError) {
            logger.warn('프롬프트 성능 업데이트 실패', `prompt_id:${row.prompt_id}`, perfError.message);
          }
        }

      } catch (e) {
        db.prepare(`
          UPDATE item_requests
          SET status = 'FAIL', updated_at = CURRENT_TIMESTAMP
          WHERE request_id = ?
        `).run(row.request_id);
        failCount++;
        logger.error('일괄 처리 오류', row.request_id, e);
      }
    }

    res.json({
      success: true,
      message: `처리 완료: 성공 ${okCount}건, 실패 ${failCount}건`,
      data: { ok: okCount, fail: failCount, total: rows.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/items/requests/:id
 * 요청 삭제
 */
router.delete('/requests/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // 관련 데이터 삭제
    db.prepare('DELETE FROM item_json WHERE request_id = ?').run(id);
    db.prepare('DELETE FROM item_output WHERE request_id = ?').run(id);
    const result = db.prepare('DELETE FROM item_requests WHERE request_id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '요청을 찾을 수 없습니다.' });
    }

    res.json({ success: true, message: '요청이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/items/preview-prompt
 * 프롬프트 미리보기 및 1차 검증
 */
router.post('/preview-prompt', (req, res) => {
  try {
    const {
      item_no,
      passage,
      level,
      extra,
      chart_id,
      set_id,
      topic
    } = req.body;

    if (!item_no) {
      return res.status(400).json({ success: false, error: 'item_no는 필수입니다.' });
    }

    // 요청 객체 구성
    const request = {
      itemNo: parseInt(item_no),
      passage: passage || '',
      level: level || '중',
      extra: extra || '',
      chartId: chart_id || null,
      setId: set_id || null,
      topic: topic || ''
    };

    // 프롬프트 번들 검증
    const validationResult = validatePromptBundle(request);

    // 수정 제안 생성
    const suggestions = generateSuggestions(validationResult);

    res.json({
      success: true,
      data: {
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        suggestions,
        preview: validationResult.preview,
        stats: validationResult.stats
      }
    });
  } catch (error) {
    logger.error('프롬프트 미리보기 오류', 'preview-prompt', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/items/outputs
 * 생성된 문항 결과 조회
 */
router.get('/outputs', (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const db = getDb();

    const rows = db.prepare(`
      SELECT o.*, r.item_no as request_item_no, r.status
      FROM item_output o
      LEFT JOIN item_requests r ON o.request_id = r.request_id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));

    const total = db.prepare('SELECT COUNT(*) as count FROM item_output').get();

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: total.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
