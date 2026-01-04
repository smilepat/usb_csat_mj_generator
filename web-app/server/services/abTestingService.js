/**
 * server/services/abTestingService.js
 * A/B 테스팅 서비스
 *
 * 프롬프트 버전 간 성능 비교 및 통계 분석
 */

const { getDb } = require('../db/database');
const logger = require('./logger');

/**
 * A/B 테스트 생성
 * @param {string} promptKey - 프롬프트 키
 * @param {string} testName - 테스트 이름
 * @param {number} versionA - A 버전 번호
 * @param {number} versionB - B 버전 번호
 * @returns {Object} 생성된 테스트 정보
 */
function createABTest(promptKey, testName, versionA, versionB) {
  const db = getDb();

  const prompt = db.prepare('SELECT id FROM prompts WHERE prompt_key = ?').get(promptKey);
  if (!prompt) {
    throw new Error('프롬프트를 찾을 수 없습니다.');
  }

  // 버전 유효성 검사
  const versions = db.prepare(`
    SELECT version FROM prompt_versions WHERE prompt_id = ?
  `).all(prompt.id).map(v => v.version);

  // 현재 버전도 포함 (0 또는 'current'로 표시)
  versions.push(0); // 0은 현재 버전을 의미

  if (!versions.includes(versionA) && versionA !== 0) {
    throw new Error(`버전 A(${versionA})를 찾을 수 없습니다.`);
  }
  if (!versions.includes(versionB) && versionB !== 0) {
    throw new Error(`버전 B(${versionB})를 찾을 수 없습니다.`);
  }

  // 기존 활성 테스트 확인
  const existingTest = db.prepare(`
    SELECT id FROM ab_tests WHERE prompt_id = ? AND status = 'active'
  `).get(prompt.id);

  if (existingTest) {
    throw new Error('이미 활성화된 A/B 테스트가 있습니다. 먼저 종료해주세요.');
  }

  // 테스트 생성
  const result = db.prepare(`
    INSERT INTO ab_tests (prompt_id, prompt_key, test_name, version_a, version_b, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(prompt.id, promptKey, testName, versionA, versionB);

  logger.info('A/B 테스트 생성', promptKey, `테스트: ${testName}, A=${versionA}, B=${versionB}`);

  return {
    testId: result.lastInsertRowid,
    promptKey,
    testName,
    versionA,
    versionB,
    status: 'active'
  };
}

/**
 * A/B 테스트 목록 조회
 * @param {string} status - 상태 필터 (active, completed, all)
 * @returns {Array} 테스트 목록
 */
function getABTests(status = 'all') {
  const db = getDb();

  let query = `
    SELECT t.*, p.title as prompt_title
    FROM ab_tests t
    LEFT JOIN prompts p ON t.prompt_id = p.id
  `;

  if (status !== 'all') {
    query += ` WHERE t.status = ?`;
  }

  query += ` ORDER BY t.created_at DESC`;

  const tests = status !== 'all'
    ? db.prepare(query).all(status)
    : db.prepare(query).all();

  return tests;
}

/**
 * A/B 테스트 상세 조회 및 결과 분석
 * @param {number} testId - 테스트 ID
 * @returns {Object} 테스트 상세 정보 및 분석 결과
 */
function getABTestResults(testId) {
  const db = getDb();

  const test = db.prepare(`
    SELECT t.*, p.title as prompt_title, p.prompt_text as current_prompt
    FROM ab_tests t
    LEFT JOIN prompts p ON t.prompt_id = p.id
    WHERE t.id = ?
  `).get(testId);

  if (!test) {
    throw new Error('A/B 테스트를 찾을 수 없습니다.');
  }

  // 버전별 프롬프트 텍스트 조회
  const versionAText = test.version_a === 0
    ? test.current_prompt
    : db.prepare(`
        SELECT prompt_text FROM prompt_versions
        WHERE prompt_id = ? AND version = ?
      `).get(test.prompt_id, test.version_a)?.prompt_text;

  const versionBText = test.version_b === 0
    ? test.current_prompt
    : db.prepare(`
        SELECT prompt_text FROM prompt_versions
        WHERE prompt_id = ? AND version = ?
      `).get(test.prompt_id, test.version_b)?.prompt_text;

  // 버전별 성능 데이터 수집
  const statsA = getVersionStats(test.prompt_id, test.version_a, test.created_at);
  const statsB = getVersionStats(test.prompt_id, test.version_b, test.created_at);

  // 통계적 분석
  const analysis = analyzeResults(statsA, statsB);

  return {
    test: {
      id: test.id,
      promptKey: test.prompt_key,
      promptTitle: test.prompt_title,
      testName: test.test_name,
      status: test.status,
      createdAt: test.created_at,
      completedAt: test.completed_at,
      winner: test.winner
    },
    versionA: {
      version: test.version_a,
      promptText: versionAText,
      stats: statsA
    },
    versionB: {
      version: test.version_b,
      promptText: versionBText,
      stats: statsB
    },
    analysis
  };
}

/**
 * 특정 버전의 성능 통계 조회
 */
function getVersionStats(promptId, version, startDate) {
  const db = getDb();

  // 해당 버전으로 생성된 문항 조회
  const items = db.prepare(`
    SELECT ir.request_id, ir.status, ir.created_at,
           im.layer1_score, im.layer2_score, im.layer3_score, im.final_score, im.grade
    FROM item_requests ir
    LEFT JOIN item_metrics im ON ir.request_id = im.request_id
    WHERE ir.prompt_id = ?
      AND (ir.prompt_version = ? OR (? = 0 AND ir.prompt_version IS NULL))
      AND ir.created_at >= ?
  `).all(promptId, version, version, startDate);

  if (items.length === 0) {
    return {
      totalItems: 0,
      okCount: 0,
      failCount: 0,
      approveRate: 0,
      avgScore: 0,
      gradeDistribution: {},
      items: []
    };
  }

  const okCount = items.filter(i => i.status === 'OK').length;
  const failCount = items.filter(i => i.status === 'FAIL').length;
  const scores = items.filter(i => i.final_score !== null).map(i => i.final_score);
  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  // 등급 분포
  const gradeDistribution = {};
  items.forEach(i => {
    if (i.grade) {
      gradeDistribution[i.grade] = (gradeDistribution[i.grade] || 0) + 1;
    }
  });

  return {
    totalItems: items.length,
    okCount,
    failCount,
    approveRate: items.length > 0 ? (okCount / items.length) * 100 : 0,
    avgScore,
    gradeDistribution,
    scores
  };
}

/**
 * 두 버전의 결과 비교 분석
 */
function analyzeResults(statsA, statsB) {
  const analysis = {
    sampleSizeA: statsA.totalItems,
    sampleSizeB: statsB.totalItems,
    sufficientData: statsA.totalItems >= 5 && statsB.totalItems >= 5,
    comparison: {},
    recommendation: null,
    confidence: 'low'
  };

  if (!analysis.sufficientData) {
    analysis.recommendation = '충분한 데이터가 수집되지 않았습니다. 각 버전당 최소 5개 이상의 문항이 필요합니다.';
    return analysis;
  }

  // 승인율 비교
  const approveRateDiff = statsA.approveRate - statsB.approveRate;
  analysis.comparison.approveRate = {
    versionA: statsA.approveRate.toFixed(1) + '%',
    versionB: statsB.approveRate.toFixed(1) + '%',
    difference: approveRateDiff.toFixed(1) + '%',
    winner: approveRateDiff > 5 ? 'A' : (approveRateDiff < -5 ? 'B' : 'tie')
  };

  // 평균 점수 비교
  const scoreDiff = statsA.avgScore - statsB.avgScore;
  analysis.comparison.avgScore = {
    versionA: statsA.avgScore.toFixed(1),
    versionB: statsB.avgScore.toFixed(1),
    difference: scoreDiff.toFixed(1),
    winner: scoreDiff > 3 ? 'A' : (scoreDiff < -3 ? 'B' : 'tie')
  };

  // 통계적 유의성 검정 (간단한 Z-test)
  if (statsA.scores.length >= 10 && statsB.scores.length >= 10) {
    const zScore = calculateZScore(statsA.scores, statsB.scores);
    analysis.zScore = zScore.toFixed(2);
    analysis.pValue = calculatePValue(zScore);

    if (Math.abs(zScore) > 1.96) {
      analysis.confidence = 'high';
      analysis.statistically_significant = true;
    } else if (Math.abs(zScore) > 1.645) {
      analysis.confidence = 'medium';
      analysis.statistically_significant = false;
    } else {
      analysis.confidence = 'low';
      analysis.statistically_significant = false;
    }
  }

  // 최종 추천
  const aWins = (analysis.comparison.approveRate.winner === 'A' ? 1 : 0) +
                (analysis.comparison.avgScore.winner === 'A' ? 1 : 0);
  const bWins = (analysis.comparison.approveRate.winner === 'B' ? 1 : 0) +
                (analysis.comparison.avgScore.winner === 'B' ? 1 : 0);

  if (aWins > bWins) {
    analysis.recommendation = `버전 A가 더 나은 성능을 보입니다. (승인율: ${approveRateDiff > 0 ? '+' : ''}${approveRateDiff.toFixed(1)}%, 점수: ${scoreDiff > 0 ? '+' : ''}${scoreDiff.toFixed(1)})`;
    analysis.suggestedWinner = 'A';
  } else if (bWins > aWins) {
    analysis.recommendation = `버전 B가 더 나은 성능을 보입니다. (승인율: ${-approveRateDiff > 0 ? '+' : ''}${(-approveRateDiff).toFixed(1)}%, 점수: ${-scoreDiff > 0 ? '+' : ''}${(-scoreDiff).toFixed(1)})`;
    analysis.suggestedWinner = 'B';
  } else {
    analysis.recommendation = '두 버전 간 유의미한 차이가 없습니다.';
    analysis.suggestedWinner = 'tie';
  }

  return analysis;
}

/**
 * Z-score 계산 (두 집단 평균 비교)
 */
function calculateZScore(scoresA, scoresB) {
  const meanA = scoresA.reduce((a, b) => a + b, 0) / scoresA.length;
  const meanB = scoresB.reduce((a, b) => a + b, 0) / scoresB.length;

  const varA = scoresA.reduce((sum, x) => sum + Math.pow(x - meanA, 2), 0) / scoresA.length;
  const varB = scoresB.reduce((sum, x) => sum + Math.pow(x - meanB, 2), 0) / scoresB.length;

  const se = Math.sqrt(varA / scoresA.length + varB / scoresB.length);

  if (se === 0) return 0;

  return (meanA - meanB) / se;
}

/**
 * P-value 근사 계산
 */
function calculatePValue(zScore) {
  // 표준 정규 분포 CDF 근사
  const absZ = Math.abs(zScore);
  const p = Math.exp(-0.5 * absZ * absZ) / Math.sqrt(2 * Math.PI);
  const pValue = 2 * (1 - normalCDF(absZ));
  return pValue.toFixed(4);
}

function normalCDF(x) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * A/B 테스트 종료 및 승자 선택
 * @param {number} testId - 테스트 ID
 * @param {string} winner - 승자 ('A', 'B', 'tie')
 * @param {boolean} applyWinner - 승자 버전을 현재 버전으로 적용할지 여부
 */
function completeABTest(testId, winner, applyWinner = false) {
  const db = getDb();

  const test = db.prepare('SELECT * FROM ab_tests WHERE id = ?').get(testId);
  if (!test) {
    throw new Error('A/B 테스트를 찾을 수 없습니다.');
  }

  if (test.status !== 'active') {
    throw new Error('이미 종료된 테스트입니다.');
  }

  // 테스트 종료
  db.prepare(`
    UPDATE ab_tests
    SET status = 'completed', winner = ?, completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(winner, testId);

  // 승자 버전 적용
  if (applyWinner && winner !== 'tie') {
    const winnerVersion = winner === 'A' ? test.version_a : test.version_b;

    if (winnerVersion !== 0) {
      // 히스토리 버전을 현재 버전으로 적용
      const versionText = db.prepare(`
        SELECT prompt_text FROM prompt_versions
        WHERE prompt_id = ? AND version = ?
      `).get(test.prompt_id, winnerVersion);

      if (versionText) {
        // 현재 버전 백업
        const currentPrompt = db.prepare('SELECT prompt_text FROM prompts WHERE id = ?').get(test.prompt_id);
        const maxVersion = db.prepare(`
          SELECT COALESCE(MAX(version), 0) as max FROM prompt_versions WHERE prompt_id = ?
        `).get(test.prompt_id);

        db.prepare(`
          INSERT INTO prompt_versions (prompt_id, prompt_key, version, prompt_text, change_reason)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          test.prompt_id,
          test.prompt_key,
          maxVersion.max + 1,
          currentPrompt.prompt_text,
          `A/B 테스트 #${testId} 결과로 버전 ${winnerVersion} 적용 전 백업`
        );

        // 승자 버전으로 업데이트
        db.prepare(`
          UPDATE prompts SET prompt_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(versionText.prompt_text, test.prompt_id);

        logger.info('A/B 테스트 승자 적용', test.prompt_key,
          `테스트 #${testId}, 버전 ${winnerVersion} 적용됨`);
      }
    }
  }

  logger.info('A/B 테스트 종료', test.prompt_key, `테스트 #${testId}, 승자: ${winner}`);

  return {
    testId,
    status: 'completed',
    winner,
    applied: applyWinner && winner !== 'tie'
  };
}

/**
 * A/B 테스트 삭제
 */
function deleteABTest(testId) {
  const db = getDb();

  const result = db.prepare('DELETE FROM ab_tests WHERE id = ?').run(testId);

  if (result.changes === 0) {
    throw new Error('A/B 테스트를 찾을 수 없습니다.');
  }

  return { deleted: true };
}

module.exports = {
  createABTest,
  getABTests,
  getABTestResults,
  completeABTest,
  deleteABTest
};
