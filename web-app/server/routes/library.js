/**
 * server/routes/library.js
 * Library 저장소 API - 승인된 문항 및 프롬프트 관리
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const logger = require('../services/logger');

/**
 * GET /api/library
 * 라이브러리 목록 조회 (필터링, 페이지네이션 지원)
 */
router.get('/', (req, res) => {
  try {
    const {
      type,           // 'item' | 'prompt' | undefined (전체)
      category,       // 카테고리 필터
      favorite,       // 즐겨찾기만 (1 또는 0)
      search,         // 검색어
      sort = 'created_at', // 정렬 기준
      order = 'DESC', // 정렬 순서
      limit = 50,
      offset = 0
    } = req.query;

    const db = getDb();
    let sql = 'SELECT * FROM library WHERE 1=1';
    const params = [];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (favorite === '1') {
      sql += ' AND is_favorite = 1';
    }

    if (search) {
      sql += ' AND (title LIKE ? OR passage LIKE ? OR question LIKE ? OR tags LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // 정렬
    const allowedSorts = ['created_at', 'updated_at', 'title', 'final_score', 'grade', 'item_no'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // 페이지네이션
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const items = db.prepare(sql).all(...params);

    // 전체 개수 조회
    let countSql = 'SELECT COUNT(*) as total FROM library WHERE 1=1';
    const countParams = [];

    if (type) {
      countSql += ' AND type = ?';
      countParams.push(type);
    }
    if (category) {
      countSql += ' AND category = ?';
      countParams.push(category);
    }
    if (favorite === '1') {
      countSql += ' AND is_favorite = 1';
    }
    if (search) {
      countSql += ' AND (title LIKE ? OR passage LIKE ? OR question LIKE ? OR tags LIKE ?)';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const totalResult = db.prepare(countSql).get(...countParams);

    // options JSON 파싱
    const parsedItems = items.map(item => ({
      ...item,
      options: item.options ? JSON.parse(item.options) : null,
      tags: item.tags ? item.tags.split(',').map(t => t.trim()) : []
    }));

    res.json({
      success: true,
      data: {
        items: parsedItems,
        pagination: {
          total: totalResult.total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    logger.error('Library 목록 조회 오류', 'library', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/library/stats
 * 라이브러리 통계
 */
router.get('/stats', (req, res) => {
  try {
    const db = getDb();

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN type = 'item' THEN 1 ELSE 0 END) as item_count,
        SUM(CASE WHEN type = 'prompt' THEN 1 ELSE 0 END) as prompt_count,
        SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) as favorite_count,
        AVG(CASE WHEN final_score IS NOT NULL THEN final_score ELSE NULL END) as avg_score
      FROM library
    `).get();

    // 카테고리별 통계
    const categories = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM library
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `).all();

    // 등급별 통계
    const grades = db.prepare(`
      SELECT grade, COUNT(*) as count
      FROM library
      WHERE grade IS NOT NULL
      GROUP BY grade
      ORDER BY
        CASE grade
          WHEN 'A' THEN 1
          WHEN 'B' THEN 2
          WHEN 'C' THEN 3
          WHEN 'D' THEN 4
          WHEN 'F' THEN 5
          ELSE 6
        END
    `).all();

    res.json({
      success: true,
      data: {
        ...stats,
        avg_score: stats.avg_score ? parseFloat(stats.avg_score.toFixed(2)) : null,
        categories,
        grades
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/library/categories
 * 카테고리 목록
 */
router.get('/categories', (req, res) => {
  try {
    const db = getDb();

    const categories = db.prepare(`
      SELECT DISTINCT category
      FROM library
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category
    `).all();

    res.json({
      success: true,
      data: categories.map(c => c.category)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/library/:id
 * 라이브러리 항목 상세 조회
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const item = db.prepare('SELECT * FROM library WHERE id = ?').get(parseInt(id));

    if (!item) {
      return res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다.' });
    }

    res.json({
      success: true,
      data: {
        ...item,
        options: item.options ? JSON.parse(item.options) : null,
        tags: item.tags ? item.tags.split(',').map(t => t.trim()) : []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/library
 * 라이브러리에 항목 추가
 */
router.post('/', (req, res) => {
  try {
    const {
      type,           // 'item' | 'prompt'
      title,
      category,
      tags,           // 문자열 또는 배열

      // 문항 관련
      request_id,
      item_no,
      passage,
      question,
      options,        // 배열
      answer,
      explanation,

      // 프롬프트 관련
      prompt_id,
      prompt_key,
      prompt_text,

      // 품질 정보
      final_score,
      grade,

      // 메타데이터
      notes,
      source
    } = req.body;

    if (!type || !['item', 'prompt'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: "type은 'item' 또는 'prompt'이어야 합니다."
      });
    }

    const db = getDb();

    // 중복 체크 (같은 request_id 또는 prompt_key)
    if (type === 'item' && request_id) {
      const existing = db.prepare(
        "SELECT id FROM library WHERE type = 'item' AND request_id = ?"
      ).get(request_id);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: '이미 라이브러리에 저장된 문항입니다.'
        });
      }
    }

    // tags 처리
    const tagsString = Array.isArray(tags) ? tags.join(', ') : (tags || '');

    // options 처리
    const optionsJson = Array.isArray(options) ? JSON.stringify(options) : options;

    const result = db.prepare(`
      INSERT INTO library (
        type, title, category, tags,
        request_id, item_no, passage, question, options, answer, explanation,
        prompt_id, prompt_key, prompt_text,
        final_score, grade, notes, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      type, title || null, category || null, tagsString,
      request_id || null, item_no || null, passage || null, question || null,
      optionsJson || null, answer || null, explanation || null,
      prompt_id || null, prompt_key || null, prompt_text || null,
      final_score || null, grade || null, notes || null, source || null
    );

    logger.info('Library 항목 추가', type, `ID: ${result.lastInsertRowid || 'new'}`);

    res.json({
      success: true,
      message: '라이브러리에 저장되었습니다.',
      data: { id: result.lastInsertRowid || result.changes }
    });
  } catch (error) {
    logger.error('Library 항목 추가 오류', 'library', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/library/item-from-request/:requestId
 * 생성 요청의 결과를 라이브러리에 저장
 */
router.post('/item-from-request/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    const { title, category, tags, notes } = req.body;
    const db = getDb();

    // 기존 저장 여부 확인
    const existing = db.prepare(
      "SELECT id FROM library WHERE type = 'item' AND request_id = ?"
    ).get(requestId);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: '이미 라이브러리에 저장된 문항입니다.',
        data: { id: existing.id }
      });
    }

    // 요청 정보 조회
    const request = db.prepare('SELECT * FROM item_requests WHERE request_id = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: '요청을 찾을 수 없습니다.' });
    }

    // 출력 정보 조회
    const output = db.prepare('SELECT * FROM item_output WHERE request_id = ?').get(requestId);

    // JSON 정보 조회
    const itemJson = db.prepare('SELECT * FROM item_json WHERE request_id = ?').get(requestId);

    // 메트릭스 정보 조회
    const metrics = db.prepare('SELECT * FROM item_metrics WHERE request_id = ?').get(requestId);

    // 데이터 구성
    let passage = output?.passage || null;
    let question = output?.question || null;
    let options = null;
    let answer = output?.answer || null;
    let explanation = output?.explanation || null;

    // final_json에서 추가 데이터 추출
    if (itemJson?.final_json) {
      try {
        const finalData = JSON.parse(itemJson.final_json);
        passage = passage || finalData.passage || finalData.stimulus;
        question = question || finalData.question || finalData.question_stem;
        answer = answer || finalData.answer || finalData.correct_answer;
        explanation = explanation || finalData.explanation;

        if (finalData.options && Array.isArray(finalData.options)) {
          options = JSON.stringify(finalData.options);
        }
      } catch (e) {
        // JSON 파싱 실패 시 무시
      }
    }

    // output의 option 필드들 조합
    if (!options && output) {
      const optionsArray = [];
      for (let i = 1; i <= 5; i++) {
        const opt = output[`option_${i}`];
        if (opt) optionsArray.push(opt);
      }
      if (optionsArray.length > 0) {
        options = JSON.stringify(optionsArray);
      }
    }

    // tags 처리
    const tagsString = Array.isArray(tags) ? tags.join(', ') : (tags || '');

    // 자동 타이틀 생성
    const autoTitle = title || `${request.item_no}번 문항 - ${new Date().toLocaleDateString('ko-KR')}`;

    const result = db.prepare(`
      INSERT INTO library (
        type, title, category, tags,
        request_id, item_no, passage, question, options, answer, explanation,
        final_score, grade, notes, source
      ) VALUES ('item', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generation')
    `).run(
      autoTitle, category || null, tagsString,
      requestId, request.item_no, passage, question, options, answer, explanation,
      metrics?.final_score || null, metrics?.grade || null, notes || null
    );

    logger.info('Library 문항 추가 (요청에서)', requestId, `ID: ${result.lastInsertRowid || 'new'}`);

    res.json({
      success: true,
      message: '문항이 라이브러리에 저장되었습니다.',
      data: { id: result.lastInsertRowid || result.changes }
    });
  } catch (error) {
    logger.error('Library 문항 추가 오류', req.params.requestId, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/library/prompt/:promptKey
 * 프롬프트를 라이브러리에 저장
 */
router.post('/prompt/:promptKey', (req, res) => {
  try {
    const { promptKey } = req.params;
    const { title, category, tags, notes } = req.body;
    const db = getDb();

    // 프롬프트 조회
    const prompt = db.prepare('SELECT * FROM prompts WHERE prompt_key = ?').get(promptKey);
    if (!prompt) {
      return res.status(404).json({ success: false, error: '프롬프트를 찾을 수 없습니다.' });
    }

    // 프롬프트 메트릭스 조회
    const metrics = db.prepare('SELECT * FROM prompt_metrics WHERE prompt_id = ?').get(prompt.id);

    // tags 처리
    const tagsString = Array.isArray(tags) ? tags.join(', ') : (tags || '');

    // 자동 타이틀 생성
    const autoTitle = title || `${prompt.title || promptKey} - ${new Date().toLocaleDateString('ko-KR')}`;

    const result = db.prepare(`
      INSERT INTO library (
        type, title, category, tags,
        prompt_id, prompt_key, prompt_text,
        final_score, grade, notes, source
      ) VALUES ('prompt', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prompt_save')
    `).run(
      autoTitle, category || null, tagsString,
      prompt.id, promptKey, prompt.prompt_text,
      metrics?.total_score || null, metrics?.grade || null, notes || null
    );

    logger.info('Library 프롬프트 추가', promptKey, `ID: ${result.lastInsertRowid || 'new'}`);

    res.json({
      success: true,
      message: '프롬프트가 라이브러리에 저장되었습니다.',
      data: { id: result.lastInsertRowid || result.changes }
    });
  } catch (error) {
    logger.error('Library 프롬프트 추가 오류', req.params.promptKey, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/library/:id
 * 라이브러리 항목 수정
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      tags,
      passage,
      question,
      options,
      answer,
      explanation,
      prompt_text,
      notes,
      is_favorite
    } = req.body;

    const db = getDb();

    const existing = db.prepare('SELECT * FROM library WHERE id = ?').get(parseInt(id));
    if (!existing) {
      return res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다.' });
    }

    // tags 처리
    const tagsString = tags !== undefined
      ? (Array.isArray(tags) ? tags.join(', ') : tags)
      : existing.tags;

    // options 처리
    const optionsJson = options !== undefined
      ? (Array.isArray(options) ? JSON.stringify(options) : options)
      : existing.options;

    db.prepare(`
      UPDATE library SET
        title = ?,
        category = ?,
        tags = ?,
        passage = ?,
        question = ?,
        options = ?,
        answer = ?,
        explanation = ?,
        prompt_text = ?,
        notes = ?,
        is_favorite = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title !== undefined ? title : existing.title,
      category !== undefined ? category : existing.category,
      tagsString,
      passage !== undefined ? passage : existing.passage,
      question !== undefined ? question : existing.question,
      optionsJson,
      answer !== undefined ? answer : existing.answer,
      explanation !== undefined ? explanation : existing.explanation,
      prompt_text !== undefined ? prompt_text : existing.prompt_text,
      notes !== undefined ? notes : existing.notes,
      is_favorite !== undefined ? (is_favorite ? 1 : 0) : existing.is_favorite,
      parseInt(id)
    );

    res.json({
      success: true,
      message: '항목이 수정되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/library/:id/favorite
 * 즐겨찾기 토글
 */
router.put('/:id/favorite', (req, res) => {
  try {
    const { id } = req.params;
    const { is_favorite } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM library WHERE id = ?').get(parseInt(id));
    if (!existing) {
      return res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다.' });
    }

    const newFavorite = is_favorite !== undefined ? (is_favorite ? 1 : 0) : (existing.is_favorite ? 0 : 1);

    db.prepare(`
      UPDATE library SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(newFavorite, parseInt(id));

    res.json({
      success: true,
      message: newFavorite ? '즐겨찾기에 추가되었습니다.' : '즐겨찾기에서 제거되었습니다.',
      data: { is_favorite: newFavorite }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/library/:id
 * 라이브러리 항목 삭제
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM library WHERE id = ?').get(parseInt(id));
    if (!existing) {
      return res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다.' });
    }

    db.prepare('DELETE FROM library WHERE id = ?').run(parseInt(id));

    logger.info('Library 항목 삭제', existing.type, `ID: ${id}`);

    res.json({
      success: true,
      message: '항목이 삭제되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/library/export
 * 라이브러리 내보내기
 */
router.post('/export', (req, res) => {
  try {
    const { ids, format = 'json' } = req.body;
    const db = getDb();

    let items;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      items = db.prepare(`SELECT * FROM library WHERE id IN (${placeholders})`).all(...ids);
    } else {
      items = db.prepare('SELECT * FROM library ORDER BY created_at DESC').all();
    }

    // 데이터 파싱
    const parsedItems = items.map(item => ({
      ...item,
      options: item.options ? JSON.parse(item.options) : null,
      tags: item.tags ? item.tags.split(',').map(t => t.trim()) : []
    }));

    if (format === 'json') {
      res.json({
        success: true,
        data: {
          exported_at: new Date().toISOString(),
          count: parsedItems.length,
          items: parsedItems
        }
      });
    } else {
      // 추후 CSV, Excel 등 다른 형식 지원 가능
      res.json({
        success: true,
        data: {
          exported_at: new Date().toISOString(),
          count: parsedItems.length,
          items: parsedItems
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
