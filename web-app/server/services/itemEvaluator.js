/**
 * server/services/itemEvaluator.js
 * LLM 기반 생성된 문항 품질 평가 서비스
 *
 * 평가 항목:
 * A. 정답 적합성 (Answer Validity)
 * B. 오답 설계 품질 (Distractor Quality)
 * C. 변별력 탐지 (Discrimination)
 * D. 문항 유형 적합성 (Type Appropriateness)
 * E. 자연스러움/수능 톤 (Naturalness)
 *
 * 운영 방식:
 * - 1차(규칙 기반) 통과 후 2차로 실행
 * - 재생성 트리거 조건 판별
 */

const { callLLM } = require('./llmClient');
const { getConfig } = require('./configService');
const logger = require('./logger');

/**
 * 문항 평가용 시스템 프롬프트
 */
const ITEM_EVALUATOR_SYSTEM_PROMPT = `You are an expert evaluator for Korean CSAT (수능) English test items.
Your task is to evaluate the quality of a GENERATED test item (not a prompt).

You must evaluate the item based on these criteria:

## A. 정답 적합성 (Answer Validity) - 30점
1. 정답이 지문 전체 논지와 일치하는가? (부분 정보만 맞추는 것이 아닌지)
2. 정답이 지문을 다시 읽지 않고는 확신하기 어렵게 설계되었는가?
3. 정답이 지문 표현을 그대로 베끼지 않고 패러프레이즈 되었는가?

## B. 오답 설계 품질 (Distractor Quality) - 25점
1. **각 오답이 서로 다른 오류 유형**을 갖는가?
   - 지엽정보 오답: 지문의 일부만 맞음
   - 과잉해석 오답: 지문보다 과장/확대
   - 반대방향 오답: 논지와 반대
   - 무관정보 오답: 관련 없는 내용
2. **최소 2개 이상의 선택지가 정답 후보**처럼 보이는가?
3. 오답이 "완전 무관" 수준으로 약하지 않은가?
4. 모든 오답이 핵심 주제와 관련은 있되 방향이 다른가?

## C. 변별력 (Discrimination) - 20점
1. 정답이 너무 뻔하게 쉽지 않은가?
2. 정답이 **"가장 늦게 탈락"**하도록 설계되었는가?
3. 오답 중 "바로 제거"되는 약한 선택지가 있는가?
4. 정답 후보가 2개 이상으로 보이는 "복수정답" 위험이 있는가?

## D. 문항 유형 적합성 (Type Appropriateness) - 15점
문항 번호별 특수 검사:
- **빈칸(31-34)**: 빈칸 선택지가 추상적 수준이 적절한가? (너무 구체적이면 안됨)
- **요지(22)/주제(23)**: 예시가 과잉 나열되지 않았는가?
- **심경(19)**: 감정의 방향성이 명확한가? (before→after 전환)
- **제목(24)**: 함축적이면서 핵심을 담았는가?
- **어법(29)**: 5개 밑줄 중 정확히 1개만 틀렸는가?

## E. 자연스러움/수능 톤 (Naturalness) - 10점
1. 지문이 수능 영어 지문처럼 자연스러운가?
2. 불필요한 교훈식/설교 톤이 과하지 않은가?
3. 어휘/표현 수준이 적절한가? (너무 쉽거나 학술적이지 않은가)

You MUST respond in the following JSON format only (no other text):
{
  "scores": {
    "answer_validity": <0-30>,
    "distractor_quality": <0-25>,
    "discrimination": <0-20>,
    "type_appropriateness": <0-15>,
    "naturalness": <0-10>
  },
  "total_score": <0-100>,
  "grade": "<A/B/C/D/F>",
  "verdict": "<PASS/REGENERATE/HUMAN_REVIEW>",
  "issues": {
    "answer_validity": ["<issue1>", ...],
    "distractor_quality": ["<issue1>", ...],
    "discrimination": ["<issue1>", ...],
    "type_appropriateness": ["<issue1>", ...],
    "naturalness": ["<issue1>", ...]
  },
  "distractor_analysis": {
    "error_types": {
      "1": "<오답1의 오류 유형: 지엽정보/과잉해석/반대방향/무관정보/정답>",
      "2": "<오답2의 오류 유형>",
      "3": "<오답3의 오류 유형>",
      "4": "<오답4의 오류 유형>",
      "5": "<오답5의 오류 유형>"
    },
    "attractiveness_ranking": [<매력도 순위: 1위부터 5위까지 번호>],
    "weak_distractors": [<너무 쉽게 제거되는 오답 번호들>]
  },
  "type_specific_check": {
    "passed": <true/false>,
    "details": "<문항 유형별 특수 검사 결과>"
  },
  "regeneration_triggers": {
    "multiple_correct_answers": <true/false>,
    "weak_distractors": <true/false>,
    "answer_copies_passage": <true/false>,
    "too_easy": <true/false>,
    "type_mismatch": <true/false>,
    "distractor_types_not_diverse": <true/false>
  },
  "should_regenerate": <true/false>,
  "regeneration_reason": "<reason if should_regenerate is true>",
  "improvement_suggestions": ["<suggestion1>", "<suggestion2>", ...]
}

Provide all feedback in Korean.`;

/**
 * 문항 유형별 평가 컨텍스트
 */
const ITEM_TYPE_CONTEXT = {
  18: { name: '글의 목적', focus: '편지/이메일의 목적이 명확히 드러나야 함' },
  19: { name: '심경 변화', focus: '심경 변화의 전환점과 방향이 명확해야 함' },
  20: { name: '필자 주장', focus: '주장이 논증적으로 뒷받침되어야 함' },
  21: { name: '함축 의미', focus: '밑줄 표현의 비유적/함축적 의미가 명확해야 함' },
  22: { name: '글의 요지', focus: '핵심 요지가 한국어 선택지로 적절히 표현되어야 함' },
  23: { name: '글의 주제', focus: '주제가 추상적 수준에서 적절히 표현되어야 함' },
  24: { name: '글의 제목', focus: '제목이 함축적이면서 핵심을 담아야 함' },
  25: { name: '도표 이해', focus: '선택지가 도표 데이터와 정확히 대조되어야 함' },
  26: { name: '내용 일치(인물)', focus: '인물 정보의 사실적 정확성이 중요함' },
  27: { name: '내용 일치(안내문)', focus: '날짜/시간/장소/비용 등 세부 정보 정확성' },
  28: { name: '어휘', focus: '문맥상 적절한 어휘 쌍의 대비가 명확해야 함' },
  29: { name: '어법', focus: '5개 밑줄 중 어법상 틀린 것이 정확히 1개여야 함' },
  30: { name: '지칭 추론', focus: '대명사 지칭 대상이 명확히 구분되어야 함' },
  31: { name: '빈칸(어구)', focus: '빈칸이 핵심 논지를 담은 추상적 어구여야 함' },
  32: { name: '빈칸(어구)', focus: '빈칸이 핵심 논지를 담은 추상적 어구여야 함' },
  33: { name: '빈칸(문장)', focus: '빈칸 문장이 글의 핵심 결론이어야 함 (고난도)' },
  34: { name: '빈칸(문장)', focus: '빈칸 문장이 글의 핵심 결론이어야 함 (고난도)' },
  35: { name: '무관한 문장', focus: '무관한 문장이 흐름상 명확히 벗어나야 함' },
  36: { name: '글의 순서', focus: '논리적 연결이 명확한 순서여야 함' },
  37: { name: '글의 순서', focus: '논리적 연결이 명확한 순서여야 함' },
  38: { name: '문장 삽입', focus: '삽입 위치의 논리적 연결이 명확해야 함' },
  39: { name: '문장 삽입', focus: '삽입 위치의 논리적 연결이 명확해야 함' },
  40: { name: '요약문 완성', focus: '요약문의 두 빈칸이 글의 핵심을 담아야 함' },
  41: { name: '장문(제목)', focus: '긴 지문의 제목이 전체 내용을 아우러야 함' },
  42: { name: '장문(순서/삽입)', focus: '장문에서의 논리적 흐름이 명확해야 함' },
  43: { name: '장문 세트', focus: '공통 지문에서 각 문항이 독립적이어야 함' },
  44: { name: '장문 세트', focus: '공통 지문에서 각 문항이 독립적이어야 함' },
  45: { name: '장문 세트', focus: '공통 지문에서 각 문항이 독립적이어야 함' }
};

/**
 * 듣기 문항 유형 컨텍스트 (LC1-17)
 */
const LC_TYPE_CONTEXT = {
  1: { name: '목적 파악', focus: '대화/담화의 목적이 명확해야 함' },
  2: { name: '의견 파악', focus: '화자의 의견이 명확히 드러나야 함' },
  3: { name: '요지 파악', focus: '담화의 핵심 요지가 명확해야 함' },
  4: { name: '그림 불일치', focus: '그림과 대화 내용의 불일치가 명확해야 함' },
  5: { name: '할 일 파악', focus: '화자가 할 일이 하나로 명확해야 함' },
  6: { name: '금액', focus: '금액 계산이 정확해야 함' },
  7: { name: '이유', focus: '이유가 명확히 드러나야 함' },
  8: { name: '언급되지 않은 것', focus: '언급되지 않은 것이 명확해야 함' },
  9: { name: '내용 불일치', focus: '불일치 내용이 명확해야 함' },
  10: { name: '도표 정보', focus: '도표와 대화 내용이 정확히 대응해야 함' },
  11: { name: '짧은 응답', focus: '응답이 문맥에 적절해야 함' },
  12: { name: '짧은 응답', focus: '응답이 문맥에 적절해야 함' },
  13: { name: '긴 응답', focus: '응답이 대화 흐름에 적절해야 함' },
  14: { name: '긴 응답(3점)', focus: '고난도 응답이 문맥에 적절해야 함' },
  15: { name: '상황에 적절한 말', focus: '상황 설명과 적절한 응답이 일치해야 함' },
  16: { name: '긴 담화 세트', focus: '긴 담화에서 각 문항이 독립적이어야 함' },
  17: { name: '긴 담화 세트', focus: '긴 담화에서 각 문항이 독립적이어야 함' }
};

/**
 * 문항을 평가용 텍스트로 포맷팅
 */
function formatItemForEvaluation(itemObj, itemNo) {
  const passage = itemObj.passage || itemObj.stimulus || itemObj.gapped_passage || '';
  const question = itemObj.question || itemObj.question_stem || '';
  const options = itemObj.options || [];
  const answer = itemObj.answer || itemObj.correct_answer || '';
  const explanation = itemObj.explanation || '';

  let formatted = `## 문항 번호: ${itemNo}번\n\n`;

  // 유형 정보
  const typeInfo = ITEM_TYPE_CONTEXT[itemNo] || LC_TYPE_CONTEXT[itemNo];
  if (typeInfo) {
    formatted += `## 문항 유형: ${typeInfo.name}\n`;
    formatted += `## 유형 특성: ${typeInfo.focus}\n\n`;
  }

  // 지문
  formatted += `## 지문 (Passage)\n${passage}\n\n`;

  // 발문
  formatted += `## 발문 (Question)\n${question}\n\n`;

  // 선택지
  formatted += `## 선택지 (Options)\n`;
  options.forEach((opt, i) => {
    const marker = answer == (i + 1) ? '✓' : ' ';
    formatted += `${marker} ① ② ③ ④ ⑤`[i * 2] ? `${['①', '②', '③', '④', '⑤'][i]} ${opt}\n` : '';
    formatted += `${['①', '②', '③', '④', '⑤'][i]} ${opt}\n`;
  });

  // 정답
  formatted += `\n## 정답: ${answer}번\n`;

  // 해설
  if (explanation) {
    formatted += `\n## 해설\n${explanation}\n`;
  }

  return formatted;
}

/**
 * LLM을 사용하여 생성된 문항 품질 평가
 * @param {Object} itemObj - 생성된 문항 객체 (normalized)
 * @param {number} itemNo - 문항 번호
 * @returns {Object} 평가 결과
 */
async function evaluateItem(itemObj, itemNo) {
  const config = getConfig();

  if (!itemObj || typeof itemObj !== 'object') {
    return {
      success: false,
      error: '문항 객체가 유효하지 않습니다.'
    };
  }

  const formattedItem = formatItemForEvaluation(itemObj, itemNo);

  const userPrompt = `다음 수능 영어 문항을 평가해주세요.

${formattedItem}

위 문항을 평가 기준(A~E)에 따라 분석하고, JSON 형식으로 결과를 제공해주세요.
특히 재생성이 필요한 심각한 문제가 있는지 판단해주세요.`;

  try {
    const response = await callLLM(ITEM_EVALUATOR_SYSTEM_PROMPT, userPrompt, config);

    // JSON 파싱
    let result;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 형식을 찾을 수 없습니다.');
      }
    } catch (parseError) {
      logger.warn('문항 평가 JSON 파싱 실패', `item_no:${itemNo}`, parseError.message);
      return {
        success: false,
        error: 'LLM 응답 파싱 실패: ' + parseError.message,
        raw_response: response
      };
    }

    // 결과 정규화
    const normalized = normalizeEvaluationResult(result, itemNo);

    logger.info('문항 평가 완료', `item_no:${itemNo}`,
      `점수: ${normalized.total_score}, 등급: ${normalized.grade}, 재생성: ${normalized.should_regenerate}`);

    return {
      success: true,
      data: normalized
    };

  } catch (error) {
    logger.error('문항 평가 실패', `item_no:${itemNo}`, error);
    return {
      success: false,
      error: 'LLM 호출 실패: ' + error.message
    };
  }
}

/**
 * 판정 상수
 */
const VERDICT = {
  PASS: 'PASS',
  REGENERATE: 'REGENERATE',
  HUMAN_REVIEW: 'HUMAN_REVIEW'
};

/**
 * 평가 결과 정규화
 */
function normalizeEvaluationResult(result, itemNo) {
  const scores = result.scores || {};

  const normalized = {
    item_no: itemNo,
    scores: {
      answer_validity: Math.min(30, Math.max(0, scores.answer_validity || 0)),
      distractor_quality: Math.min(25, Math.max(0, scores.distractor_quality || 0)),
      discrimination: Math.min(20, Math.max(0, scores.discrimination || 0)),
      type_appropriateness: Math.min(15, Math.max(0, scores.type_appropriateness || 0)),
      naturalness: Math.min(10, Math.max(0, scores.naturalness || 0))
    },
    issues: {
      answer_validity: Array.isArray(result.issues?.answer_validity) ? result.issues.answer_validity : [],
      distractor_quality: Array.isArray(result.issues?.distractor_quality) ? result.issues.distractor_quality : [],
      discrimination: Array.isArray(result.issues?.discrimination) ? result.issues.discrimination : [],
      type_appropriateness: Array.isArray(result.issues?.type_appropriateness) ? result.issues.type_appropriateness : [],
      naturalness: Array.isArray(result.issues?.naturalness) ? result.issues.naturalness : []
    },
    // 오답 분석 (새로 추가)
    distractor_analysis: {
      error_types: result.distractor_analysis?.error_types || {},
      attractiveness_ranking: Array.isArray(result.distractor_analysis?.attractiveness_ranking)
        ? result.distractor_analysis.attractiveness_ranking : [],
      weak_distractors: Array.isArray(result.distractor_analysis?.weak_distractors)
        ? result.distractor_analysis.weak_distractors : []
    },
    // 문항 유형별 특수 검사 (새로 추가)
    type_specific_check: {
      passed: result.type_specific_check?.passed !== false,
      details: result.type_specific_check?.details || ''
    },
    regeneration_triggers: {
      multiple_correct_answers: !!result.regeneration_triggers?.multiple_correct_answers,
      weak_distractors: !!result.regeneration_triggers?.weak_distractors,
      answer_copies_passage: !!result.regeneration_triggers?.answer_copies_passage,
      too_easy: !!result.regeneration_triggers?.too_easy,
      type_mismatch: !!result.regeneration_triggers?.type_mismatch,
      distractor_types_not_diverse: !!result.regeneration_triggers?.distractor_types_not_diverse
    },
    improvement_suggestions: Array.isArray(result.improvement_suggestions) ? result.improvement_suggestions : []
  };

  // 총점 계산
  normalized.total_score = Object.values(normalized.scores).reduce((a, b) => a + b, 0);

  // 등급 결정
  if (normalized.total_score >= 90) normalized.grade = 'A';
  else if (normalized.total_score >= 80) normalized.grade = 'B';
  else if (normalized.total_score >= 70) normalized.grade = 'C';
  else if (normalized.total_score >= 60) normalized.grade = 'D';
  else normalized.grade = 'F';

  // 재생성 여부 결정
  const triggers = normalized.regeneration_triggers;
  normalized.should_regenerate =
    triggers.multiple_correct_answers ||
    triggers.weak_distractors ||
    triggers.answer_copies_passage ||
    (triggers.too_easy && normalized.total_score < 70) ||
    triggers.type_mismatch ||
    triggers.distractor_types_not_diverse;

  // 재생성 이유
  if (normalized.should_regenerate) {
    const reasons = [];
    if (triggers.multiple_correct_answers) reasons.push('정답 후보가 2개 이상');
    if (triggers.weak_distractors) reasons.push('오답이 너무 약함');
    if (triggers.answer_copies_passage) reasons.push('정답이 지문 베끼기');
    if (triggers.too_easy) reasons.push('문항이 너무 쉬움');
    if (triggers.type_mismatch) reasons.push('문항 유형 불일치');
    if (triggers.distractor_types_not_diverse) reasons.push('오답 유형 다양성 부족');
    normalized.regeneration_reason = reasons.join(', ');
  } else {
    normalized.regeneration_reason = null;
  }

  // 최종 판정 결정 (PASS / REGENERATE / HUMAN_REVIEW)
  if (result.verdict && Object.values(VERDICT).includes(result.verdict)) {
    normalized.verdict = result.verdict;
  } else if (normalized.should_regenerate) {
    normalized.verdict = VERDICT.REGENERATE;
  } else if (normalized.grade === 'C' || normalized.grade === 'D') {
    normalized.verdict = VERDICT.HUMAN_REVIEW;
  } else if (normalized.grade === 'F') {
    normalized.verdict = VERDICT.REGENERATE;
  } else {
    normalized.verdict = VERDICT.PASS;
  }

  return normalized;
}

/**
 * 빠른 규칙 기반 사전 검증 (LLM 호출 전)
 * 명백한 문제가 있으면 LLM 호출 없이 재생성 트리거
 */
function quickItemCheck(itemObj, itemNo) {
  const issues = [];
  const warnings = [];

  const passageRaw = itemObj.passage || itemObj.stimulus || itemObj.gapped_passage || '';
  const passage = typeof passageRaw === 'string' ? passageRaw : '';
  const question = itemObj.question || itemObj.question_stem || '';
  const options = itemObj.options || [];
  const answer = parseInt(itemObj.answer || itemObj.correct_answer || 0);
  const explanation = itemObj.explanation || '';

  // 1. 정답 선택지가 지문을 그대로 복사했는지 체크
  if (answer >= 1 && answer <= 5 && passage) {
    const answerText = String(options[answer - 1] || '').toLowerCase().trim();
    const passageLower = passage.toLowerCase();

    // 정답이 20자 이상이고 지문에 그대로 포함되어 있으면
    if (answerText.length >= 20 && passageLower.includes(answerText)) {
      issues.push('정답 선택지가 지문을 그대로 복사함 (패러프레이즈 필요)');
    }
  }

  // 2. 선택지 길이 극단적 차이 (정답만 길거나 짧은 경우)
  if (options.length === 5) {
    const lengths = options.map(o => String(o || '').length);
    const answerLength = lengths[answer - 1] || 0;
    const avgOtherLength = lengths.filter((_, i) => i !== answer - 1).reduce((a, b) => a + b, 0) / 4;

    if (answerLength > avgOtherLength * 2) {
      warnings.push('정답 선택지가 다른 선택지보다 2배 이상 김 (정답 티남)');
    }
    if (answerLength < avgOtherLength * 0.5) {
      warnings.push('정답 선택지가 다른 선택지보다 현저히 짧음 (정답 티남)');
    }
  }

  // 3. 선택지 중 완전 동일한 것이 있는지
  const optionSet = new Set(options.map(o => String(o || '').trim().toLowerCase()));
  if (optionSet.size < options.length) {
    issues.push('중복된 선택지가 있음');
  }

  // 4. 해설에서 정답 외 다른 번호가 정답으로 언급되는지
  if (explanation) {
    const explanationLower = explanation.toLowerCase();
    for (let i = 1; i <= 5; i++) {
      if (i !== answer) {
        if (explanationLower.includes(`정답은 ${i}`) ||
            explanationLower.includes(`정답: ${i}`) ||
            explanationLower.includes(`answer is ${i}`)) {
          issues.push(`해설에서 ${i}번이 정답으로 언급됨 (실제 정답: ${answer}번)`);
        }
      }
    }
  }

  // 5. 문항 유형별 기본 체크
  // 29번 어법: grammar_meta 확인
  if (itemNo === 29) {
    if (!itemObj.grammar_meta || !Array.isArray(itemObj.grammar_meta)) {
      warnings.push('29번 어법 문항에 grammar_meta가 없음');
    }
  }

  // 31-34번 빈칸: 빈칸 존재 확인
  if (itemNo >= 31 && itemNo <= 34) {
    const gappedPassage = itemObj.gapped_passage || passage;
    if (!gappedPassage.includes('___') && !gappedPassage.includes('(   )')) {
      warnings.push('빈칸 문항에 빈칸 표시가 없음');
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    should_skip_llm: false // LLM 평가 스킵 여부 (심각한 오류 시)
  };
}

/**
 * 전체 평가 실행 (규칙 기반 + LLM)
 * @param {Object} itemObj - 생성된 문항 객체
 * @param {number} itemNo - 문항 번호
 * @param {boolean} skipLLM - LLM 평가 스킵 여부 (비용 절감용)
 * @returns {Object} 통합 평가 결과
 */
async function evaluateItemFull(itemObj, itemNo, skipLLM = false) {
  // 1. 규칙 기반 사전 검증
  const quickResult = quickItemCheck(itemObj, itemNo);

  // 규칙 검증에서 심각한 오류 발견 시
  if (!quickResult.passed) {
    return {
      success: true,
      data: {
        item_no: itemNo,
        quick_check: quickResult,
        llm_evaluation: null,
        should_regenerate: true,
        regeneration_reason: quickResult.issues.join('; '),
        total_score: 0,
        grade: 'F',
        evaluation_method: 'rule_only'
      }
    };
  }

  // 2. LLM 기반 상세 평가 (옵션)
  if (!skipLLM) {
    const llmResult = await evaluateItem(itemObj, itemNo);

    if (llmResult.success) {
      return {
        success: true,
        data: {
          item_no: itemNo,
          quick_check: quickResult,
          llm_evaluation: llmResult.data,
          should_regenerate: llmResult.data.should_regenerate,
          regeneration_reason: llmResult.data.regeneration_reason,
          total_score: llmResult.data.total_score,
          grade: llmResult.data.grade,
          evaluation_method: 'rule_and_llm'
        }
      };
    } else {
      // LLM 실패 시 규칙 기반 결과만 반환
      logger.warn('LLM 평가 실패, 규칙 기반 결과만 반환', `item_no:${itemNo}`, llmResult.error);
      return {
        success: true,
        data: {
          item_no: itemNo,
          quick_check: quickResult,
          llm_evaluation: null,
          llm_error: llmResult.error,
          should_regenerate: false,
          regeneration_reason: null,
          total_score: quickResult.warnings.length > 0 ? 70 : 85,
          grade: quickResult.warnings.length > 0 ? 'C' : 'B',
          evaluation_method: 'rule_only_llm_failed'
        }
      };
    }
  }

  // 3. LLM 스킵 시 규칙 기반 결과만 반환
  return {
    success: true,
    data: {
      item_no: itemNo,
      quick_check: quickResult,
      llm_evaluation: null,
      should_regenerate: false,
      regeneration_reason: null,
      total_score: quickResult.warnings.length > 0 ? 75 : 85,
      grade: quickResult.warnings.length > 0 ? 'C' : 'B',
      evaluation_method: 'rule_only'
    }
  };
}

/**
 * 재생성 트리거 판별
 * @param {Object} evaluationResult - 평가 결과
 * @returns {boolean} 재생성 필요 여부
 */
function shouldRegenerate(evaluationResult) {
  if (!evaluationResult || !evaluationResult.success) return false;

  const data = evaluationResult.data;
  if (!data) return false;

  // 명시적 재생성 플래그
  if (data.should_regenerate) return true;

  // 점수 기반 판단
  if (data.total_score < 60) return true;

  // 등급 기반 판단
  if (data.grade === 'F') return true;

  return false;
}

/**
 * 재생성 이유 문자열 생성
 * @param {Object} evaluationResult - 평가 결과
 * @returns {string} 재생성 이유
 */
function getRegenerationReason(evaluationResult) {
  if (!evaluationResult || !evaluationResult.success) return '평가 실패';

  const data = evaluationResult.data;
  if (!data) return '평가 데이터 없음';

  if (data.regeneration_reason) return data.regeneration_reason;

  if (data.total_score < 60) return `점수 미달 (${data.total_score}점)`;
  if (data.grade === 'F') return '등급 F';

  return '재생성 불필요';
}

module.exports = {
  evaluateItem,
  evaluateItemFull,
  quickItemCheck,
  shouldRegenerate,
  getRegenerationReason,
  formatItemForEvaluation,
  ITEM_TYPE_CONTEXT,
  LC_TYPE_CONTEXT,
  VERDICT
};
