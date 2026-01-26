/**
 * server/routes/sets.js
 * 세트 문항 관리 API
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { generateSetItems } = require('../services/itemPipeline');
const logger = require('../services/logger');

/**
 * GET /api/sets
 * 모든 세트 조회
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM item_requests WHERE set_id = s.set_id) as item_count
      FROM item_sets s
      ORDER BY s.created_at DESC
    `).all();

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sets/:setId
 * 특정 세트 상세 조회
 */
router.get('/:setId', (req, res) => {
  try {
    const { setId } = req.params;
    const db = getDb();

    const setInfo = db.prepare('SELECT * FROM item_sets WHERE set_id = ?').get(setId);
    if (!setInfo) {
      return res.status(404).json({ success: false, error: '세트를 찾을 수 없습니다.' });
    }

    // 세트에 속한 요청들
    const requests = db.prepare(`
      SELECT * FROM item_requests WHERE set_id = ? ORDER BY item_no
    `).all(setId);

    // 각 요청의 결과 (output + json 포함)
    const outputs = [];
    const itemJsons = [];
    for (const req of requests) {
      const output = db.prepare(`
        SELECT * FROM item_output WHERE request_id = ?
      `).get(req.request_id);
      if (output) {
        outputs.push(output);
      }

      // item_json에서 생성된 지문 정보 추출
      const itemJson = db.prepare(`
        SELECT final_json, normalized_json FROM item_json WHERE request_id = ?
      `).get(req.request_id);
      if (itemJson) {
        itemJsons.push({ request_id: req.request_id, ...itemJson });
      }
    }

    // 첫 번째 문항의 지문을 공통 지문으로 사용 (세트 문항은 동일 지문 공유)
    let generatedPassage = null;
    if (itemJsons.length > 0 && itemJsons[0].final_json) {
      try {
        const parsed = JSON.parse(itemJsons[0].final_json);
        generatedPassage = parsed.passage || parsed.stimulus || parsed.lc_script || null;
      } catch (e) {}
    }

    res.json({
      success: true,
      data: {
        set: setInfo,
        requests,
        outputs,
        itemJsons,
        generatedPassage  // 생성된 지문 (세트 공통)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sets
 * 새 세트 생성
 */
router.post('/', (req, res) => {
  try {
    const { set_id, set_name, common_passage, profile } = req.body;

    if (!set_id) {
      return res.status(400).json({ success: false, error: 'set_id는 필수입니다.' });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO item_sets (set_id, set_name, common_passage, profile)
      VALUES (?, ?, ?, ?)
    `).run(set_id, set_name || '', common_passage || '', profile || '');

    res.json({ success: true, message: '세트가 생성되었습니다.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: '이미 존재하는 set_id입니다.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/sets/:setId
 * 세트 수정
 */
router.put('/:setId', (req, res) => {
  try {
    const { setId } = req.params;
    const { set_name, common_passage, profile } = req.body;

    const db = getDb();
    const existing = db.prepare('SELECT * FROM item_sets WHERE set_id = ?').get(setId);

    if (!existing) {
      return res.status(404).json({ success: false, error: '세트를 찾을 수 없습니다.' });
    }

    db.prepare(`
      UPDATE item_sets
      SET set_name = ?,
          common_passage = ?,
          profile = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE set_id = ?
    `).run(
      set_name !== undefined ? set_name : existing.set_name,
      common_passage !== undefined ? common_passage : existing.common_passage,
      profile !== undefined ? profile : existing.profile,
      setId
    );

    res.json({ success: true, message: '세트가 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/sets/:setId
 * 세트 삭제
 */
router.delete('/:setId', (req, res) => {
  try {
    const { setId } = req.params;
    const db = getDb();

    // 세트에 속한 요청이 있는지 확인
    const requestCount = db.prepare(`
      SELECT COUNT(*) as count FROM item_requests WHERE set_id = ?
    `).get(setId);

    if (requestCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: `이 세트에 ${requestCount.count}개의 요청이 있습니다. 먼저 요청을 삭제해 주세요.`
      });
    }

    const result = db.prepare('DELETE FROM item_sets WHERE set_id = ?').run(setId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '세트를 찾을 수 없습니다.' });
    }

    res.json({ success: true, message: '세트가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sets/:setId/generate
 * 세트 문항 생성
 */
router.post('/:setId/generate', async (req, res) => {
  try {
    const { setId } = req.params;

    const db = getDb();
    const setInfo = db.prepare('SELECT * FROM item_sets WHERE set_id = ?').get(setId);

    if (!setInfo) {
      return res.status(404).json({ success: false, error: '세트를 찾을 수 없습니다.' });
    }

    logger.info('세트 생성 시작', `SET:${setId}`, '');

    const result = await generateSetItems(setId);

    res.json({
      success: true,
      data: {
        setId: result.setId,
        itemCount: result.itemCount,
        validationResult: result.validationResult,
        validationLog: result.validationLog
      }
    });
  } catch (error) {
    logger.error('세트 생성 오류', `SET:${req.params.setId}`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sets/:setId/requests
 * 세트에 요청 추가
 */
router.post('/:setId/requests', (req, res) => {
  try {
    const { setId } = req.params;
    const { items } = req.body; // [{ item_no, level, extra, topic }, ...]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items 배열이 필요합니다.'
      });
    }

    const db = getDb();
    const { v4: uuidv4 } = require('uuid');

    const stmt = db.prepare(`
      INSERT INTO item_requests (
        request_id, status, item_no, passage, level, extra,
        chart_id, set_id, passage_source, topic
      ) VALUES (?, 'PENDING', ?, '', ?, ?, NULL, ?, '', ?)
    `);

    const insertMany = db.transaction((itemList) => {
      const ids = [];
      for (const item of itemList) {
        const requestId = uuidv4();
        stmt.run(
          requestId,
          item.item_no,
          item.level || '',
          item.extra || '',
          setId,
          item.topic || ''
        );
        ids.push(requestId);
      }
      return ids;
    });

    const requestIds = insertMany(items);

    res.json({
      success: true,
      message: `${items.length}개 요청이 추가되었습니다.`,
      data: { requestIds }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
