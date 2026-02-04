/**
 * server/db/database.js
 * SQL.js 데이터베이스 초기화 및 관리 (순수 JavaScript, 네이티브 모듈 불필요)
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Vercel 서버리스 환경에서는 /tmp 사용 (유일한 쓰기 가능 경로)
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'csat.db')
  : path.join(__dirname, '../../data/csat.db');

let db = null;
let SQL = null;
let saveTimer = null;
const SAVE_DELAY_MS = 1000; // 1초 디바운스

/**
 * 디바운스된 DB 저장 (성능 최적화)
 * 매번 저장하지 않고, 마지막 변경 후 1초 뒤에 저장
 */
function scheduleSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveDatabase();
    saveTimer = null;
  }, SAVE_DELAY_MS);
}

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

  // 외래키 제약 활성화 (SQLite에서는 기본적으로 비활성화되어 있음)
  db.run('PRAGMA foreign_keys = ON');

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
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // prompts 테이블에 status 컬럼이 없으면 추가
  try {
    db.run(`ALTER TABLE prompts ADD COLUMN status TEXT DEFAULT 'draft'`);
  } catch (e) {
    // 이미 컬럼이 존재하면 무시
  }

  // prompts 테이블에 is_default 컬럼 추가 (문항 생성 시 기본 선택될 프롬프트)
  try {
    db.run(`ALTER TABLE prompts ADD COLUMN is_default INTEGER DEFAULT 0`);
  } catch (e) {
    // 이미 컬럼이 존재하면 무시
  }

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
      prompt_id INTEGER,
      prompt_version INTEGER,
      prompt_text_snapshot TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prompt_id) REFERENCES prompts(id)
    )
  `);

  // item_requests에 prompt_version 컬럼 추가 (기존 DB 마이그레이션)
  try {
    db.run(`ALTER TABLE item_requests ADD COLUMN prompt_version INTEGER`);
  } catch (e) {
    // 이미 컬럼이 존재하면 무시
  }

  // item_requests에 prompt_text_snapshot 컬럼 추가
  try {
    db.run(`ALTER TABLE item_requests ADD COLUMN prompt_text_snapshot TEXT`);
  } catch (e) {
    // 이미 컬럼이 존재하면 무시
  }

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

  // PROMPT_VERSIONS 테이블 (프롬프트 버전 히스토리)
  db.run(`
    CREATE TABLE IF NOT EXISTS prompt_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NOT NULL,
      prompt_key TEXT NOT NULL,
      version INTEGER NOT NULL,
      prompt_text TEXT,
      change_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prompt_id) REFERENCES prompts(id)
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

  // PROMPT_METRICS 테이블 (프롬프트 품질 메트릭스)
  db.run(`
    CREATE TABLE IF NOT EXISTS prompt_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NOT NULL,
      prompt_key TEXT,

      -- 규칙 기반 검증 점수
      rule_score INTEGER DEFAULT 0,
      rule_details TEXT,

      -- AI 평가 점수
      ai_score INTEGER DEFAULT 0,
      ai_clarity INTEGER,
      ai_completeness INTEGER,
      ai_consistency INTEGER,
      ai_specificity INTEGER,
      ai_csat_fit INTEGER,
      ai_reasoning TEXT,

      -- 통합 점수
      total_score INTEGER DEFAULT 0,
      grade TEXT,

      -- 성능 추적 (문항 생성 후 업데이트)
      times_used INTEGER DEFAULT 0,
      items_generated INTEGER DEFAULT 0,
      avg_item_score REAL,
      approve_count INTEGER DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      reject_count INTEGER DEFAULT 0,
      approve_rate REAL,
      last_used_at DATETIME,

      -- 버전별 성능 추적
      version_performance TEXT,

      -- 플래그
      needs_improvement INTEGER DEFAULT 0,
      flags TEXT,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prompt_id) REFERENCES prompts(id)
    )
  `);

  // FEEDBACK 테이블 (프롬프트 피드백 수집)
  db.run(`
    CREATE TABLE IF NOT EXISTS prompt_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NOT NULL,
      prompt_key TEXT,
      prompt_version INTEGER,
      feedback_type TEXT,
      feedback_text TEXT,
      source TEXT DEFAULT 'user',
      request_id TEXT,
      item_score REAL,
      applied INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prompt_id) REFERENCES prompts(id)
    )
  `);

  // AB_TESTS 테이블 (A/B 테스팅)
  db.run(`
    CREATE TABLE IF NOT EXISTS ab_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NOT NULL,
      prompt_key TEXT,
      test_name TEXT,
      version_a INTEGER NOT NULL,
      version_b INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      winner TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (prompt_id) REFERENCES prompts(id)
    )
  `);

  // ITEM_GENERATION_HISTORY 테이블 (시도별 히스토리 보존)
  db.run(`
    CREATE TABLE IF NOT EXISTS item_generation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      attempt_no INTEGER NOT NULL,
      raw_json TEXT,
      normalized_json TEXT,
      validation_result TEXT,
      validation_log TEXT,
      layer1_score INTEGER,
      layer2_score INTEGER,
      layer3_score INTEGER,
      final_score REAL,
      grade TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES item_requests(request_id)
    )
  `);

  // LIBRARY 테이블 (승인된 문항 및 프롬프트 저장소)
  db.run(`
    CREATE TABLE IF NOT EXISTS library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT,
      category TEXT,
      tags TEXT,

      -- 문항 관련 필드
      request_id TEXT,
      item_no INTEGER,
      passage TEXT,
      question TEXT,
      options TEXT,
      answer TEXT,
      explanation TEXT,

      -- 프롬프트 관련 필드
      prompt_id INTEGER,
      prompt_key TEXT,
      prompt_text TEXT,

      -- 품질 정보
      final_score REAL,
      grade TEXT,

      -- 메타데이터
      notes TEXT,
      is_favorite INTEGER DEFAULT 0,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES item_requests(request_id),
      FOREIGN KEY (prompt_id) REFERENCES prompts(id)
    )
  `);

  // ITEM_METRICS 테이블 (3겹 검증 시스템)
  db.run(`
    CREATE TABLE IF NOT EXISTS item_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      item_no INTEGER,

      -- Layer 1: 구조 검증 (기계적)
      layer1_score INTEGER DEFAULT 0,
      layer1_pass INTEGER DEFAULT 0,
      layer1_log TEXT,

      -- Layer 3: 수능 적합성 (규칙 기반) - Layer 2보다 먼저 구현
      word_count INTEGER,
      sentence_count INTEGER,
      avg_sentence_length REAL,
      passage_length_score INTEGER,
      format_score INTEGER,
      layer3_score INTEGER DEFAULT 0,
      layer3_log TEXT,

      -- Layer 2: 내용 품질 (규칙 + AI)
      answer_in_options INTEGER,
      distractor_uniqueness INTEGER,
      layer2_rule_score INTEGER DEFAULT 0,
      layer2_ai_score INTEGER,
      layer2_ai_reasoning TEXT,
      layer2_score INTEGER DEFAULT 0,
      layer2_log TEXT,

      -- 종합 점수 및 분류
      final_score REAL DEFAULT 0,
      grade TEXT,
      recommendation TEXT,
      flags TEXT,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES item_requests(request_id)
    )
  `);

  // 인덱스 생성
  db.run(`CREATE INDEX IF NOT EXISTS idx_item_requests_status ON item_requests(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_item_requests_set_id ON item_requests(set_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_item_json_request_id ON item_json(request_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_logs_request_id ON logs(request_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_item_metrics_request_id ON item_metrics(request_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_item_metrics_recommendation ON item_metrics(recommendation)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_metrics_prompt_id ON prompt_metrics(prompt_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_item_requests_prompt_id ON item_requests(prompt_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_key ON prompt_versions(prompt_key)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_feedback_prompt_id ON prompt_feedback(prompt_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_feedback_prompt_key ON prompt_feedback(prompt_key)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_item_generation_history_request_id ON item_generation_history(request_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_item_requests_prompt_version ON item_requests(prompt_id, prompt_version)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ab_tests_prompt_id ON ab_tests(prompt_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_library_type ON library(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_library_category ON library(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_library_is_favorite ON library(is_favorite)`);

  // 기본 설정 삽입 (Google Sheets CONFIG 시트 기준)
  const defaultConfigs = [
    ['PROVIDER', 'azure', 'gemini / openai / azure 선택 (기본값: azure)'],
    ['GEMINI_MODEL', 'gemini-2.5-pro', 'Gemini 모델 ID (v1beta 기준 models/… 중 뒷부분만)'],
    ['OPENAI_MODEL', 'gpt-4.1-mini', 'OpenAI 모델 이름'],
    ['AZURE_OPENAI_ENDPOINT', '', 'Azure OpenAI 엔드포인트 URL'],
    ['AZURE_OPENAI_DEPLOYMENT', '', 'Azure OpenAI 배포 이름'],
    ['AZURE_OPENAI_API_VERSION', '2024-12-01-preview', 'Azure OpenAI API 버전'],
    ['TEMP_BASE', '0.4', '공통 temperature'],
    ['TEMP_HIGH', '0.7', '높은 temperature (창의적 생성용)'],
    ['MAX_RETRY', '3', 'retry 횟수'],
    ['TIMEOUT_MS', '180000', 'API 타임아웃 (밀리초, 기본: 180초)'],
    ['LOG_LEVEL', 'INFO', '로그 레벨 (INFO, WARN, ERROR)'],
    // 성능 최적화 설정
    ['ENABLE_LLM_EVALUATION', 'false', 'LLM 기반 2차 품질 평가 활성화 (true/false, 기본: false - 성능 우선)'],
    ['ENABLE_SET_PARALLEL', 'true', '세트 문항 병렬 생성 활성화 (true/false, 기본: true)'],
    ['ALWAYS_RUN_LLM_EVAL', 'false', '모든 시도에서 LLM 평가 실행 (true/false, 기본: false)']
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

  // 초기화 완료 (logger를 여기서 import하면 순환 의존성 문제가 있어 console.log 유지)
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
    // 대기 중인 저장 타이머가 있으면 즉시 저장
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
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
        scheduleSave(); // 디바운스된 저장 (성능 최적화)
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
      scheduleSave(); // 디바운스된 저장 (성능 최적화)
    },
    transaction: (fn) => {
      return (...args) => {
        db.run('BEGIN TRANSACTION');
        try {
          const result = fn(...args);
          db.run('COMMIT');
          saveDatabase(); // 트랜잭션 완료 후 즉시 저장
          return result;
        } catch (e) {
          db.run('ROLLBACK');
          throw e;
        }
      };
    }
  };
}

/**
 * 참조 무결성 검사 - 삭제 전 의존성 확인
 * @param {string} table - 테이블명
 * @param {string} key - 키 컬럼명
 * @param {any} value - 키 값
 * @returns {{ canDelete: boolean, dependencies: Object }}
 */
function checkDependencies(table, key, value) {
  const dependencies = {};
  let canDelete = true;

  const db = getDb();

  switch (table) {
    case 'prompts':
      // prompts를 참조하는 item_requests 확인
      const requestCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM item_requests WHERE prompt_id = ?'
      ).get(value);
      if (requestCount && requestCount.cnt > 0) {
        dependencies.item_requests = requestCount.cnt;
        canDelete = false;
      }

      // prompts를 참조하는 prompt_versions 확인
      const versionCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM prompt_versions WHERE prompt_id = ?'
      ).get(value);
      if (versionCount && versionCount.cnt > 0) {
        dependencies.prompt_versions = versionCount.cnt;
      }

      // prompts를 참조하는 prompt_metrics 확인
      const metricsCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM prompt_metrics WHERE prompt_id = ?'
      ).get(value);
      if (metricsCount && metricsCount.cnt > 0) {
        dependencies.prompt_metrics = metricsCount.cnt;
      }
      break;

    case 'item_requests':
      // item_requests를 참조하는 item_json 확인
      const jsonCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM item_json WHERE request_id = ?'
      ).get(value);
      if (jsonCount && jsonCount.cnt > 0) {
        dependencies.item_json = jsonCount.cnt;
      }

      // item_requests를 참조하는 item_output 확인
      const outputCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM item_output WHERE request_id = ?'
      ).get(value);
      if (outputCount && outputCount.cnt > 0) {
        dependencies.item_output = outputCount.cnt;
      }

      // item_requests를 참조하는 item_metrics 확인
      const itemMetricsCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM item_metrics WHERE request_id = ?'
      ).get(value);
      if (itemMetricsCount && itemMetricsCount.cnt > 0) {
        dependencies.item_metrics = itemMetricsCount.cnt;
      }
      break;

    case 'item_sets':
      // item_sets를 참조하는 item_requests 확인
      const setRequestCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM item_requests WHERE set_id = ?'
      ).get(value);
      if (setRequestCount && setRequestCount.cnt > 0) {
        dependencies.item_requests = setRequestCount.cnt;
        canDelete = false;
      }
      break;

    case 'charts':
      // charts를 참조하는 item_requests 확인
      const chartRequestCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM item_requests WHERE chart_id = ?'
      ).get(value);
      if (chartRequestCount && chartRequestCount.cnt > 0) {
        dependencies.item_requests = chartRequestCount.cnt;
        canDelete = false;
      }
      break;
  }

  return { canDelete, dependencies };
}

/**
 * CASCADE 삭제 - 관련 레코드와 함께 삭제
 * @param {string} table - 테이블명
 * @param {string} key - 키 컬럼명
 * @param {any} value - 키 값
 * @returns {{ success: boolean, deleted: Object }}
 */
function cascadeDelete(table, key, value) {
  const db = getDb();
  const deleted = {};

  try {
    db.exec('BEGIN TRANSACTION');

    switch (table) {
      case 'prompts':
        // prompt_metrics 먼저 삭제
        db.prepare('DELETE FROM prompt_metrics WHERE prompt_id = ?').run(value);
        deleted.prompt_metrics = db.prepare('SELECT changes() as cnt').get().cnt;

        // prompt_versions 삭제
        db.prepare('DELETE FROM prompt_versions WHERE prompt_id = ?').run(value);
        deleted.prompt_versions = db.prepare('SELECT changes() as cnt').get().cnt;

        // prompts 삭제
        db.prepare('DELETE FROM prompts WHERE id = ?').run(value);
        deleted.prompts = 1;
        break;

      case 'item_requests':
        // item_json 삭제
        db.prepare('DELETE FROM item_json WHERE request_id = ?').run(value);
        deleted.item_json = db.prepare('SELECT changes() as cnt').get().cnt;

        // item_output 삭제
        db.prepare('DELETE FROM item_output WHERE request_id = ?').run(value);
        deleted.item_output = db.prepare('SELECT changes() as cnt').get().cnt;

        // item_metrics 삭제
        db.prepare('DELETE FROM item_metrics WHERE request_id = ?').run(value);
        deleted.item_metrics = db.prepare('SELECT changes() as cnt').get().cnt;

        // logs 삭제 (선택적)
        db.prepare('DELETE FROM logs WHERE request_id = ?').run(value);
        deleted.logs = db.prepare('SELECT changes() as cnt').get().cnt;

        // errors 삭제 (선택적)
        db.prepare('DELETE FROM errors WHERE request_id = ?').run(value);
        deleted.errors = db.prepare('SELECT changes() as cnt').get().cnt;

        // item_requests 삭제
        db.prepare('DELETE FROM item_requests WHERE request_id = ?').run(value);
        deleted.item_requests = 1;
        break;

      default:
        // 일반 삭제
        db.prepare(`DELETE FROM ${table} WHERE ${key} = ?`).run(value);
        deleted[table] = 1;
    }

    db.exec('COMMIT');
    saveDatabase();
    return { success: true, deleted };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * 데이터베이스 무결성 검사
 * @returns {{ valid: boolean, issues: string[] }}
 */
function checkIntegrity() {
  const db = getDb();
  const issues = [];

  // 외래키 위반 검사
  const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
  if (fkCheck.length > 0) {
    fkCheck.forEach(violation => {
      issues.push(`외래키 위반: ${violation.table}.${violation.parent} (rowid: ${violation.rowid})`);
    });
  }

  // 고아 레코드 검사 - item_json
  const orphanJson = db.prepare(`
    SELECT COUNT(*) as cnt FROM item_json
    WHERE request_id NOT IN (SELECT request_id FROM item_requests)
  `).get();
  if (orphanJson && orphanJson.cnt > 0) {
    issues.push(`고아 레코드: item_json에 ${orphanJson.cnt}개의 유효하지 않은 request_id 참조`);
  }

  // 고아 레코드 검사 - item_output
  const orphanOutput = db.prepare(`
    SELECT COUNT(*) as cnt FROM item_output
    WHERE request_id NOT IN (SELECT request_id FROM item_requests)
  `).get();
  if (orphanOutput && orphanOutput.cnt > 0) {
    issues.push(`고아 레코드: item_output에 ${orphanOutput.cnt}개의 유효하지 않은 request_id 참조`);
  }

  // 고아 레코드 검사 - prompt_versions
  const orphanVersions = db.prepare(`
    SELECT COUNT(*) as cnt FROM prompt_versions
    WHERE prompt_id NOT IN (SELECT id FROM prompts)
  `).get();
  if (orphanVersions && orphanVersions.cnt > 0) {
    issues.push(`고아 레코드: prompt_versions에 ${orphanVersions.cnt}개의 유효하지 않은 prompt_id 참조`);
  }

  // 고아 레코드 검사 - prompt_metrics
  const orphanMetrics = db.prepare(`
    SELECT COUNT(*) as cnt FROM prompt_metrics
    WHERE prompt_id NOT IN (SELECT id FROM prompts)
  `).get();
  if (orphanMetrics && orphanMetrics.cnt > 0) {
    issues.push(`고아 레코드: prompt_metrics에 ${orphanMetrics.cnt}개의 유효하지 않은 prompt_id 참조`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * 고아 레코드 정리
 * @returns {{ cleaned: Object }}
 */
function cleanOrphanRecords() {
  const db = getDb();
  const cleaned = {};

  try {
    db.exec('BEGIN TRANSACTION');

    // item_json 고아 레코드 삭제
    db.prepare(`
      DELETE FROM item_json
      WHERE request_id NOT IN (SELECT request_id FROM item_requests)
    `).run();
    cleaned.item_json = db.prepare('SELECT changes() as cnt').get().cnt;

    // item_output 고아 레코드 삭제
    db.prepare(`
      DELETE FROM item_output
      WHERE request_id NOT IN (SELECT request_id FROM item_requests)
    `).run();
    cleaned.item_output = db.prepare('SELECT changes() as cnt').get().cnt;

    // item_metrics 고아 레코드 삭제
    db.prepare(`
      DELETE FROM item_metrics
      WHERE request_id NOT IN (SELECT request_id FROM item_requests)
    `).run();
    cleaned.item_metrics = db.prepare('SELECT changes() as cnt').get().cnt;

    // prompt_versions 고아 레코드 삭제
    db.prepare(`
      DELETE FROM prompt_versions
      WHERE prompt_id NOT IN (SELECT id FROM prompts)
    `).run();
    cleaned.prompt_versions = db.prepare('SELECT changes() as cnt').get().cnt;

    // prompt_metrics 고아 레코드 삭제
    db.prepare(`
      DELETE FROM prompt_metrics
      WHERE prompt_id NOT IN (SELECT id FROM prompts)
    `).run();
    cleaned.prompt_metrics = db.prepare('SELECT changes() as cnt').get().cnt;

    db.exec('COMMIT');
    saveDatabase();
    return { cleaned };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = {
  getDb,
  initDatabase,
  closeDatabase,
  saveDatabase,
  checkDependencies,
  cascadeDelete,
  checkIntegrity,
  cleanOrphanRecords
};
