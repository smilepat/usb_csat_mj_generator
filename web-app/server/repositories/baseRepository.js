/**
 * server/repositories/baseRepository.js
 * 기본 Repository 클래스 - 데이터베이스 추상화 레이어
 */

const { getDb } = require('../db/database');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  get db() {
    return getDb();
  }

  /**
   * ID로 단일 레코드 조회
   */
  findById(id, idColumn = 'id') {
    const query = `SELECT * FROM ${this.tableName} WHERE ${idColumn} = ?`;
    return this.db.prepare(query).get(id);
  }

  /**
   * 모든 레코드 조회
   */
  findAll(options = {}) {
    const { orderBy = 'id', order = 'ASC', limit, offset } = options;
    let query = `SELECT * FROM ${this.tableName} ORDER BY ${orderBy} ${order}`;

    const params = [];
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
      if (offset) {
        query += ' OFFSET ?';
        params.push(offset);
      }
    }

    return this.db.prepare(query).all(...params);
  }

  /**
   * 조건으로 조회
   */
  findWhere(conditions, options = {}) {
    const { orderBy, order = 'ASC', limit, offset } = options;

    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');

    let query = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`;

    if (orderBy) {
      query += ` ORDER BY ${orderBy} ${order}`;
    }

    const params = Object.values(conditions);

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
      if (offset) {
        query += ' OFFSET ?';
        params.push(offset);
      }
    }

    return this.db.prepare(query).all(...params);
  }

  /**
   * 단일 조건 조회
   */
  findOneWhere(conditions) {
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');

    const query = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`;
    return this.db.prepare(query).get(...Object.values(conditions));
  }

  /**
   * 레코드 생성
   */
  create(data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;

    const result = this.db.prepare(query).run(...Object.values(data));
    return {
      id: result.lastInsertRowid,
      changes: result.changes,
      ...data
    };
  }

  /**
   * 레코드 업데이트
   */
  update(id, data, idColumn = 'id') {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');

    const query = `UPDATE ${this.tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${idColumn} = ?`;
    const result = this.db.prepare(query).run(...Object.values(data), id);

    return {
      changes: result.changes,
      success: result.changes > 0
    };
  }

  /**
   * 레코드 삭제
   */
  delete(id, idColumn = 'id') {
    const query = `DELETE FROM ${this.tableName} WHERE ${idColumn} = ?`;
    const result = this.db.prepare(query).run(id);

    return {
      changes: result.changes,
      success: result.changes > 0
    };
  }

  /**
   * 총 개수 조회
   */
  count(conditions = null) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];

    if (conditions) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }

    return this.db.prepare(query).get(...params).count;
  }

  /**
   * 존재 여부 확인
   */
  exists(conditions) {
    return this.count(conditions) > 0;
  }

  /**
   * 트랜잭션 실행
   */
  transaction(callback) {
    const transaction = this.db.transaction(callback);
    return transaction();
  }

  /**
   * 커스텀 쿼리 실행
   */
  query(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  /**
   * 커스텀 쿼리 실행 (단일 결과)
   */
  queryOne(sql, params = []) {
    return this.db.prepare(sql).get(...params);
  }

  /**
   * 커스텀 쿼리 실행 (변경)
   */
  execute(sql, params = []) {
    return this.db.prepare(sql).run(...params);
  }
}

module.exports = BaseRepository;
