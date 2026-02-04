/**
 * server/services/promptValidator.js
 * 프롬프트 1차 검증 서비스
 * - LLM 호출 전에 프롬프트 구조 및 내용 검증
 * - 체크리스트 기반 100% 자동화 검증 (정규식/키워드/구조)
 *
 * 검증 실패 시 문항 생성을 차단함
 */

const { buildPromptBundle, readMasterPrompt, readItemPrompt } = require('./promptBuilder');

/**
 * ============================================
 * 검증 설정 상수
 * ============================================
 */

// 최소 프롬프트 길이 (단문 프롬프트 차단)
const MIN_PROMPT_LENGTH = 200;

// 문항 유형별 사고 유형 정의 (확장: focus, wordRange, skillLevel, 특수 요구사항)
const THINKING_TYPES = {
  // RC (독해) - 18~45번
  18: { type: '목적 파악', keywords: ['목적', 'purpose', '글의 목적'], focus: 'Skimming for purpose', wordRange: [120, 150], skillLevel: '이해' },
  19: { type: '심경 변화', keywords: ['심경', '변화', 'feeling', 'mood', '심정'], focus: 'Inferring mood/atmosphere', wordRange: [150, 180], skillLevel: '추론' },
  20: { type: '주장 파악', keywords: ['주장', 'claim', 'argue', '필자'], focus: 'Identifying main claim', wordRange: [150, 180], skillLevel: '분석' },
  21: { type: '함축 의미', keywords: ['함축', 'imply', 'meaning', '의미하는'], focus: 'Interpreting implied meaning', wordRange: [150, 180], skillLevel: '추론' },
  22: { type: '요지 파악', keywords: ['요지', 'main point', 'gist'], focus: 'Grasping the gist', wordRange: [150, 180], skillLevel: '이해' },
  23: { type: '주제 파악', keywords: ['주제', 'topic', 'subject'], focus: 'Identifying topic/theme', wordRange: [150, 200], skillLevel: '분석' },
  24: { type: '제목 추론', keywords: ['제목', 'title'], focus: 'Inferring appropriate title', wordRange: [150, 200], skillLevel: '종합' },
  25: { type: '도표 이해', keywords: ['도표', 'chart', 'graph', 'table', '그래프'], focus: 'Scanning for specific details', wordRange: [100, 130], skillLevel: '이해', requiresChart: true },
  26: { type: '내용 일치', keywords: ['일치', 'match', '내용', '인물'], focus: 'Scanning for factual details', wordRange: [180, 220], skillLevel: '이해', format: 'biography' },
  27: { type: '안내문 일치', keywords: ['안내문', '일치', '내용'], focus: 'Reading practical texts', wordRange: [150, 180], skillLevel: '이해', format: 'notice' },
  28: { type: '어휘 추론', keywords: ['어휘', 'vocabulary', 'word', '낱말'], focus: 'Inferring word meaning in context', wordRange: [150, 180], skillLevel: '추론' },
  29: { type: '어법 판단', keywords: ['어법', 'grammar', '밑줄', '문법', 'underlined'], focus: 'Identifying grammatical errors', wordRange: [150, 180], skillLevel: '적용', requiresUnderline: 5 },
  30: { type: '지칭 추론', keywords: ['지칭', 'refer', 'reference'], focus: 'Tracking referents', wordRange: [180, 220], skillLevel: '추론' },
  31: { type: '빈칸 추론', keywords: ['빈칸', 'blank', 'gap', '추론'], focus: 'Inferring missing phrase', wordRange: [150, 180], skillLevel: '추론', blankType: 'phrase' },
  32: { type: '빈칸 추론', keywords: ['빈칸', 'blank', 'gap', '추론'], focus: 'Inferring missing phrase', wordRange: [150, 180], skillLevel: '추론', blankType: 'phrase' },
  33: { type: '빈칸 추론', keywords: ['빈칸', 'blank', 'gap', '추론'], focus: 'Inferring missing sentence', wordRange: [180, 220], skillLevel: '추론', blankType: 'sentence' },
  34: { type: '빈칸 추론', keywords: ['빈칸', 'blank', '연결어'], focus: 'Inferring logical connectors', wordRange: [180, 220], skillLevel: '분석', blankType: 'connector' },
  35: { type: '흐름 무관', keywords: ['무관', '흐름', 'irrelevant', '관계 없는'], focus: 'Identifying irrelevant sentence', wordRange: [180, 220], skillLevel: '분석' },
  36: { type: '순서 배열', keywords: ['순서', 'order', 'sequence', '배열'], focus: 'Organizing paragraph order', wordRange: [180, 220], skillLevel: '종합', format: 'ABC_paragraphs' },
  37: { type: '순서 배열', keywords: ['순서', 'order', '배열'], focus: 'Organizing paragraph order', wordRange: [180, 220], skillLevel: '종합', format: 'ABC_paragraphs' },
  38: { type: '문장 삽입', keywords: ['삽입', 'insert', 'position', '위치'], focus: 'Inserting sentence appropriately', wordRange: [180, 220], skillLevel: '분석' },
  39: { type: '문장 삽입', keywords: ['삽입', 'insert', '위치'], focus: 'Inserting sentence appropriately', wordRange: [180, 220], skillLevel: '분석' },
  40: { type: '요약문 완성', keywords: ['요약', 'summary', 'summarize'], focus: 'Completing summary', wordRange: [200, 250], skillLevel: '종합', requiresSummary: true, blankCount: 2 },
  // 세트 문항 (개별 문항 특성 반영)
  41: { type: '장문 제목/주제', keywords: ['장문', 'long passage', '제목', 'title', '주제', 'topic', 'main idea'], focus: 'Long passage comprehension - title', wordRange: [350, 420], skillLevel: '종합', isSet: true },
  42: { type: '장문 세부추론', keywords: ['장문', 'long passage', '세부', 'detail', '추론', 'inference'], focus: 'Long passage comprehension - details', skillLevel: '추론', isSet: true, sharedPassage: 41 },
  43: { type: '장문 제목/주제', keywords: ['장문', 'long passage', '제목', 'title', '주제', 'topic'], focus: 'Long passage - paragraph order', wordRange: [350, 420], skillLevel: '종합', isSet: true },
  44: { type: '장문 어휘/순서', keywords: ['장문', 'long passage', '어휘', 'vocabulary', '순서', 'order'], focus: 'Long passage - reference/vocabulary', skillLevel: '추론', isSet: true, sharedPassage: 43 },
  45: { type: '장문 삽입/내용일치', keywords: ['장문', 'long passage', '삽입', 'insert', '일치', 'match'], focus: 'Long passage - content match', skillLevel: '이해', isSet: true, sharedPassage: 43 },
  '41-42': { type: '장문 독해 세트', keywords: ['장문', 'long passage', '세트', 'set'], wordRange: [350, 420], isSet: true },
  '43-45': { type: '장문 독해 세트', keywords: ['장문', 'long passage', '세트', 'set'], wordRange: [350, 420], isSet: true },
  // LC (듣기) - 1~17번
  1: { type: '대화 목적', keywords: ['대화', 'dialogue', '목적', 'purpose'], focus: 'Listening for purpose', wordRange: [60, 80], skillLevel: '이해', format: 'dialogue' },
  2: { type: '의견 파악', keywords: ['대화', 'dialogue', '의견', 'opinion'], focus: 'Identifying opinions', wordRange: [60, 80], skillLevel: '이해', format: 'dialogue' },
  3: { type: '관계 추론', keywords: ['관계', 'relationship'], focus: 'Inferring relationships', wordRange: [60, 80], skillLevel: '추론', format: 'dialogue' },
  4: { type: '그림 선택', keywords: ['그림', 'picture', 'image'], focus: 'Matching description to image', wordRange: [60, 80], skillLevel: '이해', format: 'dialogue' },
  5: { type: '할 일 파악', keywords: ['할 일', 'task', 'do next'], focus: 'Identifying tasks/actions', wordRange: [60, 80], skillLevel: '이해', format: 'dialogue' },
  6: { type: '이유 파악', keywords: ['이유', 'reason', 'why'], focus: 'Identifying reasons', wordRange: [60, 80], skillLevel: '이해', format: 'dialogue' },
  7: { type: '숫자 정보', keywords: ['숫자', 'number', '금액', '시간', 'price', 'time'], focus: 'Scanning for numerical details', wordRange: [60, 80], skillLevel: '이해', format: 'dialogue' },
  8: { type: '언급 여부', keywords: ['언급', 'mention', 'NOT mentioned'], focus: 'Identifying mentioned/not mentioned', wordRange: [80, 100], skillLevel: '이해', format: 'dialogue' },
  9: { type: '내용 일치', keywords: ['일치', 'match', 'true'], focus: 'Matching content', wordRange: [80, 100], skillLevel: '이해', format: 'dialogue' },
  10: { type: '도표 일치', keywords: ['도표', 'chart', 'table'], focus: 'Matching chart/table info', wordRange: [80, 100], skillLevel: '이해', format: 'dialogue', requiresChart: true },
  11: { type: '적절한 응답', keywords: ['응답', 'response', 'reply'], focus: 'Selecting appropriate response', wordRange: [40, 60], skillLevel: '적용', format: 'dialogue' },
  12: { type: '적절한 응답', keywords: ['응답', 'response', 'reply'], focus: 'Selecting appropriate response', wordRange: [40, 60], skillLevel: '적용', format: 'dialogue' },
  13: { type: '상황 응답', keywords: ['상황', 'situation', 'context'], focus: 'Responding to situation', wordRange: [40, 60], skillLevel: '적용', format: 'situation' },
  14: { type: '표/도표 선택', keywords: ['표', 'table', '도표', 'chart', '선택', 'select'], focus: 'Selecting correct table/chart', wordRange: [80, 100], skillLevel: '이해', format: 'dialogue', requiresChart: true },
  15: { type: '안내문/공지', keywords: ['안내', 'announcement', '공지', 'notice', 'information'], focus: 'Understanding announcements', wordRange: [80, 100], skillLevel: '이해', format: 'announcement' },
  16: { type: '담화 주제', keywords: ['담화', 'lecture', '강의', '주제', 'topic'], focus: 'Identifying lecture topic', wordRange: [120, 150], skillLevel: '분석', format: 'lecture', isSet: true },
  17: { type: '담화 세부정보', keywords: ['담화', 'lecture', '세부', 'detail', '언급', 'mention'], focus: 'Scanning lecture details', wordRange: null, skillLevel: '이해', format: 'lecture', isSet: true, sharedPassage: 16 },
  '16-17': { type: '담화 이해 세트', keywords: ['담화', 'lecture', '강의', '세트', 'set'], wordRange: [120, 150], isSet: true, format: 'lecture' }
};

// 오답 설계 관련 필수 키워드
const DISTRACTOR_KEYWORDS = [
  // 오답 설계 일반
  '오답', 'distractor', '매력적', '오답 선택지',
  // 선택지 역할
  '①', '②', '③', '④', '⑤', '선택지',
  // 변별력 관련
  '변별', '난이도', '매력도', '함정',
  // 오답 전략
  '부분 일치', '과잉 일반화', '반대 의미', '무관한', '범위 이탈',
  'partial match', 'overgeneralization', 'opposite meaning'
];

// 변별력 지침 관련 키워드
const DISCRIMINATION_KEYWORDS = [
  '변별력', '변별', 'discrimination',
  '상위', '중위', '하위',
  '정답률', '오답률',
  '가장 늦게', '마지막에',
  '매력적인 오답', 'attractive distractor'
];

// 난이도 관련 키워드
const DIFFICULTY_KEYWORDS = [
  '난이도', 'difficulty', 'level',
  '쉬움', '중간', '어려움',
  '하', '중하', '중', '중상', '상',
  'easy', 'medium', 'hard',
  '1등급', '2등급', '3등급', '4등급',
  '상위권', '중위권', '하위권'
];

// 출력 포맷 필수 키워드 (일반적인 단어 제거하여 오탐 방지)
const OUTPUT_FORMAT_KEYWORDS = {
  passage: ['passage', 'stimulus', 'transcript', '지문', '대본'],  // 'text' 제거 (너무 일반적)
  question: ['question', 'question_stem', 'questionStem', 'stem', '발문', '문제'],  // 'prompt' 제거 (혼동 가능)
  options: ['options', 'choices', 'alternatives', '선택지', '보기'],
  answer: ['answer', 'correct_answer', 'correctAnswer', 'answer_key', '정답'],
  explanation: ['explanation', 'rationale', 'solution', '해설', '풀이']
};

// LC 문항 전용 필수 키워드
const LC_SPECIFIC_KEYWORDS = {
  lc_script: ['lc_script', 'script', 'listening script', '듣기 대본', '스크립트', 'dialogue', 'conversation']
};

// RC29 어법 문항 전용 필드
const RC29_REQUIRED_FIELDS = {
  grammar_meta: ['grammar_meta', 'error_type', 'error type', '문법 오류', '어법 오류', 'grammatical']
};

// 금지 패턴 (단문/모호한 프롬프트)
const FORBIDDEN_PATTERNS = [
  /^.{0,100}수능.{0,50}(만들어|생성|작성).{0,50}$/i,  // "수능 스타일로 만들어라" 단문
  /^.{0,50}문항.{0,30}(생성|만들어).{0,30}$/i,        // "문항 생성해줘" 단문
  /^(create|generate|make).{0,50}(question|item).{0,50}$/i  // 영문 단문
];

// 역할(Persona) 관련 키워드
const PERSONA_KEYWORDS = [
  '출제위원', '출제자', 'item writer', 'test developer',
  '역할', 'role', 'expert', '전문가',
  'You are', '당신은', 'Act as', '~로서'
];

/**
 * ============================================
 * E. 제약조건(Constraints) 검증
 * ============================================
 */

/**
 * 문항별 제약조건 검증
 * @param {string} promptText - 프롬프트 텍스트
 * @param {string|number} itemNo - 문항 번호
 */
function validateConstraints(promptText, itemNo) {
  const errors = [];
  const warnings = [];
  const numItemNo = parseInt(itemNo);
  const thinkingType = THINKING_TYPES[itemNo] || THINKING_TYPES[numItemNo];

  // E1: 단어 수 범위 명시 확인
  if (thinkingType?.wordRange) {
    const [min, max] = thinkingType.wordRange;
    const hasWordCount = /\d+\s*(단어|words?|어절)/.test(promptText) ||
                         new RegExp(`${min}|${max}`, 'i').test(promptText);
    if (!hasWordCount) {
      warnings.push(`[E1] 지문 단어 수 미명시: 권장 ${min}-${max} words`);
    }
  }

  // E2: 도표 필수 (RC25, LC10, LC14)
  if (thinkingType?.requiresChart) {
    const hasChart = /chart|도표|graph|표|그래프|table/i.test(promptText);
    if (!hasChart) {
      errors.push('[E2] 도표 문항에 차트/도표 데이터 언급 필요');
    }
  }

  // E3: 밑줄 5개 (RC29)
  if (thinkingType?.requiresUnderline) {
    const hasUnderline = /밑줄.*5|5.*밑줄|①②③④⑤|5\s*개.*밑줄|underline.*5/i.test(promptText);
    if (!hasUnderline) {
      warnings.push(`[E3] 어법 문항: 밑줄 ${thinkingType.requiresUnderline}개 명시 권장`);
    }
  }

  // E4: 요약문 형식 (RC40)
  if (thinkingType?.requiresSummary) {
    const hasSummary = /\(A\).*\(B\)|요약문|summary.*blank|빈칸.*2/i.test(promptText);
    if (!hasSummary) {
      warnings.push('[E4] 요약문 (A), (B) 빈칸 형식 명시 권장');
    }
  }

  // E5: 선택지 언어 명시
  const hasOptionLang = /한글|korean|영어|english|선택지.*언어|옵션.*언어/i.test(promptText);
  if (!hasOptionLang) {
    warnings.push('[E5] 선택지 언어 미명시 (한글/영어)');
  }

  // E6: ABC 단락 형식 (RC36, RC37)
  if (thinkingType?.format === 'ABC_paragraphs') {
    const hasABC = /\(A\).*\(B\).*\(C\)|단락.*A.*B.*C|paragraph/i.test(promptText);
    if (!hasABC) {
      warnings.push('[E6] 순서 배열 문항: (A), (B), (C) 단락 형식 명시 권장');
    }
  }

  return { errors, warnings };
}

/**
 * ============================================
 * F. 역할(Persona) 검증
 * ============================================
 */

/**
 * 역할 명시 검증
 * @param {string} promptText - 프롬프트 텍스트
 */
function validatePersona(promptText) {
  const errors = [];
  const warnings = [];

  const hasPersona = PERSONA_KEYWORDS.some(kw =>
    promptText.toLowerCase().includes(kw.toLowerCase())
  );

  if (!hasPersona) {
    warnings.push('[F1] 역할(Persona) 미명시: "수능 영어 출제위원" 등 역할 명시 권장');
  }

  // 부적절한 역할 체크 (역할 설정 문맥에서만 검사)
  // "you are a student", "당신은 학생입니다" 등 역할 지정 패턴만 체크
  // "student mistakes", "학생들에게" 등 일반 언급은 무시
  const roleAssignmentPatterns = [
    /you\s+are\s+(?:a\s+)?(?:학생|student|초보|beginner|아마추어)/i,
    /역할.*(?:학생|초보|아마추어)/i,
    /당신은\s*(?:학생|초보자|아마추어)/i,
    /\[role\].*(?:학생|student|초보|beginner|아마추어)/i
  ];
  const hasInappropriateRole = roleAssignmentPatterns.some(p => p.test(promptText));
  if (hasInappropriateRole) {
    errors.push('[F2] 부적절한 역할 설정: 출제위원/전문가 역할 사용 필요');
  }

  return { errors, warnings };
}


/**
 * ============================================
 * A. 기본 구조 검증
 * ============================================
 */

/**
 * MASTER_PROMPT 참조 여부 검증
 *
 * 주의: MASTER_PROMPT는 시스템(promptBuilder.js)에서 자동으로 병합되므로
 * ITEM_PROMPT에 명시적으로 참조할 필요가 없습니다.
 * 이 검증은 정보 제공용이며, 경고만 표시합니다.
 */
function validateMasterPromptReference(promptText) {
  const errors = [];
  const warnings = [];

  // MASTER_PROMPT 또는 시스템 프롬프트 참조 확인
  const hasMasterRef = /master|시스템|system|공통/i.test(promptText);

  // 참조가 없어도 시스템이 자동 병합하므로 정보성 메시지만 표시
  if (!hasMasterRef) {
    // 경고 제거: 시스템이 자동으로 MASTER_PROMPT를 병합하므로 문제 없음
    // warnings.push('[A1] MASTER_PROMPT 참조가 명시되지 않았습니다.');
  }

  return { errors, warnings };
}

/**
 * 출력 포맷 명시 여부 검증
 * @param {string} promptText - 프롬프트 텍스트
 * @param {string|number} itemNo - 문항 번호 (LC/RC 구분용)
 */
function validateOutputFormat(promptText, itemNo = null) {
  const errors = [];
  const warnings = [];
  const missingFormats = [];

  // 각 필수 출력 필드 확인
  for (const [field, keywords] of Object.entries(OUTPUT_FORMAT_KEYWORDS)) {
    const hasField = keywords.some(kw => promptText.toLowerCase().includes(kw.toLowerCase()));
    if (!hasField) {
      missingFormats.push(field);
    }
  }

  if (missingFormats.length > 0) {
    if (missingFormats.length >= 3) {
      errors.push(`[A3] 출력 포맷 명시 부족: ${missingFormats.join(', ')} 필드가 프롬프트에 없습니다.`);
    } else {
      warnings.push(`[A3] 출력 포맷 일부 누락: ${missingFormats.join(', ')}`);
    }
  }

  // 선택지 5개 고정 명시 확인
  const hasFiveOptions = /5\s*개|five|5\s*options|선택지\s*5|①②③④⑤/i.test(promptText);
  if (!hasFiveOptions) {
    warnings.push('[A4] 선택지 개수(5개) 고정이 명시되지 않았습니다.');
  }

  // LC 문항 전용: lc_script 필드 검증
  const numItemNo = parseInt(itemNo);
  const isLCItem = (numItemNo >= 1 && numItemNo <= 17) || String(itemNo) === '16-17';
  if (isLCItem) {
    const hasLcScript = LC_SPECIFIC_KEYWORDS.lc_script.some(kw =>
      promptText.toLowerCase().includes(kw.toLowerCase())
    );
    if (!hasLcScript) {
      warnings.push('[A5] LC 문항에 lc_script/듣기대본 관련 키워드가 없습니다.');
    }
  }

  // RC29 어법 문항 전용: grammar_meta 필드 검증
  if (numItemNo === 29) {
    const hasGrammarMeta = RC29_REQUIRED_FIELDS.grammar_meta.some(kw =>
      promptText.toLowerCase().includes(kw.toLowerCase())
    );
    if (!hasGrammarMeta) {
      warnings.push('[A6] RC29(어법) 문항에 grammar_meta/오류유형 관련 키워드가 없습니다.');
    }
  }

  return { errors, warnings };
}


/**
 * ============================================
 * B. 문항 번호별 필수 선언 검증
 * ============================================
 */

/**
 * 수능 유형 명시 검증
 */
function validateItemTypeDeclaration(promptText, itemNo) {
  const errors = [];
  const warnings = [];

  const numItemNo = parseInt(itemNo);
  const strItemNo = String(itemNo);

  // "수능 X번" 또는 "X번 유형" 명시 확인
  const typePatterns = [
    new RegExp(`수능\\s*${numItemNo}\\s*번`, 'i'),
    new RegExp(`${numItemNo}\\s*번\\s*(유형|문항)`, 'i'),
    new RegExp(`RC\\s*${numItemNo}`, 'i'),
    new RegExp(`LC\\s*${numItemNo}`, 'i'),
    new RegExp(`item\\s*${numItemNo}`, 'i'),
    new RegExp(`문항\\s*번호\\s*:?\\s*${numItemNo}`, 'i')
  ];

  const hasTypeDeclaration = typePatterns.some(p => p.test(promptText));

  if (!hasTypeDeclaration) {
    errors.push(`[B1] "수능 ${itemNo}번 유형" 명시가 없습니다. 문항 유형을 명확히 선언해야 합니다.`);
  }

  return { errors, warnings };
}

/**
 * 사고 유형 선언 검증
 */
function validateThinkingType(promptText, itemNo) {
  const errors = [];
  const warnings = [];

  const strItemNo = String(itemNo);
  const thinkingInfo = THINKING_TYPES[itemNo] || THINKING_TYPES[strItemNo];

  if (!thinkingInfo) {
    warnings.push(`[B2] ${itemNo}번 문항의 사고 유형 정의가 없습니다.`);
    return { errors, warnings };
  }

  // 사고 유형 키워드 존재 확인
  const hasThinkingType = thinkingInfo.keywords.some(kw =>
    promptText.toLowerCase().includes(kw.toLowerCase())
  );

  if (!hasThinkingType) {
    errors.push(`[B2] 사고 유형 선언 누락: "${thinkingInfo.type}" 관련 키워드(${thinkingInfo.keywords.slice(0, 3).join('/')})가 없습니다.`);
  }

  return { errors, warnings };
}

/**
 * 난이도 목표 검증
 */
function validateDifficultyTarget(promptText) {
  const errors = [];
  const warnings = [];

  const hasDifficulty = DIFFICULTY_KEYWORDS.some(kw =>
    promptText.toLowerCase().includes(kw.toLowerCase())
  );

  if (!hasDifficulty) {
    warnings.push('[B3] 난이도 목표가 명시되지 않았습니다. (예: 중위권 변별, 상위권 변별 등)');
  }

  return { errors, warnings };
}


/**
 * ============================================
 * C. 오답 설계 선언 검증 (핵심)
 * ============================================
 */

/**
 * 오답 설계 지침 검증
 */
function validateDistractorDesign(promptText) {
  const errors = [];
  const warnings = [];

  // 오답 관련 키워드 카운트
  const distractorKeywordCount = DISTRACTOR_KEYWORDS.filter(kw =>
    promptText.toLowerCase().includes(kw.toLowerCase())
  ).length;

  if (distractorKeywordCount === 0) {
    errors.push('[C1] 오답 설계 지시가 전혀 없습니다. 오답 선택지 작성 가이드라인을 반드시 포함해야 합니다.');
  } else if (distractorKeywordCount < 3) {
    warnings.push(`[C1] 오답 설계 지시가 부족합니다. (발견된 키워드: ${distractorKeywordCount}개)`);
  }

  // 선택지 역할 고정 규칙 확인 (①~⑤ 각각)
  const hasOptionRoles = /[①②③④⑤].*[①②③④⑤]/s.test(promptText) ||
                         /option\s*[1-5]|choice\s*[1-5]|선택지\s*[1-5]/i.test(promptText);

  if (!hasOptionRoles && distractorKeywordCount > 0) {
    warnings.push('[C1] 개별 선택지(①~⑤)의 역할/전략이 명시되지 않았습니다.');
  }

  return { errors, warnings };
}

/**
 * 변별력 지침 검증
 */
function validateDiscriminationGuideline(promptText) {
  const errors = [];
  const warnings = [];

  const hasDiscrimination = DISCRIMINATION_KEYWORDS.some(kw =>
    promptText.toLowerCase().includes(kw.toLowerCase())
  );

  if (!hasDiscrimination) {
    warnings.push('[C2] 변별력 관련 지침이 없습니다. (예: "정답은 가장 늦게 탈락하도록", "매력적인 오답 설계" 등)');
  }

  return { errors, warnings };
}


/**
 * ============================================
 * D. 금지/경고 패턴 검증
 * ============================================
 */

/**
 * 단문 프롬프트 차단
 */
function validateMinimumLength(promptText) {
  const errors = [];
  const warnings = [];

  const trimmedLength = promptText.trim().length;

  if (trimmedLength < 50) {
    errors.push('[D1] 프롬프트가 너무 짧습니다. (50자 미만) 문항 생성이 불가능합니다.');
  } else if (trimmedLength < MIN_PROMPT_LENGTH) {
    errors.push(`[D1] 프롬프트가 짧습니다. (${trimmedLength}자) 최소 ${MIN_PROMPT_LENGTH}자 이상 권장됩니다. 수능 품질 문항 생성을 위해 상세한 지침이 필요합니다.`);
  }

  return { errors, warnings };
}

/**
 * 금지 패턴 검사
 */
function validateForbiddenPatterns(promptText) {
  const errors = [];
  const warnings = [];

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(promptText.trim())) {
      errors.push('[D1] "수능 스타일로 만들어라" 같은 단문 프롬프트는 사용할 수 없습니다. 구체적인 지침을 작성해야 합니다.');
      break;
    }
  }

  return { errors, warnings };
}

/**
 * 사고 유형 모호성 검사
 */
function validateThinkingTypeClarity(promptText, itemNo) {
  const errors = [];
  const warnings = [];

  const strItemNo = String(itemNo);
  const thinkingInfo = THINKING_TYPES[itemNo] || THINKING_TYPES[strItemNo];

  if (!thinkingInfo) return { errors, warnings };

  // 모호한 표현 검사
  const vaguePatterns = [
    /적절한\s*것/,
    /알맞은\s*것/,
    /좋은\s*문항/,
    /괜찮은/,
    /적당히/,
    /대충/
  ];

  const hasVagueExpression = vaguePatterns.some(p => p.test(promptText));

  if (hasVagueExpression) {
    warnings.push('[D3] 모호한 표현이 있습니다. 구체적인 기준을 명시하세요.');
  }

  return { errors, warnings };
}


/**
 * ============================================
 * 통합 검증 함수
 * ============================================
 */

/**
 * 프롬프트 품질 검증 (체크리스트 기반)
 * @param {string} promptText - 프롬프트 텍스트
 * @param {string|number} itemNo - 문항 번호
 * @returns {Object} 검증 결과
 */
function validatePromptQuality(promptText, itemNo) {
  const allErrors = [];
  const allWarnings = [];
  const checklist = {
    A: { name: '기본 구조', items: [] },
    B: { name: '문항 번호별 필수 선언', items: [] },
    C: { name: '오답 설계 선언', items: [] },
    D: { name: '금지/경고 패턴', items: [] },
    E: { name: '제약조건 명시', items: [] },
    F: { name: '역할 명시', items: [] }
  };

  // A. 기본 구조 검증
  const a1 = validateMasterPromptReference(promptText);
  const a3 = validateOutputFormat(promptText, itemNo);  // itemNo 전달하여 LC/RC 구분

  checklist.A.items.push({ code: 'A1', name: 'MASTER_PROMPT 참조', pass: a1.errors.length === 0 });
  checklist.A.items.push({ code: 'A3', name: '출력 포맷 명시', pass: a3.errors.length === 0 });
  checklist.A.items.push({ code: 'A4', name: '선택지 5개 고정', pass: !a3.warnings.some(w => w.includes('A4')) });

  // LC 전용 필드 검증
  const numItemNo = parseInt(itemNo);
  const isLCItem = (numItemNo >= 1 && numItemNo <= 17) || String(itemNo) === '16-17';
  if (isLCItem) {
    checklist.A.items.push({ code: 'A5', name: 'LC 스크립트 명시', pass: !a3.warnings.some(w => w.includes('A5')) });
  }

  // RC29 전용 필드 검증
  if (numItemNo === 29) {
    checklist.A.items.push({ code: 'A6', name: 'grammar_meta 명시', pass: !a3.warnings.some(w => w.includes('A6')) });
  }

  allErrors.push(...a1.errors, ...a3.errors);
  allWarnings.push(...a1.warnings, ...a3.warnings);

  // B. 문항 번호별 필수 선언 검증
  const b1 = validateItemTypeDeclaration(promptText, itemNo);
  const b2 = validateThinkingType(promptText, itemNo);
  const b3 = validateDifficultyTarget(promptText);

  checklist.B.items.push({ code: 'B1', name: '수능 유형 명시', pass: b1.errors.length === 0 });
  checklist.B.items.push({ code: 'B2', name: '사고 유형 선언', pass: b2.errors.length === 0 });
  checklist.B.items.push({ code: 'B3', name: '난이도 목표', pass: b3.warnings.length === 0 });

  allErrors.push(...b1.errors, ...b2.errors, ...b3.errors);
  allWarnings.push(...b1.warnings, ...b2.warnings, ...b3.warnings);

  // C. 오답 설계 선언 검증 (핵심)
  const c1 = validateDistractorDesign(promptText);
  const c2 = validateDiscriminationGuideline(promptText);

  checklist.C.items.push({ code: 'C1', name: '오답 설계 지침', pass: c1.errors.length === 0 });
  checklist.C.items.push({ code: 'C2', name: '변별력 지침', pass: c2.warnings.length === 0 });

  allErrors.push(...c1.errors, ...c2.errors);
  allWarnings.push(...c1.warnings, ...c2.warnings);

  // D. 금지/경고 패턴 검증
  const d1 = validateMinimumLength(promptText);
  const d1b = validateForbiddenPatterns(promptText);
  const d3 = validateThinkingTypeClarity(promptText, itemNo);

  checklist.D.items.push({ code: 'D1', name: '단문 프롬프트 차단', pass: d1.errors.length === 0 && d1b.errors.length === 0 });
  checklist.D.items.push({ code: 'D3', name: '사고 유형 명확성', pass: d3.warnings.length === 0 });

  allErrors.push(...d1.errors, ...d1b.errors, ...d3.errors);
  allWarnings.push(...d1.warnings, ...d1b.warnings, ...d3.warnings);

  // E. 제약조건(Constraints) 검증
  const e1 = validateConstraints(promptText, itemNo);

  checklist.E.items.push({ code: 'E1', name: '단어 수/형식 제약', pass: e1.errors.length === 0 });
  // 개별 제약 항목을 체크리스트에 추가 (존재하는 경우만)
  const thinkingType = THINKING_TYPES[itemNo] || THINKING_TYPES[parseInt(itemNo)];
  if (thinkingType?.requiresChart) {
    checklist.E.items.push({ code: 'E2', name: '도표 필수', pass: !e1.errors.some(e => e.includes('E2')) });
  }
  if (thinkingType?.requiresUnderline) {
    checklist.E.items.push({ code: 'E3', name: '밑줄 개수', pass: !e1.warnings.some(w => w.includes('E3')) });
  }
  if (thinkingType?.requiresSummary) {
    checklist.E.items.push({ code: 'E4', name: '요약문 형식', pass: !e1.warnings.some(w => w.includes('E4')) });
  }

  allErrors.push(...e1.errors);
  allWarnings.push(...e1.warnings);

  // F. 역할(Persona) 검증
  const f1 = validatePersona(promptText);

  checklist.F.items.push({ code: 'F1', name: '역할 명시', pass: f1.errors.length === 0 && f1.warnings.length === 0 });

  allErrors.push(...f1.errors);
  allWarnings.push(...f1.warnings);

  // 전체 통과 여부
  const pass = allErrors.length === 0;

  // 카테고리별 가중치 설정 (오답 설계 > 사고 유형 > 제약조건 > 기본 구조 > 금지 패턴 > 역할)
  const CATEGORY_WEIGHTS = {
    A: 1.0,   // 기본 구조
    B: 1.5,   // 문항 번호별 필수 선언 (사고 유형 포함)
    C: 2.0,   // 오답 설계 선언 (핵심, 가장 높은 가중치)
    D: 0.8,   // 금지/경고 패턴
    E: 1.2,   // 제약조건 명시 (단어 수, 도표, 밑줄 등)
    F: 0.5    // 역할 명시 (권장사항)
  };

  // 가중치 적용 점수 계산 (100점 만점)
  let totalWeightedScore = 0;
  let maxWeightedScore = 0;

  for (const [catKey, cat] of Object.entries(checklist)) {
    const weight = CATEGORY_WEIGHTS[catKey] || 1.0;
    const catItemCount = cat.items.length;
    const catPassedCount = cat.items.filter(item => item.pass).length;

    totalWeightedScore += catPassedCount * weight;
    maxWeightedScore += catItemCount * weight;
  }

  const score = maxWeightedScore > 0 ? Math.round((totalWeightedScore / maxWeightedScore) * 100) : 0;

  // 문항 정보 (THINKING_TYPES에서 추출)
  const itemInfo = thinkingType ? {
    type: thinkingType.type,
    focus: thinkingType.focus || null,
    wordRange: thinkingType.wordRange || null,
    skillLevel: thinkingType.skillLevel || null,
    isSet: thinkingType.isSet || false,
    format: thinkingType.format || null
  } : null;

  return {
    pass,
    score,
    errors: allErrors,
    warnings: allWarnings,
    checklist,
    itemInfo,
    summary: pass
      ? `프롬프트 검증 통과 (${score}점)`
      : `프롬프트 검증 실패 - ${allErrors.length}개 오류 발견. 문항 생성이 차단됩니다.`
  };
}


/**
 * ============================================
 * 기존 함수들 (호환성 유지)
 * ============================================
 */

/**
 * 프롬프트 구조 검증 (기존 + 체크리스트 통합)
 */
function validatePromptStructure(promptKey, promptText) {
  const errors = [];
  const warnings = [];

  // 1. 빈 프롬프트 체크
  if (!promptText || promptText.trim().length === 0) {
    errors.push('프롬프트가 비어 있습니다.');
    return { valid: false, errors, warnings, qualityCheck: null };
  }

  // 2. 체크리스트 기반 품질 검증 (ITEM PROMPT인 경우)
  let qualityCheck = null;
  if (/^\d+$/.test(promptKey) || /^\d+-\d+$/.test(promptKey)) {
    qualityCheck = validatePromptQuality(promptText, promptKey);
    errors.push(...qualityCheck.errors);
    warnings.push(...qualityCheck.warnings);
  }

  // 3. MASTER_PROMPT 전용 검증
  if (promptKey === 'MASTER_PROMPT') {
    const schemaKeywords = ['JSON', 'schema', '스키마', 'itemNo', 'question', 'options', 'answer'];
    const foundKeywords = schemaKeywords.filter(kw => promptText.includes(kw));

    if (foundKeywords.length < 3) {
      warnings.push('MASTER_PROMPT에 JSON 스키마 관련 키워드가 부족합니다.');
    }

    const requiredFields = ['question', 'options', 'answer', 'explanation'];
    const missingFields = requiredFields.filter(f => !promptText.toLowerCase().includes(f));

    if (missingFields.length > 0) {
      warnings.push(`다음 필드에 대한 설명이 없습니다: ${missingFields.join(', ')}`);
    }
  }

  // 4. PASSAGE 프롬프트 검증
  if (promptKey.startsWith('P') && /^P\d+/.test(promptKey)) {
    if (!promptText.includes('지문') && !promptText.includes('passage')) {
      warnings.push('지문 생성 프롬프트에 "지문" 또는 "passage" 키워드가 없습니다.');
    }
  }

  // 5. 특수문자/인코딩 문제 체크
  const problematicChars = promptText.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
  if (problematicChars) {
    errors.push('프롬프트에 문제가 될 수 있는 제어 문자가 포함되어 있습니다.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    qualityCheck,
    stats: {
      length: promptText.length,
      lines: promptText.split('\n').length,
      words: promptText.split(/\s+/).filter(w => w).length
    }
  };
}

/**
 * 문항 유형별 권장 키워드 반환
 */
function getTypeKeywords(itemNo) {
  const thinkingInfo = THINKING_TYPES[itemNo] || THINKING_TYPES[String(itemNo)];
  if (thinkingInfo) {
    return thinkingInfo.keywords;
  }

  // 세트 문항 키워드
  const setKeywords = {
    '16-17': ['담화', 'lecture', 'listen', '세트'],
    '41-42': ['장문', 'long passage', '세트'],
    '43-45': ['장문', 'long passage', '세트']
  };

  if (typeof itemNo === 'string' && setKeywords[itemNo]) {
    return setKeywords[itemNo];
  }

  return [];
}

/**
 * 사용자 입력 컨텍스트 검증
 */
function validateUserContext(req) {
  const errors = [];
  const warnings = [];

  // 1. 문항 번호 유효성
  const itemNo = req.itemNo;
  const validSetItems = ['16-17', '41-42', '43-45'];

  if (typeof itemNo === 'string' && validSetItems.includes(itemNo)) {
    // 유효한 세트 문항
  } else {
    const numItemNo = parseInt(itemNo);
    if (isNaN(numItemNo) || numItemNo < 1 || numItemNo > 45) {
      errors.push('문항 번호가 유효하지 않습니다. (LC 1-17, RC 18-45 또는 세트 문항)');
    }
  }

  // 2. 난이도 유효성
  const validLevels = ['하', '중하', '중', '중상', '상'];
  if (req.level && !validLevels.includes(req.level)) {
    warnings.push(`난이도 "${req.level}"이(가) 표준 값이 아닙니다. (${validLevels.join('/')})`);
  }

  // 3. 지문 길이 체크
  if (req.passage) {
    const passageLength = req.passage.trim().length;

    if (passageLength < 100) {
      warnings.push('지문이 너무 짧습니다. (최소 100자 권장)');
    }

    if (passageLength > 3000) {
      warnings.push('지문이 매우 깁니다. LLM 토큰 제한에 주의하세요.');
    }

    const englishRatio = (req.passage.match(/[a-zA-Z]/g) || []).length / passageLength;
    if (englishRatio < 0.5) {
      warnings.push('지문에 영어 비율이 낮습니다. 수능 영어 지문인지 확인하세요.');
    }
  }

  // 4. RC25(도표) 전용 체크
  const numItemNo = parseInt(req.itemNo);
  if (numItemNo === 25 && !req.chartId && !req.passage) {
    warnings.push('RC25(도표) 문항은 차트 데이터가 필요합니다.');
  }

  // 5. 세트 문항 체크
  const isSetItem = ['16-17', '41-42', '43-45'].includes(String(req.itemNo)) ||
                    (numItemNo >= 41 && numItemNo <= 45);
  if (isSetItem && !req.setId) {
    warnings.push('세트 문항입니다. 세트 ID를 지정하는 것이 좋습니다.');
  }

  // 6. 추가 메모 길이 체크
  if (req.extra && req.extra.length > 1000) {
    warnings.push('추가 메모가 매우 깁니다. 핵심 내용만 포함하세요.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 최종 프롬프트 번들 검증 및 미리보기 생성
 */
function validatePromptBundle(req) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    preview: null,
    stats: {},
    qualityCheck: null
  };

  try {
    // 1. 사용자 컨텍스트 검증
    const contextValidation = validateUserContext(req);
    result.errors.push(...contextValidation.errors);
    result.warnings.push(...contextValidation.warnings);

    // 2. MASTER_PROMPT 검증
    let masterPrompt;
    try {
      masterPrompt = readMasterPrompt();
      const masterValidation = validatePromptStructure('MASTER_PROMPT', masterPrompt);
      result.warnings.push(...masterValidation.warnings);
      if (!masterValidation.valid) {
        result.errors.push(...masterValidation.errors);
      }
    } catch (e) {
      result.errors.push('MASTER_PROMPT를 읽을 수 없습니다: ' + e.message);
    }

    // 3. ITEM_PROMPT 검증 (체크리스트 포함)
    let itemPrompt;
    try {
      itemPrompt = readItemPrompt(req.itemNo);
      const itemValidation = validatePromptStructure(String(req.itemNo), itemPrompt);
      result.warnings.push(...itemValidation.warnings);
      result.qualityCheck = itemValidation.qualityCheck;

      if (!itemValidation.valid) {
        result.errors.push(...itemValidation.errors);
      }
    } catch (e) {
      result.errors.push(`ITEM_PROMPT(${req.itemNo})를 읽을 수 없습니다: ` + e.message);
    }

    // 4. 최종 번들 생성 시도 (에러 여부와 무관하게 미리보기/통계는 항상 생성)
    try {
      const bundle = buildPromptBundle(req);

      result.preview = {
        system: bundle.system,
        user: bundle.user,
        systemPreview: truncateText(bundle.system, 500),
        userPreview: truncateText(bundle.user, 1000)
      };

      const totalChars = (bundle.system?.length || 0) + (bundle.user?.length || 0);
      const estimatedTokens = Math.ceil(totalChars / 4);

      result.stats = {
        systemLength: bundle.system?.length || 0,
          userLength: bundle.user?.length || 0,
          totalLength: totalChars,
          estimatedTokens,
          systemLines: (bundle.system || '').split('\n').length,
          userLines: (bundle.user || '').split('\n').length
        };

        if (estimatedTokens > 8000) {
          result.warnings.push(`추정 토큰 수가 많습니다 (${estimatedTokens}). API 제한에 주의하세요.`);
        }

    } catch (e) {
      result.errors.push('프롬프트 번들 생성 실패: ' + e.message);
    }

    result.valid = result.errors.length === 0;

  } catch (e) {
    result.valid = false;
    result.errors.push('검증 중 오류 발생: ' + e.message);
  }

  return result;
}

/**
 * 텍스트 잘라내기 (미리보기용)
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '\n... (이하 생략, 총 ' + text.length + '자)';
}

/**
 * 프롬프트 수정 제안 생성
 */
function generateSuggestions(validationResult) {
  const suggestions = [];

  if (validationResult.errors.length > 0) {
    suggestions.push('⚠️ 오류를 먼저 해결해야 문항 생성이 가능합니다.');
  }

  // 체크리스트 기반 제안
  if (validationResult.qualityCheck) {
    const qc = validationResult.qualityCheck;

    if (!qc.pass) {
      suggestions.push('📋 프롬프트 품질 체크리스트를 통과하지 못했습니다.');
    }

    // 카테고리별 제안
    for (const [catKey, cat] of Object.entries(qc.checklist || {})) {
      const failedItems = cat.items.filter(item => !item.pass);
      if (failedItems.length > 0) {
        suggestions.push(`💡 [${cat.name}] 개선 필요: ${failedItems.map(i => i.name).join(', ')}`);
      }
    }
  }

  validationResult.warnings.forEach(warning => {
    if (warning.includes('오답 설계')) {
      suggestions.push('💡 오답 선택지 작성 가이드라인을 추가하세요. (예: 각 오답의 오류 유형, 매력도 등)');
    }
    if (warning.includes('사고 유형')) {
      suggestions.push('💡 해당 문항의 사고 유형을 명확히 선언하세요. (예: 빈칸 추론, 요지 파악 등)');
    }
    if (warning.includes('변별력')) {
      suggestions.push('💡 변별력 관련 지침을 추가하세요. (예: "상위권 변별", "매력적인 오답 설계" 등)');
    }
    if (warning.includes('난이도')) {
      suggestions.push('💡 목표 난이도를 명시하세요. (예: 중위권 70% 정답률 목표)');
    }
  });

  return [...new Set(suggestions)]; // 중복 제거
}

module.exports = {
  validatePromptStructure,
  validateUserContext,
  validatePromptBundle,
  generateSuggestions,
  getTypeKeywords,
  validatePromptQuality,
  // 개별 검증 함수들도 export
  validateDistractorDesign,
  validateThinkingType,
  validateDifficultyTarget,
  validateOutputFormat,
  validateConstraints,    // 신규: 제약조건 검증
  validatePersona,        // 신규: 역할 검증
  // 상수들
  THINKING_TYPES,
  DISTRACTOR_KEYWORDS,
  DISCRIMINATION_KEYWORDS,
  DIFFICULTY_KEYWORDS,
  OUTPUT_FORMAT_KEYWORDS,
  LC_SPECIFIC_KEYWORDS,
  RC29_REQUIRED_FIELDS,
  PERSONA_KEYWORDS,       // 신규: 역할 키워드
  MIN_PROMPT_LENGTH
};
