/**
 * server/services/validators/index.js
 * 검증기 모듈 통합 export
 */

const { validateCommon } = require('./common');
const { countUnderlinedSegments, validateGrammarItem } = require('./grammar');
const { countBlanks, checkPassageDiffApprox, validateGapItem } = require('./gap');
const { getChartData, validateChartItem } = require('./chart');
const { ALLOWED_SET_PATTERNS, checkSetPattern, validateItemSet } = require('./set');

module.exports = {
  // Common
  validateCommon,

  // Grammar (RC29)
  countUnderlinedSegments,
  validateGrammarItem,

  // Gap (RC31-33)
  countBlanks,
  checkPassageDiffApprox,
  validateGapItem,

  // Chart (RC25)
  getChartData,
  validateChartItem,

  // Set (16-17, 41-42, 43-45)
  ALLOWED_SET_PATTERNS,
  checkSetPattern,
  validateItemSet
};
