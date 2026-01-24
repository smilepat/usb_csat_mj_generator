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
  checkSetPattern,
  validateFormat,
  validateListeningItem,
  isListeningItem
} = require('./validators');
const { saveItemMetrics } = require('./metricsService');
const {
  evaluateItemFull,
  quickItemCheck,
  shouldRegenerate,
  getRegenerationReason
} = require('./itemEvaluator');
const { countUnderlinedSegments } = require('./validators/grammar');

/**
 * RC29 지문에 원숫자(①②③④⑤) 자동 삽입
 * LLM이 원숫자를 포함하지 않은 경우 후처리로 수정
 * @param {Object} normalized - 정규화된 문항 객체
 * @param {Object} config - 설정 객체
 * @returns {Promise<Object>} 수정된 문항 객체
 */
async function repairRC29CircledNumbers(normalized, config) {
  // passage 또는 stimulus 중 하나 사용
  const passage = normalized.passage || normalized.stimulus || '';
  const grammarMeta = normalized.grammar_meta;
  console.log(`[RC29 수정] passage길이: ${passage.length}, stimulus길이: ${(normalized.stimulus || '').length}`);
  console.log(`[RC29 수정] passage처음100자: ${passage.substring(0, 100)}`);

  // 이미 원숫자가 5개 있으면 수정 불필요
  const underlineResult = countUnderlinedSegments(passage);
  if (underlineResult.count === 5) {
    return normalized;
  }

  // grammar_meta가 없으면 수정 불가
  if (!Array.isArray(grammarMeta) || grammarMeta.length !== 5) {
    console.log(`[RC29 수정] grammar_meta 유효하지 않음 - isArray: ${Array.isArray(grammarMeta)}, length: ${grammarMeta?.length}`);
    return normalized;
  }

  console.log(`[RC29 수정] 원숫자 자동 삽입 시도 - 현재 ${underlineResult.count}개 → 5개 필요`);
  console.log('[RC29 수정] grammar_meta:', JSON.stringify(grammarMeta.map(m => ({ index: m.index, point: m.grammar_point }))));

  // 수정용 프롬프트 생성
  const repairPrompt = `다음 영어 지문에 원숫자(①②③④⑤)를 삽입해야 합니다.

[원본 지문]
${passage}

[삽입할 문법 포인트 정보]
${grammarMeta.map((m, i) => `${i+1}번(${['①','②','③','④','⑤'][i]}): ${m.grammar_point} - ${m.explanation}`).join('\n')}

[지시사항]
1. 위 grammar_meta의 각 문법 포인트에 해당하는 단어/구 바로 앞에 원숫자를 삽입하세요.
2. 원숫자는 ①②③④⑤ 순서대로 5개 모두 삽입해야 합니다.
3. 지문의 다른 내용은 절대 수정하지 마세요.
4. 결과는 JSON 형식으로 출력하세요: {"repaired_stimulus": "수정된 지문"}

예시:
원본: "The scientist discovered that the results were consistent"
수정: "The scientist ①discovered that the results ②were consistent"

JSON만 출력하세요:`;

  try {
    const systemPrompt = 'You are a helpful assistant that inserts circled numbers into English text. Output only valid JSON.';
    console.log('[RC29 수정] LLM 호출 시작...');
    const response = await callLLM(systemPrompt, repairPrompt, config);
    console.log('[RC29 수정] LLM 응답:', response ? response.substring(0, 300) : 'null');

    // JSON 파싱
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.repaired_stimulus) {
        // 수정된 지문 검증
        const repairedResult = countUnderlinedSegments(parsed.repaired_stimulus);
        if (repairedResult.count === 5) {
          logger.info('RC29 원숫자 삽입 성공', `${repairedResult.count}개 삽입됨`);
          logger.info('RC29 수정된 지문', parsed.repaired_stimulus.substring(0, 200));
          normalized.passage = parsed.repaired_stimulus;
          normalized.stimulus = parsed.repaired_stimulus;
          return normalized;
        } else {
          logger.warn('RC29 수정 실패: 삽입된 원숫자가 5개가 아님', `${repairedResult.count}개`);
        }
      }
    }
  } catch (e) {
    logger.error('RC29 원숫자 삽입 실패', e.message);
  }

  return normalized;
}

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

      // RC31~33 디버깅: passage/stimulus/gapped_passage 필드 확인
      if (req.itemNo >= 31 && req.itemNo <= 33) {
        const hasBlankInPassage = parsed.passage && /_{3,}/.test(parsed.passage);
        const hasBlankInStimulus = parsed.stimulus && /_{3,}/.test(parsed.stimulus);
        logger.info('RC31~33 빈칸 디버깅', req.requestId,
          `passage=${!!parsed.passage}(blank:${hasBlankInPassage}), stimulus=${!!parsed.stimulus}(blank:${hasBlankInStimulus}), gapped_passage=${!!parsed.gapped_passage}`
        );
      }

      // 4) Normalize (세트 문항인 경우 itemNo 전달하여 해당 문항 추출)
      const normalized = normalizeItemJson(parsed, req.itemNo);
      if (!normalized || typeof normalized !== 'object') {
        throw new Error('normalizeItemJson 결과가 유효한 객체가 아닙니다.');
      }

      // RC29 디버깅: normalized 객체 필드 확인
      if (req.itemNo == 29) {
        const nkeys = Object.keys(normalized).join(',');
        const pLen = (normalized.passage||'').length;
        const sLen = (normalized.stimulus||'').length;
        console.log(`[RC29 디버깅] keys=${nkeys}, passage길이=${pLen}, stimulus길이=${sLen}`);
        console.log(`[RC29 디버깅] passage처음50자: ${(normalized.passage||'없음').substring(0,50)}`);
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
      // RC29: 어법 - 원숫자 누락 시 자동 수정 시도
      if (req.itemNo == 29) {
        // 원숫자 자동 삽입 시도 (LLM 후처리)
        const repairedNormalized = await repairRC29CircledNumbers(normalized, config);
        // 수정된 값을 normalized에 반영
        if (repairedNormalized.passage !== normalized.passage) {
          normalized.passage = repairedNormalized.passage;
          normalized.stimulus = repairedNormalized.stimulus;
          // req.passage도 업데이트 (검증에서 사용)
          req.passage = repairedNormalized.passage;
        }

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

      // LC1-17: 듣기 문항
      if (isListeningItem(req.itemNo)) {
        const vl = validateListeningItem(normalized, req.itemNo);
        if (!vl || vl.pass === false) {
          throw new Error(vl && vl.log ? vl.log : `LC${req.itemNo} Listening Validation 실패`);
        }
        // 경고가 있으면 로그에 기록
        if (vl.warnings && vl.warnings.length > 0) {
          logger.warn('LC 문항 경고', req.requestId, vl.warnings.join('; '));
        }
      }

      // 7) 형식 검증 (LLM 미사용 - 규칙/형식 검사)
      const formatResult = validateFormat(normalized, req.itemNo);
      if (!formatResult.pass) {
        // 형식 오류는 FAIL 처리
        throw new Error('형식 검증 실패: ' + formatResult.errors.join('; '));
      }
      // 형식 경고가 있으면 로그에 기록
      if (formatResult.warnings && formatResult.warnings.length > 0) {
        logger.warn('형식 검증 경고', req.requestId, formatResult.warnings.join('; '));
      }

      // 8) 2차 LLM 기반 내용 품질 평가 (규칙 기반 통과 후)
      // 설정에서 LLM 평가 활성화 여부 확인
      const enableLLMEvaluation = config.ENABLE_LLM_EVALUATION !== 'false';
      let itemEvaluation = null;
      let shouldRetry = false;

      if (enableLLMEvaluation) {
        // 규칙 기반 빠른 검사 먼저 수행
        const quickCheck = quickItemCheck(normalized, req.itemNo);

        if (!quickCheck.passed) {
          // 규칙 기반에서 심각한 문제 발견 시 재시도
          logger.warn('문항 빠른 검사 실패', req.requestId, quickCheck.issues.join('; '));
          throw new Error('문항 내용 검사 실패: ' + quickCheck.issues.join('; '));
        }

        // LLM 평가 실행 (마지막 시도에서만 또는 설정에 따라)
        const runFullEval = attempt === maxRetry || config.ALWAYS_RUN_LLM_EVAL === 'true';

        if (runFullEval) {
          try {
            const evalResult = await evaluateItemFull(normalized, req.itemNo, false);
            if (evalResult.success) {
              itemEvaluation = evalResult.data;

              // 재생성 필요 여부 확인
              if (shouldRegenerate(evalResult) && attempt < maxRetry) {
                const reason = getRegenerationReason(evalResult);
                logger.warn('LLM 평가 재생성 권고', req.requestId, reason);
                throw new Error('LLM 평가 재생성 권고: ' + reason);
              }
            }
          } catch (evalError) {
            // LLM 평가 실패는 경고만 (문항 생성 자체는 성공으로 처리)
            logger.warn('LLM 평가 실패', req.requestId, evalError.message);
          }
        }
      }

      // 성공 히스토리 저장
      const validationLog = formatResult.warnings.length > 0
        ? `OK (경고 ${formatResult.warnings.length}건)`
        : 'OK';
      saveGenerationHistory(req.requestId, attempt, raw, normalized, 'PASS', validationLog, null, null);

      return {
        rawJson: raw,
        normalized: normalized,
        validationResult: 'PASS',
        validationLog: validationLog,
        validationWarnings: formatResult.warnings || [],
        repairLog: '',
        difficultyEst: normalized.difficultyEst || '중(추정)',
        distractorScore: normalized.distractorScore || '중간',
        finalJson: normalized,
        formatStats: formatResult.stats || {},
        itemEvaluation: itemEvaluation
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
 * 세트 문항 생성 (병렬 처리 지원)
 * @param {string} setId - 세트 ID
 * @param {boolean} parallel - 병렬 처리 여부 (기본: true)
 * @returns {Object} 세트 처리 결과
 */
async function generateSetItems(setId, parallel = true) {
  const db = getDb();
  const config = getConfig();

  // 설정에서 병렬 처리 여부 확인
  const enableParallel = parallel && config.ENABLE_SET_PARALLEL !== 'false';

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

  const now = new Date().toISOString();

  // 요청 객체 배열 준비
  const reqObjects = requests.map(row => ({
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
  }));

  // 모든 요청을 RUNNING 상태로 업데이트
  for (const req of reqObjects) {
    db.prepare(`
      UPDATE item_requests
      SET status = 'RUNNING', updated_at = ?
      WHERE request_id = ?
    `).run(now, req.requestId);
  }

  let results = [];

  if (enableParallel && reqObjects.length > 1) {
    // 병렬 처리
    logger.info('세트 문항 병렬 생성 시작', `SET:${setId}`, `문항 수: ${reqObjects.length}`);

    const promises = reqObjects.map(async (req) => {
      try {
        const result = await generateItemPipeline(req);
        return { req, result, success: true };
      } catch (e) {
        logger.error('병렬 생성 중 오류', req.requestId, e.message);
        return {
          req,
          result: {
            rawJson: '',
            normalized: null,
            validationResult: 'FAIL',
            validationLog: '병렬 생성 중 오류: ' + e.message,
            repairLog: '',
            finalJson: null
          },
          success: false
        };
      }
    });

    // 모든 Promise 완료 대기
    const parallelResults = await Promise.all(promises);

    // 결과 저장 (순차)
    for (const { req, result } of parallelResults) {
      results.push({ req, result });
      await saveItemResults(req.requestId, result, req.itemNo);

      // 상태 업데이트: OK/FAIL
      const finalStatus = result.validationResult === 'PASS' ? 'OK' : 'FAIL';
      db.prepare(`
        UPDATE item_requests
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE request_id = ?
      `).run(finalStatus, req.requestId);
    }

    logger.info('세트 문항 병렬 생성 완료', `SET:${setId}`,
      `성공: ${parallelResults.filter(r => r.result.validationResult === 'PASS').length}/${parallelResults.length}`);

  } else {
    // 순차 처리 (기존 방식)
    logger.info('세트 문항 순차 생성 시작', `SET:${setId}`, `문항 수: ${reqObjects.length}`);

    for (const req of reqObjects) {
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
  }

  // 세트 단위 검증
  const setVal = validateItemSet(setId, results, setInfo);
  logger.info('세트 검증 결과', `SET:${setId}`, setVal.log);

  return {
    setId,
    itemCount: results.length,
    validationResult: setVal.pass ? 'PASS' : 'CHECK',
    validationLog: setVal.log,
    results,
    parallelProcessed: enableParallel && reqObjects.length > 1
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
