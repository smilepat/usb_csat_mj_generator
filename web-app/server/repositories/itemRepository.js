/**
 * server/repositories/itemRepository.js
 * 문항 요청 및 결과 데이터 Repository
 */

const BaseRepository = require('./baseRepository');

class ItemRequestRepository extends BaseRepository {
  constructor() {
    super('item_requests');
  }

  /**
   * request_id로 조회
   */
  findByRequestId(requestId) {
    return this.findOneWhere({ request_id: requestId });
  }

  /**
   * 상태별 조회
   */
  findByStatus(status, options = {}) {
    return this.findWhere({ status }, {
      orderBy: 'created_at',
      order: 'DESC',
      ...options
    });
  }

  /**
   * 세트별 조회
   */
  findBySetId(setId) {
    return this.findWhere({ set_id: setId }, { orderBy: 'item_no' });
  }

  /**
   * PENDING 상태 (세트 제외)
   */
  findPendingNonSet() {
    const sql = `
      SELECT * FROM item_requests
      WHERE status = 'PENDING' AND (set_id IS NULL OR set_id = '')
      ORDER BY created_at ASC
    `;
    return this.query(sql);
  }

  /**
   * 요청과 관련 데이터 함께 조회
   */
  findWithDetails(requestId) {
    const request = this.findByRequestId(requestId);
    if (!request) return null;

    const results = this.query(
      'SELECT * FROM item_json WHERE request_id = ?',
      [requestId]
    );

    const output = this.queryOne(
      'SELECT * FROM item_output WHERE request_id = ?',
      [requestId]
    );

    const metrics = this.queryOne(
      'SELECT * FROM item_metrics WHERE request_id = ?',
      [requestId]
    );

    return { request, results, output, metrics };
  }

  /**
   * 상태 업데이트
   */
  updateStatus(requestId, status) {
    const sql = `
      UPDATE item_requests
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE request_id = ?
    `;
    return this.execute(sql, [status, requestId]);
  }

  /**
   * 요청 삭제 (관련 데이터 포함)
   */
  deleteWithRelated(requestId) {
    return this.transaction(() => {
      this.execute('DELETE FROM item_json WHERE request_id = ?', [requestId]);
      this.execute('DELETE FROM item_output WHERE request_id = ?', [requestId]);
      this.execute('DELETE FROM item_metrics WHERE request_id = ?', [requestId]);
      return this.delete(requestId, 'request_id');
    });
  }

  /**
   * 프롬프트별 통계
   */
  getStatsByPromptId(promptId) {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'OK' THEN 1 ELSE 0 END) as ok_count,
        SUM(CASE WHEN status = 'FAIL' THEN 1 ELSE 0 END) as fail_count,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_count
      FROM item_requests
      WHERE prompt_id = ?
    `;
    return this.queryOne(sql, [promptId]);
  }

  /**
   * 전체 통계
   */
  getOverallStats() {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'OK' THEN 1 ELSE 0 END) as ok_count,
        SUM(CASE WHEN status = 'FAIL' THEN 1 ELSE 0 END) as fail_count,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) as running_count
      FROM item_requests
    `;
    return this.queryOne(sql);
  }
}

class ItemJsonRepository extends BaseRepository {
  constructor() {
    super('item_json');
  }

  findByRequestId(requestId) {
    return this.findWhere({ request_id: requestId });
  }
}

class ItemOutputRepository extends BaseRepository {
  constructor() {
    super('item_output');
  }

  findByRequestId(requestId) {
    return this.findOneWhere({ request_id: requestId });
  }

  /**
   * 최근 생성된 문항 조회
   */
  findRecent(limit = 10) {
    const sql = `
      SELECT o.*, r.item_no, r.status
      FROM item_output o
      LEFT JOIN item_requests r ON o.request_id = r.request_id
      ORDER BY o.created_at DESC
      LIMIT ?
    `;
    return this.query(sql, [limit]);
  }
}

module.exports = {
  itemRequestRepository: new ItemRequestRepository(),
  itemJsonRepository: new ItemJsonRepository(),
  itemOutputRepository: new ItemOutputRepository()
};
