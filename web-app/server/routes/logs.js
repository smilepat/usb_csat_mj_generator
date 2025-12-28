/**
 * server/routes/logs.js
 * 로그 조회 API
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

/**
 * GET /api/logs
 * 일반 로그 조회
 */
router.get('/', (req, res) => {
  try {
    const { level, requestId, limit = 100, offset = 0 } = req.query;
    const db = getDb();

    let query = 'SELECT * FROM logs WHERE 1=1';
    const params = [];

    if (level) {
      query += ' AND level = ?';
      params.push(level.toUpperCase());
    }

    if (requestId) {
      query += ' AND request_id = ?';
      params.push(requestId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const rows = db.prepare(query).all(...params);

    // 총 개수 조회
    let countQuery = 'SELECT COUNT(*) as count FROM logs WHERE 1=1';
    const countParams = [];
    if (level) {
      countQuery += ' AND level = ?';
      countParams.push(level.toUpperCase());
    }
    if (requestId) {
      countQuery += ' AND request_id = ?';
      countParams.push(requestId);
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
 * GET /api/logs/errors
 * 에러 로그 조회
 */
router.get('/errors', (req, res) => {
  try {
    const { requestId, limit = 100, offset = 0 } = req.query;
    const db = getDb();

    let query = 'SELECT * FROM errors WHERE 1=1';
    const params = [];

    if (requestId) {
      query += ' AND request_id = ?';
      params.push(requestId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const rows = db.prepare(query).all(...params);

    let countQuery = 'SELECT COUNT(*) as count FROM errors WHERE 1=1';
    const countParams = [];
    if (requestId) {
      countQuery += ' AND request_id = ?';
      countParams.push(requestId);
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
 * DELETE /api/logs/clear
 * 오래된 로그 삭제
 */
router.delete('/clear', (req, res) => {
  try {
    const { days = 30 } = req.query;
    const db = getDb();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    const cutoffStr = cutoff.toISOString();

    const logResult = db.prepare(`
      DELETE FROM logs WHERE timestamp < ?
    `).run(cutoffStr);

    const errorResult = db.prepare(`
      DELETE FROM errors WHERE timestamp < ?
    `).run(cutoffStr);

    res.json({
      success: true,
      message: `${days}일 이전 로그가 삭제되었습니다.`,
      data: {
        logsDeleted: logResult.changes,
        errorsDeleted: errorResult.changes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/logs/stats
 * 로그 통계
 */
router.get('/stats', (req, res) => {
  try {
    const db = getDb();

    const stats = {
      logs: {
        total: db.prepare('SELECT COUNT(*) as count FROM logs').get().count,
        byLevel: {}
      },
      errors: {
        total: db.prepare('SELECT COUNT(*) as count FROM errors').get().count
      }
    };

    // 레벨별 로그 수
    const levels = db.prepare(`
      SELECT level, COUNT(*) as count FROM logs GROUP BY level
    `).all();
    for (const l of levels) {
      stats.logs.byLevel[l.level] = l.count;
    }

    // 최근 24시간 통계
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString();

    stats.logs.last24h = db.prepare(`
      SELECT COUNT(*) as count FROM logs WHERE timestamp > ?
    `).get(yesterdayStr).count;

    stats.errors.last24h = db.prepare(`
      SELECT COUNT(*) as count FROM errors WHERE timestamp > ?
    `).get(yesterdayStr).count;

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
