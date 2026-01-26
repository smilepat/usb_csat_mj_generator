# KSAT 프롬프트 검증기 템플릿 구조

## 1. 개요

이 문서는 수능 영어 문항 생성용 프롬프트를 분석하고 검증하는 시스템의 템플릿 구조를 설명합니다.
다른 앱 개발 시 이 구조를 기반으로 커스터마이징할 수 있습니다.

---

## 2. 핵심 데이터 구조

### 2.1 문항별 사고 유형 (THINKING_TYPES)

```javascript
const THINKING_TYPES = {
  // RC (독해) 문항: 18-45번
  18: { type: '글의 목적', keywords: ['목적', 'purpose', '의도'] },
  19: { type: '심경/분위기', keywords: ['심경', '분위기', 'mood', 'feeling', 'atmosphere'] },
  20: { type: '주장 파악', keywords: ['주장', 'claim', 'argue', 'assert'] },
  // ... 21-40번

  // 세트 문항 (개별 특성 반영)
  41: { type: '장문 제목/주제', keywords: ['장문', 'long passage', '제목', 'title'] },
  42: { type: '장문 세부추론', keywords: ['장문', '세부', 'detail', '추론'] },
  43: { type: '장문 제목/주제', keywords: ['장문', '제목', 'title', '주제'] },
  44: { type: '장문 어휘/순서', keywords: ['장문', '어휘', 'vocabulary', '순서'] },
  45: { type: '장문 삽입/내용일치', keywords: ['장문', '삽입', 'insert', '일치'] },

  // 세트 범위 키
  '41-42': { type: '장문 독해 세트', keywords: ['장문', 'long passage', '세트', 'set'] },
  '43-45': { type: '장문 독해 세트', keywords: ['장문', 'long passage', '세트', 'set'] },

  // LC (듣기) 문항: 1-17번
  1: { type: '대화 목적', keywords: ['대화', 'dialogue', '목적', 'purpose'] },
  2: { type: '의견 파악', keywords: ['대화', '의견', 'opinion'] },
  // ... 3-15번
  16: { type: '담화 주제', keywords: ['담화', 'lecture', '주제', 'topic'] },
  17: { type: '담화 세부정보', keywords: ['담화', '세부', 'detail', '언급'] },
  '16-17': { type: '담화 이해 세트', keywords: ['담화', 'lecture', '세트', 'set'] }
};
```

### 2.2 키워드 상수 정의

```javascript
// 오답 설계 관련 필수 키워드
const DISTRACTOR_KEYWORDS = [
  '오답', 'distractor', '매력적', '오답 선택지',
  '①', '②', '③', '④', '⑤', '선택지',
  '함정', 'trap', '혼동', '오개념',
  '오답률', '매력도', 'plausible'
];

// 변별력 관련 키워드
const DISCRIMINATION_KEYWORDS = [
  '변별', 'discrimination', '변별력', '상위', '하위',
  '정답률', '오답률', 'difficulty index'
];

// 난이도 관련 키워드
const DIFFICULTY_KEYWORDS = [
  '난이도', 'difficulty', 'level',
  '쉬움', '중간', '어려움',
  '하', '중하', '중', '중상', '상',
  '1등급', '2등급', '3등급', '4등급'
];

// 출력 포맷 필수 키워드
const OUTPUT_FORMAT_KEYWORDS = {
  passage: ['passage', 'stimulus', 'transcript', '지문', '대본'],
  question: ['question', 'question_stem', 'stem', '발문', '문제'],
  options: ['options', 'choices', 'alternatives', '선택지', '보기'],
  answer: ['answer', 'correct_answer', 'answer_key', '정답'],
  explanation: ['explanation', 'rationale', 'solution', '해설', '풀이']
};

// LC 문항 전용 키워드
const LC_SPECIFIC_KEYWORDS = {
  lc_script: ['lc_script', 'script', 'listening script', '듣기 대본', '스크립트']
};

// RC29 어법 문항 전용 필드
const RC29_REQUIRED_FIELDS = {
  grammar_meta: ['grammar_meta', 'error_type', '문법 오류', '어법 오류']
};

// 금지 패턴 (너무 짧거나 모호한 프롬프트)
const FORBIDDEN_PATTERNS = [
  /^.{0,100}수능.{0,50}(만들어|생성|작성).{0,50}$/i,
  /^.{0,50}문항.{0,30}(생성|만들어).{0,30}$/i,
  /^(create|generate|make).{0,50}(question|item).{0,50}$/i
];

// 최소 프롬프트 길이
const MIN_PROMPT_LENGTH = 200;
```

---

## 3. 검증 카테고리 (4단계)

### 3.1 카테고리 A: 기본 구조 검증

```javascript
/**
 * A1: MASTER_PROMPT 참조 확인
 */
function validateMasterPromptReference(promptText) {
  const errors = [];
  const warnings = [];

  const hasMasterRef = /master|마스터|기본\s*프롬프트|system\s*prompt/i.test(promptText);
  if (!hasMasterRef) {
    // 경고 수준 (필수는 아님)
    warnings.push('[A1] MASTER_PROMPT 참조가 명시되지 않았습니다.');
  }

  return { errors, warnings };
}

/**
 * A3: 출력 포맷 명시 확인
 */
function validateOutputFormat(promptText, itemNo = null) {
  const errors = [];
  const warnings = [];
  const missingFormats = [];

  // 각 필수 출력 필드 확인
  for (const [field, keywords] of Object.entries(OUTPUT_FORMAT_KEYWORDS)) {
    const hasField = keywords.some(kw =>
      promptText.toLowerCase().includes(kw.toLowerCase())
    );
    if (!hasField) {
      missingFormats.push(field);
    }
  }

  if (missingFormats.length > 0) {
    warnings.push(`[A3] 다음 출력 필드가 명시되지 않음: ${missingFormats.join(', ')}`);
  }

  // A4: 선택지 5개 고정 명시 확인
  const hasFiveOptions = /5\s*개|five|5\s*options|선택지\s*5|①②③④⑤/i.test(promptText);
  if (!hasFiveOptions) {
    warnings.push('[A4] 선택지 개수(5개) 고정이 명시되지 않았습니다.');
  }

  // A5: LC 문항 전용 lc_script 검증
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

  // A6: RC29 어법 문항 전용 grammar_meta 검증
  if (numItemNo === 29) {
    const hasGrammarMeta = RC29_REQUIRED_FIELDS.grammar_meta.some(kw =>
      promptText.toLowerCase().includes(kw.toLowerCase())
    );
    if (!hasGrammarMeta) {
      warnings.push('[A6] RC29(어법) 문항에 grammar_meta 관련 키워드가 없습니다.');
    }
  }

  return { errors, warnings };
}
```

### 3.2 카테고리 B: 문항 번호별 필수 선언

```javascript
/**
 * B1: 문항 유형 선언 확인
 */
function validateItemTypeDeclaration(promptText, itemNo) {
  const errors = [];
  const warnings = [];

  const thinkingType = THINKING_TYPES[itemNo];
  if (!thinkingType) {
    warnings.push(`[B1] 문항 번호 ${itemNo}에 대한 사고 유형이 정의되지 않음`);
    return { errors, warnings };
  }

  // 문항 유형 키워드 존재 여부 확인
  const hasTypeKeyword = thinkingType.keywords.some(kw =>
    promptText.toLowerCase().includes(kw.toLowerCase())
  );

  if (!hasTypeKeyword) {
    warnings.push(`[B1] 문항 유형(${thinkingType.type}) 관련 키워드가 부족합니다.`);
  }

  return { errors, warnings };
}

/**
 * B2: 사고 유형 매칭 확인
 */
function validateThinkingType(promptText, itemNo) {
  const errors = [];
  const warnings = [];

  const thinkingType = THINKING_TYPES[itemNo];
  if (!thinkingType) {
    return { errors, warnings };
  }

  // 키워드 매칭 점수 계산
  const matchedKeywords = thinkingType.keywords.filter(kw =>
    promptText.toLowerCase().includes(kw.toLowerCase())
  );

  const matchRatio = matchedKeywords.length / thinkingType.keywords.length;

  if (matchRatio < 0.3) {
    warnings.push(`[B2] 사고 유형 키워드 매칭률 낮음: ${Math.round(matchRatio * 100)}%`);
  }

  return { errors, warnings, matchRatio, matchedKeywords };
}

/**
 * B3: 난이도 목표 명시 확인
 */
function validateDifficultyTarget(promptText) {
  const errors = [];
  const warnings = [];

  const hasDifficulty = DIFFICULTY_KEYWORDS.some(kw =>
    promptText.toLowerCase().includes(kw.toLowerCase())
  );

  if (!hasDifficulty) {
    warnings.push('[B3] 난이도 목표가 명시되지 않았습니다.');
  }

  return { errors, warnings };
}
```

### 3.3 카테고리 C: 오답 설계 선언 (핵심)

```javascript
/**
 * C1: 오답 설계 키워드 존재 확인
 */
function validateDistractorDesign(promptText) {
  const errors = [];
  const warnings = [];

  const matchedKeywords = DISTRACTOR_KEYWORDS.filter(kw =>
    promptText.toLowerCase().includes(kw.toLowerCase())
  );

  if (matchedKeywords.length === 0) {
    errors.push('[C1] 오답 설계 관련 키워드가 전혀 없습니다. (필수)');
  } else if (matchedKeywords.length < 3) {
    warnings.push(`[C1] 오답 설계 키워드 부족: ${matchedKeywords.length}개`);
  }

  return { errors, warnings, matchedKeywords };
}

/**
 * C2: 변별력 고려 확인
 */
function validateDiscrimination(promptText) {
  const errors = [];
  const warnings = [];

  const hasDiscrimination = DISCRIMINATION_KEYWORDS.some(kw =>
    promptText.toLowerCase().includes(kw.toLowerCase())
  );

  if (!hasDiscrimination) {
    warnings.push('[C2] 변별력 관련 언급이 없습니다.');
  }

  return { errors, warnings };
}
```

### 3.4 카테고리 D: 금지/경고 패턴

```javascript
/**
 * D1: 금지 패턴 검사
 */
function validateForbiddenPatterns(promptText) {
  const errors = [];
  const warnings = [];

  // 최소 길이 검사
  if (promptText.length < MIN_PROMPT_LENGTH) {
    errors.push(`[D1] 프롬프트가 너무 짧습니다. (최소 ${MIN_PROMPT_LENGTH}자)`);
  }

  // 금지 패턴 매칭
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(promptText)) {
      errors.push('[D1b] 너무 단순한 프롬프트 패턴이 감지되었습니다.');
      break;
    }
  }

  return { errors, warnings };
}

/**
 * D3: 사고 유형 명확성 검사
 */
function validateThinkingTypeClarity(promptText, itemNo) {
  const errors = [];
  const warnings = [];

  // 복수 사고 유형이 혼재된 경우 경고
  let matchedTypes = 0;
  for (const [key, value] of Object.entries(THINKING_TYPES)) {
    if (key === String(itemNo)) continue;

    const hasOtherType = value.keywords.some(kw =>
      promptText.toLowerCase().includes(kw.toLowerCase())
    );
    if (hasOtherType) matchedTypes++;
  }

  if (matchedTypes > 2) {
    warnings.push('[D3] 여러 문항 유형의 키워드가 혼재되어 있습니다. 명확성을 높이세요.');
  }

  return { errors, warnings };
}
```

---

## 4. 통합 검증 함수

```javascript
/**
 * 프롬프트 전체 검증 (메인 함수)
 * @param {string} promptText - 검증할 프롬프트 텍스트
 * @param {string|number} itemNo - 문항 번호 (예: 18, '41-42')
 * @returns {Object} 검증 결과
 */
function validatePrompt(promptText, itemNo) {
  const allErrors = [];
  const allWarnings = [];

  // 체크리스트 구조
  const checklist = {
    A: { name: '기본 구조', items: [] },
    B: { name: '문항 번호별 필수 선언', items: [] },
    C: { name: '오답 설계 선언', items: [] },
    D: { name: '금지/경고 패턴', items: [] }
  };

  // ===== A. 기본 구조 검증 =====
  const a1 = validateMasterPromptReference(promptText);
  const a3 = validateOutputFormat(promptText, itemNo);

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

  // ===== B. 문항 번호별 필수 선언 =====
  const b1 = validateItemTypeDeclaration(promptText, itemNo);
  const b2 = validateThinkingType(promptText, itemNo);
  const b3 = validateDifficultyTarget(promptText);

  checklist.B.items.push({ code: 'B1', name: '문항 유형 선언', pass: b1.errors.length === 0 && b1.warnings.length === 0 });
  checklist.B.items.push({ code: 'B2', name: '사고 유형 매칭', pass: b2.errors.length === 0 && b2.warnings.length === 0 });
  checklist.B.items.push({ code: 'B3', name: '난이도 목표', pass: b3.errors.length === 0 && b3.warnings.length === 0 });

  allErrors.push(...b1.errors, ...b2.errors, ...b3.errors);
  allWarnings.push(...b1.warnings, ...b2.warnings, ...b3.warnings);

  // ===== C. 오답 설계 선언 (핵심) =====
  const c1 = validateDistractorDesign(promptText);
  const c2 = validateDiscrimination(promptText);

  checklist.C.items.push({ code: 'C1', name: '오답 설계 키워드', pass: c1.errors.length === 0 });
  checklist.C.items.push({ code: 'C2', name: '변별력 고려', pass: c2.errors.length === 0 && c2.warnings.length === 0 });

  allErrors.push(...c1.errors, ...c2.errors);
  allWarnings.push(...c1.warnings, ...c2.warnings);

  // ===== D. 금지/경고 패턴 =====
  const d1 = validateForbiddenPatterns(promptText);
  const d3 = validateThinkingTypeClarity(promptText, itemNo);

  checklist.D.items.push({ code: 'D1', name: '최소 길이/금지 패턴', pass: d1.errors.length === 0 });
  checklist.D.items.push({ code: 'D3', name: '사고 유형 명확성', pass: d3.warnings.length === 0 });

  allErrors.push(...d1.errors, ...d3.errors);
  allWarnings.push(...d1.warnings, ...d3.warnings);

  // ===== 점수 계산 (가중치 적용) =====
  const CATEGORY_WEIGHTS = {
    A: 1.0,   // 기본 구조
    B: 1.5,   // 문항 번호별 필수 선언
    C: 2.0,   // 오답 설계 선언 (핵심, 가장 높은 가중치)
    D: 0.8    // 금지/경고 패턴
  };

  let totalWeightedScore = 0;
  let maxWeightedScore = 0;

  for (const [catKey, cat] of Object.entries(checklist)) {
    const weight = CATEGORY_WEIGHTS[catKey] || 1.0;
    const catItemCount = cat.items.length;
    const catPassedCount = cat.items.filter(item => item.pass).length;

    totalWeightedScore += catPassedCount * weight;
    maxWeightedScore += catItemCount * weight;
  }

  const score = maxWeightedScore > 0
    ? Math.round((totalWeightedScore / maxWeightedScore) * 100)
    : 0;

  // 전체 통과 여부 (오류가 하나도 없어야 함)
  const pass = allErrors.length === 0;

  return {
    pass,
    score,
    errors: allErrors,
    warnings: allWarnings,
    checklist,
    summary: pass
      ? `프롬프트 검증 통과 (${score}점)`
      : `프롬프트 검증 실패 (${score}점) - 오류 ${allErrors.length}건`
  };
}
```

---

## 5. 사용 예시

```javascript
// 사용 예시
const promptText = `
[RC20 주장 파악] 다음 글에서 필자가 주장하는 바로 가장 적절한 것을 고르시오.

## 문항 유형
- 유형: 주장 파악 (Claim Identification)
- 난이도: 중 (3등급 수준)
- 사고 유형: 필자의 핵심 주장을 파악하고 선택지와 매칭

## 출력 형식
- passage: 지문 텍스트 (150-180단어)
- question: 발문
- options: 5개 선택지 (①②③④⑤)
- answer: 정답 번호 (1-5)
- explanation: 해설

## 오답 설계 지침
- 각 오답은 지문의 세부 내용을 왜곡하여 매력적으로 구성
- ① 주장과 반대되는 내용
- ② 지문에 언급되지 않은 내용
- ③ 부분적으로만 맞는 내용
- ④ 과도한 일반화
- 변별력을 위해 상위권 학생도 고민할 수 있는 오답 포함
`;

const result = validatePrompt(promptText, 20);
console.log(result);

/*
출력 예시:
{
  pass: true,
  score: 92,
  errors: [],
  warnings: ['[A1] MASTER_PROMPT 참조가 명시되지 않았습니다.'],
  checklist: { A: {...}, B: {...}, C: {...}, D: {...} },
  summary: '프롬프트 검증 통과 (92점)'
}
*/
```

---

## 6. 확장 가이드

### 6.1 새로운 문항 유형 추가

```javascript
// THINKING_TYPES에 새 유형 추가
THINKING_TYPES[46] = {
  type: '새로운 유형',
  keywords: ['키워드1', '키워드2', 'keyword3']
};
```

### 6.2 검증 규칙 추가

```javascript
// 새로운 검증 함수 추가
function validateNewRule(promptText, itemNo) {
  const errors = [];
  const warnings = [];

  // 검증 로직
  if (/* 조건 */) {
    errors.push('[X1] 새로운 오류 메시지');
  }

  return { errors, warnings };
}

// 통합 검증 함수에 추가
// checklist에 새 카테고리 또는 항목 추가
```

### 6.3 가중치 조정

```javascript
// 도메인에 맞게 가중치 조정
const CATEGORY_WEIGHTS = {
  A: 1.0,   // 기본 구조
  B: 1.5,   // 문항 유형 (중요도에 따라 조정)
  C: 2.5,   // 핵심 요소 (더 높은 가중치)
  D: 0.5    // 부가 검증
};
```

---

## 7. 파일 구조

```
prompt-validator/
├── index.js              # 메인 진입점, validatePrompt 함수 export
├── constants/
│   ├── thinkingTypes.js  # THINKING_TYPES 정의
│   ├── keywords.js       # 각종 키워드 상수
│   └── patterns.js       # FORBIDDEN_PATTERNS 등
├── validators/
│   ├── basicStructure.js # 카테고리 A 검증 함수
│   ├── itemType.js       # 카테고리 B 검증 함수
│   ├── distractor.js     # 카테고리 C 검증 함수
│   └── forbidden.js      # 카테고리 D 검증 함수
├── utils/
│   ├── scoring.js        # 점수 계산 유틸
│   └── helpers.js        # 공통 헬퍼 함수
└── tests/
    └── validator.test.js # 테스트 코드
```

---

## 8. API 응답 형식

```typescript
interface ValidationResult {
  pass: boolean;           // 전체 통과 여부
  score: number;           // 0-100 점수
  errors: string[];        // 오류 메시지 배열
  warnings: string[];      // 경고 메시지 배열
  checklist: {
    [category: string]: {
      name: string;
      items: Array<{
        code: string;      // 예: 'A1', 'B2'
        name: string;      // 검증 항목 이름
        pass: boolean;     // 통과 여부
      }>;
    };
  };
  summary: string;         // 요약 메시지
}
```

---

## 9. 체크리스트 요약표

| 카테고리 | 코드 | 검증 항목 | 가중치 | 설명 |
|---------|------|----------|--------|------|
| A | A1 | MASTER_PROMPT 참조 | 1.0 | 기본 프롬프트 참조 여부 |
| A | A3 | 출력 포맷 명시 | 1.0 | passage, question, options, answer, explanation |
| A | A4 | 선택지 5개 고정 | 1.0 | 선택지 개수 명시 |
| A | A5 | LC 스크립트 명시 | 1.0 | (LC 전용) lc_script 필드 |
| A | A6 | grammar_meta 명시 | 1.0 | (RC29 전용) 어법 메타 필드 |
| B | B1 | 문항 유형 선언 | 1.5 | 해당 문항의 사고 유형 키워드 |
| B | B2 | 사고 유형 매칭 | 1.5 | 키워드 매칭률 검사 |
| B | B3 | 난이도 목표 | 1.5 | 난이도 관련 언급 |
| C | C1 | 오답 설계 키워드 | 2.0 | 오답/distractor 설계 언급 (필수) |
| C | C2 | 변별력 고려 | 2.0 | 변별력 관련 언급 |
| D | D1 | 최소 길이/금지 패턴 | 0.8 | 프롬프트 길이 및 단순 패턴 검사 |
| D | D3 | 사고 유형 명확성 | 0.8 | 복수 유형 혼재 여부 |

---

*이 템플릿은 수능 영어 문항 생성 프롬프트 검증을 위해 설계되었으며,*
*다른 도메인에 맞게 THINKING_TYPES와 키워드 상수를 수정하여 활용할 수 있습니다.*
