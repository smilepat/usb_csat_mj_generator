/**
 * server/services/validators/index.js
 * 검증기 모듈 통합 export
 */

const { validateCommon, getFieldMappings, FIELD_MAPPINGS } = require('./common');
const { 
  countUnderlinedSegments, 
  countUnderlinedSegmentsLegacy,
  validateGrammarItem,
  getSupportedFormats,
  UNDERLINE_FORMATS 
} = require('./grammar');
const { countBlanks, checkPassageDiffApprox, validateGapItem } = require('./gap');
const { getChartData, validateChartItem } = require('./chart');
const { ALLOWED_SET_PATTERNS, checkSetPattern, validateItemSet } = require('./set');
const {
  LC_ITEM_RULES,
  countSpeakerTurns,
  hasSpeakerMarkers,
  countWords,
  areOptionsEnglish,
  areOptionsNumeric,
  validateListeningItem,
  isListeningItem
} = require('./listening');

module.exports = {
  // Common
  validateCommon,
  getFieldMappings,
  FIELD_MAPPINGS,

  // Grammar (RC29)
  countUnderlinedSegments,
  countUnderlinedSegmentsLegacy,
  validateGrammarItem,
  getSupportedFormats,
  UNDERLINE_FORMATS,

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
  validateItemSet,

  // Listening (LC1-17)
  LC_ITEM_RULES,
  countSpeakerTurns,
  hasSpeakerMarkers,
  countWords,
  areOptionsEnglish,
  areOptionsNumeric,
  validateListeningItem,
  isListeningItem
};
