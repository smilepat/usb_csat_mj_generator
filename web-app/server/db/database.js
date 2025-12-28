/**
 * server/db/database.js
 * SQL.js 데이터베이스 초기화 및 관리 (순수 JavaScript, 네이티브 모듈 불필요)
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/csat.db');

let db = null;
let SQL = null;

/**
 * DB를 파일로 저장
 */
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * 데이터베이스 초기화
 */
async function initDatabase() {
  // SQL.js 초기화
  SQL = await initSqlJs();

  // data 폴더가 없으면 생성
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 기존 DB 파일이 있으면 로드, 없으면 새로 생성
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // CONFIG 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // PROMPT_DB 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_key TEXT UNIQUE NOT NULL,
      title TEXT,
      prompt_text TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ITEM_REQUEST 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS item_requests (
      request_id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'PENDING',
      item_no INTEGER NOT NULL,
      passage TEXT,
      level TEXT,
      extra TEXT,
      chart_id TEXT,
      set_id TEXT,
      passage_source TEXT,
      topic TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ITEM_JSON 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS item_json (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      raw_json TEXT,
      normalized_json TEXT,
      validation_result TEXT,
      validation_log TEXT,
      repair_log TEXT,
      difficulty_est TEXT,
      distractor_score TEXT,
      final_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES item_requests(request_id)
    )
  `);

  // ITEM_OUTPUT 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS item_output (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      item_no INTEGER,
      question TEXT,
      option_1 TEXT,
      option_2 TEXT,
      option_3 TEXT,
      option_4 TEXT,
      option_5 TEXT,
      answer TEXT,
      explanation TEXT,
      logic_proof TEXT,
      difficulty_est TEXT,
      distractor_meta TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES item_requests(request_id)
    )
  `);

  // ITEM_SET 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS item_sets (
      set_id TEXT PRIMARY KEY,
      set_name TEXT,
      common_passage TEXT,
      profile TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // CHART_DB 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS charts (
      chart_id TEXT PRIMARY KEY,
      chart_name TEXT,
      raw_data_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // LOG 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      level TEXT,
      tag TEXT,
      request_id TEXT,
      message TEXT
    )
  `);

  // ERROR 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      request_id TEXT,
      func_name TEXT,
      message TEXT,
      stack TEXT
    )
  `);

  // 인덱스 생성
  db.run(`CREATE INDEX IF NOT EXISTS idx_item_requests_status ON item_requests(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_item_requests_set_id ON item_requests(set_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_item_json_request_id ON item_json(request_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_logs_request_id ON logs(request_id)`);

  // 기본 설정 삽입
  const defaultConfigs = [
    ['PROVIDER', 'gemini', 'LLM 제공자 (gemini 또는 openai)'],
    ['GEMINI_MODEL', 'gemini-2.5-pro', 'Gemini 모델명'],
    ['OPENAI_MODEL', 'gpt-4.1-mini', 'OpenAI 모델명'],
    ['TEMP_BASE', '0.4', '기본 Temperature'],
    ['MAX_RETRY', '3', '최대 재시도 횟수'],
    ['LOG_LEVEL', 'INFO', '로그 레벨 (INFO, WARN, ERROR)']
  ];

  for (const [key, value, desc] of defaultConfigs) {
    db.run(`INSERT OR IGNORE INTO config (key, value, description) VALUES (?, ?, ?)`, [key, value, desc]);
  }

  // 기본 프롬프트 삽입
  const defaultPrompts = [
    ['MASTER_PROMPT', '마스터 프롬프트', getMasterPromptTemplate(), 1],
    ['PASSAGE_MASTER', '지문 생성 마스터', getPassageMasterTemplate(), 1],
    ['29', 'RC29 어법 문항', getItemPromptTemplate(29), 1],
    ['31', 'RC31 빈칸 문항', getItemPromptTemplate(31), 1],
    ['33', 'RC33 빈칸 문항', getItemPromptTemplate(33), 1],
    ['P29', 'RC29 지문 생성', getPassageItemTemplate(29), 1],
    ['P31', 'RC31 지문 생성', getPassageItemTemplate(31), 1],
    ['P33', 'RC33 지문 생성', getPassageItemTemplate(33), 1],
    ['P41_45', 'RC41-45 세트 지문', getPassageItemTemplate('41_45'), 1]
  ];

  for (const [key, title, text, active] of defaultPrompts) {
    db.run(`INSERT OR IGNORE INTO prompts (prompt_key, title, prompt_text, active) VALUES (?, ?, ?, ?)`,
      [key, title, text, active]);
  }

  // DB 저장
  saveDatabase();

  console.log('데이터베이스 테이블 및 기본 데이터 초기화 완료');
  return db;
}

// 마스터 프롬프트 템플릿
function getMasterPromptTemplate() {
  return `당신은 한국 수능 영어 영역 문항을 생성하는 전문가입니다.

## 출력 형식
반드시 다음 JSON 스키마를 따르는 단일 JSON 객체만 출력하세요:

{
  "itemNo": 문항번호(정수),
  "passage": "지문 본문",
  "question": "발문(질문)",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answer": "정답번호(1-5)",
  "explanation": "정답 해설",
  "logic_proof": {
    "evidence_sentence": "근거 문장",
    "reasoning_steps": ["추론 단계1", "추론 단계2"]
  }
}

## 문항 생성 원칙
1. 수능 영어 기출 문항의 형식과 난이도를 충실히 따를 것
2. 지문은 학술적이고 교양 있는 주제를 다룰 것
3. 선택지는 매력적인 오답을 포함하여 변별력을 확보할 것
4. 정답의 근거가 지문에 명확히 있어야 함`;
}

// 지문 생성 마스터 템플릿
function getPassageMasterTemplate() {
  return `당신은 한국 수능 영어 지문을 생성하는 전문가입니다.

## 지문 작성 원칙
1. 학술적이고 교양 있는 주제 선정
2. 수능 영어 기출과 유사한 어휘 수준 및 문장 구조
3. 논리적 흐름이 명확한 글 구성
4. 적절한 길이 유지 (유형별 상이)

## 출력
지문 본문만 출력하세요. 질문이나 선택지는 포함하지 마세요.`;
}

// 문항 유형별 프롬프트 템플릿
function getItemPromptTemplate(itemNo) {
  const templates = {
    29: `## RC29 어법 문항 생성 지침

1. 지문 내에 5개의 밑줄 친 부분을 <u>...</u>로 표시
2. 그 중 정확히 1개만 문법적으로 틀린 표현
3. grammar_meta 배열 필수:
   [
     {"index": 1, "is_correct": true, "explanation": "설명"},
     {"index": 2, "is_correct": false, "explanation": "오류 설명"},
     ...
   ]
4. 오답의 올바른 형태도 explanation에 포함`,

    31: `## RC31 빈칸 문항 생성 지침

1. 지문의 핵심 내용이 들어갈 빈칸 1개 생성
2. 빈칸은 (___) 형태로 표시
3. gapped_passage 필드에 빈칸이 포함된 지문 저장
4. 선택지는 빈칸에 들어갈 수 있는 표현들
5. 정답은 문맥상 가장 적절한 표현`,

    33: `## RC33 빈칸 문항 생성 지침

1. 지문의 핵심 개념이나 주제어가 들어갈 빈칸 1개 생성
2. 빈칸은 (___) 형태로 표시
3. gapped_passage 필드 필수
4. 고난도 어휘나 표현을 선택지로 구성
5. 오답은 매력적이지만 문맥상 부적절한 표현`
  };

  return templates[itemNo] || `## RC${itemNo} 문항 생성 지침\n\n수능 ${itemNo}번 유형에 맞는 문항을 생성하세요.`;
}

// 지문 생성 유형별 템플릿
function getPassageItemTemplate(itemNo) {
  const templates = {
    29: `어법 문항용 지문 생성 지침:
- 다양한 문법 요소(시제, 수일치, 분사, 관계사 등)가 포함된 지문
- 5개의 밑줄 부분을 자연스럽게 배치할 수 있는 구조
- 학술적 또는 교양 주제`,

    31: `빈칸 문항용 지문 생성 지침:
- 명확한 주제와 논지가 있는 글
- 핵심 개념을 빈칸으로 만들 수 있는 구조
- 문맥을 통해 빈칸 내용을 추론할 수 있어야 함`,

    33: `고난도 빈칸 문항용 지문 생성 지침:
- 추상적이거나 철학적인 주제
- 고급 어휘와 복잡한 문장 구조
- 심층적 이해가 필요한 내용`,

    '41_45': `장문 세트용 지문 생성 지침:
- 충분한 길이의 완성된 글 (300-400단어)
- 여러 문항을 파생할 수 있는 풍부한 내용
- 순서, 삽입, 요약 문항에 적합한 구조`
  };

  return templates[itemNo] || `${itemNo}번 유형 지문 생성 지침`;
}

/**
 * 데이터베이스 연결 종료
 */
function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

/**
 * SQL.js용 래퍼 - better-sqlite3 호환 인터페이스 제공
 */
function getDb() {
  if (!db) {
    throw new Error('데이터베이스가 초기화되지 않았습니다. initDatabase()를 먼저 호출하세요.');
  }

  return {
    prepare: (sql) => ({
      run: (...params) => {
        db.run(sql, params);
        saveDatabase();
        return { changes: db.getRowsModified() };
      },
      get: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        const results = [];
        const stmt = db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    }),
    exec: (sql) => {
      db.exec(sql);
      saveDatabase();
    },
    transaction: (fn) => {
      return (...args) => {
        db.run('BEGIN TRANSACTION');
        try {
          const result = fn(...args);
          db.run('COMMIT');
          saveDatabase();
          return result;
        } catch (e) {
          db.run('ROLLBACK');
          throw e;
        }
      };
    }
  };
}

module.exports = {
  getDb,
  initDatabase,
  closeDatabase,
  saveDatabase
};
