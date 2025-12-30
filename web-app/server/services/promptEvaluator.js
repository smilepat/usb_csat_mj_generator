/**
 * server/services/promptEvaluator.js
 * LLM 기반 프롬프트 품질 평가 서비스
 */

const { callLLM } = require('./llmClient');
const { getConfig } = require('./configService');
const logger = require('./logger');

/**
 * 프롬프트 평가용 시스템 프롬프트
 */
const EVALUATOR_SYSTEM_PROMPT = `You are an expert prompt engineer specializing in Korean CSAT (수능) English test item generation.
Your task is to evaluate the quality of prompts used for generating test items.

Evaluate the given prompt based on these criteria:
1. **Clarity (명확성)**: Are instructions clear and unambiguous?
2. **Completeness (완전성)**: Does it include all necessary information?
3. **Consistency (일관성)**: Are there any conflicting instructions?
4. **Specificity (구체성)**: Is the expected output format clearly defined?
5. **CSAT Appropriateness (수능 적합성)**: Is it suitable for Korean CSAT English items?

You MUST respond in the following JSON format only (no other text):
{
  "overall_score": <1-10>,
  "criteria_scores": {
    "clarity": <1-10>,
    "completeness": <1-10>,
    "consistency": <1-10>,
    "specificity": <1-10>,
    "csat_appropriateness": <1-10>
  },
  "strengths": ["<strength1>", "<strength2>", ...],
  "weaknesses": ["<weakness1>", "<weakness2>", ...],
  "suggestions": ["<suggestion1>", "<suggestion2>", ...],
  "improved_prompt": "<optional: improved version of the prompt if score < 7>"
}

Provide feedback in Korean for better understanding by Korean users.`;

/**
 * 프롬프트 유형별 평가 컨텍스트
 */
function getEvaluationContext(promptKey) {
  if (promptKey === 'MASTER_PROMPT') {
    return `이 프롬프트는 모든 수능 영어 문항 생성에 적용되는 마스터 시스템 프롬프트입니다.
JSON 스키마 정의, 공통 출력 형식, 기본 지침 등이 포함되어야 합니다.`;
  }

  if (promptKey === 'PASSAGE_MASTER') {
    return `이 프롬프트는 수능 영어 지문을 자동 생성할 때 사용되는 마스터 프롬프트입니다.
지문 작성 가이드라인, 난이도 조절 지침, 수능 스타일 유지 방법 등이 포함되어야 합니다.`;
  }

  if (/^\d+$/.test(promptKey)) {
    const itemNo = parseInt(promptKey);
    const typeDescriptions = {
      18: '글의 목적 파악',
      19: '심경 변화 추론',
      20: '필자 주장 파악',
      21: '함축 의미 추론',
      22: '글의 요지 파악',
      23: '글의 주제 파악',
      24: '글의 제목 추론',
      25: '도표 이해',
      26: '내용 일치 (인물)',
      27: '내용 일치 (안내문)',
      28: '어휘 추론',
      29: '어법 (밑줄 5개 중 틀린 것)',
      30: '지칭 추론',
      31: '빈칸 추론 (어구)',
      32: '빈칸 추론 (어구)',
      33: '빈칸 추론 (문장)',
      34: '빈칸 추론 (문장)',
      35: '무관한 문장 찾기',
      36: '글의 순서 배열',
      37: '글의 순서 배열',
      38: '문장 삽입',
      39: '문장 삽입',
      40: '요약문 완성'
    };
    const desc = typeDescriptions[itemNo] || '문항';
    return `이 프롬프트는 수능 영어 ${itemNo}번 유형(${desc}) 문항 생성에 사용됩니다.
해당 유형의 특성에 맞는 구체적인 지침이 포함되어야 합니다.`;
  }

  if (/^P\d+/.test(promptKey)) {
    const itemNo = promptKey.replace('P', '');
    return `이 프롬프트는 ${itemNo}번 문항용 지문 생성에 사용됩니다.
해당 유형에 적합한 지문 작성 지침이 포함되어야 합니다.`;
  }

  return '이 프롬프트의 용도를 파악하여 적절히 평가해주세요.';
}

/**
 * LLM을 사용하여 프롬프트 품질 평가
 * @param {string} promptKey - 프롬프트 키
 * @param {string} promptText - 프롬프트 내용
 * @returns {Object} 평가 결과
 */
async function evaluatePrompt(promptKey, promptText) {
  const config = getConfig();

  if (!promptText || promptText.trim().length === 0) {
    return {
      success: false,
      error: '프롬프트가 비어 있습니다.'
    };
  }

  const context = getEvaluationContext(promptKey);

  const userPrompt = `다음 프롬프트를 평가해주세요.

[프롬프트 키] ${promptKey}

[프롬프트 용도]
${context}

[평가 대상 프롬프트]
---
${promptText}
---

위 프롬프트를 평가 기준에 따라 분석하고 JSON 형식으로 결과를 제공해주세요.`;

  try {
    const response = await callLLM(EVALUATOR_SYSTEM_PROMPT, userPrompt, config);

    // JSON 파싱 시도
    let result;
    try {
      // JSON 블록 추출
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 형식을 찾을 수 없습니다.');
      }
    } catch (parseError) {
      logger.warn('프롬프트 평가 JSON 파싱 실패', promptKey, parseError.message);
      return {
        success: false,
        error: 'LLM 응답 파싱 실패: ' + parseError.message,
        raw_response: response
      };
    }

    // 결과 정규화
    const normalized = normalizeEvaluationResult(result);

    return {
      success: true,
      data: normalized
    };

  } catch (error) {
    logger.error('프롬프트 평가 실패', promptKey, error);
    return {
      success: false,
      error: 'LLM 호출 실패: ' + error.message
    };
  }
}

/**
 * 평가 결과 정규화
 * @param {Object} result - LLM 응답 결과
 * @returns {Object} 정규화된 결과
 */
function normalizeEvaluationResult(result) {
  const normalized = {
    overall_score: Math.min(10, Math.max(1, result.overall_score || 5)),
    criteria_scores: {
      clarity: Math.min(10, Math.max(1, result.criteria_scores?.clarity || 5)),
      completeness: Math.min(10, Math.max(1, result.criteria_scores?.completeness || 5)),
      consistency: Math.min(10, Math.max(1, result.criteria_scores?.consistency || 5)),
      specificity: Math.min(10, Math.max(1, result.criteria_scores?.specificity || 5)),
      csat_appropriateness: Math.min(10, Math.max(1, result.criteria_scores?.csat_appropriateness || 5))
    },
    strengths: Array.isArray(result.strengths) ? result.strengths : [],
    weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    improved_prompt: result.improved_prompt || null
  };

  // 등급 계산
  normalized.grade = getGrade(normalized.overall_score);
  normalized.grade_label = getGradeLabel(normalized.grade);

  return normalized;
}

/**
 * 점수를 등급으로 변환
 */
function getGrade(score) {
  if (score >= 9) return 'A';
  if (score >= 7) return 'B';
  if (score >= 5) return 'C';
  if (score >= 3) return 'D';
  return 'F';
}

/**
 * 등급 라벨 반환
 */
function getGradeLabel(grade) {
  const labels = {
    'A': '우수 - 바로 사용 가능',
    'B': '양호 - 소폭 개선 권장',
    'C': '보통 - 개선 필요',
    'D': '미흡 - 상당한 개선 필요',
    'F': '부족 - 전면 재작성 권장'
  };
  return labels[grade] || '평가 불가';
}

/**
 * 빠른 규칙 기반 사전 검증 (LLM 호출 전)
 * @param {string} promptKey - 프롬프트 키
 * @param {string} promptText - 프롬프트 내용
 * @returns {Object} 사전 검증 결과
 */
function quickValidate(promptKey, promptText) {
  const issues = [];
  const warnings = [];

  // 길이 체크
  if (promptText.length < 50) {
    issues.push('프롬프트가 너무 짧습니다 (최소 50자 권장)');
  }

  if (promptText.length > 10000) {
    warnings.push('프롬프트가 매우 깁니다. 토큰 비용에 주의하세요.');
  }

  // MASTER_PROMPT 전용 체크
  if (promptKey === 'MASTER_PROMPT') {
    if (!promptText.includes('JSON')) {
      issues.push('MASTER_PROMPT에 JSON 관련 지침이 없습니다.');
    }
    if (!promptText.includes('item_no') && !promptText.includes('itemNo')) {
      warnings.push('item_no 필드에 대한 언급이 없습니다.');
    }
  }

  // 문항 프롬프트 체크
  if (/^\d+$/.test(promptKey)) {
    const itemNo = parseInt(promptKey);

    // RC29 어법
    if (itemNo === 29) {
      if (!promptText.includes('밑줄') && !promptText.includes('underline')) {
        warnings.push('RC29는 밑줄 문항입니다. 밑줄 관련 지침이 없습니다.');
      }
    }

    // RC31-34 빈칸
    if (itemNo >= 31 && itemNo <= 34) {
      if (!promptText.includes('빈칸') && !promptText.includes('blank')) {
        warnings.push('빈칸 문항인데 빈칸 관련 지침이 없습니다.');
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * 사용자 피드백 기반 프롬프트 개선용 시스템 프롬프트
 */
const IMPROVEMENT_SYSTEM_PROMPT = `You are an expert prompt engineer specializing in Korean CSAT (수능) English test item generation.
Your task is to improve a prompt based on user feedback.

Guidelines:
1. Carefully analyze the user's feedback and understand what they want to change
2. Preserve the original structure and intent of the prompt while incorporating the feedback
3. Ensure the improved prompt remains clear, specific, and appropriate for CSAT item generation
4. If the feedback is unclear, make reasonable assumptions and note them
5. Maintain consistency with Korean CSAT English test standards

You MUST respond in the following JSON format only (no other text):
{
  "improved_prompt": "<the improved prompt text>",
  "changes_made": ["<change1>", "<change2>", ...],
  "notes": "<optional: any notes about assumptions or limitations>"
}

Provide the improved prompt and explanations in Korean.`;

/**
 * 사용자 피드백을 기반으로 프롬프트 개선
 * @param {string} promptKey - 프롬프트 키
 * @param {string} promptText - 원본 프롬프트 내용
 * @param {string} feedback - 사용자 피드백
 * @returns {Object} 개선 결과
 */
async function improvePromptWithFeedback(promptKey, promptText, feedback) {
  const config = getConfig();

  if (!promptText || promptText.trim().length === 0) {
    return {
      success: false,
      error: '프롬프트가 비어 있습니다.'
    };
  }

  if (!feedback || feedback.trim().length === 0) {
    return {
      success: false,
      error: '피드백이 비어 있습니다.'
    };
  }

  const context = getEvaluationContext(promptKey);

  const userPrompt = `다음 프롬프트를 사용자 피드백을 반영하여 개선해주세요.

[프롬프트 키] ${promptKey}

[프롬프트 용도]
${context}

[원본 프롬프트]
---
${promptText}
---

[사용자 피드백]
---
${feedback}
---

위 피드백을 반영하여 프롬프트를 개선하고, JSON 형식으로 결과를 제공해주세요.`;

  try {
    const response = await callLLM(IMPROVEMENT_SYSTEM_PROMPT, userPrompt, config);

    // JSON 파싱 시도
    let result;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 형식을 찾을 수 없습니다.');
      }
    } catch (parseError) {
      logger.warn('프롬프트 개선 JSON 파싱 실패', promptKey, parseError.message);
      return {
        success: false,
        error: 'LLM 응답 파싱 실패: ' + parseError.message,
        raw_response: response
      };
    }

    return {
      success: true,
      data: {
        improved_prompt: result.improved_prompt || '',
        changes_made: Array.isArray(result.changes_made) ? result.changes_made : [],
        notes: result.notes || null
      }
    };

  } catch (error) {
    logger.error('프롬프트 개선 실패', promptKey, error);
    return {
      success: false,
      error: 'LLM 호출 실패: ' + error.message
    };
  }
}

module.exports = {
  evaluatePrompt,
  quickValidate,
  getEvaluationContext,
  improvePromptWithFeedback
};
