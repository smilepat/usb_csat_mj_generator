/**
 * server/services/promptBuilder.js
 * 프롬프트 구성 서비스
 */

const { getDb } = require('../db/database');

/**
 * MASTER_PROMPT 읽기
 */
function readMasterPrompt() {
  const db = getDb();
  const row = db.prepare(`
    SELECT prompt_text FROM prompts
    WHERE prompt_key = 'MASTER_PROMPT' AND active = 1
  `).get();

  if (!row || !row.prompt_text) {
    throw new Error('MASTER_PROMPT를 찾을 수 없습니다.');
  }

  return row.prompt_text;
}

/**
 * 문항 번호를 프롬프트 키로 변환
 * LC01-LC17 (1-17), RC18-RC45 (18-45)
 */
function itemNoToPromptKey(itemNo) {
  const num = parseInt(itemNo, 10);
  if (num >= 1 && num <= 17) {
    // 듣기 문항: LC01-LC17
    return 'LC' + String(num).padStart(2, '0');
  } else if (num >= 18 && num <= 45) {
    // 독해 문항: RC18-RC45
    return 'RC' + String(num);
  }
  // 기존 형식 (숫자만)도 지원
  return String(itemNo);
}

/**
 * ITEM_PROMPT 읽기
 */
function readItemPrompt(itemNo) {
  const db = getDb();

  // 새 형식 (LC01, RC20 등)과 기존 형식 (숫자만) 모두 시도
  const newKey = itemNoToPromptKey(itemNo);
  const oldKey = String(itemNo);

  // 1. 새 형식 키로 활성화된 프롬프트 찾기
  let row = db.prepare(`
    SELECT prompt_text FROM prompts
    WHERE prompt_key = ? AND active = 1
  `).get(newKey);

  // 2. 새 형식 키로 비활성화된 프롬프트 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = ?
    `).get(newKey);
  }

  // 3. 기존 형식 키로 활성화된 프롬프트 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = ? AND active = 1
    `).get(oldKey);
  }

  // 4. 기존 형식 키로 비활성화된 프롬프트 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = ?
    `).get(oldKey);
  }

  if (!row || !row.prompt_text) {
    throw new Error(`ITEM_NO=${itemNo}에 해당하는 프롬프트를 찾을 수 없습니다. (시도한 키: ${newKey}, ${oldKey})`);
  }

  return row.prompt_text;
}

/**
 * 지문 생성용 마스터 프롬프트 읽기
 */
function readPassageMasterPrompt() {
  const db = getDb();
  const row = db.prepare(`
    SELECT prompt_text FROM prompts
    WHERE prompt_key = 'PASSAGE_MASTER' AND active = 1
  `).get();

  if (!row || !row.prompt_text) {
    throw new Error('PASSAGE_MASTER 프롬프트를 찾을 수 없습니다.');
  }

  return row.prompt_text;
}

/**
 * 지문 생성용 아이템 프롬프트 읽기
 */
function readPassageItemPrompt(req) {
  const db = getDb();
  let key = '';

  // 세트 문항인 경우
  if (req.setId && req.itemNo >= 41 && req.itemNo <= 45) {
    key = 'P41_45';
  } else {
    key = 'P' + String(req.itemNo);
  }

  const row = db.prepare(`
    SELECT prompt_text FROM prompts
    WHERE prompt_key = ? AND active = 1
  `).get(key);

  if (!row || !row.prompt_text) {
    throw new Error(`지문용 프롬프트 키=${key}를 찾을 수 없습니다.`);
  }

  return row.prompt_text;
}

/**
 * 세트 정보 읽기
 */
function readSetInfo(setId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM item_sets WHERE set_id = ?
  `).get(setId);

  if (!row) {
    return {
      setId: setId,
      setName: '',
      passage: '',
      profile: '',
      profileMap: {}
    };
  }

  return {
    setId: row.set_id,
    setName: row.set_name || '',
    passage: row.common_passage || '',
    profile: row.profile || '',
    profileMap: parseSetProfile(row.profile || '')
  };
}

/**
 * SET_PROFILE 문자열 파싱
 */
function parseSetProfile(profileStr) {
  const result = {};
  if (!profileStr) return result;

  const parts = String(profileStr).split(',');
  parts.forEach(part => {
    const p = part.trim();
    if (!p) return;
    const kv = p.split(':');
    if (kv.length !== 2) return;

    const itemNoStr = kv[0].trim();
    const level = kv[1].trim();
    if (!itemNoStr || !level) return;

    result[itemNoStr] = level;
  });

  return result;
}

/**
 * 프로필에서 예상 난이도 조회
 */
function getExpectedLevelFromProfile(profileObj, itemNo) {
  if (!profileObj) return null;
  const key = String(itemNo);
  return profileObj[key] || null;
}

/**
 * 차트 데이터 읽기
 */
function getChartData(chartId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT raw_data_json FROM charts WHERE chart_id = ?
  `).get(chartId);

  if (!row || !row.raw_data_json) {
    return {};
  }

  try {
    return JSON.parse(row.raw_data_json);
  } catch (e) {
    return {};
  }
}

/**
 * LLM용 시스템/사용자 프롬프트 구성
 */
function buildPromptBundle(req, logger = null) {
  // SET_PROFILE 기반 levelInfo 계산
  let levelInfo = req.level || '';
  if (req.setId) {
    try {
      const setInfo = readSetInfo(req.setId);
      if (setInfo && setInfo.profileMap) {
        const expected = getExpectedLevelFromProfile(setInfo.profileMap, req.itemNo);
        if (expected) levelInfo = expected + ' (SET_PROFILE)';
      }
    } catch (e) {
      if (logger) logger.error('SET PROFILE 처리 실패', req.requestId, e);
    }
  }

  // MASTER & ITEM PROMPT 로드
  const master = readMasterPrompt();
  const itemPrompt = readItemPrompt(req.itemNo);

  // CONTEXT 구성
  let context = '';

  // PASSAGE가 이미 주어졌을 때
  if (req.passage) {
    context += '[지문(PASSAGE_GIVEN)]\n' + req.passage + '\n\n';
  } else {
    // PASSAGE가 비어 있을 때: LLM이 지문까지 생성
    context += '[지문 생성 지시]\n';
    context += '- 수능 영어 ' + req.itemNo + '번 유형에 적합한 지문을 직접 작성하시오.\n';
    context += '- 지문은 한국 수능 수준의 어휘·문장 난이도를 유지하되, ';
    context += '학습자가 이해 가능하도록 자연스럽게 구성하시오.\n';

    if (levelInfo) {
      context += '- 난이도: ' + levelInfo + ' 수준에 맞게 문장 구조와 어휘 난도를 조절하시오.\n';
    } else {
      context += '- 난이도: 중간 수준(일반 고3 수험생 기준)으로 설정하시오.\n';
    }

    if (req.extra) {
      context += '- 추가 조건/스타일: ' + req.extra + '\n';
    }

    context += '- 지문 길이는 해당 유형의 실제 수능 기출 평균 길이에 근접하게 작성하시오.\n';
    context += '- 세트 문항(41–42, 43–45, 16–17)의 경우, ';
    context += '세 문항 이상을 자연스럽게 파생할 수 있는 완성된 하나의 지문을 작성하시오.\n\n';
  }

  // 도표 데이터
  if (req.chartId) {
    try {
      const chartData = getChartData(req.chartId);
      context += '[도표 데이터(JSON)]\n' + JSON.stringify(chartData) + '\n\n';
    } catch (e) {
      if (logger) logger.error('도표 로드 실패', req.requestId, e);
    }
  }

  if (levelInfo) {
    context += '[난이도 의도]\n' + levelInfo + '\n\n';
  }

  if (req.extra) {
    context += '[추가 메모]\n' + req.extra + '\n\n';
  }

  if (req.setId) {
    context += '[세트 정보]\nSET_ID=' + req.setId + ', ITEM_NO=' + req.itemNo + '\n\n';
  }

  // userPrompt 구성
  const userPrompt =
    '아래 정보를 바탕으로 한국 수능 영어 문항을 1개 생성하시오.\n' +
    '1) PASSAGE_GIVEN 블록이 있는 경우: 해당 지문을 절대 수정·삭제·요약하지 말고 그대로 사용하시오.\n' +
    '2) 지문 생성 지시만 있고 PASSAGE_GIVEN이 없는 경우: 먼저 지문을 직접 작성한 뒤, 그 지문을 기반으로 문항을 생성하시오.\n' +
    '3) 출력은 MASTER_PROMPT에서 정의한 JSON 스키마를 따르는 단일 JSON 객체 1개만 출력하고, 그 외 텍스트는 출력하지 마시오.\n\n' +
    '----------------------------------------\n' +
    '[ITEM별 지침]\n' + itemPrompt + '\n\n' +
    '----------------------------------------\n' +
    '[문항 생성에 사용할 추가 정보]\n' +
    context +
    '----------------------------------------\n' +
    '위의 지침과 정보를 모두 반영하여 MASTER 스키마에 맞는 단일 문항(JSON 객체 1개)을 생성하시오.';

  return {
    system: master,
    user: userPrompt
  };
}

module.exports = {
  readMasterPrompt,
  readItemPrompt,
  itemNoToPromptKey,
  readPassageMasterPrompt,
  readPassageItemPrompt,
  readSetInfo,
  parseSetProfile,
  getExpectedLevelFromProfile,
  getChartData,
  buildPromptBundle
};
