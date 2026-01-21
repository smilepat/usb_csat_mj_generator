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

  const jsonStr = text.substring(first, last + 1);

  try {
    const obj = JSON.parse(jsonStr);
    return obj;
  } catch (e) {
    throw new Error('JSON.parse 실패: ' + e.message + ' / 원본: ' + jsonStr.slice(0, 150));
  }
}

/**
 * JSON 객체를 정규화된 형태로 변환
 * @param {Object} obj - 원본 JSON 객체
 * @returns {Object} 정규화된 객체
 */
function normalizeItemJson(obj) {
  if (!obj) {
    throw new Error('normalizeItemJson: obj가 없습니다.');
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

module.exports = {
  parseItemJson,
  normalizeItemJson
};
