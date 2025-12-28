/** config.gs
 * 시트 이름 상수 & CONFIG 로더
 */

const SHEET = {
  CONFIG: "CONFIG",
  PROMPT_DB: "PROMPT_DB",
  ITEM_REQUEST: "ITEM_REQUEST",
  ITEM_JSON: "ITEM_JSON",
  ITEM_OUTPUT: "ITEM_OUTPUT",
  CHART_DB: "CHART_DB",
  ITEM_SET: "ITEM_SET",
  LOG: "LOG",
  ERROR: "ERROR"
};

function getConfig() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SHEET.CONFIG);
  const obj = {};

  if (sheet) {
    const values = sheet.getDataRange().getValues(); // [ [KEY, VALUE], ... ]
    for (let i = 1; i < values.length; i++) { // 1행은 헤더
      const key = String(values[i][0] || "").trim();
      const val = values[i][1];
      if (key) obj[key] = val;
    }
  }

  // Script Properties에 저장된 API KEY들
  const props = PropertiesService.getScriptProperties();
  const geminiKey = props.getProperty("GEMINI_API_KEY");
  const openaiKey = props.getProperty("OPENAI_API_KEY");
  const legacyKey = props.getProperty("LLM_API_KEY"); // 이전 호환용

  if (geminiKey) obj["GEMINI_API_KEY"] = geminiKey;
  if (openaiKey) obj["OPENAI_API_KEY"] = openaiKey;
  if (legacyKey) obj["LLM_API_KEY"] = legacyKey;       // 필요하면 fallback 용으로 사용

  return obj;
}
