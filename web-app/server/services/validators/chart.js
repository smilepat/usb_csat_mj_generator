/**
 * server/services/validators/chart.js
 * RC25 도표 문항 검증
 */

const { getDb } = require('../../db/database');

/**
 * CHART_DB에서 차트 데이터 읽기
 * @param {string} chartId - 차트 ID
 * @returns {Object}
 */
function getChartData(chartId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT raw_data_json FROM charts WHERE chart_id = ?
  `).get(chartId);

  if (!row || !row.raw_data_json) {
    return {};
  }

  try {
    return JSON.parse(row.raw_data_json);
  } catch (e) {
    return {};
  }
}

/**
 * RC25 도표 문항 검증
 * @param {Object} itemObj - 정규화된 문항 객체
 * @param {Object} chartData - 차트 데이터
 * @returns {{ pass: boolean, log: string }}
 */
function validateChartItem(itemObj, chartData) {
  const logs = [];
  let pass = true;

  if (!chartData || Object.keys(chartData).length === 0) {
    logs.push('chartData가 비어 있음(경고)');
  } else {
    logs.push('chartData 존재');
  }

  if (!Array.isArray(itemObj.options) || itemObj.options.length !== 5) {
    pass = false;
    logs.push('도표 문항: options 길이 5 아님');
  }

  // 추후 세부 수치 비교 로직 추가 가능
  if (pass && logs.length === 0) logs.push('OK');

  return { pass, log: logs.join('; ') };
}

module.exports = {
  getChartData,
  validateChartItem
};
