/**
 * server/routes/charts.js
 * 차트 데이터 관리 API
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

/**
 * GET /api/charts
 * 모든 차트 조회
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT chart_id, chart_name, created_at, updated_at
      FROM charts
      ORDER BY created_at DESC
    `).all();

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/charts/:chartId
 * 특정 차트 상세 조회
 */
router.get('/:chartId', (req, res) => {
  try {
    const { chartId } = req.params;
    const db = getDb();

    const row = db.prepare('SELECT * FROM charts WHERE chart_id = ?').get(chartId);
    if (!row) {
      return res.status(404).json({ success: false, error: '차트를 찾을 수 없습니다.' });
    }

    // raw_data_json 파싱
    let data = {};
    try {
      data = JSON.parse(row.raw_data_json || '{}');
    } catch (e) {
      data = {};
    }

    res.json({
      success: true,
      data: {
        chartId: row.chart_id,
        chartName: row.chart_name,
        data: data,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/charts
 * 새 차트 생성
 */
router.post('/', (req, res) => {
  try {
    const { chart_id, chart_name, data } = req.body;

    if (!chart_id) {
      return res.status(400).json({ success: false, error: 'chart_id는 필수입니다.' });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO charts (chart_id, chart_name, raw_data_json)
      VALUES (?, ?, ?)
    `).run(
      chart_id,
      chart_name || '',
      typeof data === 'object' ? JSON.stringify(data) : (data || '{}')
    );

    res.json({ success: true, message: '차트가 생성되었습니다.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: '이미 존재하는 chart_id입니다.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/charts/:chartId
 * 차트 수정
 */
router.put('/:chartId', (req, res) => {
  try {
    const { chartId } = req.params;
    const { chart_name, data } = req.body;

    const db = getDb();
    const existing = db.prepare('SELECT * FROM charts WHERE chart_id = ?').get(chartId);

    if (!existing) {
      return res.status(404).json({ success: false, error: '차트를 찾을 수 없습니다.' });
    }

    let rawDataJson = existing.raw_data_json;
    if (data !== undefined) {
      rawDataJson = typeof data === 'object' ? JSON.stringify(data) : data;
    }

    db.prepare(`
      UPDATE charts
      SET chart_name = ?,
          raw_data_json = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE chart_id = ?
    `).run(
      chart_name !== undefined ? chart_name : existing.chart_name,
      rawDataJson,
      chartId
    );

    res.json({ success: true, message: '차트가 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/charts/:chartId
 * 차트 삭제
 */
router.delete('/:chartId', (req, res) => {
  try {
    const { chartId } = req.params;
    const db = getDb();

    // 이 차트를 사용하는 요청이 있는지 확인
    const usageCount = db.prepare(`
      SELECT COUNT(*) as count FROM item_requests WHERE chart_id = ?
    `).get(chartId);

    if (usageCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: `이 차트를 사용하는 요청이 ${usageCount.count}개 있습니다.`
      });
    }

    const result = db.prepare('DELETE FROM charts WHERE chart_id = ?').run(chartId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '차트를 찾을 수 없습니다.' });
    }

    res.json({ success: true, message: '차트가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
