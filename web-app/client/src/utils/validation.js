/**
 * client/src/utils/validation.js
 * 클라이언트 측 폼 유효성 검사 유틸리티
 */

/**
 * 문항 생성 폼 유효성 검사 규칙
 */
export const VALIDATION_RULES = {
  // 지문 최소/최대 길이 (단어 수)
  passage: {
    minWords: 50,
    maxWords: 500,
    minChars: 200,
    maxChars: 3000
  },
  // 주제 길이 제한
  topic: {
    minLength: 2,
    maxLength: 100
  },
  // 추가 메모 길이 제한
  extra: {
    maxLength: 500
  },
  // 차트 ID 형식
  chartId: {
    pattern: /^[a-zA-Z0-9_-]+$/
  }
};

/**
 * LC 문항 번호 범위 (1-17)
 */
export const LC_ITEM_RANGE = { min: 1, max: 17 };

/**
 * RC 문항 번호 범위 (18-45)
 */
export const RC_ITEM_RANGE = { min: 18, max: 45 };

/**
 * 세트 문항 패턴
 */
export const SET_PATTERNS = ['16-17', '41-42', '43-45'];

/**
 * 단어 수 계산
 * @param {string} text - 텍스트
 * @returns {number} 단어 수
 */
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * 영어 텍스트인지 확인
 * @param {string} text - 텍스트
 * @returns {boolean}
 */
export function isEnglishText(text) {
  if (!text) return false;
  const englishPattern = /[a-zA-Z]/g;
  const matches = text.match(englishPattern) || [];
  return matches.length > text.length * 0.5;
}

/**
 * 문항 번호가 LC 문항인지 확인
 * @param {number|string} itemNo - 문항 번호
 * @returns {boolean}
 */
export function isLCItem(itemNo) {
  if (typeof itemNo === 'string' && itemNo.includes('-')) {
    const first = parseInt(itemNo.split('-')[0]);
    return first >= LC_ITEM_RANGE.min && first <= LC_ITEM_RANGE.max;
  }
  const num = parseInt(itemNo, 10);
  return num >= LC_ITEM_RANGE.min && num <= LC_ITEM_RANGE.max;
}

/**
 * 문항 번호가 RC 문항인지 확인
 * @param {number|string} itemNo - 문항 번호
 * @returns {boolean}
 */
export function isRCItem(itemNo) {
  if (typeof itemNo === 'string' && itemNo.includes('-')) {
    const first = parseInt(itemNo.split('-')[0]);
    return first >= RC_ITEM_RANGE.min && first <= RC_ITEM_RANGE.max;
  }
  const num = parseInt(itemNo, 10);
  return num >= RC_ITEM_RANGE.min && num <= RC_ITEM_RANGE.max;
}

/**
 * 세트 문항인지 확인
 * @param {string} itemNo - 문항 번호
 * @returns {boolean}
 */
export function isSetItem(itemNo) {
  return SET_PATTERNS.includes(String(itemNo));
}

/**
 * 지문 검증
 * @param {string} passage - 지문 텍스트
 * @param {number|string} itemNo - 문항 번호
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validatePassage(passage, itemNo) {
  const errors = [];
  const warnings = [];

  // 지문이 비어있으면 AI가 생성하므로 OK
  if (!passage || !passage.trim()) {
    return { valid: true, errors: [], warnings: ['지문이 비어있어 AI가 자동 생성합니다.'] };
  }

  const wordCount = countWords(passage);
  const charCount = passage.length;

  // 최소 글자 수 검사
  if (charCount < VALIDATION_RULES.passage.minChars) {
    errors.push(`지문이 너무 짧습니다. (${charCount}자, 최소 ${VALIDATION_RULES.passage.minChars}자 필요)`);
  }

  // 최대 글자 수 검사
  if (charCount > VALIDATION_RULES.passage.maxChars) {
    errors.push(`지문이 너무 깁니다. (${charCount}자, 최대 ${VALIDATION_RULES.passage.maxChars}자 이하)`);
  }

  // 최소 단어 수 검사
  if (wordCount < VALIDATION_RULES.passage.minWords) {
    warnings.push(`지문 단어 수가 적습니다. (${wordCount}단어, 권장 ${VALIDATION_RULES.passage.minWords}단어 이상)`);
  }

  // 최대 단어 수 검사
  if (wordCount > VALIDATION_RULES.passage.maxWords) {
    warnings.push(`지문 단어 수가 많습니다. (${wordCount}단어, 권장 ${VALIDATION_RULES.passage.maxWords}단어 이하)`);
  }

  // 영어 텍스트 검사 (RC 문항의 경우)
  if (isRCItem(itemNo) && !isEnglishText(passage)) {
    warnings.push('지문이 주로 영어가 아닙니다. 수능 영어 문항은 영어 지문이 필요합니다.');
  }

  // RC29 어법 문항: 밑줄 검사
  if (String(itemNo) === '29') {
    const underlineCount = (passage.match(/<u>|<\/u>|\[_\d_\]|①|②|③|④|⑤/g) || []).length;
    if (passage.trim() && underlineCount === 0) {
      warnings.push('RC29(어법) 문항은 5개의 밑줄 표시가 필요합니다. 밑줄이 없으면 AI가 추가합니다.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 주제 검증
 * @param {string} topic - 주제
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateTopic(topic) {
  const errors = [];
  const warnings = [];

  if (!topic || !topic.trim()) {
    return { valid: true, errors: [], warnings: [] };
  }

  if (topic.length < VALIDATION_RULES.topic.minLength) {
    errors.push(`주제가 너무 짧습니다. (최소 ${VALIDATION_RULES.topic.minLength}자 필요)`);
  }

  if (topic.length > VALIDATION_RULES.topic.maxLength) {
    errors.push(`주제가 너무 깁니다. (최대 ${VALIDATION_RULES.topic.maxLength}자 이하)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 추가 메모 검증
 * @param {string} extra - 추가 메모
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateExtra(extra) {
  const errors = [];
  const warnings = [];

  if (!extra || !extra.trim()) {
    return { valid: true, errors: [], warnings: [] };
  }

  if (extra.length > VALIDATION_RULES.extra.maxLength) {
    errors.push(`추가 메모가 너무 깁니다. (최대 ${VALIDATION_RULES.extra.maxLength}자 이하)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 차트 ID 검증
 * @param {string} chartId - 차트 ID
 * @param {number|string} itemNo - 문항 번호
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateChartId(chartId, itemNo) {
  const errors = [];
  const warnings = [];

  // RC25(도표)인 경우에만 차트 ID 필요
  if (String(itemNo) === '25') {
    if (!chartId || !chartId.trim()) {
      warnings.push('RC25(도표) 문항은 차트 ID가 권장됩니다. 없으면 AI가 가상 데이터를 생성합니다.');
    } else if (!VALIDATION_RULES.chartId.pattern.test(chartId)) {
      errors.push('차트 ID는 영문, 숫자, 밑줄, 하이픈만 사용 가능합니다.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 전체 폼 검증
 * @param {Object} formData - 폼 데이터
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateForm(formData) {
  const allErrors = [];
  const allWarnings = [];

  const { item_no, passage, topic, extra, chart_id } = formData;

  // 문항 번호 검증
  if (!item_no) {
    allErrors.push('문항 유형을 선택해주세요.');
  }

  // 지문 검증
  const passageResult = validatePassage(passage, item_no);
  allErrors.push(...passageResult.errors);
  allWarnings.push(...passageResult.warnings);

  // 주제 검증
  const topicResult = validateTopic(topic);
  allErrors.push(...topicResult.errors);
  allWarnings.push(...topicResult.warnings);

  // 추가 메모 검증
  const extraResult = validateExtra(extra);
  allErrors.push(...extraResult.errors);
  allWarnings.push(...extraResult.warnings);

  // 차트 ID 검증
  const chartResult = validateChartId(chart_id, item_no);
  allErrors.push(...chartResult.errors);
  allWarnings.push(...chartResult.warnings);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * XSS 방지를 위한 HTML 이스케이프
 * @param {string} text - 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
export function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * SQL 인젝션 방지를 위한 위험 문자 확인
 * @param {string} text - 텍스트
 * @returns {boolean} 위험 문자 포함 여부
 */
export function hasSqlInjectionRisk(text) {
  if (!text) return false;
  const dangerousPatterns = [
    /--/,           // SQL 주석
    /;.*(?:DROP|DELETE|INSERT|UPDATE|SELECT)/i,
    /'\s*OR\s*'1'\s*=\s*'1/i,
    /UNION\s+SELECT/i
  ];
  return dangerousPatterns.some(pattern => pattern.test(text));
}
