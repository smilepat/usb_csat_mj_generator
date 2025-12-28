/** validator_common.gs
 * 모든 문항 공통 Validation
 */

function validateCommon(itemObj) {
  const logs = [];
  let pass = true;

  if (!itemObj.question || !String(itemObj.question).trim()) {
    pass = false;
    logs.push("question이 비어 있음");
  }

  if (!Array.isArray(itemObj.options) || itemObj.options.length !== 5) {
    pass = false;
    logs.push("options 배열 길이가 5가 아님");
  } else {
    const emptyCount = itemObj.options.filter(o => !String(o || "").trim()).length;
    if (emptyCount > 1) {
      logs.push("options 중 빈 문자열이 2개 이상");
    }
  }

  if (!itemObj.answer) {
    pass = false;
    logs.push("answer가 없음");
  } else {
    const n = Number(itemObj.answer);
    if (!(n >= 1 && n <= 5)) {
      pass = false;
      logs.push("answer가 1~5 범위를 벗어남: " + itemObj.answer);
    }
  }

  if (!itemObj.explanation) {
    logs.push("explanation이 비어 있음(경고)");
  }

  return {
    pass: pass,
    log: logs.join("; ") || "OK"
  };
}
