/**
 * server/services/validators/grammar.js
 * RC29 어법 문항 검증
 */

/**
 * 지문에서 <u>...</u> 밑줄 구간 개수
 * @param {string} passage - 지문
 * @returns {number}
 */
function countUnderlinedSegments(passage) {
  if (!passage) return 0;
  const matches = String(passage).match(/<u>[\s\S]*?<\/u>/g);
  return matches ? matches.length : 0;
}

/**
 * RC29 어법 문항 검증
 * @param {Object} itemObj - 정규화된 문항 객체
 * @param {Object} req - 요청 객체
 * @returns {{ pass: boolean, log: string }}
 */
function validateGrammarItem(itemObj, req) {
  const logs = [];
  let pass = true;

  const passage = req.passage || itemObj.passage || '';
  const underlineCount = countUnderlinedSegments(passage);

  if (underlineCount !== 5) {
    pass = false;
    logs.push('지문 내 밑줄 개수 != 5 (현재: ' + underlineCount + ')');
  } else {
    logs.push('지문 내 밑줄 5개 OK');
  }

  const meta = itemObj.grammar_meta;
  if (!Array.isArray(meta) || meta.length !== 5) {
    pass = false;
    logs.push('grammar_meta 배열이 없거나 길이가 5가 아님');
    return { pass, log: logs.join('; ') };
  }

  let wrongCount = 0;
  meta.forEach((m, i) => {
    if (typeof m.index === 'undefined') {
      pass = false;
      logs.push('grammar_meta[' + i + '].index 없음');
    }
    if (typeof m.is_correct === 'undefined') {
      pass = false;
      logs.push('grammar_meta[' + i + '].is_correct 없음');
    }
    if (m.is_correct === false) wrongCount++;
  });

  if (wrongCount !== 1) {
    pass = false;
    logs.push('문법상 틀린 밑줄(is_correct=false) 개수 != 1 (현재: ' + wrongCount + ')');
  } else {
    logs.push('틀린 밑줄 exactly 1개 OK');
  }

  return { pass, log: logs.join('; ') };
}

module.exports = {
  countUnderlinedSegments,
  validateGrammarItem
};
