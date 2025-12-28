/**
 * server/services/logger.js
 * 통합 로깅 모듈
 */

const { getDb } = require('../db/database');
const { getLogLevel } = require('./configService');

const LOG_LEVELS = { INFO: 1, WARN: 2, ERROR: 3 };

/**
 * 로그 레벨에 따라 로깅 여부 결정
 * @param {string} level - 로그 레벨
 * @returns {boolean}
 */
function shouldLog(level) {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * 일반 로그 기록
 * @param {string} level - 로그 레벨
 * @param {string} tag - 태그
 * @param {string} requestId - 요청 ID
 * @param {string} message - 메시지
 */
function writeLogRow(level, tag, requestId, message) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO logs (level, tag, request_id, message)
      VALUES (?, ?, ?, ?)
    `).run(level, tag || '', requestId || '', message || '');
  } catch (e) {
    console.error('로그 기록 실패:', e);
  }
}

/**
 * 에러 로그 기록
 * @param {string} requestId - 요청 ID
 * @param {string} funcName - 함수명
 * @param {Error|string} error - 에러 객체
 */
function writeErrorRow(requestId, funcName, error) {
  try {
    const db = getDb();
    const msg = error && error.message ? error.message : String(error);
    const stack = error && error.stack ? error.stack : '';

    db.prepare(`
      INSERT INTO errors (request_id, func_name, message, stack)
      VALUES (?, ?, ?, ?)
    `).run(requestId || '', funcName || '', msg, stack);
  } catch (e) {
    console.error('에러 로그 기록 실패:', e);
  }
}

/**
 * INFO 레벨 로그
 */
function info(tag, requestId, message) {
  if (!shouldLog('INFO')) return;
  console.log(`[INFO] ${tag}: ${message}`);
  writeLogRow('INFO', tag, requestId, message);
}

/**
 * WARN 레벨 로그
 */
function warn(tag, requestId, message) {
  if (!shouldLog('WARN')) return;
  console.warn(`[WARN] ${tag}: ${message}`);
  writeLogRow('WARN', tag, requestId, message);
}

/**
 * ERROR 레벨 로그
 */
function error(tag, requestId, err) {
  if (!shouldLog('ERROR')) return;
  const msg = err && err.message ? err.message : String(err);
  console.error(`[ERROR] ${tag}: ${msg}`);
  writeLogRow('ERROR', tag, requestId, msg);
  writeErrorRow(requestId, tag, err);
}

module.exports = {
  info,
  warn,
  error
};
