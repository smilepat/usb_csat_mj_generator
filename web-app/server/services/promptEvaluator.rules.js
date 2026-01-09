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
 * 문항 번호별 키워드 매핑 (LC 1-17, RC 18-45)
 * - requiredAny: 하나라도 매칭되면 통과
 * - requiredAll: 모두 매칭되어야 통과 (필요시 사용)
 * - additionalRules: 추가 세부 검증 규칙
 * ============================================================
 */
const ITEM_KEYWORD_MAP = {
  // ========== LC 1번: 짧은 대화 목적 ==========
  1: {
    requiredAny: [/대화|dialogue|목적|purpose|듣기|listen/i],
    message: "LC1번 프롬프트에 '대화 목적/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(짧은|short|간단한|brief)/i.test(text),
        message: "LC1번은 짧은 대화 형식이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(음성|audio|스크립트|script|대본)/i.test(text),
        message: "LC1번 듣기 스크립트 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 2번: 의견/주장 ==========
  2: {
    requiredAny: [/의견|opinion|주장|claim|생각|think|듣기|listen/i],
    message: "LC2번 프롬프트에 '의견/주장/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(화자|speaker|말하는\s*사람)/i.test(text),
        message: "LC2번 화자 의견 파악 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 3번: 대화 주제 ==========
  3: {
    requiredAny: [/주제|topic|대화.*내용|what.*about|듣기|listen/i],
    message: "LC3번 프롬프트에 '대화 주제/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(무엇|what|주제|topic)/i.test(text),
        message: "LC3번 대화 주제 파악 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 4번: 그림 내용 일치 ==========
  4: {
    requiredAny: [/그림|picture|image|일치|match|듣기|listen/i],
    message: "LC4번 프롬프트에 '그림 일치/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(시각|visual|묘사|describe)/i.test(text),
        message: "LC4번 그림 묘사 일치 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 5번: 화자 할 일 ==========
  5: {
    requiredAny: [/할\s*일|task|action|무엇.*할|what.*do|듣기|listen/i],
    message: "LC5번 프롬프트에 '할 일/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(남자|여자|man|woman|화자|speaker)/i.test(text),
        message: "LC5번 특정 화자의 할 일 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 6번: 금액/숫자 ==========
  6: {
    requiredAny: [/금액|price|cost|숫자|number|얼마|how\s*much|듣기|listen/i],
    message: "LC6번 프롬프트에 '금액/숫자/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(계산|calculate|총액|total|할인|discount)/i.test(text),
        message: "LC6번 금액 계산 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 7번: 이유 ==========
  7: {
    requiredAny: [/이유|reason|why|왜|듣기|listen/i],
    message: "LC7번 프롬프트에 '이유/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(~않|not|거절|refuse|취소|cancel)/i.test(text),
        message: "LC7번 행동의 이유 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 8번: 언급되지 않은 것 ==========
  8: {
    requiredAny: [/언급|mention|not.*mention|않은|듣기|listen/i],
    message: "LC8번 프롬프트에 '언급되지 않은 것/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(제외|except|않은|not)/i.test(text),
        message: "LC8번 '언급되지 않은 것' 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 9번: 두 사람 관계 ==========
  9: {
    requiredAny: [/관계|relationship|두\s*사람|between|듣기|listen/i],
    message: "LC9번 프롬프트에 '두 사람 관계/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(직업|job|역할|role|의사|doctor|선생|teacher)/i.test(text),
        message: "LC9번 직업/역할 관계 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 10번: 내용 일치 ==========
  10: {
    requiredAny: [/일치|match|내용|content|correct|듣기|listen/i],
    message: "LC10번 프롬프트에 '내용 일치/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(사실|fact|정보|information)/i.test(text),
        message: "LC10번 사실 정보 일치 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 11번: 도표 (듣기) ==========
  11: {
    requiredAny: [/도표|chart|table|graph|듣기|listen/i],
    message: "LC11번 프롬프트에 '도표/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(데이터|data|수치|figure|숫자|number)/i.test(text),
        message: "LC11번 도표 데이터 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 12번: 적절한 응답 (짧은 대화) ==========
  12: {
    requiredAny: [/응답|response|대답|answer|reply|듣기|listen/i],
    message: "LC12번 프롬프트에 '적절한 응답/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(마지막|last|다음|next|이어질)/i.test(text),
        message: "LC12번 다음에 이어질 응답 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 13번: 적절한 응답 (짧은 대화) ==========
  13: {
    requiredAny: [/응답|response|대답|answer|reply|듣기|listen/i],
    message: "LC13번 프롬프트에 '적절한 응답/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(마지막|last|다음|next|이어질)/i.test(text),
        message: "LC13번 다음에 이어질 응답 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 14번: 적절한 응답 (긴 대화) ==========
  14: {
    requiredAny: [/응답|response|대답|answer|reply|듣기|listen/i],
    message: "LC14번 프롬프트에 '적절한 응답/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(긴\s*대화|long.*dialogue|상황|situation)/i.test(text),
        message: "LC14번 긴 대화 상황 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 15번: 상황에 적절한 말 ==========
  15: {
    requiredAny: [/상황|situation|적절한\s*말|appropriate|듣기|listen/i],
    message: "LC15번 프롬프트에 '상황에 적절한 말/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(상황\s*설명|context|배경)/i.test(text),
        message: "LC15번 상황 설명 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 16번: 세트 문항 (담화 1) ==========
  16: {
    requiredAny: [/담화|discourse|lecture|강의|세트|set|듣기|listen/i],
    message: "LC16번 프롬프트에 '담화/세트/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(세트|set|연계|연결|16.*17|두\s*문항)/i.test(text),
        message: "LC16-17번 세트 문항 구조 지침이 필요합니다.",
        severity: SEVERITY.ERROR,
      },
      {
        check: (text) => /(긴\s*담화|long.*discourse|강연|lecture)/i.test(text),
        message: "LC16번 긴 담화 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== LC 17번: 세트 문항 (담화 2) ==========
  17: {
    requiredAny: [/담화|discourse|lecture|강의|세트|set|듣기|listen/i],
    message: "LC17번 프롬프트에 '담화/세트/듣기' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(세트|set|연계|연결|16.*17|두\s*문항)/i.test(text),
        message: "LC16-17번 세트 문항 구조 지침이 필요합니다.",
        severity: SEVERITY.ERROR,
      },
      {
        check: (text) => /(세부\s*내용|detail|구체적)/i.test(text),
        message: "LC17번 세부 내용 파악 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 18번: 글의 목적 ==========
  18: {
    requiredAny: [/목적|purpose|의도|intention|why.*write|글.*쓴\s*이유/i],
    message: "18번 프롬프트에 '글의 목적' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(편지|letter|이메일|email|안내|notice)/i.test(text),
        message: "18번은 편지/이메일/안내문 형식이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(선택지|options|5개|five)/i.test(text),
        message: "18번 선택지 형식 지침이 필요합니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 19번: 심경 변화 ==========
  19: {
    requiredAny: [/심경|심리|감정|feeling|emotion|mood|변화|change/i],
    message: "19번 프롬프트에 '심경/감정 변화' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(서사|narrative|이야기|story|소설|fiction)/i.test(text),
        message: "19번은 서사/이야기 형식 지문이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(→|->|에서.*로|from.*to|변화)/i.test(text),
        message: "19번 심경 '변화' 방향 표시 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 20번: 필자 주장 ==========
  20: {
    requiredAny: [/주장|claim|argument|opinion|필자.*말|author.*say/i],
    message: "20번 프롬프트에 '필자 주장' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(논증|argument|주장.*근거|evidence|support)/i.test(text),
        message: "20번 주장의 근거 제시 방식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 21번: 함축 의미 ==========
  21: {
    requiredAny: [/함축|imply|의미|meaning|밑줄|underline|뜻/i],
    message: "21번 프롬프트에 '함축 의미' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(밑줄|underline|강조|highlight)/i.test(text),
        message: "21번 밑줄 부분 표시 방식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(비유|metaphor|은유|figurative)/i.test(text),
        message: "21번 비유/은유 표현 관련 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 22번: 글의 요지 ==========
  22: {
    requiredAny: [/요지|gist|main\s*point|핵심|central\s*idea/i],
    message: "22번 프롬프트에 '글의 요지' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(주제문|topic\s*sentence|핵심\s*문장)/i.test(text),
        message: "22번 주제문 도출 방식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 23번: 글의 주제 ==========
  23: {
    requiredAny: [/주제|topic|subject|theme|about/i],
    message: "23번 프롬프트에 '글의 주제' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(추상적|abstract|구체적|specific)/i.test(text),
        message: "23번 주제의 추상도 수준 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 24번: 글의 제목 ==========
  24: {
    requiredAny: [/제목|title|heading|적절.*제목/i],
    message: "24번 프롬프트에 '글의 제목' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(함축|imply|은유|metaphor|비유)/i.test(text),
        message: "24번 제목의 함축적/은유적 표현 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(간결|concise|짧|short)/i.test(text),
        message: "24번 제목 형식(간결성) 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 25번: 도표 이해 ==========
  25: {
    requiredAny: [/도표|graph|chart|table|그래프|표/i],
    message: "25번 프롬프트에 '도표/그래프' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(데이터|data|숫자|number|수치|figure)/i.test(text),
        message: "25번 도표 데이터 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(불일치|mismatch|틀린|incorrect)/i.test(text),
        message: "25번 '내용과 일치하지 않는 것' 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 26번: 내용 일치 (인물) ==========
  26: {
    requiredAny: [/인물|person|biography|일치|match|내용.*맞/i],
    message: "26번 프롬프트에 '인물 내용 일치' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(전기|biography|역사적\s*인물|historical)/i.test(text),
        message: "26번 인물 소개글 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(사실|fact|정보|information)/i.test(text),
        message: "26번 사실 정보 포함 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 27번: 내용 일치 (안내문) ==========
  27: {
    requiredAny: [/안내|notice|announcement|광고|advertisement|일치|match/i],
    message: "27번 프롬프트에 '안내문 내용 일치' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(날짜|date|시간|time|장소|place|비용|cost|fee)/i.test(text),
        message: "27번 안내문 필수 정보(날짜/시간/장소/비용) 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 28번: 어휘 추론 ==========
  28: {
    requiredAny: [/어휘|vocabulary|word|단어|문맥|context/i],
    message: "28번 프롬프트에 '어휘 추론' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(밑줄|underline|괄호|bracket)/i.test(text),
        message: "28번 어휘 표시 방식(밑줄/괄호) 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(2개|two|쌍|pair)/i.test(text),
        message: "28번 어휘 쌍(2개) 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 29번: 어법 (밑줄 5개) ==========
  29: {
    requiredAny: [/underline|밑줄/i, /어법|문법|grammar/i],
    message: "29번 프롬프트에 '밑줄/어법(문법)' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(5개|five|5\s*밑줄|5\s*underline)/i.test(text),
        message: "29번 밑줄 5개 형식 지침이 필요합니다(필수).",
        severity: SEVERITY.ERROR,
      },
      {
        check: (text) => /(시제|tense|수일치|agreement|분사|participle|관계사|relative)/i.test(text),
        message: "29번 어법 항목(시제/수일치/분사/관계사 등) 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(grammar_meta|어법\s*메타|설명)/i.test(text),
        message: "29번 각 밑줄 설명(grammar_meta) 출력 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 30번: 지칭 추론 ==========
  30: {
    requiredAny: [/지칭|refer|reference|가리키|indicate/i],
    message: "30번 프롬프트에 '지칭 추론' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(대명사|pronoun|it|they|he|she)/i.test(text),
        message: "30번 대명사 지칭 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 31~34번: 빈칸 추론 ==========
  31: {
    requiredAny: [/blank|빈칸|빈 칸/i],
    message: "31번 프롬프트에 '빈칸(blank)' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(어구|phrase|표현|expression)/i.test(text),
        message: "31번 빈칸 유형(어구) 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(gapped_passage|빈칸.*지문)/i.test(text),
        message: "31번 빈칸 포함 지문 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },
  32: {
    requiredAny: [/blank|빈칸|빈 칸/i],
    message: "32번 프롬프트에 '빈칸(blank)' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(어구|phrase|표현|expression)/i.test(text),
        message: "32번 빈칸 유형(어구) 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },
  33: {
    requiredAny: [/blank|빈칸|빈 칸/i],
    message: "33번 프롬프트에 '빈칸(blank)' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(문장|sentence)/i.test(text),
        message: "33번 빈칸 유형(문장) 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(고난도|high.*difficulty|어려운)/i.test(text),
        message: "33번 고난도 빈칸 특성 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },
  34: {
    requiredAny: [/blank|빈칸|빈 칸/i],
    message: "34번 프롬프트에 '빈칸(blank)' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(문장|sentence)/i.test(text),
        message: "34번 빈칸 유형(문장) 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(고난도|high.*difficulty|어려운)/i.test(text),
        message: "34번 고난도 빈칸 특성 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 35번: 무관한 문장 ==========
  35: {
    requiredAny: [/무관|관계\s*없|irrelevant|out\s*of\s*place|흐름.*맞지|doesn't\s*belong/i],
    message: "35번 프롬프트에 '흐름과 무관한 문장' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(①|②|③|④|⑤|\[1\]|\[2\]|\[3\]|\[4\]|\[5\])/i.test(text),
        message: "35번 문장 번호 표시 형식 지침이 필요합니다(필수).",
        severity: SEVERITY.ERROR,
      },
      {
        check: (text) => /(5\s*문장|five\s*sentences|5개)/i.test(text),
        message: "35번 5개 문장 구조 지침이 필요합니다(필수).",
        severity: SEVERITY.ERROR,
      },
    ],
  },

  // ========== 36~37번: 글의 순서 ==========
  36: {
    requiredAny: [/순서|order|배열|arrange|sequence/i],
    message: "36번 프롬프트에 '글의 순서' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(\(A\)|\(B\)|\(C\)|단락)/i.test(text),
        message: "36번 단락 표시((A), (B), (C)) 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(연결사|connector|transition|however|therefore)/i.test(text),
        message: "36번 연결사 활용 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },
  37: {
    requiredAny: [/순서|order|배열|arrange|sequence/i],
    message: "37번 프롬프트에 '글의 순서' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(\(A\)|\(B\)|\(C\)|단락)/i.test(text),
        message: "37번 단락 표시((A), (B), (C)) 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 38~39번: 문장 삽입 ==========
  38: {
    requiredAny: [/삽입|insert|넣|위치|position|어디/i],
    message: "38번 프롬프트에 '문장 삽입' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(주어진\s*문장|given\s*sentence)/i.test(text),
        message: "38번 '주어진 문장' 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(①|②|③|④|⑤|\[1\]|\[2\]|\[3\]|\[4\]|\[5\])/i.test(text),
        message: "38번 삽입 위치 표시 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },
  39: {
    requiredAny: [/삽입|insert|넣|위치|position|어디/i],
    message: "39번 프롬프트에 '문장 삽입' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(주어진\s*문장|given\s*sentence)/i.test(text),
        message: "39번 '주어진 문장' 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 40번: 요약문 완성 ==========
  40: {
    requiredAny: [/요약|summary|summarize|완성|complete/i],
    message: "40번 프롬프트에 '요약문 완성' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(\(A\)|\(B\)|빈칸\s*2개|two\s*blanks)/i.test(text),
        message: "40번 요약문 빈칸 2개((A), (B)) 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(3x3|3\s*x\s*3|9\s*단어|nine\s*words)/i.test(text),
        message: "40번 선택지 3x3 형식 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 41~42번: 장문 (제목/순서/삽입) ==========
  41: {
    requiredAny: [/장문|long\s*passage|제목|순서|삽입/i],
    message: "41번 프롬프트에 '장문 독해' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(제목|title)/i.test(text),
        message: "41번 제목 추론 유형 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(300|350|400|단어|words)/i.test(text),
        message: "41-42번 장문 길이(300-400단어) 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },
  42: {
    requiredAny: [/장문|long\s*passage|제목|순서|삽입/i],
    message: "42번 프롬프트에 '장문 독해' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(순서|order|삽입|insert)/i.test(text),
        message: "42번 순서/삽입 유형 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },

  // ========== 43~45번: 장문 (세트) ==========
  43: {
    requiredAny: [/장문|long\s*passage|세트|set/i],
    message: "43번 프롬프트에 '장문 세트' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(빈칸|blank|어휘|vocabulary)/i.test(text),
        message: "43번 빈칸/어휘 유형 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
      {
        check: (text) => /(공통\s*지문|shared\s*passage|같은\s*지문)/i.test(text),
        message: "43-45번 공통 지문 사용 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },
  44: {
    requiredAny: [/장문|long\s*passage|세트|set/i],
    message: "44번 프롬프트에 '장문 세트' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(일치|match|내용)/i.test(text),
        message: "44번 내용 일치 유형 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
  },
  45: {
    requiredAny: [/장문|long\s*passage|세트|set/i],
    message: "45번 프롬프트에 '장문 세트' 관련 단서가 부족합니다.",
    severity: SEVERITY.WARN,
    additionalRules: [
      {
        check: (text) => /(일치|match|내용)/i.test(text),
        message: "45번 내용 일치 유형 지침이 권장됩니다.",
        severity: SEVERITY.WARN,
      },
    ],
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
