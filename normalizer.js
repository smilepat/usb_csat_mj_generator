/** normalizer.gs
 * LLM이 만든 JSON을 내부 표준 형태로 정리 (모든 주요 필드 보존)
 * - 공통 필드: question, options[5], answer, explanation, logic_proof, passage
 * - RC29 전용: grammar_meta
 * - RC31~33 전용: gapped_passage
 */

function normalizeItemJson(obj) {
  if (!obj) throw new Error("normalizeItemJson: obj가 없습니다.");

  // 1) Deep Copy (원본 보존)
  const out = JSON.parse(JSON.stringify(obj));

  // --------------------------------------------
  // 2) 공통 필드 보정
  // --------------------------------------------

  // itemNo (있으면 사용, 없으면 req.itemNo에서 나중에 보완)
  if (!out.itemNo) out.itemNo = obj.itemNo || null;

  // question
  out.question = out.question || "";

  // options: 배열, 정확히 5개 유지
  if (!Array.isArray(out.options)) {
    throw new Error("options 배열이 없습니다.");
  }
  if (out.options.length < 5) {
    while (out.options.length < 5) {
      out.options.push("");
    }
  }
  if (out.options.length > 5) {
    out.options = out.options.slice(0, 5);
  }

  // answer: 반드시 문자열 "1"~"5"
  if (typeof out.answer === "number") {
    out.answer = String(out.answer);
  } else if (typeof out.answer === "string") {
    const m = out.answer.match(/([1-5])/);
    if (m) {
      out.answer = m[1];
    } else {
      throw new Error("answer 필드에서 1~5를 찾을 수 없습니다: " + out.answer);
    }
  } else {
    throw new Error("answer 필드가 없습니다.");
  }

  // explanation
  out.explanation = out.explanation || "";

  // logic_proof (없으면 기본 구조 생성)
  if (!out.logic_proof || typeof out.logic_proof !== "object") {
    out.logic_proof = {
      evidence_sentence: "",
      reasoning_steps: []
    };
  } else {
    if (typeof out.logic_proof.evidence_sentence !== "string") {
      out.logic_proof.evidence_sentence = out.logic_proof.evidence_sentence || "";
    }
    if (!Array.isArray(out.logic_proof.reasoning_steps)) {
      out.logic_proof.reasoning_steps = out.logic_proof.reasoning_steps
        ? [String(out.logic_proof.reasoning_steps)]
        : [];
    }
  }

  // --------------------------------------------
  // 3) RC 공통: passage 보존
  // --------------------------------------------
  // LLM이 생성한 새 지문이든, 외부에서 주입된 지문이든 무조건 JSON에 남겨둔다.
  out.passage = out.passage || "";

  // --------------------------------------------
  // 4) RC29 전용 grammar_meta 보존
  // --------------------------------------------
  if (obj.grammar_meta) {
    out.grammar_meta = obj.grammar_meta;
  } else if (typeof out.grammar_meta === "undefined") {
    out.grammar_meta = null; // 없으면 null (validator_grammar에서 체크)
  }

  // --------------------------------------------
  // 5) RC31~33 전용 gapped_passage 반드시 보존
  // --------------------------------------------
  // 모델이 실수로 이름을 다르게 쓰는 경우도 대비
  const g1 = obj.gapped_passage;
  const g2 = obj.gap_passage;
  const g3 = obj.gappped_passage;  // (오타 대비)
  const g4 = obj.gappedPassage;    // (camelCase 대비)

  out.gapped_passage =
    g1 || g2 || g3 || g4 || out.gapped_passage || "";

  // --------------------------------------------
  // 6) 기타 확장 필드 보존 여지
  // --------------------------------------------
  // 필요 시: out.meta = obj.meta || out.meta || null;

  return out;
}
