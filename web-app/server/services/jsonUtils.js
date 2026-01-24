/**
 * server/services/jsonUtils.js
 * JSON 파싱 유틸리티
 */

/**
 * LLM 응답 텍스트를 JSON 객체로 파싱
 * @param {string} rawText - LLM 응답 텍스트
 * @returns {Object} 파싱된 JSON 객체
 */
function parseItemJson(rawText) {
  if (!rawText) {
    throw new Error('LLM 응답이 비어 있습니다.');
  }

  let text = String(rawText).trim();

  // ```json ``` 코드블록 제거
  text = text.replace(/```json/gi, '')
             .replace(/```/g, '')
             .trim();

  // 첫 { 부터 마지막 } 까지 추출
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');

  if (first === -1 || last === -1 || last <= first) {
    throw new Error('JSON 형식이 아닌 응답입니다: ' + text.slice(0, 100));
  }

  let jsonStr = text.substring(first, last + 1);

  // LLM이 circled numbers (①②③④⑤)를 반환하는 경우 정수로 변환
  // 모든 위치에서 circled numbers를 숫자로 변환 (JSON 값 위치)
  // 예: "correct_answer": ① → "correct_answer": 1
  // 예: "answer": ⑤, → "answer": 5,

  // 1) 콜론 뒤에 오는 circled numbers (키:값 형태)
  jsonStr = jsonStr
    .replace(/:\s*①\s*([,}\]])/g, ': 1$1')
    .replace(/:\s*②\s*([,}\]])/g, ': 2$1')
    .replace(/:\s*③\s*([,}\]])/g, ': 3$1')
    .replace(/:\s*④\s*([,}\]])/g, ': 4$1')
    .replace(/:\s*⑤\s*([,}\]])/g, ': 5$1');

  // 2) 줄 끝에 있는 circled numbers (쉼표/괄호 없이)
  jsonStr = jsonStr
    .replace(/:\s*①\s*$/gm, ': 1')
    .replace(/:\s*②\s*$/gm, ': 2')
    .replace(/:\s*③\s*$/gm, ': 3')
    .replace(/:\s*④\s*$/gm, ': 4')
    .replace(/:\s*⑤\s*$/gm, ': 5');

  // 3) 배열 내부의 unquoted circled numbers (숫자 값으로 사용된 경우만)
  // 예: [①, ②] → [1, 2] (unquoted)
  // 주의: ["①", "②"]는 유효한 JSON이므로 변환하지 않음
  jsonStr = jsonStr
    .replace(/\[\s*①\s*([,\]])/g, '[1$1')
    .replace(/\[\s*②\s*([,\]])/g, '[2$1')
    .replace(/\[\s*③\s*([,\]])/g, '[3$1')
    .replace(/\[\s*④\s*([,\]])/g, '[4$1')
    .replace(/\[\s*⑤\s*([,\]])/g, '[5$1')
    .replace(/,\s*①\s*([,\]])/g, ', 1$1')
    .replace(/,\s*②\s*([,\]])/g, ', 2$1')
    .replace(/,\s*③\s*([,\]])/g, ', 3$1')
    .replace(/,\s*④\s*([,\]])/g, ', 4$1')
    .replace(/,\s*⑤\s*([,\]])/g, ', 5$1');

  // 참고: 문자열 내부의 circled numbers ("①", "②" 등)는 유효한 JSON이므로 변환하지 않음
  // RC29, RC37 등의 프롬프트에서 options로 사용됨

  try {
    const obj = JSON.parse(jsonStr);
    return obj;
  } catch (e) {
    throw new Error('JSON.parse 실패: ' + e.message + ' / 원본: ' + jsonStr.slice(0, 150));
  }
}

/**
 * passage가 객체인 경우 문자열로 변환
 * LLM이 {intro, sentences} 또는 배열 형태로 반환하는 경우 처리
 * @param {any} passage - 원본 passage 값
 * @returns {string} 문자열로 변환된 passage
 */
function convertPassageToString(passage) {
  if (!passage) return '';

  // 이미 문자열인 경우 그대로 반환
  if (typeof passage === 'string') {
    return passage;
  }

  // 배열인 경우 조인
  if (Array.isArray(passage)) {
    return passage.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        return item.text || item.content || item.sentence || JSON.stringify(item);
      }
      return String(item);
    }).join(' ');
  }

  // 객체인 경우 (예: {intro, sentences})
  if (typeof passage === 'object' && passage !== null) {
    const parts = [];

    // intro 처리
    if (passage.intro) {
      parts.push(typeof passage.intro === 'string' ? passage.intro : JSON.stringify(passage.intro));
    }

    // sentences 처리 (RC36, RC37 문장 순서 문항용)
    if (passage.sentences) {
      if (Array.isArray(passage.sentences)) {
        // 배열인 경우
        parts.push(passage.sentences.join(' '));
      } else if (typeof passage.sentences === 'string') {
        // 문자열인 경우
        parts.push(passage.sentences);
      } else if (typeof passage.sentences === 'object') {
        // 객체인 경우 (예: {A: "...", B: "...", C: "..."})
        // RC36, RC37 문장 순서 문항 형식
        const sentenceKeys = Object.keys(passage.sentences).sort();
        const formattedSentences = sentenceKeys.map(key => {
          return `(${key}) ${passage.sentences[key]}`;
        }).join('\n');
        parts.push(formattedSentences);
      }
    }

    // text, content 필드 처리
    if (passage.text) {
      parts.push(typeof passage.text === 'string' ? passage.text : JSON.stringify(passage.text));
    }
    if (passage.content) {
      parts.push(typeof passage.content === 'string' ? passage.content : JSON.stringify(passage.content));
    }

    // 아무 필드도 없으면 JSON 문자열로 변환
    if (parts.length === 0) {
      return JSON.stringify(passage);
    }

    return parts.join('\n\n');
  }

  // 기타 타입은 문자열로 변환
  return String(passage);
}

/**
 * JSON 객체를 정규화된 형태로 변환
 * @param {Object} obj - 원본 JSON 객체
 * @param {number} targetItemNo - 추출할 문항 번호 (세트 응답에서 특정 문항 추출 시 사용)
 * @returns {Object} 정규화된 객체
 */
function normalizeItemJson(obj, targetItemNo = null) {
  if (!obj) {
    throw new Error('normalizeItemJson: obj가 없습니다.');
  }

  // 세트 형식 응답 처리 (questions 배열이 있는 경우)
  if (Array.isArray(obj.questions) && obj.questions.length > 0) {
    return normalizeSetItemJson(obj, targetItemNo);
  }

  // Deep Copy
  const out = JSON.parse(JSON.stringify(obj));

  // itemNo
  if (!out.itemNo) out.itemNo = obj.itemNo || null;

  // question: question_stem도 지원 (새 프롬프트 형식)
  out.question = out.question || out.question_stem || '';

  // passage: stimulus, transcript도 지원 (새 프롬프트 형식)
  if (!out.passage && out.stimulus) {
    out.passage = out.stimulus;
  }
  if (!out.passage && out.transcript) {
    out.passage = out.transcript;
  }

  // passage가 객체인 경우 문자열로 변환 (LLM이 {intro, sentences} 형태로 반환하는 경우)
  out.passage = convertPassageToString(out.passage);
  out.stimulus = convertPassageToString(out.stimulus);

  // lc_script: LC 문항용 스크립트 필드 매핑 (stimulus, transcript 지원)
  if (!out.lc_script) {
    out.lc_script = out.stimulus || out.transcript || out.script || '';
  }

  // options: 배열, 정확히 5개 유지
  if (!Array.isArray(out.options)) {
    throw new Error('options 배열이 없습니다.');
  }
  if (out.options.length < 5) {
    while (out.options.length < 5) {
      out.options.push('');
    }
  }
  if (out.options.length > 5) {
    out.options = out.options.slice(0, 5);
  }

  // answer: 다양한 필드명 지원 (correct_answer, correctAnswer, answer_key 등)
  let answerValue = null;

  // 우선순위대로 answer 값 탐색
  if (out.answer !== undefined && out.answer !== null) {
    answerValue = out.answer;
  } else if (out.correct_answer !== undefined && out.correct_answer !== null) {
    answerValue = out.correct_answer;
  } else if (out.correctAnswer !== undefined && out.correctAnswer !== null) {
    answerValue = out.correctAnswer;
  } else if (out.answer_key !== undefined && out.answer_key !== null) {
    answerValue = out.answer_key;
  } else if (out.answerKey !== undefined && out.answerKey !== null) {
    answerValue = out.answerKey;
  }

  if (typeof answerValue === 'number') {
    // 숫자 그대로 사용 (1-5 범위 체크)
    if (answerValue >= 1 && answerValue <= 5) {
      out.answer = String(answerValue);
    } else {
      throw new Error('answer 필드가 1~5 범위를 벗어남: ' + answerValue);
    }
  } else if (typeof answerValue === 'string') {
    // 문자열에서 1-5 추출
    const m = String(answerValue).match(/([1-5])/);
    if (m) {
      out.answer = m[1];
    } else {
      throw new Error('answer 필드에서 1~5를 찾을 수 없습니다: ' + answerValue);
    }
  } else if (answerValue === undefined || answerValue === null) {
    // answer 필드가 없으면 전체 객체 키 목록과 함께 에러
    const keys = Object.keys(obj).join(', ');
    throw new Error('answer 필드가 없습니다. 객체 키: [' + keys + ']');
  } else {
    throw new Error('answer 필드가 잘못된 타입입니다: ' + typeof answerValue);
  }

  // explanation
  out.explanation = out.explanation || '';

  // logic_proof
  if (!out.logic_proof || typeof out.logic_proof !== 'object') {
    out.logic_proof = {
      evidence_sentence: '',
      reasoning_steps: []
    };
  } else {
    if (typeof out.logic_proof.evidence_sentence !== 'string') {
      out.logic_proof.evidence_sentence = out.logic_proof.evidence_sentence || '';
    }
    if (!Array.isArray(out.logic_proof.reasoning_steps)) {
      out.logic_proof.reasoning_steps = out.logic_proof.reasoning_steps
        ? [String(out.logic_proof.reasoning_steps)]
        : [];
    }
  }

  // passage 보존 (위에서 stimulus/transcript로 이미 매핑됨)
  out.passage = out.passage || '';

  // RC29 전용 grammar_meta
  if (obj.grammar_meta) {
    out.grammar_meta = obj.grammar_meta;
  } else if (typeof out.grammar_meta === 'undefined') {
    out.grammar_meta = null;
  }

  // RC31~33 전용 gapped_passage
  const g1 = obj.gapped_passage;
  const g2 = obj.gap_passage;
  const g3 = obj.gappped_passage;
  const g4 = obj.gappedPassage;

  out.gapped_passage = g1 || g2 || g3 || g4 || out.gapped_passage || '';

  // gapped_passage가 없고 passage에 빈칸이 있으면 passage를 gapped_passage로 사용
  if (!out.gapped_passage && out.passage) {
    const hasBlank = /_{3,}|\(___\)/.test(out.passage);
    if (hasBlank) {
      out.gapped_passage = out.passage;
      // 디버깅용 로그 (콘솔에만 출력)
      console.log('[jsonUtils] passage에서 빈칸 감지 → gapped_passage 자동 설정');
    }
  }

  // 추가: stimulus에 빈칸이 있지만 passage로 복사 안 된 경우 대비
  if (!out.gapped_passage && obj.stimulus) {
    const hasBlankInStimulus = /_{3,}|\(___\)/.test(obj.stimulus);
    if (hasBlankInStimulus) {
      out.gapped_passage = obj.stimulus;
      console.log('[jsonUtils] stimulus에서 빈칸 감지 → gapped_passage 자동 설정');
    }
  }

  // 새 프롬프트 형식의 추가 필드 보존
  if (obj.vocabulary_difficulty) {
    out.vocabulary_difficulty = obj.vocabulary_difficulty;
  }
  if (obj.low_frequency_words) {
    out.low_frequency_words = obj.low_frequency_words;
  }
  if (obj.vocabulary_meta) {
    out.vocabulary_meta = obj.vocabulary_meta;
  }
  if (obj.image_prompt) {
    out.image_prompt = obj.image_prompt;
  }
  if (obj.chart_data) {
    out.chart_data = obj.chart_data;
  }

  // RC40 요약문 완성 문항용 summary 필드 보존
  if (obj.summary) {
    out.summary = obj.summary;
  }

  // 추가 통계 필드 보존 (passage_stats, summary_stats)
  if (obj.passage_stats) {
    out.passage_stats = obj.passage_stats;
  }
  if (obj.summary_stats) {
    out.summary_stats = obj.summary_stats;
  }

  return out;
}

/**
 * 세트 형식 JSON 응답을 정규화 (questions 배열이 있는 경우)
 * RC41_42, RC43_45 등 세트 프롬프트에서 사용
 * @param {Object} obj - 원본 JSON 객체 (questions 배열 포함)
 * @param {number} targetItemNo - 추출할 문항 번호
 * @returns {Object} 정규화된 개별 문항 객체
 */
function normalizeSetItemJson(obj, targetItemNo) {
  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    throw new Error('세트 형식이지만 questions 배열이 비어있습니다.');
  }

  // targetItemNo가 없으면 첫 번째 문항 사용
  let targetQuestion = null;

  if (targetItemNo) {
    // question_number로 해당 문항 찾기
    targetQuestion = obj.questions.find(q =>
      q.question_number === targetItemNo ||
      String(q.question_number) === String(targetItemNo)
    );
  }

  // 찾지 못하면 첫 번째 문항 사용
  if (!targetQuestion) {
    targetQuestion = obj.questions[0];
  }

  // 개별 문항 형식으로 변환
  const out = {
    itemNo: targetQuestion.question_number || targetItemNo,
    question: targetQuestion.question || targetQuestion.question_stem || '',
    options: targetQuestion.options || [],
    answer: null,
    explanation: targetQuestion.explanation || '',
    passage: convertPassageToString(obj.stimulus || obj.passage || ''),
    lc_script: convertPassageToString(obj.stimulus || obj.transcript || obj.script || ''),
    set_instruction: obj.set_instruction || '',
    logic_proof: {
      evidence_sentence: '',
      reasoning_steps: []
    }
  };

  // answer 처리
  let answerValue = targetQuestion.correct_answer || targetQuestion.answer;

  if (typeof answerValue === 'number') {
    if (answerValue >= 1 && answerValue <= 5) {
      out.answer = String(answerValue);
    } else {
      throw new Error('answer 필드가 1~5 범위를 벗어남: ' + answerValue);
    }
  } else if (typeof answerValue === 'string') {
    const m = String(answerValue).match(/([1-5])/);
    if (m) {
      out.answer = m[1];
    } else {
      throw new Error('answer 필드에서 1~5를 찾을 수 없습니다: ' + answerValue);
    }
  } else {
    throw new Error('세트 문항에서 answer 필드가 없습니다.');
  }

  // options 5개로 맞추기
  if (!Array.isArray(out.options)) {
    throw new Error('세트 문항의 options 배열이 없습니다.');
  }
  while (out.options.length < 5) {
    out.options.push('');
  }
  if (out.options.length > 5) {
    out.options = out.options.slice(0, 5);
  }

  // 추가 필드 보존
  if (obj.vocabulary_difficulty) {
    out.vocabulary_difficulty = obj.vocabulary_difficulty;
  }
  if (obj.low_frequency_words) {
    out.low_frequency_words = obj.low_frequency_words;
  }

  // gapped_passage 처리 (빈칸이 있는 경우)
  if (out.passage && /_{3,}|\(___\)/.test(out.passage)) {
    out.gapped_passage = out.passage;
  }

  return out;
}

module.exports = {
  parseItemJson,
  normalizeItemJson,
  normalizeSetItemJson
};
