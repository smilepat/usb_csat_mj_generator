/** validator_set.gs
 * 세트 문항(예: 16–17, 41–42, 43–45) 전체에 대한 일관성 검사
 */

// 허용 세트 패턴 정의
const ALLOWED_SET_PATTERNS = [
  { min: 16, max: 17, label: "LC 세트 (16-17)" },
  { min: 41, max: 42, label: "RC 세트 (41-42)" },
  { min: 43, max: 45, label: "RC 세트 (43-45)" }
];

/**
 * 주어진 itemNo 배열이 허용된 세트 패턴인지 검사
 * - 예: [41, 42] → OK
 * - 예: [41, 43] → FAIL
 */
function checkSetPattern(itemNos) {
  if (!itemNos || itemNos.length === 0) {
    return { ok: false, label: "", message: "세트 내 문항 번호가 비어 있음" };
  }

  const nums = itemNos.map(n => Number(n)).filter(n => !isNaN(n));
  const minNo = Math.min.apply(null, nums);
  const maxNo = Math.max.apply(null, nums);

  // 허용 패턴 찾기
  const pattern = ALLOWED_SET_PATTERNS.find(p => p.min === minNo && p.max === maxNo);
  if (!pattern) {
    return {
      ok: false,
      label: "",
      message: "허용되지 않은 세트 범위입니다. 현재 범위: " + minNo + "-" + maxNo +
        " / 허용 범위: 16-17, 41-42, 43-45"
    };
  }

  // min~max 사이 번호가 모두 존재하는지 확인
  for (let n = pattern.min; n <= pattern.max; n++) {
    if (!nums.includes(n)) {
      return {
        ok: false,
        label: pattern.label,
        message: "세트 범위 " + pattern.min + "-" + pattern.max +
          " 중 문항 번호 " + n + " 가 누락되어 있습니다."
      };
    }
  }

  return {
    ok: true,
    label: pattern.label,
    message: "허용된 세트 패턴(" + pattern.label + ")이며, 범위 내 문항이 모두 존재합니다."
  };
}

/**
 * @param {string} setId
 * @param {Array<{req:Object,result:Object}>} results
 * @param {Object} setInfo
 */
function validateItemSet(setId, results, setInfo) {
  const logs = [];
  let pass = true;

  logs.push("SET_ID=" + setId + " / 문항 수=" + results.length);

  // 1) 세트 패턴 검사: (16-17) or (41-42) or (43-45)
  const itemNos = results.map(r => r.req.itemNo);
  const patternCheck = checkSetPattern(itemNos);
  if (!patternCheck.ok) {
    pass = false;
    logs.push("세트 패턴 오류: " + patternCheck.message);
  } else {
    logs.push("세트 패턴 OK: " + patternCheck.message);
  }

  // 2) 각 문항의 validationResult 확인
  const failItems = results.filter(r => r.result.validationResult !== "PASS");
  if (failItems.length > 0) {
    pass = false;
    logs.push("세트 내 FAIL 문항 개수=" + failItems.length);
    const ids = failItems.map(f => f.req.requestId + "(#" + f.req.itemNo + ")").join(", ");
    logs.push("FAIL 문항 목록: " + ids);
  } else {
    logs.push("세트 내 모든 문항 validation PASS");
  }

  // 3) 세트 메타(선택)
  if (setInfo && setInfo.profile) {
    logs.push("세트 프로파일: " + setInfo.profile);
  }

  return { pass, log: logs.join("; ") };
}
