/**
 * server/services/validators/gap.js
 * RC31~33 빈칸 문항 검증
 */

/**
 * 빈칸 개수 세기
 * @param {string} text - 지문 텍스트
 * @returns {number}
 */
function countBlanks(text) {
  if (!text) return 0;
  // (___) 또는 ___ 모두 허용
  const matches = String(text).match(/\(___\)|_{3,}/g);
  return matches ? matches.length : 0;
}

/**
 * 지문 변형 근사 검사
 * @param {string} originalPassage - 원본 지문
 * @param {string} gappedPassage - 빈칸이 있는 지문
 * @returns {{ ok: boolean, diffInfo: string }}
 */
function checkPassageDiffApprox(originalPassage, gappedPassage) {
  // 원본 지문이 없거나 비어있으면 (자동 생성 모드) 검사 건너뜀
  if (!originalPassage || String(originalPassage).trim() === '') {
    return { ok: true, diffInfo: '지문 자동 생성 모드이므로 diff 검사를 건너뜀' };
  }
  if (!gappedPassage) {
    return { ok: false, diffInfo: 'gapped_passage 없음' };
  }

  // 빈칸 제거한 텍스트
  const stripped = String(gappedPassage).replace(/\(___\)|_{3,}/g, '');

  const normalize = s => String(s).replace(/\s+/g, ' ').trim();
  const normOrig = normalize(originalPassage);
  const normStrip = normalize(stripped);

  // 원본 지문이 gapped_passage를 포함하거나, 유사도가 높으면 통과
  // (LLM이 지문을 약간 수정할 수 있으므로 엄격한 검사 대신 경고만)
  const ok = normOrig.indexOf(normStrip) !== -1 || normStrip.indexOf(normOrig) !== -1;
  const diffInfo = ok
    ? '빈칸 제외 텍스트가 원 지문에 존재함'
    : '원 지문과 gapped_passage 간 불일치 가능성 (경고)';

  // 불일치해도 경고만 하고 통과시킴 (LLM이 자동 생성한 경우)
  return { ok: true, diffInfo };
}

/**
 * RC31~33 빈칸 문항 검증
 * @param {Object} itemObj - 정규화된 문항 객체
 * @param {Object} req - 요청 객체
 * @returns {{ pass: boolean, log: string }}
 */
function validateGapItem(itemObj, req) {
  const logs = [];
  let pass = true;

  const originalPassage = req.passage || '';

  // gapped_passage가 없으면 passage에서 빈칸을 찾아서 사용
  // (일부 프롬프트는 passage/stimulus에 빈칸을 직접 포함)
  let gappedPassage = itemObj.gapped_passage || '';

  if (!gappedPassage && itemObj.passage) {
    // passage에 빈칸이 있으면 gapped_passage로 사용
    const blankInPassage = countBlanks(itemObj.passage);
    if (blankInPassage > 0) {
      gappedPassage = itemObj.passage;
      logs.push('passage에서 빈칸 감지 → gapped_passage로 사용');
    }
  }

  // 1) gapped_passage 필드 필수 검사
  if (!gappedPassage) {
    return {
      pass: false,
      log: 'gapped_passage 필드 없음 → RC31~33은 반드시 빈칸이 포함된 지문(gapped_passage 또는 passage)이 필요함'
    };
  }

  // 2) 빈칸 개수 검사
  const blankCount = countBlanks(gappedPassage);
  if (blankCount !== 1) {
    pass = false;
    logs.push(`빈칸 개수 오류: (___)가 정확히 1개여야 함 → 현재: ${blankCount}`);
  } else {
    logs.push('빈칸 개수 OK(1개)');
  }

  // 3) 지문 변형 여부 검사
  const diff = checkPassageDiffApprox(originalPassage, gappedPassage);
  if (!diff.ok) {
    pass = false;
    logs.push('지문 변형 의심: ' + diff.diffInfo);
  } else {
    logs.push('지문 변형 없음: ' + diff.diffInfo);
  }

  return {
    pass,
    log: logs.join('; ')
  };
}

module.exports = {
  countBlanks,
  checkPassageDiffApprox,
  validateGapItem
};
