/**
 * server/db/firestore.js
 * Firebase Firestore 클라이언트 (Vercel 프로덕션용)
 * SQLite와 동일한 인터페이스 제공
 */

const admin = require('firebase-admin');

let db = null;
let initialized = false;

/**
 * Firebase 초기화
 */
function initFirestore() {
  if (initialized) return db;

  // 환경 변수에서 서비스 계정 정보 로드
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT 환경 변수가 설정되지 않았습니다.');
  }

  try {
    const credentials = JSON.parse(serviceAccount);

    admin.initializeApp({
      credential: admin.credential.cert(credentials)
    });

    db = admin.firestore();
    initialized = true;
    console.log('[Firestore] 초기화 완료');
    return db;
  } catch (error) {
    console.error('[Firestore] 초기화 실패:', error.message);
    throw error;
  }
}

/**
 * Firestore 인스턴스 반환
 */
function getFirestore() {
  if (!db) {
    throw new Error('Firestore가 초기화되지 않았습니다. initFirestore()를 먼저 호출하세요.');
  }
  return db;
}

// =============================================
// Collection Names (SQLite 테이블명과 동일)
// =============================================
const COLLECTIONS = {
  CONFIG: 'config',
  PROMPTS: 'prompts',
  ITEM_REQUESTS: 'item_requests',
  ITEM_JSON: 'item_json',
  ITEM_OUTPUT: 'item_output',
  ITEM_SETS: 'item_sets',
  CHARTS: 'charts',
  PROMPT_VERSIONS: 'prompt_versions',
  LOGS: 'logs',
  ERRORS: 'errors',
  PROMPT_METRICS: 'prompt_metrics',
  PROMPT_FEEDBACK: 'prompt_feedback',
  AB_TESTS: 'ab_tests',
  ITEM_GENERATION_HISTORY: 'item_generation_history',
  LIBRARY: 'library',
  ITEM_METRICS: 'item_metrics'
};

// =============================================
// CRUD 헬퍼 함수들
// =============================================

/**
 * 문서 생성/업데이트
 * @param {string} collection - 컬렉션명
 * @param {string} docId - 문서 ID
 * @param {Object} data - 데이터
 */
async function setDoc(collection, docId, data) {
  const docRef = db.collection(collection).doc(docId);
  await docRef.set({
    ...data,
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return docRef.id;
}

/**
 * 문서 추가 (자동 ID)
 * @param {string} collection - 컬렉션명
 * @param {Object} data - 데이터
 */
async function addDoc(collection, data) {
  const docRef = await db.collection(collection).add({
    ...data,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

/**
 * 문서 조회
 * @param {string} collection - 컬렉션명
 * @param {string} docId - 문서 ID
 */
async function getDoc(collection, docId) {
  const docRef = db.collection(collection).doc(docId);
  const doc = await docRef.get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/**
 * 컬렉션 전체 조회
 * @param {string} collection - 컬렉션명
 * @param {Object} options - 정렬/필터 옵션
 */
async function getDocs(collection, options = {}) {
  let query = db.collection(collection);

  // 필터 적용
  if (options.where) {
    for (const [field, op, value] of options.where) {
      query = query.where(field, op, value);
    }
  }

  // 정렬 적용
  if (options.orderBy) {
    query = query.orderBy(options.orderBy, options.orderDir || 'asc');
  }

  // 제한 적용
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * 문서 삭제
 * @param {string} collection - 컬렉션명
 * @param {string} docId - 문서 ID
 */
async function deleteDoc(collection, docId) {
  await db.collection(collection).doc(docId).delete();
}

/**
 * 쿼리로 문서 조회
 * @param {string} collection - 컬렉션명
 * @param {string} field - 필드명
 * @param {string} op - 연산자
 * @param {any} value - 값
 */
async function queryDocs(collection, field, op, value) {
  const snapshot = await db.collection(collection)
    .where(field, op, value)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// =============================================
// SQLite 호환 래퍼 (getDb() 대체)
// =============================================

/**
 * SQLite 호환 인터페이스
 * 기존 코드의 db.prepare().run/get/all 패턴 지원
 */
function getFirestoreDb() {
  if (!db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  return {
    // Firestore는 동기 prepare를 지원하지 않으므로 비동기 래퍼 제공
    // 기존 코드에서 await를 추가해야 함

    /**
     * 비동기 prepare 대체
     */
    prepare: (sql) => {
      // SQL 파싱하여 Firestore 연산으로 변환
      return new FirestoreStatement(db, sql);
    },

    /**
     * 트랜잭션 (배치 작업)
     */
    transaction: (fn) => {
      return async (...args) => {
        const batch = db.batch();
        try {
          const result = await fn(batch, ...args);
          await batch.commit();
          return result;
        } catch (error) {
          console.error('[Firestore] 트랜잭션 실패:', error);
          throw error;
        }
      };
    },

    // 직접 Firestore 접근용
    firestore: db,
    collection: (name) => db.collection(name),

    // 헬퍼 함수들
    setDoc,
    addDoc,
    getDoc,
    getDocs,
    deleteDoc,
    queryDocs
  };
}

/**
 * SQL 문장을 Firestore 연산으로 변환하는 클래스
 */
class FirestoreStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.parsedSql = this.parseSql(sql);
  }

  parseSql(sql) {
    const normalized = sql.trim().toUpperCase();

    if (normalized.startsWith('SELECT')) {
      return { type: 'SELECT', sql };
    } else if (normalized.startsWith('INSERT')) {
      return { type: 'INSERT', sql };
    } else if (normalized.startsWith('UPDATE')) {
      return { type: 'UPDATE', sql };
    } else if (normalized.startsWith('DELETE')) {
      return { type: 'DELETE', sql };
    }

    return { type: 'UNKNOWN', sql };
  }

  /**
   * INSERT/UPDATE/DELETE 실행
   */
  async run(...params) {
    const { type, sql } = this.parsedSql;

    switch (type) {
      case 'INSERT':
        return await this.executeInsert(sql, params);
      case 'UPDATE':
        return await this.executeUpdate(sql, params);
      case 'DELETE':
        return await this.executeDelete(sql, params);
      default:
        console.warn('[Firestore] 지원하지 않는 SQL:', sql);
        return { changes: 0 };
    }
  }

  /**
   * SELECT 단일 행 조회
   */
  async get(...params) {
    const results = await this.all(...params);
    return results[0] || undefined;
  }

  /**
   * SELECT 전체 행 조회
   */
  async all(...params) {
    const { sql } = this.parsedSql;

    // 간단한 SQL 파싱
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) {
      console.warn('[Firestore] 테이블명 파싱 실패:', sql);
      return [];
    }

    const tableName = tableMatch[1];
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|$)/i);

    let query = this.db.collection(tableName);

    // WHERE 절 파싱 및 적용
    if (whereMatch && params.length > 0) {
      const conditions = this.parseWhereClause(whereMatch[1], params);
      for (const cond of conditions) {
        query = query.where(cond.field, cond.op, cond.value);
      }
    }

    // ORDER BY 파싱
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      query = query.orderBy(orderMatch[1], (orderMatch[2] || 'ASC').toLowerCase());
    }

    // LIMIT 파싱
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      query = query.limit(parseInt(limitMatch[1]));
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Firestore Timestamp를 ISO 문자열로 변환
      for (const key in data) {
        if (data[key] && data[key].toDate) {
          data[key] = data[key].toDate().toISOString();
        }
      }
      return { id: doc.id, ...data };
    });
  }

  parseWhereClause(whereStr, params) {
    const conditions = [];
    // 간단한 파싱: field = ? 패턴
    const parts = whereStr.split(/\s+AND\s+/i);
    let paramIndex = 0;

    for (const part of parts) {
      const match = part.match(/(\w+)\s*([=<>!]+|LIKE|IN)\s*\?/i);
      if (match && paramIndex < params.length) {
        let op = '==';
        switch (match[2].toUpperCase()) {
          case '=': op = '=='; break;
          case '>': op = '>'; break;
          case '<': op = '<'; break;
          case '>=': op = '>='; break;
          case '<=': op = '<='; break;
          case '!=': case '<>': op = '!='; break;
        }
        conditions.push({
          field: match[1],
          op,
          value: params[paramIndex++]
        });
      }
    }

    return conditions;
  }

  async executeInsert(sql, params) {
    // INSERT INTO table (col1, col2, ...) VALUES (?, ?, ...)
    const tableMatch = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
    const columnsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);

    if (!tableMatch || !columnsMatch) {
      console.warn('[Firestore] INSERT 파싱 실패:', sql);
      return { changes: 0 };
    }

    const tableName = tableMatch[1];
    const columns = columnsMatch[1].split(',').map(c => c.trim());

    const data = {};
    columns.forEach((col, idx) => {
      if (idx < params.length) {
        data[col] = params[idx];
      }
    });

    // ID 필드 결정 (테이블별)
    let docId = null;
    if (data.request_id) docId = data.request_id;
    else if (data.set_id) docId = data.set_id;
    else if (data.chart_id) docId = data.chart_id;
    else if (data.prompt_key) docId = data.prompt_key;
    else if (data.key) docId = data.key;

    if (docId) {
      await this.db.collection(tableName).doc(docId).set({
        ...data,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } else {
      await this.db.collection(tableName).add({
        ...data,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return { changes: 1 };
  }

  async executeUpdate(sql, params) {
    // UPDATE table SET col1 = ?, col2 = ? WHERE id = ?
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
    const whereMatch = sql.match(/WHERE\s+(.+?)$/i);

    if (!tableMatch || !setMatch || !whereMatch) {
      console.warn('[Firestore] UPDATE 파싱 실패:', sql);
      return { changes: 0 };
    }

    const tableName = tableMatch[1];
    const setParts = setMatch[1].split(',').map(p => p.trim());
    const whereParts = whereMatch[1].split(/\s+AND\s+/i);

    // SET 절에서 컬럼 수 계산
    const setColumns = setParts.filter(p => p.includes('?'));
    const setParamCount = setColumns.length;

    const updateData = {};
    setColumns.forEach((part, idx) => {
      const colMatch = part.match(/(\w+)\s*=/i);
      if (colMatch && idx < params.length) {
        updateData[colMatch[1]] = params[idx];
      }
    });
    updateData.updated_at = admin.firestore.FieldValue.serverTimestamp();

    // WHERE 절 파싱
    const whereParams = params.slice(setParamCount);
    const conditions = this.parseWhereClause(whereMatch[1], whereParams);

    if (conditions.length === 0) {
      console.warn('[Firestore] WHERE 조건 파싱 실패');
      return { changes: 0 };
    }

    // 쿼리 실행
    let query = this.db.collection(tableName);
    for (const cond of conditions) {
      query = query.where(cond.field, cond.op, cond.value);
    }

    const snapshot = await query.get();
    const batch = this.db.batch();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, updateData);
    });

    await batch.commit();
    return { changes: snapshot.size };
  }

  async executeDelete(sql, params) {
    // DELETE FROM table WHERE id = ?
    const tableMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    const whereMatch = sql.match(/WHERE\s+(.+?)$/i);

    if (!tableMatch) {
      console.warn('[Firestore] DELETE 파싱 실패:', sql);
      return { changes: 0 };
    }

    const tableName = tableMatch[1];

    if (!whereMatch) {
      // WHERE 없으면 전체 삭제 (위험!)
      console.warn('[Firestore] WHERE 없는 DELETE는 지원하지 않습니다.');
      return { changes: 0 };
    }

    const conditions = this.parseWhereClause(whereMatch[1], params);

    let query = this.db.collection(tableName);
    for (const cond of conditions) {
      query = query.where(cond.field, cond.op, cond.value);
    }

    const snapshot = await query.get();
    const batch = this.db.batch();

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return { changes: snapshot.size };
  }
}

// =============================================
// 시드 데이터 초기화
// =============================================

/**
 * Firestore에 초기 데이터 설정
 */
async function seedFirestoreData() {
  console.log('[Firestore] 시드 데이터 확인 중...');

  // 이미 데이터가 있는지 확인
  const configSnapshot = await db.collection(COLLECTIONS.CONFIG).limit(1).get();

  if (!configSnapshot.empty) {
    console.log('[Firestore] 기존 데이터 존재, 시드 스킵');
    return;
  }

  console.log('[Firestore] 시드 데이터 초기화 시작...');

  // 기본 설정
  const defaultConfigs = [
    { key: 'PROVIDER', value: 'azure', description: 'gemini / openai / azure 선택' },
    { key: 'GEMINI_MODEL', value: 'gemini-2.5-pro', description: 'Gemini 모델 ID' },
    { key: 'OPENAI_MODEL', value: 'gpt-4.1-mini', description: 'OpenAI 모델 이름' },
    { key: 'TEMP_BASE', value: '0.95', description: '공통 temperature' },
    { key: 'MAX_RETRY', value: '3', description: 'retry 횟수' },
    { key: 'TIMEOUT_MS', value: '180000', description: 'API 타임아웃' },
    { key: 'LOG_LEVEL', value: 'INFO', description: '로그 레벨' },
    { key: 'ENABLE_LLM_EVALUATION', value: 'false', description: 'LLM 기반 2차 품질 평가' },
    { key: 'ENABLE_SET_PARALLEL', value: 'true', description: '세트 문항 병렬 생성' }
  ];

  const batch = db.batch();

  for (const config of defaultConfigs) {
    const ref = db.collection(COLLECTIONS.CONFIG).doc(config.key);
    batch.set(ref, {
      ...config,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  // seed_prompts.json에서 프롬프트 로드
  const fs = require('fs');
  const path = require('path');
  const seedPromptsPath = path.join(__dirname, 'seed_prompts.json');

  if (fs.existsSync(seedPromptsPath)) {
    try {
      const seedData = JSON.parse(fs.readFileSync(seedPromptsPath, 'utf8'));

      for (const p of seedData) {
        const ref = db.collection(COLLECTIONS.PROMPTS).doc(p.prompt_key);
        batch.set(ref, {
          prompt_key: p.prompt_key,
          title: p.title,
          prompt_text: p.prompt_text,
          active: p.active,
          is_default: p.is_default || 0,
          status: 'draft',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      console.log(`[Firestore] ${seedData.length}개 프롬프트 준비 완료`);
    } catch (e) {
      console.error('[Firestore] seed_prompts.json 로드 실패:', e.message);
    }
  }

  await batch.commit();
  console.log('[Firestore] 시드 데이터 초기화 완료');
}

module.exports = {
  initFirestore,
  getFirestore,
  getFirestoreDb,
  seedFirestoreData,
  COLLECTIONS,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  queryDocs
};
