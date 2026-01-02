// promptEvaluator.rules.js
// ✅ 규칙 기반 검증 룰 정의(LLM 미사용)
// - "프롬프트 텍스트" 검사(Pre-check)
// - "출력 JSON" 검사(Post-check)도 일부 포함 가능(스키마/키/옵션수 등)

const SEVERITY = {
  ERROR: "error",
  WARN: "warn",
  PASS: "pass",
};

/**
 * 공통: 프롬프트 길이/금지어/기본 출력 계약
 */
const COMMON_PROMPT_RULES = [
  {
    id: "LEN_MIN_50",
    severity: SEVERITY.ERROR,
    when: ({ text }) => (text || "").trim().length < 50,
    message: "프롬프트가 너무 짧습니다(50자 미만).",
  },
  {
    id: "LEN_MAX_10000",
    severity: SEVERITY.WARN,
    when: ({ text }) => (text || "").length > 10000,
    message: "프롬프트가 너무 깁니다(10,000자 초과).",
  },

  // "무시/자유형식" 같은 위험한 표현들
  {
    id: "FORBIDDEN_RELAXED_LANGUAGE",
    severity: SEVERITY.WARN,
    when: ({ text }) =>
      /(마음대로|자유롭게|아무렇게나|규칙\s*무시|지침\s*무시|ignore\s+(all|the)\s+instructions)/i.test(
        text || ""
      ),
    message:
      "프롬프트에 규칙 완화/무시 유도 표현이 있습니다(품질 저하 위험).",
  },
];

/**
 * MASTER_PROMPT 전용: 반드시 있어야 하는 핵심 단서들
 * - JSON 출력 강제
 * - 필수 키 언급(최소한 question/options/answer 같은)
 * - CSAT/수능 맥락
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
      !/(question|options|answer)/i.test(text || ""), // 최소 단서
    message:
      "MASTER_PROMPT에 필수 출력 키(question/options/answer) 단서가 부족합니다.",
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
    when: ({ text }) => !/(item_no|문항\s*번호|번호)/i.test(text || ""),
    message: "MASTER_PROMPT에 item_no(문항 번호) 언급이 없습니다.",
  },
];

/**
 * 문항 번호별(또는 문항군별) 프롬프트에 "반드시 포함돼야 하는 개념 키워드" 매핑
 * - 여기서 잡는 건 "프롬프트에 유형 단서가 있냐" (초간단 but 효과 큼)
 */
const ITEM_KEYWORD_MAP = {
  // 예: 29번 어법
  29: {
    requiredAny: [/underline|밑줄/i, /어법|문법/i],
    message: "29번 프롬프트에 밑줄/어법(문법) 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // 31~34 빈칸
  31: {
    requiredAny: [/blank|빈칸/i],
    message: "31번 프롬프트에 빈칸(blank) 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  32: {
    requiredAny: [/blank|빈칸/i],
    message: "32번 프롬프트에 빈칸(blank) 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  33: {
    requiredAny: [/blank|빈칸/i],
    message: "33번 프롬프트에 빈칸(blank) 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  34: {
    requiredAny: [/blank|빈칸/i],
    message: "34번 프롬프트에 빈칸(blank) 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },

  // 필요하면 확장 예시
  35: {
    requiredAny: [/무관|흐름|irrelevant|out of place/i],
    message: "35번 프롬프트에 '흐름과 무관한 문장' 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  36: {
    requiredAny: [/순서|배열|ordering|reorder/i],
    message: "36번 프롬프트에 순서(배열) 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  37: {
    requiredAny: [/순서|배열|ordering|reorder/i],
    message: "37번 프롬프트에 순서(배열) 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  38: {
    requiredAny: [/삽입|insertion|insert/i],
    message: "38번 프롬프트에 문장 삽입 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
  39: {
    requiredAny: [/삽입|insertion|insert/i],
    message: "39번 프롬프트에 문장 삽입 단서가 부족합니다.",
    severity: SEVERITY.WARN,
  },
};

/**
 * 출력 JSON 스키마(최소 버전) - LLM 호출 후 결과를 규칙으로 검증할 때 사용
 * - itemType별로 필요한 필드를 다르게 할 수도 있음
 */
const OUTPUT_SCHEMA = {
  baseRequiredKeys: ["item_no", "question", "options", "answer"],
  optionCount: 5,
  answerRange: [1, 5], // 1~5
};

module.exports = {
  SEVERITY,
  COMMON_PROMPT_RULES,
  MASTER_PROMPT_RULES,
  ITEM_KEYWORD_MAP,
  OUTPUT_SCHEMA,
};
