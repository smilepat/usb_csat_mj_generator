/**
 * server/routes/prompts.js
 * 프롬프트 관리 API
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { evaluatePrompt, quickValidate, improvePromptWithFeedback } = require('../services/promptEvaluator');
const {
  calculateAndSavePromptMetrics,
  getPromptMetrics,
  getPromptMetricsSummary,
  recalculateAllPromptMetrics,
  updatePromptPerformance
} = require('../services/promptMetricsService');
const logger = require('../services/logger');

/**
 * GET /api/prompts
 * 모든 프롬프트 조회 (메트릭스 포함)
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT p.*, pm.total_score, pm.grade, pm.needs_improvement,
             pm.items_generated, pm.approve_rate
      FROM prompts p
      LEFT JOIN prompt_metrics pm ON p.id = pm.prompt_id
      ORDER BY
        CASE
          WHEN p.prompt_key = 'MASTER_PROMPT' THEN 1
          WHEN p.prompt_key = 'PASSAGE_MASTER' THEN 2
          WHEN p.prompt_key LIKE 'P%' THEN 3
          ELSE 4
        END,
        p.prompt_key
    `).all();
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 메트릭스 관련 엔드포인트 (/:key 라우트보다 먼저 정의)
// ============================================

/**
 * GET /api/prompts/metrics/summary
 * 프롬프트 메트릭스 요약
 */
router.get('/metrics/summary', (req, res) => {
  try {
    const summary = getPromptMetricsSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/prompts/metrics/recalculate-all
 * 모든 프롬프트 메트릭스 재계산
 */
router.post('/metrics/recalculate-all', async (req, res) => {
  try {
    const { includeAI = false } = req.body;

    logger.info('모든 프롬프트 메트릭스 재계산 시작', 'system', `AI 포함: ${includeAI}`);

    const results = await recalculateAllPromptMetrics(includeAI);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.info('모든 프롬프트 메트릭스 재계산 완료', 'system', `성공: ${successCount}, 실패: ${failCount}`);

    res.json({
      success: true,
      data: {
        total: results.length,
        success: successCount,
        failed: failCount,
        details: results
      }
    });
  } catch (error) {
    logger.error('모든 프롬프트 메트릭스 재계산 오류', 'system', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/prompts/:key
 * 특정 프롬프트 조회
 */
router.get('/:key', (req, res) => {
  try {
    const { key } = req.params;
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM prompts WHERE prompt_key = ?
    `).get(key);

    if (!row) {
      return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/prompts
 * 새 프롬프트 생성 (메트릭스 자동 계산)
 */
router.post('/', async (req, res) => {
  try {
    const { prompt_key, title, prompt_text, active = 1 } = req.body;

    if (!prompt_key || !prompt_text) {
      return res.status(400).json({
        success: false,
        error: 'prompt_key와 prompt_text는 필수입니다.'
      });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO prompts (prompt_key, title, prompt_text, active)
      VALUES (?, ?, ?, ?)
    `).run(prompt_key, title || '', prompt_text, active ? 1 : 0);

    // 새로 생성된 프롬프트 ID 조회
    const newPrompt = db.prepare('SELECT id FROM prompts WHERE prompt_key = ?').get(prompt_key);

    // 메트릭스 자동 계산 (규칙 기반만, AI 평가는 별도 요청으로)
    let metrics = null;
    if (newPrompt) {
      try {
        metrics = await calculateAndSavePromptMetrics(newPrompt.id, prompt_key, prompt_text, false);
      } catch (metricsError) {
        logger.warn('프롬프트 메트릭스 계산 실패', prompt_key, metricsError.message);
      }
    }

    res.json({
      success: true,
      message: '프롬프트가 생성되었습니다.',
      metrics: metrics
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: '이미 존재하는 prompt_key입니다.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/prompts/:key
 * 프롬프트 수정 (버전 히스토리 저장 + 메트릭스 재계산)
 */
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { title, prompt_text, active, change_reason } = req.body;

    const db = getDb();
    const existing = db.prepare('SELECT * FROM prompts WHERE prompt_key = ?').get(key);

    if (!existing) {
      return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
    }

    const newPromptText = prompt_text !== undefined ? prompt_text : existing.prompt_text;

    // 프롬프트 텍스트가 변경되면 이전 버전을 히스토리에 저장
    let newVersion = null;
    if (prompt_text !== undefined && prompt_text !== existing.prompt_text) {
      // 현재 최신 버전 번호 조회
      const latestVersion = db.prepare(
        'SELECT MAX(version) as max_version FROM prompt_versions WHERE prompt_id = ?'
      ).get(existing.id);

      newVersion = (latestVersion?.max_version || 0) + 1;

      // 이전 버전 저장
      db.prepare(`
        INSERT INTO prompt_versions (prompt_id, prompt_key, version, prompt_text, change_reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        existing.id,
        key,
        newVersion,
        existing.prompt_text,  // 이전 텍스트 저장
        change_reason || '수동 수정'
      );

      logger.info('프롬프트 버전 저장', key, `버전 ${newVersion} 저장됨`);
    }

    // 프롬프트 업데이트
    db.prepare(`
      UPDATE prompts
      SET title = ?,
          prompt_text = ?,
          active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE prompt_key = ?
    `).run(
      title !== undefined ? title : existing.title,
      newPromptText,
      active !== undefined ? (active ? 1 : 0) : existing.active,
      key
    );

    // 프롬프트 텍스트가 변경되었으면 메트릭스 재계산
    let metrics = null;
    if (prompt_text !== undefined && prompt_text !== existing.prompt_text) {
      try {
        metrics = await calculateAndSavePromptMetrics(existing.id, key, newPromptText, false);
        logger.info('프롬프트 수정 후 메트릭스 재계산', key, `Score: ${metrics?.totalScore}`);
      } catch (metricsError) {
        logger.warn('프롬프트 메트릭스 재계산 실패', key, metricsError.message);
      }
    }

    res.json({
      success: true,
      message: '프롬프트가 수정되었습니다.',
      version: newVersion,
      metrics: metrics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/prompts/:key/evaluate
 * LLM을 사용한 프롬프트 품질 평가
 */
router.post('/:key/evaluate', async (req, res) => {
  try {
    const { key } = req.params;
    const { prompt_text } = req.body;
    const db = getDb();

    // prompt_text가 제공되지 않으면 DB에서 조회
    let textToEvaluate = prompt_text;
    if (!textToEvaluate) {
      const row = db.prepare('SELECT prompt_text FROM prompts WHERE prompt_key = ?').get(key);
      if (!row) {
        return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
      }
      textToEvaluate = row.prompt_text;
    }

    // 1. 빠른 규칙 기반 사전 검증
    const quickResult = quickValidate(key, textToEvaluate);

    // 2. LLM 기반 평가
    logger.info('프롬프트 평가 시작', key, `길이: ${textToEvaluate.length}자`);
    const evalResult = await evaluatePrompt(key, textToEvaluate);

    if (!evalResult.success) {
      return res.status(500).json({
        success: false,
        error: evalResult.error,
        quickValidation: quickResult
      });
    }

    logger.info('프롬프트 평가 완료', key, `점수: ${evalResult.data.overall_score}/10`);

    res.json({
      success: true,
      data: {
        ...evalResult.data,
        quickValidation: quickResult
      }
    });
  } catch (error) {
    logger.error('프롬프트 평가 오류', req.params.key, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/prompts/:key/quick-validate
 * 빠른 규칙 기반 검증 (LLM 호출 없음)
 */
router.post('/:key/quick-validate', (req, res) => {
  try {
    const { key } = req.params;
    const { prompt_text } = req.body;
    const db = getDb();

    let textToValidate = prompt_text;
    if (!textToValidate) {
      const row = db.prepare('SELECT prompt_text FROM prompts WHERE prompt_key = ?').get(key);
      if (!row) {
        return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
      }
      textToValidate = row.prompt_text;
    }

    const result = quickValidate(key, textToValidate);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/prompts/:key/improve
 * 사용자 피드백을 기반으로 프롬프트 개선
 */
router.post('/:key/improve', async (req, res) => {
  try {
    const { key } = req.params;
    const { prompt_text, feedback } = req.body;
    const db = getDb();

    if (!feedback || feedback.trim().length === 0) {
      return res.status(400).json({ success: false, error: '피드백을 입력해주세요.' });
    }

    // prompt_text가 제공되지 않으면 DB에서 조회
    let textToImprove = prompt_text;
    if (!textToImprove) {
      const row = db.prepare('SELECT prompt_text FROM prompts WHERE prompt_key = ?').get(key);
      if (!row) {
        return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
      }
      textToImprove = row.prompt_text;
    }

    logger.info('프롬프트 피드백 개선 시작', key, `피드백: ${feedback.substring(0, 50)}...`);
    const result = await improvePromptWithFeedback(key, textToImprove, feedback);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    logger.info('프롬프트 피드백 개선 완료', key, `변경사항: ${result.data.changes_made.length}개`);

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error('프롬프트 피드백 개선 오류', req.params.key, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/prompts/:key/versions
 * 프롬프트 버전 히스토리 조회
 */
router.get('/:key/versions', (req, res) => {
  try {
    const { key } = req.params;
    const db = getDb();

    const prompt = db.prepare('SELECT id, prompt_text, updated_at FROM prompts WHERE prompt_key = ?').get(key);
    if (!prompt) {
      return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
    }

    // 버전 히스토리 조회 (최신순)
    const versions = db.prepare(`
      SELECT id, version, prompt_text, change_reason, created_at
      FROM prompt_versions
      WHERE prompt_id = ?
      ORDER BY version DESC
    `).all(prompt.id);

    // 현재 버전 정보 추가
    const currentVersion = {
      version: 'current',
      prompt_text: prompt.prompt_text,
      change_reason: '현재 버전',
      created_at: prompt.updated_at
    };

    res.json({
      success: true,
      data: {
        current: currentVersion,
        history: versions,
        total_versions: versions.length + 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/prompts/:key/versions/:version/restore
 * 특정 버전으로 복원
 */
router.post('/:key/versions/:version/restore', async (req, res) => {
  try {
    const { key, version } = req.params;
    const db = getDb();

    const prompt = db.prepare('SELECT * FROM prompts WHERE prompt_key = ?').get(key);
    if (!prompt) {
      return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
    }

    // 복원할 버전 조회
    const targetVersion = db.prepare(`
      SELECT * FROM prompt_versions
      WHERE prompt_id = ? AND version = ?
    `).get(prompt.id, parseInt(version));

    if (!targetVersion) {
      return res.status(404).json({ success: false, error: '해당 버전을 찾을 수 없습니다.' });
    }

    // 현재 버전을 히스토리에 저장
    const latestVersion = db.prepare(
      'SELECT MAX(version) as max_version FROM prompt_versions WHERE prompt_id = ?'
    ).get(prompt.id);

    const newVersion = (latestVersion?.max_version || 0) + 1;

    db.prepare(`
      INSERT INTO prompt_versions (prompt_id, prompt_key, version, prompt_text, change_reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      prompt.id,
      key,
      newVersion,
      prompt.prompt_text,
      `버전 ${version}으로 복원 전 백업`
    );

    // 선택한 버전으로 복원
    db.prepare(`
      UPDATE prompts
      SET prompt_text = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE prompt_key = ?
    `).run(targetVersion.prompt_text, key);

    logger.info('프롬프트 버전 복원', key, `버전 ${version}으로 복원됨`);

    // 메트릭스 재계산
    let metrics = null;
    try {
      metrics = await calculateAndSavePromptMetrics(prompt.id, key, targetVersion.prompt_text, false);
    } catch (metricsError) {
      logger.warn('복원 후 메트릭스 재계산 실패', key, metricsError.message);
    }

    res.json({
      success: true,
      message: `버전 ${version}으로 복원되었습니다.`,
      restored_version: version,
      backup_version: newVersion,
      metrics: metrics
    });
  } catch (error) {
    logger.error('프롬프트 버전 복원 오류', req.params.key, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/prompts/:key
 * 프롬프트 삭제
 */
router.delete('/:key', (req, res) => {
  try {
    const { key } = req.params;
    const db = getDb();

    const result = db.prepare('DELETE FROM prompts WHERE prompt_key = ?').run(key);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
    }

    res.json({ success: true, message: '프롬프트가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 추가 메트릭스 엔드포인트 (/:key 하위 경로)
// ============================================

/**
 * GET /api/prompts/:key/metrics
 * 특정 프롬프트의 메트릭스 조회
 */
router.get('/:key/metrics', (req, res) => {
  try {
    const { key } = req.params;
    const db = getDb();

    const prompt = db.prepare('SELECT id FROM prompts WHERE prompt_key = ?').get(key);
    if (!prompt) {
      return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
    }

    const metrics = getPromptMetrics(prompt.id);

    res.json({
      success: true,
      data: metrics || { message: '메트릭스가 아직 계산되지 않았습니다.' }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/prompts/:key/metrics/calculate
 * 프롬프트 메트릭스 계산 (강제 재계산)
 */
router.post('/:key/metrics/calculate', async (req, res) => {
  try {
    const { key } = req.params;
    const { includeAI = false } = req.body;
    const db = getDb();

    const prompt = db.prepare('SELECT id, prompt_text FROM prompts WHERE prompt_key = ?').get(key);
    if (!prompt) {
      return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
    }

    logger.info('프롬프트 메트릭스 계산 요청', key, `AI 포함: ${includeAI}`);

    const metrics = await calculateAndSavePromptMetrics(prompt.id, key, prompt.prompt_text, includeAI);

    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('프롬프트 메트릭스 계산 오류', req.params.key, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/prompts/:key/performance/update
 * 프롬프트 성능 데이터 업데이트 (문항 생성 후 호출)
 */
router.post('/:key/performance/update', (req, res) => {
  try {
    const { key } = req.params;
    const db = getDb();

    const prompt = db.prepare('SELECT id FROM prompts WHERE prompt_key = ?').get(key);
    if (!prompt) {
      return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
    }

    const performance = updatePromptPerformance(prompt.id);

    res.json({
      success: true,
      data: performance || { message: '해당 프롬프트로 생성된 문항이 없습니다.' }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
