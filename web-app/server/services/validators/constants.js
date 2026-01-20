/**
 * server/services/validators/constants.js
 * 검증에 사용되는 모든 상수를 한 곳에서 관리
 */

// 문항 번호 범위
const ITEM_NUMBER_RANGES = {
  LISTENING: { min: 1, max: 17 },      // 듣기평가
  READING: { min: 18, max: 45 },        // 독해
  GRAMMAR: [29],                        // 어법성 판단
  GAP: [31, 32, 33, 34],               // 빈칸 추론
  CHART: [25],                         // 도표
  SET: ['16-17', '41-42', '43-45']     // 세트 문항
};

// 정답 범위
const ANSWER_RANGE = {
  MIN: 1,
  MAX: 5
};

// 선택지 개수
const OPTIONS_COUNT = 5;

// 지문 단어 수 범위 (문항 유형별)
const WORD_COUNT_RANGES = {
  DEFAULT: { min: 100, max: 300 },
  LISTENING: { min: 50, max: 200 },
  READING_SHORT: { min: 80, max: 180 },   // 18-24번
  READING_MEDIUM: { min: 120, max: 250 }, // 25-34번
  READING_LONG: { min: 150, max: 350 },   // 35-45번
  CHART: { min: 30, max: 100 }            // 도표 문항
};

// 선택지 길이 제한 (문자 수)
const OPTION_LENGTH_LIMITS = {
  MIN: 1,
  MAX: 200,
  WARNING_THRESHOLD: 150
};

// LLM 메타 출력 패턴 (걸러내야 할 패턴)
const LLM_META_PATTERNS = [
  /^여기[\s는]?/i,
  /^다음[\s은]?/i,
  /^Here\s+(is|are)/i,
  /^The\s+(following|answer)/i,
  /^\[?(문항|예시|정답)\]?/i,
  /^JSON:/i,
  /^Output:/i,
  /^Result:/i,
  /^```/,
  /^---/
];

// 선택지에 사용하면 안 되는 패턴
const OPTION_FORBIDDEN_PATTERNS = [
  /^정답/i,
  /^correct/i,
  /^answer/i,
  /없음/,
  /해당\s*없/,
  /모두\s*정답/,
  /all\s*(of\s*)?the\s*above/i,
  /none\s*(of\s*)?the\s*above/i
];

// 공지/광고 키워드 (notice 문항 감지)
const NOTICE_KEYWORDS = [
  'notice', 'announcement', 'attention', 'important',
  'event', 'sale', 'discount', 'offer', 'limited',
  'register', 'sign up', 'deadline', 'application'
];

// 도표 비교 키워드
const CHART_COMPARISON_KEYWORDS = [
  'increase', 'decrease', 'rise', 'fall', 'grow',
  'decline', 'highest', 'lowest', 'more than', 'less than',
  'greater', 'smaller', 'difference', 'percent', '%'
];

// 밑줄 표시 형식 (어법 문항)
const UNDERLINE_FORMATS = {
  SQUARE_BRACKETS_NUMBER: /\[(\d)\]\s*([^\[]+)/g,  // [1] word
  PARENTHESES_CIRCLED: /([①②③④⑤])\s*([^①②③④⑤]+)/g,  // ① word
  UNDERLINE_TAG: /<u>([^<]+)<\/u>/g,  // <u>word</u>
  ASTERISKS: /\*{1,2}([^*]+)\*{1,2}/g  // *word* or **word**
};

// 빈칸 형식
const BLANK_PATTERNS = [
  /_{3,}/g,           // ___
  /\(\s*\)/g,         // ( )
  /\[\s*\]/g,         // [ ]
  /\(\s*[A-E]\s*\)/g, // (A), (B), etc.
  /\[\s*[A-E]\s*\]/g  // [A], [B], etc.
];

// 세트 문항 패턴
const ALLOWED_SET_PATTERNS = [
  '16-17',
  '41-42',
  '43-45'
];

// 듣기평가 문항별 규칙
const LC_ITEM_RULES = {
  // 대화 응답 문항 (1-2)
  1: { type: 'response', minTurns: 2, maxTurns: 4, optionType: 'english' },
  2: { type: 'response', minTurns: 2, maxTurns: 4, optionType: 'english' },

  // 담화/대화 목적 (3-4)
  3: { type: 'purpose', minTurns: 1, optionType: 'korean' },
  4: { type: 'purpose', minTurns: 2, optionType: 'korean' },

  // 의견/주장 (5-6)
  5: { type: 'opinion', minTurns: 1, optionType: 'korean' },
  6: { type: 'claim', minTurns: 1, optionType: 'korean' },

  // 관계/장소 (7-8)
  7: { type: 'relation', optionType: 'korean' },
  8: { type: 'place', optionType: 'korean' },

  // 이유/언급 (9-10)
  9: { type: 'reason', optionType: 'korean' },
  10: { type: 'mention', optionType: 'korean' },

  // 도표/내용일치 (11-12)
  11: { type: 'chart', optionType: 'numeric' },
  12: { type: 'match', optionType: 'korean' },

  // 실용문 (13-15)
  13: { type: 'practical', optionType: 'korean' },
  14: { type: 'practical', optionType: 'korean' },
  15: { type: 'practical', optionType: 'korean' },

  // 세트 문항 (16-17)
  16: { type: 'set', optionType: 'mixed' },
  17: { type: 'set', optionType: 'mixed' }
};

// 검증 결과 상태
const VALIDATION_STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  WARNING: 'WARNING'
};

// 검증 레이어
const VALIDATION_LAYERS = {
  STRUCTURE: { name: '구조 검증', weight: 0.4 },
  CONTENT: { name: '내용 검증', weight: 0.25 },
  CSAT: { name: '수능 적합성', weight: 0.35 }
};

// 등급 기준
const GRADE_THRESHOLDS = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
  F: 0
};

module.exports = {
  ITEM_NUMBER_RANGES,
  ANSWER_RANGE,
  OPTIONS_COUNT,
  WORD_COUNT_RANGES,
  OPTION_LENGTH_LIMITS,
  LLM_META_PATTERNS,
  OPTION_FORBIDDEN_PATTERNS,
  NOTICE_KEYWORDS,
  CHART_COMPARISON_KEYWORDS,
  UNDERLINE_FORMATS,
  BLANK_PATTERNS,
  ALLOWED_SET_PATTERNS,
  LC_ITEM_RULES,
  VALIDATION_STATUS,
  VALIDATION_LAYERS,
  GRADE_THRESHOLDS
};
