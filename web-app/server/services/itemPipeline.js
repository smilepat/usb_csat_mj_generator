/**
 * server/services/itemPipeline.js
 * 문항 생성 파이프라인
 */

const { getDb } = require('../db/database');
const { callLLM } = require('./llmClient');
const { buildPromptBundle, readSetInfo } = require('./promptBuilder');
const { generatePassageIfNeeded } = require('./passageGenerator');
const { parseItemJson, normalizeItemJson } = require('./jsonUtils');
const { getConfig } = require('./configService');
const logger = require('./logger');
const {
  validateCommon,
  validateGrammarItem,
  validateGapItem,
  validateChartItem,
  getChartData,
  validateItemSet,
  checkSetPattern
} = require('./validators');
const { saveItemMetrics } = require('./metricsService');

/**
 * 단일 문항 생성 파이프라인
 * @param {Object} req - 요청 객체
 * @returns {Object} 결과 객체
 */
async function generateItemPipeline(req) {
  const config = getConfig();
  const maxRetry = parseInt(config.MAX_RETRY || '3');
  const db = getDb();

  // 0단계: 필요하면 지문 먼저 생성
  try {
    req = await generatePassageIfNeeded(req, logger);
  } catch (e) {
    // 실패 히스토리 저장
    saveGenerationHistory(req.requestId, 0, null, null, 'FAIL', '지문 생성 중 오류: ' + e.message, null, e.message);
    return {
      rawJson: '',
      normalized: null,
      validationResult: 'FAIL',
      validationLog: '지문 생성 중 오류: ' + e.message,
      repairLog: '',
      finalJson: null
    };
  }

  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    try {
      // 1) 프롬프트 구성
      const bundle = buildPromptBundle(req, logger);
      if (!bundle || !bundle.system || !bundle.user) {
        throw new Error('buildPromptBundle 결과가 올바르지 않습니다.');
      }

      // 2) LLM 호출
      const raw = await callLLM(bundle.system, bundle.user, config);

      if (!raw || String(raw).trim() === '') {
        throw new Error('LLM 응답이 비어 있습니다.');
      }

      // 3) JSON 파싱
      const parsed = parseItemJson(raw);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('parseItemJson 결과가 유효한 객체가 아닙니다.');
      }

      // 디버깅: LLM 응답에서 answer 관련 필드 확인
      logger.info('LLM 응답 파싱 결과', req.requestId,
        `answer=${parsed.answer}, correct_answer=${parsed.correct_answer}, keys=${Object.keys(parsed).join(',')}`
      );

      // 4) Normalize
      const normalized = normalizeItemJson(parsed);
      if (!normalized || typeof normalized !== 'object') {
        throw new Error('normalizeItemJson 결과가 유효한 객체가 아닙니다.');
      }

      // itemNo 보완
      if (!normalized.itemNo && req.itemNo) {
        normalized.itemNo = req.itemNo;
      }

      // 5) 공통 Validation
      const cv = validateCommon(normalized);
      if (!cv || cv.pass === false) {
        throw new Error(cv && cv.log ? cv.log : '공통 Validation 실패');
      }

      // 6) 유형별 추가 Validation
      // RC29: 어법
      if (req.itemNo == 29) {
        const vg = validateGrammarItem(normalized, req);
        if (!vg || vg.pass === false) {
          throw new Error(vg && vg.log ? vg.log : 'RC29 Grammar Validation 실패');
        }
      }

      // RC31~33: 빈칸
      if (req.itemNo >= 31 && req.itemNo <= 33) {
        const vgGap = validateGapItem(normalized, req);
        if (!vgGap || vgGap.pass === false) {
          throw new Error(vgGap && vgGap.log ? vgGap.log : 'RC31~33 Gap Validation 실패');
        }
      }

      // RC25: 도표
      if (req.itemNo == 25 && req.chartId) {
        const chartData = getChartData(req.chartId);
        const vc = validateChartItem(normalized, chartData);
        if (!vc || vc.pass === false) {
          throw new Error(vc && vc.log ? vc.log : 'RC25 Chart Validation 실패');
        }
      }

      // 성공 히스토리 저장
      saveGenerationHistory(req.requestId, attempt, raw, normalized, 'PASS', 'OK', null, null);

      return {
        rawJson: raw,
        normalized: normalized,
        validationResult: 'PASS',
        validationLog: 'OK',
        repairLog: '',
        difficultyEst: normalized.difficultyEst || '중(추정)',
        distractorScore: normalized.distractorScore || '중간',
        finalJson: normalized
      };

    } catch (e) {
      logger.warn('generateItemPipeline', req.requestId, `시도 ${attempt}/${maxRetry} 실패: ${e.message}`);

      // 실패 히스토리 저장
      saveGenerationHistory(req.requestId, attempt, null, null, 'FAIL', e.message, null, e.message);

      if (attempt === maxRetry) {
        return {
          rawJson: '',
          normalized: null,
          validationResult: 'FAIL',
          validationLog: '실패: ' + e.message,
          repairLog: '',
          finalJson: null
        };
      }
    }
  }
}

/**
 * 생성 시도 히스토리 저장
 */
function saveGenerationHistory(requestId, attemptNo, rawJson, normalizedJson, result, log, metrics, errorMessage) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO item_generation_history (
        request_id, attempt_no, raw_json, normalized_json,
        validation_result, validation_log, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      requestId,
      attemptNo,
      rawJson || '',
      normalizedJson ? JSON.stringify(normalizedJson) : '',
      result,
      log,
      errorMessage || ''
    );
  } catch (e) {
    // 히스토리 저장 실패는 무시 (메인 프로세스에 영향 주지 않음)
    logger.warn('saveGenerationHistory', requestId, `히스토리 저장 실패: ${e.message}`);
  }
}

/**
 * 세트 문항 생성
 * @param {string} setId - 세트 ID
 * @returns {Object} 세트 처리 결과
 */
async function generateSetItems(setId) {
  const db = getDb();

  // 세트 정보 조회
  const setInfo = readSetInfo(setId);

  // 해당 세트의 요청들 조회
  const requests = db.prepare(`
    SELECT * FROM item_requests WHERE set_id = ?
  `).all(setId);

  if (!requests || requests.length === 0) {
    throw new Error(`SET_ID=${setId}에 해당하는 요청이 없습니다.`);
  }

  // 세트 패턴 사전 체크
  const itemNos = requests.map(r => r.item_no);
  const patternCheck = checkSetPattern(itemNos);

  if (!patternCheck.ok) {
    logger.warn('세트 패턴 오류', `SET:${setId}`, patternCheck.message);
  }

  const results = [];
  const now = new Date().toISOString();

  for (const row of requests) {
    const req = {
      requestId: row.request_id,
      status: row.status,
      itemNo: row.item_no,
      passage: setInfo.passage || row.passage,
      level: row.level,
      extra: row.extra,
      chartId: row.chart_id,
      setId: row.set_id,
      passageSource: row.passage_source,
      topic: row.topic
    };

    // 상태 업데이트: RUNNING
    db.prepare(`
      UPDATE item_requests
      SET status = 'RUNNING', updated_at = ?
      WHERE request_id = ?
    `).run(now, req.requestId);

    // 문항 생성
    const result = await generateItemPipeline(req);
    results.push({ req, result });

    // 결과 저장 (itemNo 전달)
    await saveItemResults(req.requestId, result, req.itemNo);

    // 상태 업데이트: OK/FAIL
    const finalStatus = result.validationResult === 'PASS' ? 'OK' : 'FAIL';
    db.prepare(`
      UPDATE item_requests
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE request_id = ?
    `).run(finalStatus, req.requestId);
  }

  // 세트 단위 검증
  const setVal = validateItemSet(setId, results, setInfo);
  logger.info('세트 검증 결과', `SET:${setId}`, setVal.log);

  return {
    setId,
    itemCount: results.length,
    validationResult: setVal.pass ? 'PASS' : 'CHECK',
    validationLog: setVal.log,
    results
  };
}

/**
 * 문항 결과 저장
 * @param {string} requestId - 요청 ID
 * @param {Object} result - 결과 객체
 * @param {number} itemNo - 문항 번호
 */
async function saveItemResults(requestId, result, itemNo) {
  const db = getDb();

  // ITEM_JSON 저장
  db.prepare(`
    INSERT INTO item_json (
      request_id, raw_json, normalized_json, validation_result,
      validation_log, repair_log, difficulty_est, distractor_score, final_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    requestId,
    result.rawJson || '',
    result.normalized ? JSON.stringify(result.normalized) : '',
    result.validationResult || '',
    result.validationLog || '',
    result.repairLog || '',
    result.difficultyEst || '',
    result.distractorScore || '',
    result.finalJson ? JSON.stringify(result.finalJson) : ''
  );

  // ITEM_OUTPUT 저장 (성공 시)
  if (result.finalJson) {
    const fj = result.finalJson;
    db.prepare(`
      INSERT INTO item_output (
        request_id, item_no, question, option_1, option_2, option_3,
        option_4, option_5, answer, explanation, logic_proof,
        difficulty_est, distractor_meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      requestId,
      fj.itemNo || '',
      fj.question || '',
      fj.options?.[0] || '',
      fj.options?.[1] || '',
      fj.options?.[2] || '',
      fj.options?.[3] || '',
      fj.options?.[4] || '',
      fj.answer || '',
      fj.explanation || '',
      fj.logic_proof ? JSON.stringify(fj.logic_proof) : '',
      result.difficultyEst || '',
      fj.distractor_meta ? JSON.stringify(fj.distractor_meta) : ''
    );
  }

  // ITEM_METRICS 저장 (3겹 검증 시스템)
  const layer1Pass = result.validationResult === 'PASS';
  const layer1Log = result.validationLog || '';
  const itemObj = result.finalJson || result.normalized || {};
  const actualItemNo = itemNo || itemObj.itemNo || 0;

  if (Object.keys(itemObj).length > 0) {
    const metrics = saveItemMetrics(requestId, itemObj, actualItemNo, layer1Pass, layer1Log);
    if (metrics) {
      result.metrics = metrics;
    }
  }
}

module.exports = {
  generateItemPipeline,
  generateSetItems,
  saveItemResults
};
