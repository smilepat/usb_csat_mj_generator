/** itemSetProfileUtils.gs
 * ITEM_SET.PROFILE 문자열을 파싱하여
 * { "41": "중", "42": "중상", ... } 형태의 객체로 변환
 */

/**
 * "41:중,42:중상,43:상" 같은 문자열을 파싱
 * @param {string} profileStr
 * @return {Object} 예: { "41": "중", "42": "중상", "43": "상" }
 */
function parseSetProfile(profileStr) {
  const result = {};
  if (!profileStr) return result;

  const parts = String(profileStr).split(",");
  parts.forEach(part => {
    const p = part.trim();
    if (!p) return;
    const kv = p.split(":");
    if (kv.length !== 2) return;

    const itemNoStr = kv[0].trim();
    const level = kv[1].trim();
    if (!itemNoStr || !level) return;

    result[itemNoStr] = level;
  });

  return result;
}

/**
 * 특정 itemNo에 대한 기대 난이도 조회
 * @param {Object} profileObj parseSetProfile 결과
 * @param {number} itemNo
 * @return {string|null}
 */
function getExpectedLevelFromProfile(profileObj, itemNo) {
  if (!profileObj) return null;
  const key = String(itemNo);
  return profileObj[key] || null;
}
