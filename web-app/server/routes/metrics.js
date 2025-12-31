/**
 * server/routes/metrics.js
 * 문항 품질 메트릭스 API
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { getMetricsByRequestId, getMetricsStats } = require('../services/metricsService');

/**
 * GET /api/metrics
 * 전체 메트릭스 목록 조회
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { recommendation, grade, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT m.*, r.item_no as req_item_no, r.status
      FROM item_metrics m
      LEFT JOIN item_requests r ON m.request_id = r.request_id
      WHERE 1=1
    `;
    const params = [];

    if (recommendation) {
      sql += ` AND m.recommendation = ?`;
      params.push(recommendation);
    }

    if (grade) {
      sql += ` AND m.grade = ?`;
      params.push(grade);
    }

    sql += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const metrics = db.prepare(sql).all(...params);

    // 총 개수
    let countSql = `SELECT COUNT(*) as total FROM item_metrics WHERE 1=1`;
    const countParams = [];
    if (recommendation) {
      countSql += ` AND recommendation = ?`;
      countParams.push(recommendation);
    }
    if (grade) {
      countSql += ` AND grade = ?`;
      countParams.push(grade);
    }
    const countResult = db.prepare(countSql).get(...countParams);

    res.json({
      success: true,
      data: metrics,
      total: countResult?.total || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metrics/stats
 * 메트릭스 통계 조회
 */
router.get('/stats', (req, res) => {
  try {
    const stats = getMetricsStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metrics/summary
 * 대시보드용 요약 정보
 */
router.get('/summary', (req, res) => {
  try {
    const db = getDb();

    // 분류별 개수
    const byRecommendation = db.prepare(`
      SELECT recommendation, COUNT(*) as count
      FROM item_metrics
      GROUP BY recommendation
    `).all();

    // 등급별 개수
    const byGrade = db.prepare(`
      SELECT grade, COUNT(*) as count
      FROM item_metrics
      GROUP BY grade
      ORDER BY grade
    `).all();

    // 평균 점수
    const avgScores = db.prepare(`
      SELECT
        ROUND(AVG(layer1_score), 1) as avg_layer1,
        ROUND(AVG(layer2_score), 1) as avg_layer2,
        ROUND(AVG(layer3_score), 1) as avg_layer3,
        ROUND(AVG(final_score), 1) as avg_final
      FROM item_metrics
    `).get();

    // 최근 10개 문항
    const recent = db.prepare(`
      SELECT request_id, item_no, final_score, grade, recommendation, created_at
      FROM item_metrics
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    // 문항 유형별 평균
    const byItemType = db.prepare(`
      SELECT
        CASE
          WHEN item_no BETWEEN 1 AND 17 THEN 'LC'
          WHEN item_no = 29 THEN 'RC_grammar'
          WHEN item_no BETWEEN 31 AND 34 THEN 'RC_gap'
          WHEN item_no = 25 THEN 'RC_chart'
          WHEN item_no BETWEEN 41 AND 45 THEN 'RC_long'
          ELSE 'RC_general'
        END as item_type,
        COUNT(*) as count,
        ROUND(AVG(final_score), 1) as avg_score
      FROM item_metrics
      WHERE item_no > 0
      GROUP BY item_type
    `).all();

    res.json({
      success: true,
      data: {
        byRecommendation,
        byGrade,
        avgScores,
        recent,
        byItemType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metrics/:requestId
 * 특정 요청의 메트릭스 조회
 */
router.get('/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    const metrics = getMetricsByRequestId(requestId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: '해당 요청의 메트릭스가 없습니다.'
      });
    }

    // flags JSON 파싱
    if (metrics.flags) {
      try {
        metrics.flags = JSON.parse(metrics.flags);
      } catch (e) {
        metrics.flags = [];
      }
    }

    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
