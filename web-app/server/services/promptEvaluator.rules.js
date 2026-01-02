// promptEvaluator.rules.js
// ✅ 규칙 기반 검증 룰 정의(LLM 미사용)
// - "프롬프트 텍스트" 검사(Pre-check)
// - "출력 JSON" 검사(Post-check)도 일부 포함 가능(스키마/키/옵션수 등)
//
// 📌 규칙 추가/수정 가이드:
// 1. COMMON_PROMPT_RULES: 모든 프롬프트에 적용되는 공통 규칙
// 2. MASTER_PROMPT_RULES: MASTER_PROMPT 전용 규칙
// 3. ITEM_KEYWORD_MAP: 문항 번호별 키워드 검사 규칙
// 4. PASSAGE_PROMPT_RULES: 지문 생성 프롬프트(P1~P45) 전용 규칙
//
// severity 옵션:
// - ERROR: 심각한 문제 (이슈당 10점 감점, 최대 30점)
// - WARN: 경고 (경고당 3점 감점, 최대 15점)
// - PASS: 통과 (감점 없음)

const SEVERITY = {
  ERROR: "error",
  WARN: "warn",
  PASS: "pass",
};

/**
 * ============================================================
 * 공통 규칙: 모든 프롬프트에 적용
 * ============================================================
 */
const COMMON_PROMPT_RULES = [
  // 길이 검사
  {
    id: "LEN_MIN_50",
    severity: SEVERITY.ERROR,
    when: ({ text }) => (text || "").trim().length < 50,
    message: "프롬프트가 너무 짧습니다(50자 미만).",
  },
  {
    id: "LEN_MIN_100",
    severity: SEVERITY.WARN,
    when: ({ text }) => {
      const len = (text || "").trim().length;
      return len >= 50 && len < 100;
    },
    message: "프롬프트가 짧습니다(100자 미만). 더 구체적인 지침 추가를 권장합니다.",
  },
  {
    id: "LEN_MAX_10000",
    severity: SEVERITY.WARN,
    when: ({ text }) => (text || "").length > 10000,
    message: "프롬프트가 너무 깁니다(10,000자 초과). 토큰 비용에 주의하세요.",
  },

  // 위험한 표현 감지
  {
    id: "FORBIDDEN_RELAXED_LANGUAGE",
    severity: SEVERITY.WARN,
    when: ({ text }) =>
      /(마음대로|자유롭게|아무렇게나|규칙\s*무시|지침\s*무시|ignore\s+(all|the)\s+instructions)/i.test(
        text || ""
      ),
    message: "프롬프트에 규칙 완화/무시 유도 표현이 있습니다(품질 저하 위험).",
  },

  // 품질 향상을 위한 권장 요소
  {
    id: "MISSING_OUTPUT_FORMAT",
    severity: SEVERITY.WARN,
    when: ({ text }) =>
      !/(출력\s*형식|output\s*format|형식.*따|format.*follow)/i.test(text || ""),
    message: "출력 형식에 대한 명시적 지침이 없습니다.",
  },

  // 예시 포함 권장
  {
    id: "MISSING_EXAMPLE",
    severity: SEVERITY.WARN,
    when: ({ text }) => {
      const len = (text || "").length;
      // 500자 이상인 프롬프트에서만 예시 권장
      return len >= 500 && !/(예시|example|예:|ex:|e\.g\.|예를\s*들|for\s*instance)/i.test(text || "");
    },
    message: "구체적인 예시가 없습니다. 예시를 추가하면 품질이 향상됩니다.",
  },

  // 한국어/영어 혼용 검사 (수능 영어 문항 특성)
  {
    id: "MISSING_LANGUAGE_INSTRUCTION",
    severity: SEVERITY.WARN,
    when: ({ text }) =>
      !/(영어|English|한국어|Korean|언어|language)/i.test(text || ""),
    message: "언어 사용에 대한 지침이 없습니다(지문 영어, 해설 한국어 등).",
  },
];

/**
 * ============================================================
 * MASTER_PROMPT 전용 규칙
 * ============================================================
 */
const MASTER_PROMPT_RULES = [
  {
    id: "MASTER_MISSING_JSON",
    severity: SEVERITY.ERROR,
    when: ({ text }) => !/(JSON|json)/.test(text || ""),
    message: "MASTER_PROMPT에 JSON 출력 언급이 없습니다.",
  },
  {
    id: "MASTER_MISSING_REQUIRED_KEYS",
    severity: SEVERITY.ERROR,
    when: ({ text }) =>
      !/(question|options|answer)/i.test(text || ""),
    message: "MASTER_PROMPT에 필수 출력 키(question/options/answer) 단서가 부족합니다.",
  },
  {
    id: "MASTER_MISSING_CSAT_CONTEXT",
    severity: SEVERITY.ERROR,
    when: ({ text }) =>
      !/(수능|CSAT|대학수학능력시험|KICE)/i.test(text || ""),
    message: "MASTER_PROMPT에 수능/CSAT 맥락 언급이 없습니다.",
  },
  {
    id: "MASTER_MISSING_ITEM_NO",
    severity: SEVERITY.WARN,
    when: ({ text }) => !/(item_no|itemNo|문항\s*번호)/i.test(text || ""),
    message: "MASTER_PROMPT에 item_no(문항 번호) 필드 언급이 없습니다.",
  },
  {
    id: "MASTER_MISSING_OPTION_COUNT",
    severity: SEVERITY.WARN,
    when: ({ text }) => !/(5\s*개|five|5\s*options|선택지\s*5)/i.test(text || ""),
    message: "MASTER_PROMPT에 선택지 5개 요구 명시가 없습니다.",
  },
  {
    id: "MASTER_MISSING_EXPLANATION",
    severity: SEVERITY.WARN,
    when: ({ text }) => !/(explanation|해설|풀이|정답\s*근거)/i.test(text || ""),
    message: "MASTER_PROMPT에 해설/정답 근거 요구가 없습니다.",
  },
];

/**
 * ============================================================
 * 지문 생성 프롬프트(P1~P45) 전용 규칙
 * ============================================================
 */
const PASSAGE_PROMPT_RULES = [
  {
    id: "PASSAGE_MISSING_LENGTH",
    severity: SEVERITY.WARN,
    when: ({ text }) =>
      !/(단어\s*수|word\s*count|길이|length|\d+\s*words|\d+\s*단어)/i.test(text || ""),
    message: "지문 길이/단어 수에 대한 지침이 없습니다.",
  },
  {
    id: "PASSAGE_MISSING_DIFFICULTY",
    severity: SEVERITY.WARN,
    when: ({ text }) =>
      !/(난이도|difficulty|수준|level|어휘\s*수준|vocabulary\s*level)/i.test(text || ""),
    message: "지문 난이도/어휘 수준에 대한 지침이 없습니다.",
  },
  {
    id: "PASSAGE_MISSING_TOPIC",
    severity: SEVERITY.WARN,
    when: ({ text }) =>
      !/(주제|topic|소재|theme|분야|field|subject)/i.test(text || ""),
    message: "지문 주제/소재에 대한 지침이 없습니다.",
  },
  {
    id: "PASSAGE_MISSING_STRUCTURE",
    severity: SEVERITY.WARN,
    when: ({ text }) =>
      !/(구조|structure|단락|paragraph|흐름|flow|전개)/i.test(text || ""),
    message: "지문 구조/전개 방식에 대한 지침이 없습니다.",
  },
];

/**
 * ============================================================
 * 문항 번호별 키워드 매핑 (18번 ~ 45번)
 * - requiredAny: 하나라도 매칭되면 통과
 * - requiredAll: 모두 매칭되어야 통과 (필요시 사용)
 * ============================================================
 */
const ITEM_KEYWORD_MAP = {
  // ========== 18번: 글의 목적 ==========
  18: {
    requiredAny: [/목적|purpose|의도|intention|why.*write|글.*쓴\s*이유/i],
    message: "18번 프롬프트에 '글의 목적' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 19번: 심경 변화 ==========
  19: {
    requiredAny: [/심경|심리|감정|feeling|emotion|mood|변화|change/i],
    message: "19번 프롬프트에 '심경/감정 변화' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 20번: 필자 주장 ==========
  20: {
    requiredAny: [/주장|claim|argument|opinion|필자.*말|author.*say/i],
    message: "20번 프롬프트에 '필자 주장' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 21번: 함축 의미 ==========
  21: {
    requiredAny: [/함축|imply|의미|meaning|밑줄|underline|뜻/i],
    message: "21번 프롬프트에 '함축 의미' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 22번: 글의 요지 ==========
  22: {
    requiredAny: [/요지|gist|main\s*point|핵심|central\s*idea/i],
    message: "22번 프롬프트에 '글의 요지' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 23번: 글의 주제 ==========
  23: {
    requiredAny: [/주제|topic|subject|theme|about/i],
    message: "23번 프롬프트에 '글의 주제' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 24번: 글의 제목 ==========
  24: {
    requiredAny: [/제목|title|heading|적절.*제목/i],
    message: "24번 프롬프트에 '글의 제목' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 25번: 도표 이해 ==========
  25: {
    requiredAny: [/도표|graph|chart|table|그래프|표/i],
    message: "25번 프롬프트에 '도표/그래프' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 26번: 내용 일치 (인물) ==========
  26: {
    requiredAny: [/인물|person|biography|일치|match|내용.*맞/i],
    message: "26번 프롬프트에 '인물 내용 일치' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 27번: 내용 일치 (안내문) ==========
  27: {
    requiredAny: [/안내|notice|announcement|광고|advertisement|일치|match/i],
    message: "27번 프롬프트에 '안내문 내용 일치' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 28번: 어휘 추론 ==========
  28: {
    requiredAny: [/어휘|vocabulary|word|단어|문맥|context/i],
    message: "28번 프롬프트에 '어휘 추론' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 29번: 어법 (밑줄 5개) ==========
  29: {
    requiredAny: [/underline|밑줄/i, /어법|문법|grammar/i],
    message: "29번 프롬프트에 '밑줄/어법(문법)' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 30번: 지칭 추론 ==========
  30: {
    requiredAny: [/지칭|refer|reference|가리키|indicate/i],
    message: "30번 프롬프트에 '지칭 추론' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 31~34번: 빈칸 추론 ==========
  31: {
    requiredAny: [/blank|빈칸|빈 칸/i],
    message: "31번 프롬프트에 '빈칸(blank)' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  32: {
    requiredAny: [/blank|빈칸|빈 칸/i],
    message: "32번 프롬프트에 '빈칸(blank)' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  33: {
    requiredAny: [/blank|빈칸|빈 칸/i],
    message: "33번 프롬프트에 '빈칸(blank)' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  34: {
    requiredAny: [/blank|빈칸|빈 칸/i],
    message: "34번 프롬프트에 '빈칸(blank)' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 35번: 무관한 문장 ==========
  35: {
    requiredAny: [/무관|관계\s*없|irrelevant|out\s*of\s*place|흐름.*맞지|doesn't\s*belong/i],
    message: "35번 프롬프트에 '흐름과 무관한 문장' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 36~37번: 글의 순서 ==========
  36: {
    requiredAny: [/순서|order|배열|arrange|sequence/i],
    message: "36번 프롬프트에 '글의 순서' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  37: {
    requiredAny: [/순서|order|배열|arrange|sequence/i],
    message: "37번 프롬프트에 '글의 순서' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 38~39번: 문장 삽입 ==========
  38: {
    requiredAny: [/삽입|insert|넣|위치|position|어디/i],
    message: "38번 프롬프트에 '문장 삽입' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  39: {
    requiredAny: [/삽입|insert|넣|위치|position|어디/i],
    message: "39번 프롬프트에 '문장 삽입' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 40번: 요약문 완성 ==========
  40: {
    requiredAny: [/요약|summary|summarize|완성|complete/i],
    message: "40번 프롬프트에 '요약문 완성' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 41~42번: 장문 (제목/순서/삽입) ==========
  41: {
    requiredAny: [/장문|long\s*passage|제목|순서|삽입/i],
    message: "41번 프롬프트에 '장문 독해' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  42: {
    requiredAny: [/장문|long\s*passage|제목|순서|삽입/i],
    message: "42번 프롬프트에 '장문 독해' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // ========== 43~45번: 장문 (세트) ==========
  43: {
    requiredAny: [/장문|long\s*passage|세트|set/i],
    message: "43번 프롬프트에 '장문 세트' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  44: {
    requiredAny: [/장문|long\s*passage|세트|set/i],
    message: "44번 프롬프트에 '장문 세트' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  45: {
    requiredAny: [/장문|long\s*passage|세트|set/i],
    message: "45번 프롬프트에 '장문 세트' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
};

/**
 * ============================================================
 * 출력 JSON 스키마 (문항 생성 결과 검증용)
 * - itemType별로 필요한 필드를 다르게 할 수도 있음
 * ============================================================
 */
const OUTPUT_SCHEMA = {
  // 기본 필수 키
  baseRequiredKeys: ["item_no", "question", "options", "answer"],

  // 선택지 수
  optionCount: 5,

  // 정답 범위
  answerRange: [1, 5],

  // 권장 키 (있으면 좋음)
  recommendedKeys: ["passage", "explanation", "difficulty"],

  // 문항 유형별 추가 필수 키
  typeSpecificKeys: {
    // 25번 도표: 도표 데이터 필요
    25: ["chart_data"],
    // 29번 어법: 밑줄 위치 필요
    29: ["underlined_parts"],
    // 36-37번 순서: 단락 정보 필요
    36: ["paragraphs"],
    37: ["paragraphs"],
    // 38-39번 삽입: 삽입 문장 필요
    38: ["given_sentence"],
    39: ["given_sentence"],
    // 40번 요약: 요약문 빈칸 필요
    40: ["summary_blanks"],
  },
};

/**
 * ============================================================
 * 유틸리티: 프롬프트 키 타입 판별
 * ============================================================
 */
function getPromptType(promptKey) {
  if (promptKey === "MASTER_PROMPT") return "master";
  if (promptKey === "PASSAGE_MASTER") return "passage_master";
  if (/^P\d+/.test(promptKey)) return "passage"; // P1, P31 등
  if (/^LC\d+/.test(promptKey)) return "listening"; // LC16, LC17 등
  if (/^RC\d+/.test(promptKey)) return "reading"; // RC18, RC29 등
  if (/^\d+$/.test(promptKey)) return "item"; // 18, 29 등 (숫자만)
  return "other";
}

module.exports = {
  SEVERITY,
  COMMON_PROMPT_RULES,
  MASTER_PROMPT_RULES,
  PASSAGE_PROMPT_RULES,
  ITEM_KEYWORD_MAP,
  OUTPUT_SCHEMA,
  getPromptType,
};
