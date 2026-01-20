/**
 * server/services/configService.js
 * 설정 관리 서비스
 */

const { getDb } = require('../db/database');

/**
 * 모든 설정 값 가져오기
 * @returns {Object} 설정 객체
 */
function getConfig() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM config').all();

  const config = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }

  // 환경 변수에서 설정 가져오기
  if (process.env.PROVIDER) {
    config.PROVIDER = process.env.PROVIDER;
  }
  if (process.env.GEMINI_API_KEY) {
    config.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  }
  if (process.env.OPENAI_API_KEY) {
    config.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  }

  // Azure OpenAI 환경 변수
  if (process.env.AZURE_OPENAI_ENDPOINT) {
    config.AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
  }
  if (process.env.AZURE_OPENAI_API_KEY) {
    config.AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
  }
  if (process.env.AZURE_OPENAI_DEPLOYMENT) {
    config.AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT;
  }
  if (process.env.AZURE_OPENAI_API_VERSION) {
    config.AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION;
  }

  return config;
}

/**
 * 설정 값 업데이트
 * @param {string} key - 설정 키
 * @param {string} value - 설정 값
 */
function setConfig(key, value) {
  const db = getDb();
  // SQL.js 호환: INSERT OR REPLACE 사용
  db.prepare(`
    INSERT OR REPLACE INTO config (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
  `).run(key, value);
}

/**
 * 로그 레벨 가져오기
 * @returns {string} 로그 레벨
 */
function getLogLevel() {
  const config = getConfig();
  const level = (config.LOG_LEVEL || 'INFO').toUpperCase();
  return ['INFO', 'WARN', 'ERROR'].includes(level) ? level : 'INFO';
}

module.exports = {
  getConfig,
  setConfig,
  getLogLevel
};
