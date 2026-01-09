/**
 * server/services/validators/common.js
 * 공통 문항 검증
 */

/**
 * 필드 매핑 정보 - 프롬프트 수정 제안에 사용
 */
const FIELD_MAPPINGS = {
  question: {
    aliases: ['question', 'question_stem', 'questionStem', 'prompt', 'stem'],
    description: '문제 발문'
  },
  passage: {
    aliases: ['passage', 'stimulus', 'transcript', 'text', 'content'],
    description: '지문/대본'
  },
  answer: {
    aliases: ['answer', 'correct_answer', 'correctAnswer', 'answer_key', 'answerKey'],
    description: '정답 (1-5)'
  },
  options: {
    aliases: ['options', 'choices', 'alternatives'],
    description: '선택지 배열 (5개)'
  },
  explanation: {
    aliases: ['explanation', 'rationale', 'solution', 'commentary'],
    description: '해설'
  }
};

/**
 * 모든 문항에 대한 공통 검증
 * @param {Object} itemObj - 정규화된 문항 객체
 * @returns {{ pass: boolean, log: string, promptSuggestion: string|null }}
 */
function validateCommon(itemObj) {
  const logs = [];
  const promptSuggestions = [];
  let pass = true;

  // question 검사
  if (!itemObj.question || !String(itemObj.question).trim()) {
    pass = false;
    logs.push('question이 비어 있음');
    promptSuggestions.push(
      'question 필드가 비어 있습니다. 프롬프트에서 다음 중 하나의 키로 발문을 출력하도록 지시해 주세요: ' + FIELD_MAPPINGS.question.aliases.join(', ')
    );
  }

  // options 검사
  if (!Array.isArray(itemObj.options)) {
    pass = false;
    logs.push('options 배열이 없음');
    promptSuggestions.push(
      'options 배열이 없습니다. 프롬프트에서 "options": ["①", "②", "③", "④", "⑤"] 형식으로 선택지를 출력하도록 지시해 주세요.'
    );
  } else if (itemObj.options.length !== 5) {
    pass = false;
    logs.push('options 배열 길이가 5가 아님 (현재: ' + itemObj.options.length + ')');
    promptSuggestions.push(
      'options 배열 길이가 ' + itemObj.options.length + '개입니다. 프롬프트에서 "선택지는 정확히 5개"라고 명시해 주세요.'
    );
  } else {
    const emptyCount = itemObj.options.filter(o => !String(o || '').trim()).length;
    if (emptyCount > 1) {
      logs.push('options 중 빈 문자열이 ' + emptyCount + '개 (경고)');
    }
  }

  // answer 검사
  if (!itemObj.answer) {
    pass = false;
    logs.push('answer가 없음');
    promptSuggestions.push(
      'answer 필드가 없습니다. 프롬프트에서 다음 중 하나의 키로 정답을 출력하도록 지시해 주세요: ' + FIELD_MAPPINGS.answer.aliases.join(', ') + '. 값은 1-5 정수여야 합니다.'
    );
  } else {
    const n = Number(itemObj.answer);
    if (!(n >= 1 && n <= 5)) {
      pass = false;
      logs.push('answer가 1~5 범위를 벗어남: ' + itemObj.answer);
      promptSuggestions.push(
        'answer 값이 "' + itemObj.answer + '"입니다. 프롬프트에서 "correct_answer는 1-5 사이의 정수"라고 명시해 주세요.'
      );
    }
  }

  // passage 검사 (경고만 - 일부 문항은 passage 없이도 유효)
  if (!itemObj.passage || !String(itemObj.passage).trim()) {
    logs.push('passage가 비어 있음 (경고)');
  }

  // explanation 검사 (경고만)
  if (!itemObj.explanation || !String(itemObj.explanation).trim()) {
    logs.push('explanation이 비어 있음 (경고)');
  }

  // 프롬프트 수정 제안 생성
  const promptSuggestion = promptSuggestions.length > 0
    ? '[프롬프트 수정 필요] ' + promptSuggestions.join(' | ')
    : null;

  if (promptSuggestion) {
    logs.push(promptSuggestion);
  }

  return {
    pass: pass,
    log: logs.join('; ') || 'OK',
    promptSuggestion: promptSuggestion
  };
}

/**
 * 필드 매핑 정보 반환 (외부 참조용)
 */
function getFieldMappings() {
  return FIELD_MAPPINGS;
}

module.exports = {
  validateCommon,
  getFieldMappings,
  FIELD_MAPPINGS
};
