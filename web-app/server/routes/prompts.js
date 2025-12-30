/**
 * server/routes/prompts.js
 * 프롬프트 관리 API
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { evaluatePrompt, quickValidate, improvePromptWithFeedback } = require('../services/promptEvaluator');
const logger = require('../services/logger');

/**
 * GET /api/prompts
 * 모든 프롬프트 조회
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM prompts ORDER BY prompt_key
    `).all();
    res.json({ success: true, data: rows });
  } catch (error) {
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
 * 새 프롬프트 생성
 */
router.post('/', (req, res) => {
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

    res.json({ success: true, message: '프롬프트가 생성되었습니다.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: '이미 존재하는 prompt_key입니다.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/prompts/:key
 * 프롬프트 수정
 */
router.put('/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { title, prompt_text, active } = req.body;

    const db = getDb();
    const existing = db.prepare('SELECT * FROM prompts WHERE prompt_key = ?').get(key);

    if (!existing) {
      return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
    }

    db.prepare(`
      UPDATE prompts
      SET title = ?,
          prompt_text = ?,
          active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE prompt_key = ?
    `).run(
      title !== undefined ? title : existing.title,
      prompt_text !== undefined ? prompt_text : existing.prompt_text,
      active !== undefined ? (active ? 1 : 0) : existing.active,
      key
    );

    res.json({ success: true, message: '프롬프트가 수정되었습니다.' });
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

module.exports = router;
