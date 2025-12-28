/**
 * server/routes/config.js
 * 설정 관리 API
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

/**
 * GET /api/config
 * 모든 설정 조회
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM config ORDER BY key').all();
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/config/:key
 * 설정 값 업데이트
 */
router.put('/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const db = getDb();
    db.prepare(`
      INSERT INTO config (key, value, description, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = ?,
        description = COALESCE(?, description),
        updated_at = CURRENT_TIMESTAMP
    `).run(key, value, description, value, description);

    res.json({ success: true, message: '설정이 업데이트되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/config/batch
 * 여러 설정 일괄 업데이트
 */
router.post('/batch', (req, res) => {
  try {
    const { configs } = req.body;
    const db = getDb();

    const stmt = db.prepare(`
      INSERT INTO config (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `);

    const updateMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run(item.key, item.value, item.value);
      }
    });

    updateMany(configs);

    res.json({ success: true, message: `${configs.length}개 설정이 업데이트되었습니다.` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
