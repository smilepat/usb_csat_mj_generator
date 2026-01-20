/**
 * server/repositories/promptRepository.js
 * 프롬프트 데이터 Repository
 */

const BaseRepository = require('./baseRepository');

class PromptRepository extends BaseRepository {
  constructor() {
    super('prompts');
  }

  /**
   * prompt_key로 조회
   */
  findByKey(promptKey) {
    return this.findOneWhere({ prompt_key: promptKey });
  }

  /**
   * 활성화된 프롬프트만 조회
   */
  findActive() {
    return this.findWhere({ active: 1 }, { orderBy: 'prompt_key' });
  }

  /**
   * 프롬프트와 메트릭스 함께 조회
   */
  findAllWithMetrics() {
    const sql = `
      SELECT p.*, pm.total_score, pm.grade, pm.total_items, pm.approve_rate
      FROM prompts p
      LEFT JOIN prompt_metrics pm ON p.id = pm.prompt_id
      ORDER BY p.prompt_key
    `;
    return this.query(sql);
  }

  /**
   * prompt_key로 업데이트
   */
  updateByKey(promptKey, data) {
    return this.update(promptKey, data, 'prompt_key');
  }

  /**
   * prompt_key로 삭제
   */
  deleteByKey(promptKey) {
    return this.delete(promptKey, 'prompt_key');
  }

  /**
   * 버전 히스토리 조회
   */
  getVersions(promptId) {
    const sql = `
      SELECT * FROM prompt_versions
      WHERE prompt_id = ?
      ORDER BY version DESC
    `;
    return this.query(sql, [promptId]);
  }

  /**
   * 새 버전 저장
   */
  saveVersion(promptId, version, promptText, changeLog = '') {
    const sql = `
      INSERT INTO prompt_versions (prompt_id, version, prompt_text, change_log)
      VALUES (?, ?, ?, ?)
    `;
    return this.execute(sql, [promptId, version, promptText, changeLog]);
  }

  /**
   * 특정 버전 조회
   */
  getVersion(promptId, version) {
    const sql = `
      SELECT * FROM prompt_versions
      WHERE prompt_id = ? AND version = ?
    `;
    return this.queryOne(sql, [promptId, version]);
  }

  /**
   * 마스터 프롬프트 조회
   */
  getMasterPrompt() {
    return this.findByKey('MASTER_PROMPT');
  }

  /**
   * 지문 생성 마스터 프롬프트 조회
   */
  getPassageMasterPrompt() {
    return this.findByKey('PASSAGE_MASTER');
  }
}

module.exports = new PromptRepository();
