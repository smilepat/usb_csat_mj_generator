/**
 * server/services/validators/format.js
 * 형식 검증기 - LLM 미사용 규칙/형식 검사
 *
 * 체크리스트:
 * A. 입력/출력 형식 검사
 * B. 길이/구조 검사
 * C. 금지 패턴 검사
 * D. 문항번호별 필수 요소 검사
 * E. 정답 중복 위험 검사
 */

// ============================================
// A. 언어 혼합 규칙 검사
// ============================================

/**
 * 텍스트가 주로 영어인지 판단
 * @param {string} text
 * @returns {boolean}
 */
function isMainlyEnglish(text) {
  if (!text || typeof text !== 'string') return false;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  return englishChars > koreanChars;
}

/**
 * 텍스트가 주로 한국어인지 판단
 * @param {string} text
 * @returns {boolean}
 */
function isMainlyKorean(text) {
  if (!text || typeof text !== 'string') return false;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  return koreanChars > englishChars;
}

/**
 * 언어 혼합 규칙 검사
 * - 지문이 영어면 선택지도 영어 (또는 일관성 유지)
 * - 특정 문항은 한국어 선택지 허용 (주제 찾기 등)
 * @param {Object} itemObj
 * @param {number} itemNo
 * @returns {{ pass: boolean, warnings: string[] }}
 */
function validateLanguageMix(itemObj, itemNo) {
  const warnings = [];
  let pass = true;

  const passage = itemObj.passage || itemObj.stimulus || '';
  const options = itemObj.options || [];

  // 한국어 선택지가 허용되는 문항 (주제, 제목, 요지 등)
  const koreanOptionsAllowed = [20, 21, 22, 23, 24]; // RC 주제/제목/요지 문항

  const passageIsEnglish = isMainlyEnglish(passage);
  const optionsHaveKorean = options.some(opt => isMainlyKorean(String(opt || '')));

  if (passageIsEnglish && optionsHaveKorean && !koreanOptionsAllowed.includes(itemNo)) {
    warnings.push(`언어 혼합 경고: 지문은 영어인데 선택지에 한국어가 포함됨 (문항 ${itemNo})`);
  }

  return { pass, warnings };
}

// ============================================
// B. 길이/구조 검사
// ============================================

/**
 * 문항번호별 권장 단어 수 범위
 */
const WORD_COUNT_RANGES = {
  // RC 문항
  18: { min: 80, max: 180, name: '글의 목적' },
  19: { min: 80, max: 180, name: '심경 변화' },
  20: { min: 100, max: 200, name: '주장' },
  21: { min: 80, max: 180, name: '함축 의미' },
  22: { min: 100, max: 200, name: '요지' },
  23: { min: 100, max: 200, name: '주제' },
  24: { min: 100, max: 200, name: '제목' },
  25: { min: 80, max: 160, name: '도표' },
  26: { min: 100, max: 200, name: '내용 불일치(인물)' },
  27: { min: 100, max: 200, name: '내용 불일치(실용문)' },
  28: { min: 80, max: 160, name: '어법(밑줄 없음)' },
  29: { min: 120, max: 220, name: '어법(밑줄)' },
  30: { min: 120, max: 220, name: '어휘' },
  31: { min: 120, max: 220, name: '빈칸(구/절)' },
  32: { min: 130, max: 240, name: '빈칸(구/절)' },
  33: { min: 150, max: 260, name: '빈칸(문장)' },
  34: { min: 150, max: 260, name: '빈칸(문장)' },
  35: { min: 100, max: 200, name: '무관한 문장' },
  36: { min: 120, max: 220, name: '글의 순서' },
  37: { min: 120, max: 220, name: '글의 순서' },
  38: { min: 120, max: 220, name: '문장 삽입' },
  39: { min: 120, max: 220, name: '문장 삽입' },
  40: { min: 140, max: 240, name: '요약문' },
  41: { min: 200, max: 350, name: '장문(제목+순서)' },
  42: { min: 200, max: 350, name: '장문(제목+순서)' },
  43: { min: 250, max: 400, name: '장문 세트' },
  44: { min: 250, max: 400, name: '장문 세트' },
  45: { min: 250, max: 400, name: '장문 세트' }
};

/**
 * 단어 수 계산
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * 지문 길이 검사
 * @param {Object} itemObj
 * @param {number} itemNo
 * @returns {{ pass: boolean, warnings: string[], wordCount: number }}
 */
function validatePassageLength(itemObj, itemNo) {
  const warnings = [];
  let pass = true;

  const passage = itemObj.passage || itemObj.stimulus || itemObj.gapped_passage || '';
  const wordCount = countWords(passage);

  const range = WORD_COUNT_RANGES[itemNo];
  if (range) {
    if (wordCount < range.min) {
      warnings.push(`지문 길이 부족: ${wordCount}단어 (${range.name} 권장: ${range.min}-${range.max}단어)`);
    } else if (wordCount > range.max) {
      warnings.push(`지문 길이 초과: ${wordCount}단어 (${range.name} 권장: ${range.min}-${range.max}단어)`);
    }
  }

  return { pass, warnings, wordCount };
}

// ============================================
// C. 금지 패턴 검사 (LLM 출력 티 제거)
// ============================================

/**
 * LLM 메타 문장 패턴
 */
const LLM_META_PATTERNS = [
  /as an ai/i,
  /as a language model/i,
  /i cannot/i,
  /i can't/i,
  /i'm unable/i,
  /here is the answer/i,
  /here's the answer/i,
  /let me help you/i,
  /i'd be happy to/i,
  /certainly!/i,
  /sure!/i,
  /of course!/i,
  /here you go/i,
  /i hope this helps/i,
  /feel free to ask/i
];

/**
 * 선택지 금지 패턴
 */
const OPTION_FORBIDDEN_PATTERNS = [
  /all of the above/i,
  /none of the above/i,
  /both a and b/i,
  /a and b/i,
  /모두 맞다/,
  /모두 틀리다/,
  /위의 모든/,
  /해당 없음/
];

/**
 * LLM 메타 문장 검사
 * @param {Object} itemObj
 * @returns {{ pass: boolean, errors: string[] }}
 */
function validateNoLLMMeta(itemObj) {
  const errors = [];
  let pass = true;

  // 모든 텍스트 필드 검사
  const textsToCheck = [
    itemObj.passage,
    itemObj.stimulus,
    itemObj.question,
    itemObj.explanation,
    ...(itemObj.options || [])
  ].filter(Boolean).map(String);

  for (const text of textsToCheck) {
    for (const pattern of LLM_META_PATTERNS) {
      if (pattern.test(text)) {
        pass = false;
        errors.push(`LLM 메타 문장 발견: "${text.substring(0, 50)}..." (패턴: ${pattern})`);
        break;
      }
    }
  }

  return { pass, errors };
}

/**
 * 선택지 금지 패턴 검사
 * @param {Object} itemObj
 * @returns {{ pass: boolean, errors: string[] }}
 */
function validateOptionPatterns(itemObj) {
  const errors = [];
  let pass = true;

  const options = itemObj.options || [];

  for (let i = 0; i < options.length; i++) {
    const opt = String(options[i] || '');

    // 금지 패턴 검사
    for (const pattern of OPTION_FORBIDDEN_PATTERNS) {
      if (pattern.test(opt)) {
        pass = false;
        errors.push(`선택지 ${i + 1}에 금지 패턴: "${opt}" (수능 스타일 위반)`);
        break;
      }
    }
  }

  return { pass, errors };
}

/**
 * 선택지 길이 검사
 * @param {Object} itemObj
 * @returns {{ pass: boolean, warnings: string[] }}
 */
function validateOptionLength(itemObj) {
  const warnings = [];
  let pass = true;

  const options = itemObj.options || [];
  const MIN_WORDS = 2;
  const MAX_WORDS = 30;

  for (let i = 0; i < options.length; i++) {
    const opt = String(options[i] || '');
    const wordCount = countWords(opt);

    if (wordCount < MIN_WORDS && opt.trim().length > 0) {
      warnings.push(`선택지 ${i + 1} 너무 짧음: ${wordCount}단어 "${opt}"`);
    } else if (wordCount > MAX_WORDS) {
      warnings.push(`선택지 ${i + 1} 너무 김: ${wordCount}단어`);
    }
  }

  return { pass, warnings };
}

// ============================================
// D. 문항번호별 필수 요소 검사
// ============================================

/**
 * 안내문/공지문 필수 정보 키워드
 */
const NOTICE_KEYWORDS = {
  date: [/\d{1,2}\/\d{1,2}/, /\d{1,2}:\d{2}/, /january|february|march|april|may|june|july|august|september|october|november|december/i, /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i],
  time: [/\d{1,2}:\d{2}/, /a\.?m\.?|p\.?m\.?/i, /morning|afternoon|evening|night/i],
  location: [/room|hall|building|center|library|gym|auditorium|cafeteria|office/i],
  action: [/register|sign up|apply|submit|contact|call|email|visit|attend|bring/i]
};

/**
 * 도표 문항 비교 표현 키워드
 */
const CHART_COMPARISON_KEYWORDS = [
  /more than/i, /less than/i, /higher than/i, /lower than/i,
  /cheaper/i, /longer/i, /shorter/i, /faster/i, /slower/i,
  /at least/i, /at most/i, /no more than/i, /no less than/i,
  /increased/i, /decreased/i, /doubled/i, /tripled/i,
  /percent/i, /%/, /ratio/i, /proportion/i
];

/**
 * 안내문/공지문 필수 정보 검사 (문항 27번 등)
 * @param {Object} itemObj
 * @param {number} itemNo
 * @returns {{ pass: boolean, warnings: string[], foundElements: string[] }}
 */
function validateNoticeElements(itemObj, itemNo) {
  const warnings = [];
  const foundElements = [];
  let pass = true;

  // 안내문/공지문 문항 번호
  const noticeItems = [27];
  if (!noticeItems.includes(itemNo)) {
    return { pass, warnings, foundElements };
  }

  const passage = itemObj.passage || itemObj.stimulus || '';
  const MIN_ELEMENTS = 2;

  for (const [element, patterns] of Object.entries(NOTICE_KEYWORDS)) {
    const found = patterns.some(p => p.test(passage));
    if (found) {
      foundElements.push(element);
    }
  }

  if (foundElements.length < MIN_ELEMENTS) {
    warnings.push(`안내문 필수 정보 부족: ${foundElements.length}개 발견 (날짜/시간/장소/행동요구 중 ${MIN_ELEMENTS}개 이상 권장)`);
  }

  return { pass, warnings, foundElements };
}

/**
 * 도표 문항 비교 표현 검사 (문항 25번)
 * @param {Object} itemObj
 * @param {number} itemNo
 * @returns {{ pass: boolean, warnings: string[] }}
 */
function validateChartExpressions(itemObj, itemNo) {
  const warnings = [];
  let pass = true;

  if (itemNo !== 25) {
    return { pass, warnings };
  }

  const options = itemObj.options || [];
  let comparisonCount = 0;

  for (const opt of options) {
    const optText = String(opt || '');
    const hasComparison = CHART_COMPARISON_KEYWORDS.some(p => p.test(optText));
    if (hasComparison) {
      comparisonCount++;
    }
  }

  if (comparisonCount < 3) {
    warnings.push(`도표 문항 비교 표현 부족: 선택지 중 ${comparisonCount}개만 비교/수치 표현 포함`);
  }

  return { pass, warnings };
}

// ============================================
// E. 빈칸 문항 선택지 문장 완성 검사 (31-34번)
// ============================================

/**
 * 빈칸 문항 선택지가 문장 완성 가능한지 검사
 * @param {Object} itemObj
 * @param {number} itemNo
 * @returns {{ pass: boolean, errors: string[], warnings: string[] }}
 */
function validateGapOptionCompletion(itemObj, itemNo) {
  const errors = [];
  const warnings = [];
  let pass = true;

  // 빈칸 문항 번호
  const gapItems = [31, 32, 33, 34];
  if (!gapItems.includes(itemNo)) {
    return { pass, errors, warnings };
  }

  const gappedPassage = itemObj.gapped_passage || itemObj.passage || '';
  const options = itemObj.options || [];

  // 빈칸 위치 찾기
  const blankPattern = /\(___\)|_{3,}|\(\s{3,}\)/g;
  const hasBlank = blankPattern.test(gappedPassage);

  if (!hasBlank) {
    errors.push('빈칸 문항에 빈칸 표시가 없음');
    pass = false;
    return { pass, errors, warnings };
  }

  // 각 선택지가 빈칸에 들어갈 수 있는 형태인지 검사
  for (let i = 0; i < options.length; i++) {
    const opt = String(options[i] || '').trim();

    if (opt.length === 0) {
      errors.push(`선택지 ${i + 1}이 비어 있음`);
      pass = false;
      continue;
    }

    // 31-32번 (구/절): 짧은 표현 (2-15단어 권장)
    if (itemNo === 31 || itemNo === 32) {
      const wordCount = opt.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount > 15) {
        warnings.push(`선택지 ${i + 1} 구/절 문항치고 너무 김: ${wordCount}단어`);
      }
      if (wordCount < 2) {
        warnings.push(`선택지 ${i + 1} 구/절 문항치고 너무 짧음: ${wordCount}단어`);
      }
    }

    // 33-34번 (문장): 더 긴 표현 (5-25단어 권장)
    if (itemNo === 33 || itemNo === 34) {
      const wordCount = opt.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount < 5) {
        warnings.push(`선택지 ${i + 1} 문장 빈칸 문항치고 너무 짧음: ${wordCount}단어`);
      }
      if (wordCount > 30) {
        warnings.push(`선택지 ${i + 1} 문장 빈칸 문항치고 너무 김: ${wordCount}단어`);
      }
    }
  }

  return { pass, errors, warnings };
}

// ============================================
// F. 정답 위험 신호 검사
// ============================================

/**
 * 지문-정답 표현 중복률 계산
 * @param {string} passage - 지문
 * @param {string} answerText - 정답 선택지 텍스트
 * @returns {number} 0-1 사이 중복률
 */
function calculatePassageAnswerOverlap(passage, answerText) {
  if (!passage || !answerText) return 0;
  if (typeof passage !== 'string' || typeof answerText !== 'string') return 0;

  const passageWords = passage.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const answerWords = answerText.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  if (answerWords.length === 0) return 0;

  const passageSet = new Set(passageWords);
  const matchCount = answerWords.filter(w => passageSet.has(w)).length;

  return matchCount / answerWords.length;
}

/**
 * 정답-지문 중복률 검사
 * @param {Object} itemObj
 * @returns {{ pass: boolean, warnings: string[], overlapRatio: number }}
 */
function validateAnswerPassageOverlap(itemObj) {
  const warnings = [];
  let pass = true;

  const passage = itemObj.passage || itemObj.stimulus || itemObj.gapped_passage || '';
  const options = itemObj.options || [];
  const answer = parseInt(itemObj.answer || itemObj.correct_answer || 0);

  if (answer < 1 || answer > 5 || !options[answer - 1]) {
    return { pass, warnings, overlapRatio: 0 };
  }

  const answerText = String(options[answer - 1] || '');
  const overlapRatio = calculatePassageAnswerOverlap(passage, answerText);

  // 70% 이상 중복 시 경고
  if (overlapRatio >= 0.7) {
    warnings.push(`정답-지문 표현 중복률 과다: ${Math.round(overlapRatio * 100)}% (패러프레이즈 필요)`);
  } else if (overlapRatio >= 0.5) {
    warnings.push(`정답-지문 표현 중복률 주의: ${Math.round(overlapRatio * 100)}%`);
  }

  return { pass, warnings, overlapRatio };
}

/**
 * 노골적 오답 검출 (너무 쉽게 제거되는 오답)
 * @param {Object} itemObj
 * @returns {{ pass: boolean, warnings: string[], weakDistractors: number[] }}
 */
function validateWeakDistractors(itemObj) {
  const warnings = [];
  let pass = true;
  const weakDistractors = [];

  const passageRaw = itemObj.passage || itemObj.stimulus || '';
  const passage = typeof passageRaw === 'string' ? passageRaw : '';
  const options = itemObj.options || [];
  const answer = parseInt(itemObj.answer || itemObj.correct_answer || 0);

  // 지문 키워드 추출 (4글자 이상 단어)
  const passageKeywords = new Set(
    passage.toLowerCase().split(/\s+/).filter(w => w.length >= 4)
  );

  for (let i = 0; i < options.length; i++) {
    if (i + 1 === answer) continue; // 정답은 스킵

    const opt = String(options[i] || '').toLowerCase();
    const optWords = opt.split(/\s+/).filter(w => w.length >= 4);

    // 지문과 전혀 관련 없는 키워드만 있는 경우
    const matchCount = optWords.filter(w => passageKeywords.has(w)).length;
    const matchRatio = optWords.length > 0 ? matchCount / optWords.length : 0;

    if (matchRatio < 0.1 && optWords.length >= 3) {
      weakDistractors.push(i + 1);
    }
  }

  if (weakDistractors.length >= 2) {
    warnings.push(`노골적 오답 ${weakDistractors.length}개 발견 (${weakDistractors.join(', ')}번): 지문과 무관해 쉽게 제거됨`);
  } else if (weakDistractors.length === 1) {
    warnings.push(`노골적 오답 1개 발견 (${weakDistractors[0]}번): 지문과 무관해 쉽게 제거됨`);
  }

  return { pass, warnings, weakDistractors };
}

/**
 * 복수 정답 위험 검사 (2개 이상 선택지가 모두 맞아 보이는지)
 * 규칙 기반으로는 완전한 판단 어려움 - LLM 평가 보조
 * @param {Object} itemObj
 * @returns {{ pass: boolean, warnings: string[] }}
 */
function validateMultipleAnswerRisk(itemObj) {
  const warnings = [];
  let pass = true;

  const options = itemObj.options || [];

  // 선택지 간 유사도 계산
  const similarities = [];
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      const sim = calculateSimilarity(String(options[i] || ''), String(options[j] || ''));
      if (sim >= 0.6) {
        similarities.push({ pair: [i + 1, j + 1], similarity: sim });
      }
    }
  }

  // 매우 유사한 선택지 쌍이 있으면 경고
  if (similarities.length >= 2) {
    const pairs = similarities.map(s => `${s.pair[0]}-${s.pair[1]}`).join(', ');
    warnings.push(`선택지 간 높은 유사도 발견 (${pairs}): 복수정답 위험 - LLM 검토 권장`);
  }

  return { pass, warnings };
}

// ============================================
// G. 정답 중복 위험 검사
// ============================================

/**
 * 선택지 구조 유사도 계산 (단순 비교)
 * @param {string} opt1
 * @param {string} opt2
 * @returns {number} 0-1 사이 유사도
 */
function calculateSimilarity(opt1, opt2) {
  const words1 = opt1.toLowerCase().split(/\s+/);
  const words2 = opt2.toLowerCase().split(/\s+/);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = [...set1].filter(w => set2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * 선택지 구조 중복 검사
 * @param {Object} itemObj
 * @returns {{ pass: boolean, warnings: string[] }}
 */
function validateOptionDuplication(itemObj) {
  const warnings = [];
  let pass = true;

  const options = (itemObj.options || []).map(String);
  const SIMILARITY_THRESHOLD = 0.7;
  let highSimilarityPairs = 0;

  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      const similarity = calculateSimilarity(options[i], options[j]);
      if (similarity >= SIMILARITY_THRESHOLD) {
        highSimilarityPairs++;
      }
    }
  }

  if (highSimilarityPairs >= 3) {
    warnings.push(`선택지 구조 과도 중복: ${highSimilarityPairs}쌍이 70% 이상 유사`);
  }

  return { pass, warnings };
}

/**
 * 수치/날짜 구분점 검사
 * @param {Object} itemObj
 * @returns {{ pass: boolean, warnings: string[] }}
 */
function validateNumericDistinction(itemObj) {
  const warnings = [];
  let pass = true;

  const options = (itemObj.options || []).map(String);

  // 숫자 추출
  const numbersInOptions = options.map(opt => {
    const matches = opt.match(/\d+/g);
    return matches ? matches.map(Number) : [];
  });

  // 같은 숫자가 여러 선택지에 등장하는지 확인
  const allNumbers = numbersInOptions.flat();
  const numberCounts = {};

  for (const num of allNumbers) {
    numberCounts[num] = (numberCounts[num] || 0) + 1;
  }

  const duplicatedNumbers = Object.entries(numberCounts)
    .filter(([_, count]) => count >= 3)
    .map(([num]) => num);

  if (duplicatedNumbers.length > 0) {
    warnings.push(`동일 수치가 3개 이상 선택지에 등장: ${duplicatedNumbers.join(', ')} - 구분점 불명확 우려`);
  }

  return { pass, warnings };
}

// ============================================
// 통합 검증 함수
// ============================================

/**
 * 전체 형식 검증 실행
 * @param {Object} itemObj - 정규화된 문항 객체
 * @param {number} itemNo - 문항 번호
 * @returns {{ pass: boolean, errors: string[], warnings: string[], stats: Object }}
 */
function validateFormat(itemObj, itemNo) {
  const allErrors = [];
  const allWarnings = [];
  let pass = true;

  // A. 언어 혼합 규칙
  const langResult = validateLanguageMix(itemObj, itemNo);
  allWarnings.push(...langResult.warnings);

  // B. 지문 길이 검사
  const lengthResult = validatePassageLength(itemObj, itemNo);
  allWarnings.push(...lengthResult.warnings);

  // C. 금지 패턴 검사
  const metaResult = validateNoLLMMeta(itemObj);
  if (!metaResult.pass) {
    pass = false;
    allErrors.push(...metaResult.errors);
  }

  const optPatternResult = validateOptionPatterns(itemObj);
  if (!optPatternResult.pass) {
    pass = false;
    allErrors.push(...optPatternResult.errors);
  }

  const optLengthResult = validateOptionLength(itemObj);
  allWarnings.push(...optLengthResult.warnings);

  // D. 문항번호별 필수 요소
  const noticeResult = validateNoticeElements(itemObj, itemNo);
  allWarnings.push(...noticeResult.warnings);

  const chartResult = validateChartExpressions(itemObj, itemNo);
  allWarnings.push(...chartResult.warnings);

  // E. 빈칸 문항 선택지 검사 (31-34번)
  const gapResult = validateGapOptionCompletion(itemObj, itemNo);
  if (!gapResult.pass) {
    pass = false;
    allErrors.push(...gapResult.errors);
  }
  allWarnings.push(...gapResult.warnings);

  // F. 정답 위험 신호 검사
  const overlapResult = validateAnswerPassageOverlap(itemObj);
  allWarnings.push(...overlapResult.warnings);

  const weakResult = validateWeakDistractors(itemObj);
  allWarnings.push(...weakResult.warnings);

  const multiResult = validateMultipleAnswerRisk(itemObj);
  allWarnings.push(...multiResult.warnings);

  // G. 정답 중복 위험
  const dupResult = validateOptionDuplication(itemObj);
  allWarnings.push(...dupResult.warnings);

  const numResult = validateNumericDistinction(itemObj);
  allWarnings.push(...numResult.warnings);

  return {
    pass,
    errors: allErrors,
    warnings: allWarnings,
    stats: {
      wordCount: lengthResult.wordCount,
      noticeElements: noticeResult.foundElements || [],
      answerPassageOverlap: overlapResult.overlapRatio || 0,
      weakDistractors: weakResult.weakDistractors || []
    }
  };
}

module.exports = {
  // 개별 검증 함수
  isMainlyEnglish,
  isMainlyKorean,
  validateLanguageMix,
  countWords,
  validatePassageLength,
  validateNoLLMMeta,
  validateOptionPatterns,
  validateOptionLength,
  validateNoticeElements,
  validateChartExpressions,
  validateOptionDuplication,
  validateNumericDistinction,

  // 빈칸 문항 검증 (31-34번)
  validateGapOptionCompletion,

  // 정답 위험 신호 검사
  calculatePassageAnswerOverlap,
  validateAnswerPassageOverlap,
  validateWeakDistractors,
  validateMultipleAnswerRisk,

  // 통합 검증
  validateFormat,

  // 상수
  WORD_COUNT_RANGES,
  LLM_META_PATTERNS,
  OPTION_FORBIDDEN_PATTERNS,
  NOTICE_KEYWORDS,
  CHART_COMPARISON_KEYWORDS
};
