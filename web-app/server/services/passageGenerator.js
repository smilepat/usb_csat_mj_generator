/**
 * server/services/passageGenerator.js
 * LLM을 사용한 지문 자동 생성
 */

const { getDb } = require('../db/database');
const { callLLM } = require('./llmClient');
const { readPassageMasterPrompt, readPassageItemPrompt } = require('./promptBuilder');
const { getConfig } = require('./configService');

/**
 * 필요할 때만 LLM으로 지문 생성
 * @param {Object} req - 요청 객체
 * @param {Object} logger - 로거 객체 (선택)
 * @returns {Object} 지문이 채워진 req 객체
 */
async function generatePassageIfNeeded(req, logger = null) {
  // 1) 이미 PASSAGE가 있으면 스킵
  if (req.passage && String(req.passage).trim() !== '' &&
      String(req.passage).trim() !== '(AUTO)') {
    return req;
  }

  // 2) PASSAGE_SOURCE 확인
  const source = (req.passageSource || '').toUpperCase();
  if (source === 'MANUAL') {
    throw new Error('PASSAGE_SOURCE=MANUAL인데 PASSAGE가 비어 있습니다.');
  }

  // 3) 프롬프트 구성
  const master = readPassageMasterPrompt();
  const itemPrompt = readPassageItemPrompt(req);

  let context = '';

  if (req.level) {
    context += '[난이도 의도]\n' + req.level + '\n\n';
  }

  if (req.topic) {
    context += '[주제 / 상황]\n' + req.topic + '\n\n';
  }

  if (req.setId) {
    context += '[세트 정보]\nSET_ID=' + req.setId + ', ITEM_NO=' + req.itemNo + '\n\n';
  }

  const userPrompt =
    '아래 지침에 따라 KSAT 스타일의 영어 지문만 생성하시오.\n' +
    '질문이나 선택지는 절대 쓰지 말고, 본문 지문만 출력하시오.\n\n' +
    '----------------------------------------\n' +
    '[지문 생성 공통 지침]\n' + itemPrompt + '\n\n' +
    '----------------------------------------\n' +
    '[추가 정보]\n' + context;

  // 4) LLM 호출
  const config = await getConfig();
  const raw = await callLLM(master, userPrompt, config);

  // 5) 후처리
  const passage = String(raw).trim();
  if (!passage) {
    throw new Error('LLM이 빈 지문을 반환했습니다.');
  }

  // 6) DB에 PASSAGE 저장
  const db = getDb();
  db.prepare(`
    UPDATE item_requests
    SET passage = ?, passage_source = 'LLM', updated_at = CURRENT_TIMESTAMP
    WHERE request_id = ?
  `).run(passage, req.requestId);

  // 7) req 객체에 반영
  req.passage = passage;
  req.passageSource = 'LLM';

  if (logger) {
    logger.info('지문 생성 완료', req.requestId, `${passage.length}자`);
  }

  return req;
}

module.exports = {
  generatePassageIfNeeded
};
