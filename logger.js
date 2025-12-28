/**
 * logger.gs
 * ----------------------------------------
 * KSAT 문항 생성 · 검증 시스템 통합 로깅 모듈
 *
 * 기능:
 *  - logInfo()
 *  - logWarn()
 *  - logError()
 *  - 내부 writeLogRow()
 *  - 내부 writeErrorRow()
 *
 * 시트:
 *  - LOG (일반 로그)
 *  - ERROR (예외/오류)
 *
 * CONFIG:
 *  - LOG_LEVEL = "INFO" / "WARN" / "ERROR"
 */


/**
 * CONFIG 시트에서 LOG_LEVEL을 가져옴
 */
function getLogLevel_() {
  try {
    const cfg = getConfig(); // config.gs의 getConfig()
    const level = (cfg["LOG_LEVEL"] || "INFO").toUpperCase();
    return ["INFO", "WARN", "ERROR"].includes(level) ? level : "INFO";
  } catch (e) {
    return "INFO"; // config 오류 시 INFO 기본값
  }
}


/**
 * 로그 레벨 우선순위 비교
 */
function shouldLog_(level) {
  const order = { "INFO": 1, "WARN": 2, "ERROR": 3 };
  const current = getLogLevel_();
  return order[level] >= order[current];
}


/**
 * 공통 로그 기록
 * LOG 시트에 일반 기록 남김
 */
function writeLogRow_(level, tag, requestId, message) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.LOG);
  if (!sheet) return;

  const ts = new Date();

  sheet.appendRow([
    ts,
    level,
    tag || "",
    requestId || "",
    message || ""
  ]);
}


/**
 * 오류 로그 기록
 * ERROR 시트에 상세 오류 기록 남김
 */
function writeErrorRow_(requestId, funcName, error) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.ERROR);
  if (!sheet) return;

  const ts = new Date();
  const msg = error && error.message ? error.message : String(error);
  const stack = error && error.stack ? error.stack : "";

  sheet.appendRow([
    ts,
    requestId || "",
    funcName || "",
    msg,
    stack
  ]);
}


/**
 * INFO 레벨 로그
 * @param {string} tag
 * @param {string} requestId
 * @param {string} message
 */
function logInfo(tag, requestId, message) {
  if (!shouldLog_("INFO")) return;
  writeLogRow_("INFO", tag, requestId, message);
}


/**
 * WARN 레벨 로그
 * @param {string} tag
 * @param {string} requestId
 * @param {string} message
 */
function logWarn(tag, requestId, message) {
  if (!shouldLog_("WARN")) return;
  writeLogRow_("WARN", tag, requestId, message);
}


/**
 * ERROR 레벨 로그
 * @param {string} tag
 * @param {string} requestId
 * @param {string|Error} error
 */
function logError(tag, requestId, error) {
  if (!shouldLog_("ERROR")) return;

  // 일반 LOG 시트에도 기록
  const msg = error && error.message ? error.message : String(error);
  writeLogRow_("ERROR", tag, requestId, msg);

  // 상세 내용은 ERROR 시트에 별도 기록
  writeErrorRow_(requestId, tag, error);
}
function touchUpdatedAt_(row) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.ITEM_REQUEST);
  const now = new Date();
  sh.getRange(row, 7).setValue(now); // CREATED_AT
  sh.getRange(row, 8).setValue(now); // UPDATED_AT
}
