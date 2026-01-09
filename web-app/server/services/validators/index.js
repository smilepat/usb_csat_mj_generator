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
const {
  isMainlyEnglish,
  isMainlyKorean,
  validateLanguageMix,
  validatePassageLength,
  validateNoLLMMeta,
  validateOptionPatterns,
  validateOptionLength,
  validateNoticeElements,
  validateChartExpressions,
  validateOptionDuplication,
  validateNumericDistinction,
  validateGapOptionCompletion,
  calculatePassageAnswerOverlap,
  validateAnswerPassageOverlap,
  validateWeakDistractors,
  validateMultipleAnswerRisk,
  validateFormat,
  WORD_COUNT_RANGES,
  LLM_META_PATTERNS,
  OPTION_FORBIDDEN_PATTERNS,
  NOTICE_KEYWORDS,
  CHART_COMPARISON_KEYWORDS
} = require('./format');

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
  isListeningItem,

  // Format (형식 검증 - LLM 미사용)
  isMainlyEnglish,
  isMainlyKorean,
  validateLanguageMix,
  validatePassageLength,
  validateNoLLMMeta,
  validateOptionPatterns,
  validateOptionLength,
  validateNoticeElements,
  validateChartExpressions,
  validateOptionDuplication,
  validateNumericDistinction,
  validateFormat,
  WORD_COUNT_RANGES,
  LLM_META_PATTERNS,
  OPTION_FORBIDDEN_PATTERNS,
  NOTICE_KEYWORDS,
  CHART_COMPARISON_KEYWORDS,

  // 빈칸 문항 검증 (31-34번)
  validateGapOptionCompletion,

  // 정답 위험 신호 검사
  calculatePassageAnswerOverlap,
  validateAnswerPassageOverlap,
  validateWeakDistractors,
  validateMultipleAnswerRisk
};
