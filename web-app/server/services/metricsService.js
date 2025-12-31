/**
 * server/services/metricsService.js
 * 문항 품질 메트릭스 서비스 (3겹 검증 시스템)
 */

const { getDb } = require('../db/database');
const logger = require('./logger');

/**
 * Layer 1 구조 검증 결과를 메트릭스로 변환
 * @param {boolean} pass - 검증 통과 여부
 * @param {string} log - 검증 로그
 * @returns {Object} Layer 1 메트릭스
 */
function calculateLayer1Metrics(pass, log) {
  return {
    layer1_score: pass ? 100 : 0,
    layer1_pass: pass ? 1 : 0,
    layer1_log: log || ''
  };
}

/**
 * Layer 3 수능 적합성 검증 (규칙 기반)
 * @param {Object} itemObj - 문항 객체
 * @param {number} itemNo - 문항 번호
 * @returns {Object} Layer 3 메트릭스
 */
function calculateLayer3Metrics(itemObj, itemNo) {
  const logs = [];
  let totalScore = 0;
  let maxScore = 0;

  const passage = itemObj.passage || itemObj.gapped_passage || '';

  // 1. 단어 수 계산
  const words = passage.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // 2. 문장 수 계산
  const sentences = passage.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;

  // 3. 평균 문장 길이
  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;

  // 4. 지문 길이 적정성 평가 (문항 유형별 기준)
  const lengthStandards = {
    // LC (듣기): 짧은 지문
    16: { min: 50, max: 150, ideal: 100 },
    17: { min: 50, max: 150, ideal: 100 },
    // RC 일반: 중간 길이
    18: { min: 100, max: 200, ideal: 150 },
    19: { min: 100, max: 200, ideal: 150 },
    20: { min: 100, max: 200, ideal: 150 },
    21: { min: 120, max: 220, ideal: 170 },
    22: { min: 120, max: 220, ideal: 170 },
    23: { min: 120, max: 220, ideal: 170 },
    24: { min: 120, max: 220, ideal: 170 },
    25: { min: 80, max: 150, ideal: 100 },   // 도표
    26: { min: 100, max: 200, ideal: 150 },
    27: { min: 80, max: 150, ideal: 100 },   // 안내문
    28: { min: 120, max: 220, ideal: 170 },
    29: { min: 120, max: 220, ideal: 170 },  // 어법
    30: { min: 120, max: 220, ideal: 170 },
    // RC 빈칸: 중간~긴 지문
    31: { min: 130, max: 250, ideal: 180 },
    32: { min: 130, max: 250, ideal: 180 },
    33: { min: 150, max: 280, ideal: 200 },
    34: { min: 150, max: 280, ideal: 200 },
    // RC 논리: 중간 지문
    35: { min: 130, max: 250, ideal: 180 },
    36: { min: 130, max: 250, ideal: 180 },
    37: { min: 130, max: 250, ideal: 180 },
    38: { min: 130, max: 250, ideal: 180 },
    39: { min: 130, max: 250, ideal: 180 },
    40: { min: 150, max: 280, ideal: 200 },
    // RC 장문: 긴 지문
    41: { min: 200, max: 400, ideal: 300 },
    42: { min: 200, max: 400, ideal: 300 },
    43: { min: 250, max: 450, ideal: 350 },
    44: { min: 250, max: 450, ideal: 350 },
    45: { min: 250, max: 450, ideal: 350 }
  };

  const standard = lengthStandards[itemNo] || { min: 100, max: 250, ideal: 150 };
  let passageLengthScore = 0;
  maxScore += 40;

  if (wordCount >= standard.min && wordCount <= standard.max) {
    // 범위 내: 이상적 길이에 가까울수록 높은 점수
    const deviation = Math.abs(wordCount - standard.ideal);
    const maxDeviation = Math.max(standard.ideal - standard.min, standard.max - standard.ideal);
    passageLengthScore = Math.round(40 * (1 - deviation / maxDeviation));
    logs.push(`지문 길이 OK (${wordCount}단어, 기준: ${standard.min}-${standard.max})`);
  } else if (wordCount < standard.min) {
    passageLengthScore = Math.max(0, Math.round(20 * (wordCount / standard.min)));
    logs.push(`지문이 짧음 (${wordCount}단어 < ${standard.min})`);
  } else {
    passageLengthScore = Math.max(0, Math.round(20 * (standard.max / wordCount)));
    logs.push(`지문이 김 (${wordCount}단어 > ${standard.max})`);
  }
  totalScore += passageLengthScore;

  // 5. 문장 복잡도 평가 (평균 문장 길이)
  // 수능 영어: 평균 15-25단어/문장이 적절
  let formatScore = 0;
  maxScore += 30;

  if (avgSentenceLength >= 12 && avgSentenceLength <= 28) {
    formatScore = 30;
    logs.push(`문장 복잡도 적절 (평균 ${avgSentenceLength.toFixed(1)}단어/문장)`);
  } else if (avgSentenceLength < 12) {
    formatScore = Math.round(20 * (avgSentenceLength / 12));
    logs.push(`문장이 너무 단순 (평균 ${avgSentenceLength.toFixed(1)}단어/문장)`);
  } else {
    formatScore = Math.round(20 * (28 / avgSentenceLength));
    logs.push(`문장이 너무 복잡 (평균 ${avgSentenceLength.toFixed(1)}단어/문장)`);
  }
  totalScore += formatScore;

  // 6. 선택지 형식 검사
  maxScore += 30;
  let optionsScore = 0;

  if (Array.isArray(itemObj.options) && itemObj.options.length === 5) {
    const filledOptions = itemObj.options.filter(o => o && String(o).trim().length > 0);
    if (filledOptions.length === 5) {
      optionsScore = 30;
      logs.push('선택지 5개 완비');
    } else {
      optionsScore = Math.round(30 * (filledOptions.length / 5));
      logs.push(`선택지 부족 (${filledOptions.length}/5)`);
    }
  } else {
    logs.push('선택지 배열 오류');
  }
  totalScore += optionsScore;

  // 최종 Layer 3 점수 (0-100)
  const layer3Score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    word_count: wordCount,
    sentence_count: sentenceCount,
    avg_sentence_length: Math.round(avgSentenceLength * 100) / 100,
    passage_length_score: passageLengthScore,
    format_score: formatScore + optionsScore,
    layer3_score: layer3Score,
    layer3_log: logs.join('; ')
  };
}

/**
 * Layer 2 규칙 기반 내용 검증
 * @param {Object} itemObj - 문항 객체
 * @returns {Object} Layer 2 규칙 기반 메트릭스
 */
function calculateLayer2RuleMetrics(itemObj) {
  const logs = [];
  let score = 0;
  let maxScore = 0;

  // 1. 정답이 선택지 범위 내에 있는지
  maxScore += 30;
  const answer = parseInt(itemObj.answer);
  if (answer >= 1 && answer <= 5) {
    score += 30;
    logs.push('정답 범위 OK');
  } else {
    logs.push(`정답 범위 오류: ${itemObj.answer}`);
  }

  // 2. 선택지 중복 검사
  maxScore += 40;
  if (Array.isArray(itemObj.options) && itemObj.options.length === 5) {
    const normalized = itemObj.options.map(o => String(o || '').trim().toLowerCase());
    const unique = new Set(normalized);
    const uniqueRatio = unique.size / 5;
    const uniqueScore = Math.round(40 * uniqueRatio);
    score += uniqueScore;

    if (unique.size === 5) {
      logs.push('선택지 모두 고유');
    } else {
      logs.push(`선택지 중복: ${5 - unique.size}개`);
    }
  }

  // 3. 해설 존재 여부
  maxScore += 30;
  if (itemObj.explanation && String(itemObj.explanation).trim().length > 10) {
    score += 30;
    logs.push('해설 존재');
  } else {
    logs.push('해설 없음 또는 너무 짧음');
  }

  const layer2RuleScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    answer_in_options: answer >= 1 && answer <= 5 ? 1 : 0,
    distractor_uniqueness: Array.isArray(itemObj.options) ? new Set(itemObj.options.map(o => String(o || '').trim().toLowerCase())).size : 0,
    layer2_rule_score: layer2RuleScore,
    layer2_score: layer2RuleScore,  // AI 평가 전까지는 규칙 점수로 대체
    layer2_log: logs.join('; ')
  };
}

/**
 * 종합 점수 및 분류 계산
 * @param {Object} layer1 - Layer 1 메트릭스
 * @param {Object} layer2 - Layer 2 메트릭스
 * @param {Object} layer3 - Layer 3 메트릭스
 * @returns {Object} 종합 결과
 */
function calculateFinalMetrics(layer1, layer2, layer3) {
  // 가중치 설정
  // Layer 1 (구조): 40% - 필수 통과
  // Layer 3 (수능 적합성): 35% - 객관적 수치
  // Layer 2 (내용 품질): 25% - 규칙 + AI

  const weights = {
    layer1: 0.40,
    layer3: 0.35,
    layer2: 0.25
  };

  // Layer 1 미통과시 최대 점수 제한
  let finalScore;
  if (!layer1.layer1_pass) {
    finalScore = Math.min(40, layer3.layer3_score * 0.3 + layer2.layer2_score * 0.1);
  } else {
    finalScore =
      layer1.layer1_score * weights.layer1 +
      layer3.layer3_score * weights.layer3 +
      layer2.layer2_score * weights.layer2;
  }

  finalScore = Math.round(finalScore * 100) / 100;

  // 등급 결정
  let grade;
  if (finalScore >= 90) grade = 'A';
  else if (finalScore >= 80) grade = 'B';
  else if (finalScore >= 70) grade = 'C';
  else if (finalScore >= 60) grade = 'D';
  else grade = 'F';

  // 분류 결정
  let recommendation;
  const flags = [];

  if (!layer1.layer1_pass) {
    recommendation = 'REJECT';
    flags.push('구조 검증 실패');
  } else if (finalScore >= 85) {
    recommendation = 'APPROVE';
  } else if (finalScore >= 65) {
    recommendation = 'REVIEW';
    if (layer3.layer3_score < 70) flags.push('수능 적합성 미흡');
    if (layer2.layer2_score < 70) flags.push('내용 품질 검토 필요');
  } else {
    recommendation = 'REJECT';
    if (layer3.layer3_score < 50) flags.push('수능 적합성 부족');
    if (layer2.layer2_score < 50) flags.push('내용 품질 부족');
  }

  return {
    final_score: finalScore,
    grade,
    recommendation,
    flags: JSON.stringify(flags)
  };
}

/**
 * 문항 메트릭스 저장
 * @param {string} requestId - 요청 ID
 * @param {Object} itemObj - 문항 객체
 * @param {number} itemNo - 문항 번호
 * @param {boolean} layer1Pass - Layer 1 통과 여부
 * @param {string} layer1Log - Layer 1 로그
 */
function saveItemMetrics(requestId, itemObj, itemNo, layer1Pass, layer1Log) {
  try {
    const db = getDb();

    // 각 레이어 메트릭스 계산
    const layer1 = calculateLayer1Metrics(layer1Pass, layer1Log);
    const layer3 = calculateLayer3Metrics(itemObj, itemNo);
    const layer2 = calculateLayer2RuleMetrics(itemObj);
    const final = calculateFinalMetrics(layer1, layer2, layer3);

    // DB 저장
    db.prepare(`
      INSERT INTO item_metrics (
        request_id, item_no,
        layer1_score, layer1_pass, layer1_log,
        word_count, sentence_count, avg_sentence_length, passage_length_score, format_score, layer3_score, layer3_log,
        answer_in_options, distractor_uniqueness, layer2_rule_score, layer2_score, layer2_log,
        final_score, grade, recommendation, flags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      requestId, itemNo,
      layer1.layer1_score, layer1.layer1_pass, layer1.layer1_log,
      layer3.word_count, layer3.sentence_count, layer3.avg_sentence_length, layer3.passage_length_score, layer3.format_score, layer3.layer3_score, layer3.layer3_log,
      layer2.answer_in_options, layer2.distractor_uniqueness, layer2.layer2_rule_score, layer2.layer2_score, layer2.layer2_log,
      final.final_score, final.grade, final.recommendation, final.flags
    );

    logger.info('메트릭스 저장', requestId, `점수: ${final.final_score}, 등급: ${final.grade}, 분류: ${final.recommendation}`);

    return {
      ...layer1,
      ...layer3,
      ...layer2,
      ...final
    };

  } catch (error) {
    logger.error('메트릭스 저장 실패', requestId, error);
    return null;
  }
}

/**
 * 요청 ID로 메트릭스 조회
 * @param {string} requestId - 요청 ID
 * @returns {Object|null} 메트릭스 데이터
 */
function getMetricsByRequestId(requestId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM item_metrics WHERE request_id = ?
  `).get(requestId);
}

/**
 * 메트릭스 통계 조회
 * @returns {Object} 통계 데이터
 */
function getMetricsStats() {
  const db = getDb();

  const total = db.prepare(`SELECT COUNT(*) as count FROM item_metrics`).get();
  const byGrade = db.prepare(`
    SELECT grade, COUNT(*) as count FROM item_metrics GROUP BY grade
  `).all();
  const byRecommendation = db.prepare(`
    SELECT recommendation, COUNT(*) as count FROM item_metrics GROUP BY recommendation
  `).all();
  const avgScores = db.prepare(`
    SELECT
      AVG(layer1_score) as avg_layer1,
      AVG(layer2_score) as avg_layer2,
      AVG(layer3_score) as avg_layer3,
      AVG(final_score) as avg_final
    FROM item_metrics
  `).get();

  return {
    total: total?.count || 0,
    byGrade: byGrade || [],
    byRecommendation: byRecommendation || [],
    avgScores: avgScores || {}
  };
}

module.exports = {
  calculateLayer1Metrics,
  calculateLayer3Metrics,
  calculateLayer2RuleMetrics,
  calculateFinalMetrics,
  saveItemMetrics,
  getMetricsByRequestId,
  getMetricsStats
};
