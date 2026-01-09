/**
 * server/services/promptEvaluator.js
 * LLM 기반 프롬프트 품질 평가 서비스
 * - 출제위원 관점에서 프롬프트 평가
 * - PASS/REVISE/BLOCK 판정
 * - 오답 설계/변별력 평가
 */

const { callLLM } = require('./llmClient');
const { getConfig } = require('./configService');
const logger = require('./logger');
const {
  SEVERITY,
  COMMON_PROMPT_RULES,
  MASTER_PROMPT_RULES,
  PASSAGE_PROMPT_RULES,
  ITEM_KEYWORD_MAP,
  getPromptType,
} = require('./promptEvaluator.rules');

/**
 * ============================================
 * 판정 결과 상수
 * ============================================
 */
const VERDICT = {
  PASS: 'PASS',       // 문항 생성 진행 가능
  REVISE: 'REVISE',   // 개선 권장 (생성은 가능하나 품질 저하 우려)
  BLOCK: 'BLOCK'      // 문항 생성 차단 (필수 수정 필요)
};

/**
 * ============================================
 * 출제위원 관점 평가용 시스템 프롬프트 (새로 추가)
 * ============================================
 */
const EXAMINER_EVALUATOR_SYSTEM_PROMPT = `당신은 30년 경력의 수능 영어 출제위원입니다.
주어진 프롬프트로 생성될 문항의 품질을 "출제위원 관점"에서 엄격하게 평가해야 합니다.

## 평가 관점

당신은 프롬프트 자체가 아닌, "이 프롬프트로 생성될 문항"의 품질을 예측하여 평가합니다.

## 핵심 평가 기준

### 1. 상위권 변별 적합성 (discrimination_fit)
- 이 프롬프트로 생성된 문항이 상위권(1-2등급) 학생을 변별할 수 있는가?
- 단순 해석이나 암기로 풀리지 않고, 추론/분석이 필요한가?
- 정답률 30-50% 수준의 문항이 생성될 수 있는가?

### 2. 오답 설계 품질 (distractor_design)
- 오답 선택지들이 "서로 싸우도록" 설계되어 있는가?
- 각 오답이 고유한 오류 유형(부분 일치, 과잉 일반화, 반대 의미 등)을 가지는가?
- 매력적인 오답이 생성될 수 있도록 지침이 명확한가?
- 정답 외 선택지도 타당해 보이도록 설계되었는가?

### 3. 정답 재진술 위험 (restatement_risk)
- 정답이 단순히 지문을 재진술(paraphrase)해서 쉽게 찾을 수 있는 구조인가?
- 정답 도출에 충분한 추론 과정이 필요한가?
- "정답이 가장 늦게 탈락하도록" 설계되었는가?

### 4. 사고 유형 일치 (thinking_type_match)
- 해당 문항 번호의 사고 요구(예: 31번=빈칸 추론, 22번=요지 파악)와 일치하는가?
- 문항 유형에 맞는 인지 과정이 요구되는가?

## 판정 기준

- **PASS**: 모든 기준 점수가 7점 이상
- **REVISE**: 하나 이상의 기준이 5-6점 (생성 가능하나 개선 권장)
- **BLOCK**: 하나 이상의 기준이 4점 이하 (문항 생성 차단 필요)

## 응답 형식

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):

{
  "verdict": "PASS" | "REVISE" | "BLOCK",
  "overall_score": <1-10>,
  "criteria_scores": {
    "discrimination_fit": <1-10>,
    "distractor_design": <1-10>,
    "restatement_risk": <1-10>,
    "thinking_type_match": <1-10>
  },
  "analysis": {
    "discrimination_fit": "<상위권 변별 적합성 분석>",
    "distractor_design": "<오답 설계 품질 분석>",
    "restatement_risk": "<정답 재진술 위험 분석>",
    "thinking_type_match": "<사고 유형 일치 분석>"
  },
  "critical_issues": ["<심각한 문제점1>", ...],
  "improvement_required": ["<필수 개선사항1>", ...],
  "verdict_reason": "<판정 사유 요약>"
}

한국어로 상세하게 분석해주세요.`;

/**
 * 기존 프롬프트 평가용 시스템 프롬프트 (호환성 유지)
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
 * 문항 유형별 사고 요구 정의
 */
const THINKING_REQUIREMENTS = {
  18: { type: '목적 파악', requirement: '글 전체를 읽고 필자의 의도/목적을 추론' },
  19: { type: '심경 변화', requirement: '등장인물의 감정 변화를 맥락에서 추론' },
  20: { type: '주장 파악', requirement: '필자의 핵심 주장을 파악하고 선택지와 매칭' },
  21: { type: '함축 의미', requirement: '밑줄 친 부분의 함축적 의미를 문맥에서 추론' },
  22: { type: '요지 파악', requirement: '글의 핵심 메시지를 압축하여 파악' },
  23: { type: '주제 파악', requirement: '글의 중심 주제를 추상적으로 파악' },
  24: { type: '제목 추론', requirement: '글 전체를 아우르는 적절한 제목 선택' },
  25: { type: '도표 이해', requirement: '도표 정보와 지문 내용의 일치/불일치 판단' },
  26: { type: '내용 일치', requirement: '지문의 세부 정보와 선택지 비교' },
  27: { type: '안내문 일치', requirement: '안내문의 세부 사항과 선택지 비교' },
  28: { type: '어휘 추론', requirement: '문맥에서 밑줄 친 어휘의 적절성 판단' },
  29: { type: '어법 판단', requirement: '밑줄 친 5개 중 문법적 오류 식별' },
  30: { type: '지칭 추론', requirement: '대명사나 지시어가 가리키는 대상 파악' },
  31: { type: '빈칸 추론 (어구)', requirement: '빈칸에 들어갈 어구를 논리적으로 추론' },
  32: { type: '빈칸 추론 (어구)', requirement: '빈칸에 들어갈 어구를 논리적으로 추론' },
  33: { type: '빈칸 추론 (문장)', requirement: '빈칸에 들어갈 문장을 논리적으로 추론' },
  34: { type: '빈칸 추론 (연결어)', requirement: '문장 간 논리 관계 파악하여 연결어 선택' },
  35: { type: '흐름 무관', requirement: '글의 흐름과 무관한 문장 식별' },
  36: { type: '순서 배열', requirement: '주어진 문장들의 논리적 순서 파악' },
  37: { type: '순서 배열', requirement: '주어진 문장들의 논리적 순서 파악' },
  38: { type: '문장 삽입', requirement: '주어진 문장이 들어갈 적절한 위치 파악' },
  39: { type: '문장 삽입', requirement: '주어진 문장이 들어갈 적절한 위치 파악' },
  40: { type: '요약문 완성', requirement: '글의 핵심 내용을 요약하여 빈칸 완성' }
};

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
    const thinkingReq = THINKING_REQUIREMENTS[itemNo];
    if (thinkingReq) {
      return `이 프롬프트는 수능 영어 ${itemNo}번 유형(${thinkingReq.type}) 문항 생성에 사용됩니다.
사고 요구: ${thinkingReq.requirement}
해당 유형의 특성에 맞는 구체적인 지침이 포함되어야 합니다.`;
    }
    return `이 프롬프트는 수능 영어 ${itemNo}번 유형 문항 생성에 사용됩니다.`;
  }

  if (/^P\d+/.test(promptKey)) {
    const itemNo = promptKey.replace('P', '');
    return `이 프롬프트는 ${itemNo}번 문항용 지문 생성에 사용됩니다.
해당 유형에 적합한 지문 작성 지침이 포함되어야 합니다.`;
  }

  return '이 프롬프트의 용도를 파악하여 적절히 평가해주세요.';
}

/**
 * ============================================
 * 출제위원 관점 평가 (새로 추가)
 * ============================================
 */

/**
 * 출제위원 관점에서 프롬프트 평가 (LLM 사용)
 * @param {string} promptKey - 프롬프트 키
 * @param {string} promptText - 프롬프트 내용
 * @returns {Object} 평가 결과 (verdict: PASS/REVISE/BLOCK)
 */
async function evaluatePromptAsExaminer(promptKey, promptText) {
  const config = getConfig();

  if (!promptText || promptText.trim().length === 0) {
    return {
      success: false,
      verdict: VERDICT.BLOCK,
      error: '프롬프트가 비어 있습니다.'
    };
  }

  // 문항 번호 추출
  let itemNo = null;
  if (/^\d+$/.test(promptKey)) {
    itemNo = parseInt(promptKey);
  }

  const thinkingReq = itemNo ? THINKING_REQUIREMENTS[itemNo] : null;
  const context = getEvaluationContext(promptKey);

  const userPrompt = `다음 프롬프트를 "출제위원 관점"에서 평가해주세요.

[프롬프트 키] ${promptKey}

[프롬프트 용도]
${context}

${thinkingReq ? `[해당 문항의 사고 요구]
- 유형: ${thinkingReq.type}
- 요구되는 사고 과정: ${thinkingReq.requirement}
` : ''}

[평가 대상 프롬프트]
---
${promptText}
---

위 프롬프트로 생성될 문항이:
1. 상위권 변별에 적합한가?
2. 오답이 서로 싸우도록 설계되어 있는가?
3. 정답이 지문 재진술로 떨어질 위험은 없는가?
4. ${thinkingReq ? thinkingReq.type : '해당'} 문항의 사고 요구와 일치하는가?

엄격하게 평가하고 PASS/REVISE/BLOCK 판정을 내려주세요.`;

  try {
    const response = await callLLM(EXAMINER_EVALUATOR_SYSTEM_PROMPT, userPrompt, config);

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
      logger.warn('출제위원 평가 JSON 파싱 실패', promptKey, parseError.message);
      return {
        success: false,
        verdict: VERDICT.REVISE,
        error: 'LLM 응답 파싱 실패: ' + parseError.message,
        raw_response: response
      };
    }

    // 결과 정규화
    const normalized = normalizeExaminerResult(result);

    return {
      success: true,
      ...normalized
    };

  } catch (error) {
    logger.error('출제위원 평가 실패', promptKey, error);
    return {
      success: false,
      verdict: VERDICT.REVISE,
      error: 'LLM 호출 실패: ' + error.message
    };
  }
}

/**
 * 출제위원 평가 결과 정규화
 */
function normalizeExaminerResult(result) {
  // 점수 정규화
  const criteriaScores = {
    discrimination_fit: Math.min(10, Math.max(1, result.criteria_scores?.discrimination_fit || 5)),
    distractor_design: Math.min(10, Math.max(1, result.criteria_scores?.distractor_design || 5)),
    restatement_risk: Math.min(10, Math.max(1, result.criteria_scores?.restatement_risk || 5)),
    thinking_type_match: Math.min(10, Math.max(1, result.criteria_scores?.thinking_type_match || 5))
  };

  const overallScore = Math.min(10, Math.max(1, result.overall_score ||
    Math.round((criteriaScores.discrimination_fit +
                criteriaScores.distractor_design +
                criteriaScores.restatement_risk +
                criteriaScores.thinking_type_match) / 4)));

  // 판정 결정 (가장 낮은 점수 기준)
  const minScore = Math.min(...Object.values(criteriaScores));
  let verdict;
  if (result.verdict && Object.values(VERDICT).includes(result.verdict)) {
    verdict = result.verdict;
  } else if (minScore >= 7) {
    verdict = VERDICT.PASS;
  } else if (minScore >= 5) {
    verdict = VERDICT.REVISE;
  } else {
    verdict = VERDICT.BLOCK;
  }

  return {
    verdict,
    overall_score: overallScore,
    criteria_scores: criteriaScores,
    analysis: result.analysis || {},
    critical_issues: Array.isArray(result.critical_issues) ? result.critical_issues : [],
    improvement_required: Array.isArray(result.improvement_required) ? result.improvement_required : [],
    verdict_reason: result.verdict_reason || getDefaultVerdictReason(verdict, criteriaScores)
  };
}

/**
 * 기본 판정 사유 생성
 */
function getDefaultVerdictReason(verdict, scores) {
  if (verdict === VERDICT.PASS) {
    return '모든 평가 기준이 충족되었습니다. 문항 생성을 진행해도 좋습니다.';
  }

  const weakPoints = [];
  if (scores.discrimination_fit < 7) weakPoints.push('상위권 변별력');
  if (scores.distractor_design < 7) weakPoints.push('오답 설계');
  if (scores.restatement_risk < 7) weakPoints.push('정답 재진술 위험');
  if (scores.thinking_type_match < 7) weakPoints.push('사고 유형 일치');

  if (verdict === VERDICT.REVISE) {
    return `다음 항목의 개선이 권장됩니다: ${weakPoints.join(', ')}`;
  }

  return `다음 항목이 심각하게 부족합니다: ${weakPoints.join(', ')}. 프롬프트 수정이 필요합니다.`;
}

/**
 * ============================================
 * 기존 함수들 (호환성 유지)
 * ============================================
 */

/**
 * LLM을 사용하여 프롬프트 품질 평가 (기존 방식)
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

    let result;
    try {
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
 */
function quickValidate(promptKey, promptText) {
  const issues = [];
  const warnings = [];
  const context = { text: promptText, key: promptKey };
  const promptType = getPromptType(promptKey);

  // 1. 공통 규칙 검사
  for (const rule of COMMON_PROMPT_RULES) {
    if (rule.when(context)) {
      if (rule.severity === SEVERITY.ERROR) {
        issues.push(rule.message);
      } else if (rule.severity === SEVERITY.WARN) {
        warnings.push(rule.message);
      }
    }
  }

  // 2. MASTER_PROMPT 전용 규칙 검사
  if (promptType === 'master') {
    for (const rule of MASTER_PROMPT_RULES) {
      if (rule.when(context)) {
        if (rule.severity === SEVERITY.ERROR) {
          issues.push(rule.message);
        } else if (rule.severity === SEVERITY.WARN) {
          warnings.push(rule.message);
        }
      }
    }
  }

  // 3. 지문 생성 프롬프트(P1~P45) 전용 규칙 검사
  if (promptType === 'passage') {
    for (const rule of PASSAGE_PROMPT_RULES) {
      if (rule.when(context)) {
        if (rule.severity === SEVERITY.ERROR) {
          issues.push(rule.message);
        } else if (rule.severity === SEVERITY.WARN) {
          warnings.push(rule.message);
        }
      }
    }
  }

  // 4. 문항 번호별 키워드 검사
  let itemNo = null;
  if (/^\d+$/.test(promptKey)) {
    itemNo = parseInt(promptKey);
  } else if (/^RC(\d+)$/.test(promptKey)) {
    itemNo = parseInt(promptKey.match(/^RC(\d+)$/)[1]);
  } else if (/^LC(\d+)$/.test(promptKey)) {
    itemNo = parseInt(promptKey.match(/^LC(\d+)$/)[1]);
  }

  if (itemNo !== null) {
    const keywordRule = ITEM_KEYWORD_MAP[itemNo];

    if (keywordRule) {
      const hasMatch = keywordRule.requiredAny.some(pattern =>
        pattern.test(promptText || '')
      );

      if (!hasMatch) {
        if (keywordRule.severity === SEVERITY.ERROR) {
          issues.push(keywordRule.message);
        } else if (keywordRule.severity === SEVERITY.WARN) {
          warnings.push(keywordRule.message);
        }
      }

      if (keywordRule.additionalRules && Array.isArray(keywordRule.additionalRules)) {
        for (const addRule of keywordRule.additionalRules) {
          if (!addRule.check(promptText || '')) {
            if (addRule.severity === SEVERITY.ERROR) {
              issues.push(addRule.message);
            } else if (addRule.severity === SEVERITY.WARN) {
              warnings.push(addRule.message);
            }
          }
        }
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    promptType
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

/**
 * ============================================
 * 통합 평가 함수 (새로 추가)
 * ============================================
 */

/**
 * 프롬프트 전체 평가 (기존 평가 + 출제위원 관점)
 * @param {string} promptKey - 프롬프트 키
 * @param {string} promptText - 프롬프트 내용
 * @param {Object} options - 옵션 { includeExaminerEval: true }
 * @returns {Object} 통합 평가 결과
 */
async function evaluatePromptFull(promptKey, promptText, options = {}) {
  const { includeExaminerEval = true } = options;

  const result = {
    promptKey,
    timestamp: new Date().toISOString(),
    quickValidation: null,
    standardEvaluation: null,
    examinerEvaluation: null,
    finalVerdict: VERDICT.PASS,
    summary: ''
  };

  // 1. 빠른 규칙 기반 검증
  result.quickValidation = quickValidate(promptKey, promptText);

  if (!result.quickValidation.passed) {
    result.finalVerdict = VERDICT.BLOCK;
    result.summary = '규칙 기반 검증 실패: ' + result.quickValidation.issues.join(', ');
    return result;
  }

  // 2. 기존 LLM 평가
  const standardResult = await evaluatePrompt(promptKey, promptText);
  result.standardEvaluation = standardResult;

  if (!standardResult.success) {
    result.finalVerdict = VERDICT.REVISE;
    result.summary = '표준 평가 실패: ' + standardResult.error;
    return result;
  }

  // 3. 출제위원 관점 평가 (ITEM PROMPT인 경우)
  if (includeExaminerEval && /^\d+$/.test(promptKey)) {
    const examinerResult = await evaluatePromptAsExaminer(promptKey, promptText);
    result.examinerEvaluation = examinerResult;

    if (examinerResult.success) {
      result.finalVerdict = examinerResult.verdict;
      result.summary = examinerResult.verdict_reason;
    } else {
      // 출제위원 평가 실패 시 표준 평가 기준으로 판정
      const standardScore = standardResult.data?.overall_score || 5;
      if (standardScore >= 7) {
        result.finalVerdict = VERDICT.PASS;
      } else if (standardScore >= 5) {
        result.finalVerdict = VERDICT.REVISE;
      } else {
        result.finalVerdict = VERDICT.BLOCK;
      }
      result.summary = '출제위원 평가 실패, 표준 평가 기준 적용: ' + getGradeLabel(getGrade(standardScore));
    }
  } else {
    // ITEM PROMPT가 아닌 경우 표준 평가만으로 판정
    const standardScore = standardResult.data?.overall_score || 5;
    if (standardScore >= 7) {
      result.finalVerdict = VERDICT.PASS;
    } else if (standardScore >= 5) {
      result.finalVerdict = VERDICT.REVISE;
    } else {
      result.finalVerdict = VERDICT.BLOCK;
    }
    result.summary = '표준 평가 결과: ' + (standardResult.data?.grade_label || '평가 불가');
  }

  return result;
}

module.exports = {
  // 기존 함수들
  evaluatePrompt,
  quickValidate,
  getEvaluationContext,
  improvePromptWithFeedback,
  // 새로 추가된 함수들
  evaluatePromptAsExaminer,
  evaluatePromptFull,
  // 상수들
  VERDICT,
  THINKING_REQUIREMENTS
};
