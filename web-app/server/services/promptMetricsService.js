/**
 * server/services/promptMetricsService.js
 * 프롬프트 품질 메트릭스 통합 서비스
 * - 규칙 기반 검증 + AI 평가 통합
 * - 프롬프트 성능 추적 (생성된 문항 품질)
 */

const { getDb, saveDatabase } = require('../db/database');
const { validatePromptStructure, getTypeKeywords } = require('./promptValidator');
const { evaluatePrompt, quickValidate } = require('./promptEvaluator');
const { SEVERITY } = require('./promptEvaluator.rules');
const logger = require('./logger');

// 가중치 설정
const WEIGHTS = {
  RULE: 0.4,  // 규칙 기반 40%
  AI: 0.6     // AI 평가 60%
};

/**
 * 규칙 기반 검증 점수 계산 (0-100)
 * @param {string} promptKey - 프롬프트 키
 * @param {string} promptText - 프롬프트 내용
 * @returns {Object} 규칙 기반 점수 및 세부 정보
 */
function calculateRuleScore(promptKey, promptText) {
  const result = {
    score: 0,
    details: [],
    deductions: []
  };

  if (!promptText || promptText.trim().length === 0) {
    return { score: 0, details: ['프롬프트가 비어 있음'], deductions: [{ reason: '빈 프롬프트', points: -100 }] };
  }

  let baseScore = 100;

  // 1. 길이 검사 (최대 -20점)
  const length = promptText.trim().length;
  if (length < 50) {
    baseScore -= 20;
    result.deductions.push({ reason: '프롬프트 너무 짧음 (50자 미만)', points: -20 });
  } else if (length < 100) {
    baseScore -= 10;
    result.deductions.push({ reason: '프롬프트 짧음 (100자 미만)', points: -10 });
  } else {
    result.details.push('길이 적절 (' + length + '자)');
  }

  // 2. 구조 검증 (최대 -30점)
  const structureResult = validatePromptStructure(promptKey, promptText);

  if (structureResult.errors.length > 0) {
    const deduction = Math.min(30, structureResult.errors.length * 15);
    baseScore -= deduction;
    result.deductions.push({ reason: '구조 오류: ' + structureResult.errors.join(', '), points: -deduction });
  }

  if (structureResult.warnings.length > 0) {
    const deduction = Math.min(15, structureResult.warnings.length * 5);
    baseScore -= deduction;
    result.deductions.push({ reason: '구조 경고: ' + structureResult.warnings.join(', '), points: -deduction });
  }

  if (structureResult.valid && structureResult.warnings.length === 0) {
    result.details.push('구조 검증 통과');
  }

  // 3. 키워드 검사 (최대 -20점)
  if (/^\d+$/.test(promptKey)) {
    const itemNo = parseInt(promptKey);
    const keywords = getTypeKeywords(itemNo);

    if (keywords.length > 0) {
      const foundCount = keywords.filter(kw =>
        promptText.toLowerCase().includes(kw.toLowerCase())
      ).length;

      const keywordRatio = foundCount / keywords.length;

      if (keywordRatio < 0.3) {
        baseScore -= 20;
        result.deductions.push({ reason: '유형별 키워드 부족', points: -20 });
      } else if (keywordRatio < 0.6) {
        baseScore -= 10;
        result.deductions.push({ reason: '유형별 키워드 일부 누락', points: -10 });
      } else {
        result.details.push('유형별 키워드 포함 (' + Math.round(keywordRatio * 100) + '%)');
      }
    }
  }

  // 4. MASTER_PROMPT 전용 검사 (최대 -20점)
  if (promptKey === 'MASTER_PROMPT') {
    const requiredElements = ['JSON', 'itemNo', 'question', 'options', 'answer'];
    const foundElements = requiredElements.filter(el => promptText.includes(el));

    if (foundElements.length < 3) {
      baseScore -= 20;
      result.deductions.push({ reason: '필수 스키마 요소 부족', points: -20 });
    } else if (foundElements.length < requiredElements.length) {
      baseScore -= 10;
      result.deductions.push({ reason: '일부 스키마 요소 누락', points: -10 });
    } else {
      result.details.push('스키마 요소 모두 포함');
    }
  }

  // 5. 빠른 검증 (promptEvaluator.rules.js 기반)
  const quickResult = quickValidate(promptKey, promptText);

  // ERROR 레벨 이슈: 더 높은 감점 (이슈당 10점, 최대 30점)
  if (quickResult.issues.length > 0) {
    const errorDeduction = Math.min(30, quickResult.issues.length * 10);
    baseScore -= errorDeduction;
    result.deductions.push({
      reason: '빠른 검증 오류: ' + quickResult.issues.join(', '),
      points: -errorDeduction,
      severity: SEVERITY.ERROR
    });
  }

  // WARN 레벨 경고: 낮은 감점 (경고당 3점, 최대 15점)
  if (quickResult.warnings.length > 0) {
    const warnDeduction = Math.min(15, quickResult.warnings.length * 3);
    baseScore -= warnDeduction;
    result.deductions.push({
      reason: '빠른 검증 경고: ' + quickResult.warnings.join(', '),
      points: -warnDeduction,
      severity: SEVERITY.WARN
    });
  }

  // 검증 통과 시 상세 정보 추가
  if (quickResult.passed && quickResult.warnings.length === 0) {
    result.details.push('빠른 검증 통과 (규칙 기반)');
  }

  result.score = Math.max(0, baseScore);
  return result;
}

/**
 * AI 평가 점수를 100점 만점으로 변환
 * @param {Object} aiResult - evaluatePrompt 결과
 * @returns {Object} 변환된 AI 점수
 */
function normalizeAIScore(aiResult) {
  if (!aiResult.success || !aiResult.data) {
    return {
      score: 0,
      clarity: 0,
      completeness: 0,
      consistency: 0,
      specificity: 0,
      csat_fit: 0,
      reasoning: aiResult.error || 'AI 평가 실패'
    };
  }

  const data = aiResult.data;

  return {
    score: Math.round(data.overall_score * 10), // 1-10 -> 10-100
    clarity: Math.round(data.criteria_scores.clarity * 10),
    completeness: Math.round(data.criteria_scores.completeness * 10),
    consistency: Math.round(data.criteria_scores.consistency * 10),
    specificity: Math.round(data.criteria_scores.specificity * 10),
    csat_fit: Math.round(data.criteria_scores.csat_appropriateness * 10),
    reasoning: JSON.stringify({
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      suggestions: data.suggestions,
      improved_prompt: data.improved_prompt
    })
  };
}

/**
 * 통합 점수 및 등급 계산
 * @param {number} ruleScore - 규칙 기반 점수 (0-100)
 * @param {number} aiScore - AI 평가 점수 (0-100)
 * @returns {Object} 통합 점수, 등급, 플래그
 */
function calculateTotalScore(ruleScore, aiScore) {
  // AI 점수가 없으면 규칙 점수만 사용
  const hasAI = aiScore > 0;

  let totalScore;
  if (hasAI) {
    totalScore = Math.round(ruleScore * WEIGHTS.RULE + aiScore * WEIGHTS.AI);
  } else {
    totalScore = ruleScore;
  }

  // 등급 계산
  let grade;
  if (totalScore >= 90) grade = 'A';
  else if (totalScore >= 80) grade = 'B';
  else if (totalScore >= 70) grade = 'C';
  else if (totalScore >= 60) grade = 'D';
  else grade = 'F';

  // 개선 필요 플래그
  const needsImprovement = totalScore < 70;

  return {
    totalScore,
    grade,
    needsImprovement,
    hasAI
  };
}

/**
 * 프롬프트 메트릭스 계산 및 저장
 * @param {number} promptId - prompts 테이블의 ID
 * @param {string} promptKey - 프롬프트 키
 * @param {string} promptText - 프롬프트 내용
 * @param {boolean} includeAI - AI 평가 포함 여부
 * @returns {Object} 저장된 메트릭스
 */
async function calculateAndSavePromptMetrics(promptId, promptKey, promptText, includeAI = false) {
  const db = getDb();

  try {
    // 1. 규칙 기반 검증
    const ruleResult = calculateRuleScore(promptKey, promptText);

    // 2. AI 평가 (선택적)
    let aiResult = { score: 0, clarity: 0, completeness: 0, consistency: 0, specificity: 0, csat_fit: 0, reasoning: null };

    if (includeAI) {
      const evalResult = await evaluatePrompt(promptKey, promptText);
      aiResult = normalizeAIScore(evalResult);
    }

    // 3. 통합 점수 계산
    const { totalScore, grade, needsImprovement } = calculateTotalScore(ruleResult.score, aiResult.score);

    // 4. 기존 메트릭스 확인
    const existing = db.prepare(`
      SELECT id FROM prompt_metrics WHERE prompt_id = ?
    `).get(promptId);

    const ruleDetails = JSON.stringify({
      details: ruleResult.details,
      deductions: ruleResult.deductions
    });

    if (existing) {
      // 업데이트
      db.prepare(`
        UPDATE prompt_metrics SET
          prompt_key = ?,
          rule_score = ?,
          rule_details = ?,
          ai_score = ?,
          ai_clarity = ?,
          ai_completeness = ?,
          ai_consistency = ?,
          ai_specificity = ?,
          ai_csat_fit = ?,
          ai_reasoning = ?,
          total_score = ?,
          grade = ?,
          needs_improvement = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE prompt_id = ?
      `).run(
        promptKey,
        ruleResult.score,
        ruleDetails,
        aiResult.score,
        aiResult.clarity,
        aiResult.completeness,
        aiResult.consistency,
        aiResult.specificity,
        aiResult.csat_fit,
        aiResult.reasoning,
        totalScore,
        grade,
        needsImprovement ? 1 : 0,
        promptId
      );
    } else {
      // 새로 삽입
      db.prepare(`
        INSERT INTO prompt_metrics (
          prompt_id, prompt_key, rule_score, rule_details,
          ai_score, ai_clarity, ai_completeness, ai_consistency, ai_specificity, ai_csat_fit, ai_reasoning,
          total_score, grade, needs_improvement
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        promptId,
        promptKey,
        ruleResult.score,
        ruleDetails,
        aiResult.score,
        aiResult.clarity,
        aiResult.completeness,
        aiResult.consistency,
        aiResult.specificity,
        aiResult.csat_fit,
        aiResult.reasoning,
        totalScore,
        grade,
        needsImprovement ? 1 : 0
      );
    }

    logger.info('프롬프트 메트릭스 저장', promptKey, `Score: ${totalScore}, Grade: ${grade}`);

    return {
      promptId,
      promptKey,
      ruleScore: ruleResult.score,
      ruleDetails: ruleResult,
      aiScore: aiResult.score,
      aiDetails: includeAI ? aiResult : null,
      totalScore,
      grade,
      needsImprovement
    };

  } catch (error) {
    logger.error('프롬프트 메트릭스 계산 실패', promptKey, error);
    throw error;
  }
}

/**
 * 프롬프트 사용 횟수 증가 (문항 생성 시작 시 호출)
 * @param {number} promptId - 프롬프트 ID
 */
function incrementPromptUsage(promptId) {
  const db = getDb();

  try {
    db.prepare(`
      UPDATE prompt_metrics SET
        times_used = COALESCE(times_used, 0) + 1,
        last_used_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE prompt_id = ?
    `).run(promptId);

    logger.info('프롬프트 사용 횟수 증가', promptId);
    return true;
  } catch (error) {
    logger.error('프롬프트 사용 횟수 증가 실패', promptId, error);
    return false;
  }
}

/**
 * 프롬프트 성능 업데이트 (문항 생성 후 호출)
 * @param {number} promptId - 프롬프트 ID
 * @param {number} promptVersion - 프롬프트 버전 (선택)
 */
function updatePromptPerformance(promptId, promptVersion = null) {
  const db = getDb();

  try {
    // 해당 프롬프트로 생성된 문항들의 통계
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        AVG(m.final_score) as avg_score,
        SUM(CASE WHEN m.recommendation = 'APPROVE' THEN 1 ELSE 0 END) as approve_count,
        SUM(CASE WHEN m.recommendation = 'REVIEW' THEN 1 ELSE 0 END) as review_count,
        SUM(CASE WHEN m.recommendation = 'REJECT' THEN 1 ELSE 0 END) as reject_count
      FROM item_requests r
      JOIN item_metrics m ON r.request_id = m.request_id
      WHERE r.prompt_id = ?
    `).get(promptId);

    if (!stats || stats.total === 0) {
      return null;
    }

    const approveRate = stats.total > 0 ? (stats.approve_count / stats.total) * 100 : 0;

    // 기존 버전 성능 데이터 가져오기
    let versionPerformance = {};
    const existing = db.prepare(`
      SELECT version_performance FROM prompt_metrics WHERE prompt_id = ?
    `).get(promptId);

    if (existing && existing.version_performance) {
      try {
        versionPerformance = JSON.parse(existing.version_performance);
      } catch (e) {
        versionPerformance = {};
      }
    }

    // 버전별 성능 추적 (버전이 제공된 경우)
    if (promptVersion !== null) {
      versionPerformance[`v${promptVersion}`] = {
        items_generated: stats.total,
        avg_score: Math.round(stats.avg_score * 10) / 10,
        approve_rate: Math.round(approveRate * 10) / 10,
        updated_at: new Date().toISOString()
      };
    }

    // 성능 데이터 업데이트
    db.prepare(`
      UPDATE prompt_metrics SET
        items_generated = ?,
        avg_item_score = ?,
        approve_count = ?,
        review_count = ?,
        reject_count = ?,
        approve_rate = ?,
        version_performance = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE prompt_id = ?
    `).run(
      stats.total,
      Math.round(stats.avg_score * 10) / 10,
      stats.approve_count,
      stats.review_count,
      stats.reject_count,
      Math.round(approveRate * 10) / 10,
      JSON.stringify(versionPerformance),
      promptId
    );

    // 낮은 성능 프롬프트 플래그
    if (approveRate < 50 && stats.total >= 3) {
      db.prepare(`
        UPDATE prompt_metrics SET
          needs_improvement = 1,
          flags = ?
        WHERE prompt_id = ?
      `).run(
        JSON.stringify({ lowApproveRate: true, rate: approveRate }),
        promptId
      );
    }

    return {
      itemsGenerated: stats.total,
      avgItemScore: stats.avg_score,
      approveRate,
      versionPerformance
    };

  } catch (error) {
    logger.error('프롬프트 성능 업데이트 실패', promptId, error);
    return null;
  }
}

/**
 * 프롬프트 메트릭스 조회
 * @param {number} promptId - 프롬프트 ID
 * @returns {Object|null} 메트릭스 데이터
 */
function getPromptMetrics(promptId) {
  const db = getDb();

  const metrics = db.prepare(`
    SELECT * FROM prompt_metrics WHERE prompt_id = ?
  `).get(promptId);

  if (metrics) {
    // JSON 파싱
    if (metrics.rule_details) {
      try {
        metrics.rule_details = JSON.parse(metrics.rule_details);
      } catch (e) {
        metrics.rule_details = null;
      }
    }
    if (metrics.ai_reasoning) {
      try {
        metrics.ai_reasoning = JSON.parse(metrics.ai_reasoning);
      } catch (e) {
        metrics.ai_reasoning = null;
      }
    }
    if (metrics.flags) {
      try {
        metrics.flags = JSON.parse(metrics.flags);
      } catch (e) {
        metrics.flags = null;
      }
    }
  }

  return metrics;
}

/**
 * 프롬프트별 메트릭스 요약 조회
 * @returns {Object} 요약 데이터
 */
function getPromptMetricsSummary() {
  const db = getDb();

  // 등급별 분포
  const byGrade = db.prepare(`
    SELECT grade, COUNT(*) as count
    FROM prompt_metrics
    GROUP BY grade
    ORDER BY grade
  `).all();

  // 평균 점수
  const avgScores = db.prepare(`
    SELECT
      ROUND(AVG(rule_score), 1) as avg_rule,
      ROUND(AVG(ai_score), 1) as avg_ai,
      ROUND(AVG(total_score), 1) as avg_total,
      COUNT(*) as total_prompts
    FROM prompt_metrics
  `).get();

  // 개선 필요 프롬프트
  const needsImprovement = db.prepare(`
    SELECT pm.*, p.prompt_key, p.title
    FROM prompt_metrics pm
    JOIN prompts p ON pm.prompt_id = p.id
    WHERE pm.needs_improvement = 1
    ORDER BY pm.total_score ASC
    LIMIT 10
  `).all();

  // 성능 상위 프롬프트
  const topPerformers = db.prepare(`
    SELECT pm.*, p.prompt_key, p.title
    FROM prompt_metrics pm
    JOIN prompts p ON pm.prompt_id = p.id
    WHERE pm.items_generated > 0
    ORDER BY pm.approve_rate DESC
    LIMIT 5
  `).all();

  // 성능 하위 프롬프트
  const lowPerformers = db.prepare(`
    SELECT pm.*, p.prompt_key, p.title
    FROM prompt_metrics pm
    JOIN prompts p ON pm.prompt_id = p.id
    WHERE pm.items_generated >= 3
    ORDER BY pm.approve_rate ASC
    LIMIT 5
  `).all();

  return {
    byGrade,
    avgScores,
    needsImprovement,
    topPerformers,
    lowPerformers
  };
}

/**
 * 모든 프롬프트 메트릭스 재계산
 * @param {boolean} includeAI - AI 평가 포함 여부
 */
async function recalculateAllPromptMetrics(includeAI = false) {
  const db = getDb();

  const prompts = db.prepare(`
    SELECT id, prompt_key, prompt_text FROM prompts WHERE active = 1
  `).all();

  const results = [];

  for (const prompt of prompts) {
    try {
      const metrics = await calculateAndSavePromptMetrics(
        prompt.id,
        prompt.prompt_key,
        prompt.prompt_text,
        includeAI
      );
      results.push({ promptKey: prompt.prompt_key, success: true, metrics });
    } catch (error) {
      results.push({ promptKey: prompt.prompt_key, success: false, error: error.message });
    }
  }

  return results;
}

module.exports = {
  calculateRuleScore,
  normalizeAIScore,
  calculateTotalScore,
  calculateAndSavePromptMetrics,
  incrementPromptUsage,
  updatePromptPerformance,
  getPromptMetrics,
  getPromptMetricsSummary,
  recalculateAllPromptMetrics
};
