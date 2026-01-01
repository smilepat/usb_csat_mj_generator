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

  // answer: correct_answer도 지원 (새 프롬프트 형식)
  let answerValue = out.answer !== undefined ? out.answer : out.correct_answer;

  if (typeof answerValue === 'number') {
    out.answer = String(answerValue);
  } else if (typeof answerValue === 'string') {
    const m = answerValue.match(/([1-5])/);
    if (m) {
      out.answer = m[1];
    } else {
      throw new Error('answer 필드에서 1~5를 찾을 수 없습니다: ' + answerValue);
    }
  } else if (answerValue === undefined || answerValue === null) {
    throw new Error('answer 필드가 없습니다.');
  } else {
    throw new Error('answer 필드가 없습니다.');
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

  return out;
}

module.exports = {
  parseItemJson,
  normalizeItemJson
};
