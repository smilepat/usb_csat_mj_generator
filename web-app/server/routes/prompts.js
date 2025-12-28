/**
 * server/routes/prompts.js
 * 프롬프트 관리 API
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

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
