/**
 * server/services/promptBuilder.js
 * 프롬프트 구성 서비스
 */

const { getDb } = require('../db/database');
const logger = require('./logger');

// 프롬프트 캐시 (성능 최적화)
const promptCache = {
  master: null,
  items: new Map(),
  lastClearTime: Date.now()
};

// =============================================
// 듣기 문항 다양성 시나리오 (LC01-LC17)
// =============================================

/**
 * LC07 (불참 이유) 시나리오 목록
 * 매번 다른 상황/이벤트를 랜덤 선택하여 다양한 지문 생성
 */
const LC07_SCENARIOS = [
  { event: 'a hiking trip', setting: 'outdoor adventure', refuser: 'man' },
  { event: 'a book club meeting', setting: 'library or cafe', refuser: 'woman' },
  { event: 'a charity marathon', setting: 'city park', refuser: 'man' },
  { event: 'a cooking class', setting: 'community center', refuser: 'woman' },
  { event: 'a photography workshop', setting: 'art studio', refuser: 'man' },
  { event: 'a volunteer event at an animal shelter', setting: 'animal shelter', refuser: 'woman' },
  { event: 'a beach cleanup day', setting: 'coastal area', refuser: 'man' },
  { event: 'a movie premiere', setting: 'cinema', refuser: 'woman' },
  { event: 'a science fair', setting: 'school auditorium', refuser: 'man' },
  { event: 'a yoga retreat', setting: 'wellness center', refuser: 'woman' },
  { event: 'a neighborhood garage sale', setting: 'residential area', refuser: 'man' },
  { event: 'a pottery class', setting: 'craft studio', refuser: 'woman' },
  { event: 'a camping trip', setting: 'national park', refuser: 'man' },
  { event: 'a language exchange meetup', setting: 'cultural center', refuser: 'woman' },
  { event: 'a basketball tournament', setting: 'sports complex', refuser: 'man' },
  { event: 'a gardening workshop', setting: 'botanical garden', refuser: 'woman' },
  { event: 'a music festival', setting: 'outdoor venue', refuser: 'man' },
  { event: 'a chess competition', setting: 'community hall', refuser: 'woman' },
  { event: 'a food truck festival', setting: 'downtown plaza', refuser: 'man' },
  { event: 'a dance performance', setting: 'theater', refuser: 'woman' },
  { event: 'an escape room challenge', setting: 'entertainment complex', refuser: 'man' },
  { event: 'a museum exhibition opening', setting: 'art museum', refuser: 'woman' },
  { event: 'a startup pitch event', setting: 'conference center', refuser: 'man' },
  { event: 'a karaoke night', setting: 'entertainment venue', refuser: 'woman' }
];

/**
 * 듣기 문항용 랜덤 시나리오 선택
 * @param {number} itemNo - 문항 번호
 * @returns {Object|null} 선택된 시나리오 또는 null
 */
function getRandomListeningScenario(itemNo) {
  if (itemNo === 7) {
    const idx = Math.floor(Math.random() * LC07_SCENARIOS.length);
    return LC07_SCENARIOS[idx];
  }
  // 다른 LC 문항도 필요시 추가 가능
  return null;
}

// 캐시 TTL: 5분 (프롬프트 수정 시 자동 무효화)
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 캐시 무효화 (프롬프트 수정 시 호출)
 */
function clearPromptCache() {
  promptCache.master = null;
  promptCache.items.clear();
  promptCache.lastClearTime = Date.now();
  logger.info('promptCache', null, '프롬프트 캐시 무효화됨');
}

/**
 * 캐시 유효성 확인
 */
function isCacheValid() {
  return (Date.now() - promptCache.lastClearTime) < CACHE_TTL_MS;
}

/**
 * MASTER_PROMPT 읽기 (캐시 적용)
 *
 * 우선순위:
 * 1. active=1 + is_default=1 (최우선)
 * 2. active=1
 * 3. is_default=1
 * 4. 아무거나
 */
function readMasterPrompt() {
  // 캐시 확인
  if (promptCache.master && isCacheValid()) {
    return promptCache.master;
  }

  const db = getDb();

  // 1. 활성화 + 기본값 프롬프트 찾기 (최우선)
  let row = db.prepare(`
    SELECT prompt_text FROM prompts
    WHERE prompt_key = 'MASTER_PROMPT' AND active = 1 AND is_default = 1
    ORDER BY updated_at DESC
    LIMIT 1
  `).get();

  // 2. 활성화된 프롬프트 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = 'MASTER_PROMPT' AND active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
  }

  // 3. 기본값 프롬프트 찾기 (비활성화 포함)
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = 'MASTER_PROMPT' AND is_default = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
  }

  // 4. 아무 프롬프트나 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = 'MASTER_PROMPT'
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
  }

  if (!row || !row.prompt_text) {
    throw new Error('MASTER_PROMPT를 찾을 수 없습니다.');
  }

  // 캐시에 저장
  promptCache.master = row.prompt_text;
  return row.prompt_text;
}

/**
 * 문항 번호를 프롬프트 키로 변환
 * LC01-LC17 (1-17), RC18-RC45 (18-45)
 * 세트 문항: LC16_17, RC41_42, RC43_45
 */
function itemNoToPromptKey(itemNo) {
  const itemNoStr = String(itemNo);

  // 세트 문항 형식 처리 (예: "16-17", "41-42", "43-45")
  if (itemNoStr.includes('-')) {
    const [start, end] = itemNoStr.split('-').map(n => parseInt(n, 10));
    if (start >= 1 && end <= 17) {
      // 듣기 세트: LC16_17
      return `LC${start}_${end}`;
    } else if (start >= 18 && end <= 45) {
      // 독해 세트: RC41_42, RC43_45
      return `RC${start}_${end}`;
    }
  }

  const num = parseInt(itemNo, 10);

  // 세트 문항의 개별 번호 처리 (16, 17 → LC16_17)
  if (num === 16 || num === 17) {
    return 'LC16_17';
  }
  // 세트 문항의 개별 번호 처리 (41, 42 → RC41_42)
  if (num === 41 || num === 42) {
    return 'RC41_42';
  }
  // 세트 문항의 개별 번호 처리 (43, 44, 45 → RC43_45)
  if (num >= 43 && num <= 45) {
    return 'RC43_45';
  }

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
 * ITEM_PROMPT 읽기 (캐시 적용)
 *
 * 우선순위:
 * 1. 새 형식 키 (RC18) + active=1 + is_default=1
 * 2. 새 형식 키 (RC18) + active=1
 * 3. 새 형식 키 (RC18) + is_default=1
 * 4. 새 형식 키 (RC18)
 * 5. 기존 형식 키 (18) + active=1 + is_default=1
 * 6. 기존 형식 키 (18) + active=1
 * 7. 기존 형식 키 (18) + is_default=1
 * 8. 기존 형식 키 (18)
 */
function readItemPrompt(itemNo) {
  const cacheKey = `item_${itemNo}`;

  // 캐시 확인
  if (promptCache.items.has(cacheKey) && isCacheValid()) {
    return promptCache.items.get(cacheKey);
  }

  const db = getDb();

  // 새 형식 (LC01, RC20 등)과 기존 형식 (숫자만) 모두 시도
  const newKey = itemNoToPromptKey(itemNo);
  const oldKey = String(itemNo);

  // 1. 새 형식 키로 활성화 + 기본값 프롬프트 찾기 (최우선)
  let row = db.prepare(`
    SELECT prompt_text FROM prompts
    WHERE prompt_key = ? AND active = 1 AND is_default = 1
    ORDER BY updated_at DESC
    LIMIT 1
  `).get(newKey);

  // 2. 새 형식 키로 활성화된 프롬프트 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = ? AND active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(newKey);
  }

  // 3. 새 형식 키로 기본값 프롬프트 찾기 (비활성화 포함)
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = ? AND is_default = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(newKey);
  }

  // 4. 새 형식 키로 아무 프롬프트나 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(newKey);
  }

  // 5. 기존 형식 키로 활성화 + 기본값 프롬프트 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = ? AND active = 1 AND is_default = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(oldKey);
  }

  // 6. 기존 형식 키로 활성화된 프롬프트 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = ? AND active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(oldKey);
  }

  // 7. 기존 형식 키로 기본값 프롬프트 찾기 (비활성화 포함)
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = ? AND is_default = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(oldKey);
  }

  // 8. 기존 형식 키로 아무 프롬프트나 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(oldKey);
  }

  if (!row || !row.prompt_text) {
    throw new Error(`ITEM_NO=${itemNo}에 해당하는 프롬프트를 찾을 수 없습니다. (시도한 키: ${newKey}, ${oldKey})`);
  }

  // 캐시에 저장
  promptCache.items.set(cacheKey, row.prompt_text);
  return row.prompt_text;
}

/**
 * 지문 생성용 마스터 프롬프트 읽기
 *
 * 우선순위:
 * 1. active=1 + is_default=1 (최우선)
 * 2. active=1
 * 3. is_default=1
 * 4. 아무거나
 */
function readPassageMasterPrompt() {
  const db = getDb();

  // 1. 활성화 + 기본값 프롬프트 찾기 (최우선)
  let row = db.prepare(`
    SELECT prompt_text FROM prompts
    WHERE prompt_key = 'PASSAGE_MASTER' AND active = 1 AND is_default = 1
    ORDER BY updated_at DESC
    LIMIT 1
  `).get();

  // 2. 활성화된 프롬프트 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = 'PASSAGE_MASTER' AND active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
  }

  // 3. 기본값 프롬프트 찾기 (비활성화 포함)
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = 'PASSAGE_MASTER' AND is_default = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
  }

  // 4. 아무 프롬프트나 찾기
  if (!row) {
    row = db.prepare(`
      SELECT prompt_text FROM prompts
      WHERE prompt_key = 'PASSAGE_MASTER'
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
  }

  if (!row || !row.prompt_text) {
    throw new Error('PASSAGE_MASTER 프롬프트를 찾을 수 없습니다.');
  }

  return row.prompt_text;
}

/**
 * 지문 생성용 기본 템플릿
 * 문항별 프롬프트가 없을 때 사용됩니다.
 */
function getDefaultPassageTemplate(itemNo) {
  const num = parseInt(itemNo, 10);

  // 듣기 문항 (1-17)
  if (num >= 1 && num <= 17) {
    return `
## ${num}번 문항 지문 생성 지침

한국 수능 영어 듣기 ${num}번 유형에 적합한 대화/담화 스크립트를 작성하세요.

### 기본 요구사항:
- 실제 수능 듣기 시험과 유사한 자연스러운 대화체
- 원어민이 사용하는 일상적 표현 사용
- 화자 간 명확한 역할 구분
- 문맥상 정답을 유추할 수 있는 단서 포함

### 형식:
- M: (남성 화자)
- W: (여성 화자)
- 필요시 나레이터 추가

### 주의사항:
- 한국 학생들에게 친숙한 상황 설정
- 너무 복잡하지 않은 문장 구조
- 핵심 정보는 명확하게 전달
`.trim();
  }

  // 독해 문항 (18-45)
  const itemTypeMap = {
    18: { type: '목적', desc: '글의 목적을 파악하는 문항으로, 편지나 이메일 형식의 지문을 작성하세요.' },
    19: { type: '심경 변화', desc: '화자의 심경 변화가 드러나는 서사적 지문을 작성하세요.' },
    20: { type: '주장', desc: '필자의 주장이 명확히 드러나는 논설문 형식의 지문을 작성하세요.' },
    21: { type: '함축 의미', desc: '밑줄 친 문장의 함축적 의미를 파악해야 하는 지문을 작성하세요.' },
    22: { type: '요지', desc: '글의 요지가 명확히 드러나는 지문을 작성하세요.' },
    23: { type: '주제', desc: '중심 주제가 명확한 학술적 지문을 작성하세요.' },
    24: { type: '제목', desc: '적절한 제목을 추론할 수 있는 지문을 작성하세요.' },
    25: { type: '도표', desc: '도표/그래프의 내용과 일치하는 지문을 작성하세요.' },
    26: { type: '내용 일치(인물)', desc: '인물에 대한 설명문으로, 5개의 세부 사실을 포함하세요.' },
    27: { type: '내용 일치(안내문)', desc: '행사/시설 안내문 형식으로 세부 정보를 포함하세요.' },
    28: { type: '어휘', desc: '문맥상 적절한 어휘를 선택해야 하는 지문을 작성하세요.' },
    29: { type: '어법', desc: '어법 문항으로, 5개의 밑줄 중 1개의 어법 오류가 포함된 지문을 작성하세요.' },
    30: { type: '지칭 추론', desc: '대명사나 지칭 표현의 대상을 파악하는 지문을 작성하세요.' },
    31: { type: '빈칸(어구)', desc: '핵심 어구가 빈칸으로 처리될 지문을 작성하세요.' },
    32: { type: '빈칸(어구)', desc: '핵심 어구가 빈칸으로 처리될 지문을 작성하세요.' },
    33: { type: '빈칸(문장)', desc: '핵심 문장이 빈칸으로 처리될 지문을 작성하세요.' },
    34: { type: '빈칸(문장)', desc: '핵심 문장이 빈칸으로 처리될 지문을 작성하세요.' },
    35: { type: '무관한 문장', desc: '흐름과 무관한 문장 1개가 포함된 지문을 작성하세요.' },
    36: { type: '순서', desc: '(A), (B), (C) 문단의 순서를 배열하는 지문을 작성하세요.' },
    37: { type: '순서', desc: '(A), (B), (C) 문단의 순서를 배열하는 지문을 작성하세요.' },
    38: { type: '문장 삽입', desc: '주어진 문장이 들어갈 위치를 찾는 지문을 작성하세요.' },
    39: { type: '문장 삽입', desc: '주어진 문장이 들어갈 위치를 찾는 지문을 작성하세요.' },
    40: { type: '요약', desc: '요약문 완성용 지문으로, (A)와 (B)에 들어갈 단어를 추론할 수 있게 작성하세요.' }
  };

  // 장문 세트 (41-45)
  if (num >= 41 && num <= 45) {
    return `
## ${num}번 문항 지문 생성 지침 (장문)

한국 수능 영어 장문(41-42 또는 43-45 세트)에 적합한 긴 지문을 작성하세요.

### 기본 요구사항:
- 350-450 단어 분량의 완결된 글
- 논리적 구조와 일관된 흐름
- 학술적이거나 교훈적인 내용
- 여러 문항을 파생할 수 있는 풍부한 내용

### 지문 구성:
- 명확한 도입, 전개, 결론 구조
- 핵심 주제와 이를 뒷받침하는 세부 내용
- 문맥상 추론 가능한 정보 포함

### 주의사항:
- 고등학생 수준의 어휘와 문장 구조
- 지나치게 전문적인 용어 지양
- 문화적 편향 없는 보편적 주제
`.trim();
  }

  const info = itemTypeMap[num];
  if (info) {
    return `
## ${num}번 문항(${info.type}) 지문 생성 지침

${info.desc}

### 기본 요구사항:
- 150-200 단어 분량 (유형에 따라 조절)
- 수능 영어 지문에 적합한 어휘 수준
- 논리적이고 자연스러운 글 전개
- 정답 추론에 필요한 단서 포함

### 지문 특성:
- 한국 학생들에게 친숙하거나 교육적인 주제
- 문단 간 유기적 연결
- 핵심 내용의 명확한 제시

### 주의사항:
- 실제 수능 기출과 유사한 스타일 유지
- 특정 문화권에 치우치지 않는 보편적 내용
- 학습자가 배경지식 없이도 이해 가능한 수준
`.trim();
  }

  // 기본 템플릿 (매칭되지 않는 경우)
  return `
## ${num}번 문항 지문 생성 지침

한국 수능 영어 시험에 적합한 지문을 작성하세요.

### 기본 요구사항:
- 수능 수준의 어휘와 문장 구조
- 논리적이고 자연스러운 글 전개
- 해당 문항 유형에 적합한 내용과 형식

### 주의사항:
- 실제 수능 기출과 유사한 스타일 유지
- 적절한 길이 (유형에 따라 150-300 단어)
- 정답 추론에 필요한 단서 포함
`.trim();
}

/**
 * 지문 생성용 아이템 프롬프트 읽기
 * DB에 프롬프트가 없으면 기본 템플릿을 반환합니다.
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

  // DB에 프롬프트가 있으면 반환
  if (row && row.prompt_text) {
    return row.prompt_text;
  }

  // DB에 없으면 기본 템플릿 반환
  logger.info('promptBuilder', null, `P${req.itemNo} 프롬프트 없음, 기본 템플릿 사용`);
  return getDefaultPassageTemplate(req.itemNo);
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

  // 듣기 문항 다양성 지시 (LC01-LC17)
  let listeningDiversityInstruction = '';
  const itemNoNum = parseInt(req.itemNo, 10);
  if (itemNoNum >= 1 && itemNoNum <= 17) {
    const scenario = getRandomListeningScenario(itemNoNum);
    if (scenario) {
      listeningDiversityInstruction = `
⚠️ [다양성 필수 요구사항 - 반드시 준수] ⚠️
이번 생성에서는 반드시 아래 시나리오를 사용하세요:
- **이벤트**: ${scenario.event}
- **배경**: ${scenario.setting}
- **불참자**: ${scenario.refuser}

생일 파티, 동창회, 가족 모임 등 흔한 시나리오는 사용하지 마세요.
위에서 지정된 이벤트와 배경을 창의적으로 활용하여 자연스러운 대화를 작성하세요.

`;
    }
  }

  // RC29 어법 문항용 원숫자 강제 지시
  let rc29CircledNumberInstruction = '';
  if (req.itemNo === 29) {
    rc29CircledNumberInstruction = `
⚠️ [RC29 필수 요구사항 - 반드시 준수] ⚠️
stimulus 필드에 원숫자(①②③④⑤)를 반드시 지문 텍스트 내에 삽입하세요.

올바른 예시:
"stimulus": "The scientist ①discovered that the results ②were consistent with ③their hypothesis, which ④suggested a new approach ⑤to solving the problem."

잘못된 예시 (절대 금지):
"stimulus": "The scientist discovered that the results were consistent with their hypothesis..."
(원숫자가 없으면 검증 실패로 재생성됩니다)

원숫자는 각 문법 포인트 바로 앞에 위치해야 합니다.
`;
  }

  // userPrompt 구성
  const userPrompt =
    '아래 정보를 바탕으로 한국 수능 영어 문항을 1개 생성하시오.\n' +
    '1) PASSAGE_GIVEN 블록이 있는 경우: 해당 지문을 절대 수정·삭제·요약하지 말고 그대로 사용하시오.\n' +
    '2) 지문 생성 지시만 있고 PASSAGE_GIVEN이 없는 경우: 먼저 지문을 직접 작성한 뒤, 그 지문을 기반으로 문항을 생성하시오.\n' +
    '3) 출력은 MASTER_PROMPT에서 정의한 JSON 스키마를 따르는 단일 JSON 객체 1개만 출력하고, 그 외 텍스트는 출력하지 마시오.\n\n' +
    listeningDiversityInstruction +
    rc29CircledNumberInstruction +
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
  getDefaultPassageTemplate,
  readSetInfo,
  parseSetProfile,
  getExpectedLevelFromProfile,
  getChartData,
  buildPromptBundle,
  clearPromptCache  // 프롬프트 수정 시 캐시 무효화용
};
