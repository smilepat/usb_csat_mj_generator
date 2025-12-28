/** validator_chart.gs
 * RC25 도표 문항 검증 + CHART_DB 읽기
 */

/**
 * CHART_DB에서 CHART_ID에 해당하는 RAW_DATA_JSON 읽기
 */
function getChartData(chartId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.CHART_DB);
  if (!sheet) return {};

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(chartId)) {
      const raw = values[i][2];
      if (!raw) return {};
      try {
        return JSON.parse(raw);
      } catch (e) {
        return {};
      }
    }
  }
  return {};
}

/**
 * 현재는 기본 형식만 검사하는 placeholder 버전
 * 추후 실제 수치 비교 로직으로 고도화 가능
 */
function validateChartItem(itemObj, chartData) {
  const logs = [];
  let pass = true;

  if (!chartData || Object.keys(chartData).length === 0) {
    logs.push("chartData가 비어 있음(경고)");
  } else {
    logs.push("chartData 존재");
  }

  if (!Array.isArray(itemObj.options) || itemObj.options.length !== 5) {
    pass = false;
    logs.push("도표 문항: options 길이 5 아님");
  }

  // 지금은 세부 수치 비교 없이 PASS로 처리
  if (pass && logs.length === 0) logs.push("OK");

  return { pass, log: logs.join("; ") };
}
