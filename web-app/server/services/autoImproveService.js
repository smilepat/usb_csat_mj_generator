/**
 * server/services/autoImproveService.js
 * 자동 순환 개선 프로세스
 *
 * 성능 저하 감지 시 자동으로 프롬프트 개선을 트리거
 */

const { getDb } = require('../db/database');
const { evaluatePrompt, improvePromptWithFeedback } = require('./promptEvaluator');
const { calculateMetrics } = require('./promptMetricsService');
const logger = require('./logger');

// 자동 개선 트리거 조건
const AUTO_IMPROVE_THRESHOLDS = {
  MIN_ITEMS_GENERATED: 3,      // 최소 생성 문항 수
  APPROVE_RATE_THRESHOLD: 50,  // 승인율 50% 미만 시 개선 필요
  AVG_SCORE_THRESHOLD: 60,     // 평균 점수 60점 미만 시 개선 필요
  CONSECUTIVE_FAILS: 3         // 연속 실패 3회 시 즉시 개선
};

/**
 * 프롬프트 성능 분석 및 자동 개선 필요 여부 판단
 * @param {number} promptId - 프롬프트 ID
 * @returns {Object} 분석 결과
 */
function analyzePromptPerformance(promptId) {
  const db = getDb();

  // 프롬프트 및 메트릭스 조회
  const prompt = db.prepare(`
    SELECT p.*, pm.items_generated, pm.approve_rate, pm.avg_item_score,
           pm.approve_count, pm.reject_count, pm.needs_improvement
    FROM prompts p
    LEFT JOIN prompt_metrics pm ON p.id = pm.prompt_id
    WHERE p.id = ?
  `).get(promptId);

  if (!prompt) {
    return { needsImprovement: false, reason: 'prompt_not_found' };
  }

  const analysis = {
    promptId,
    promptKey: prompt.prompt_key,
    itemsGenerated: prompt.items_generated || 0,
    approveRate: prompt.approve_rate || 0,
    avgScore: prompt.avg_item_score || 0,
    needsImprovement: false,
    reasons: [],
    severity: 'none',
    suggestedActions: []
  };

  // 최소 문항 수 미달 시 분석 스킵
  if (analysis.itemsGenerated < AUTO_IMPROVE_THRESHOLDS.MIN_ITEMS_GENERATED) {
    analysis.reasons.push('insufficient_data');
    return analysis;
  }

  // 승인율 체크
  if (analysis.approveRate < AUTO_IMPROVE_THRESHOLDS.APPROVE_RATE_THRESHOLD) {
    analysis.needsImprovement = true;
    analysis.reasons.push('low_approve_rate');
    analysis.suggestedActions.push('승인율 향상을 위한 프롬프트 구체화 필요');
  }

  // 평균 점수 체크
  if (analysis.avgScore < AUTO_IMPROVE_THRESHOLDS.AVG_SCORE_THRESHOLD) {
    analysis.needsImprovement = true;
    analysis.reasons.push('low_avg_score');
    analysis.suggestedActions.push('문항 품질 향상을 위한 프롬프트 개선 필요');
  }

  // 연속 실패 체크
  const recentResults = db.prepare(`
    SELECT ir.status, ir.created_at
    FROM item_requests ir
    WHERE ir.prompt_id = ?
    ORDER BY ir.created_at DESC
    LIMIT ?
  `).all(promptId, AUTO_IMPROVE_THRESHOLDS.CONSECUTIVE_FAILS);

  const consecutiveFails = recentResults.filter(r => r.status === 'FAIL').length;
  if (consecutiveFails >= AUTO_IMPROVE_THRESHOLDS.CONSECUTIVE_FAILS) {
    analysis.needsImprovement = true;
    analysis.reasons.push('consecutive_failures');
    analysis.severity = 'critical';
    analysis.suggestedActions.push('연속 실패로 인한 긴급 프롬프트 점검 필요');
  }

  // 심각도 결정
  if (analysis.reasons.length >= 2) {
    analysis.severity = 'high';
  } else if (analysis.needsImprovement) {
    analysis.severity = 'medium';
  }

  return analysis;
}

/**
 * 자동 개선 프로세스 실행
 * @param {number} promptId - 프롬프트 ID
 * @param {boolean} dryRun - true면 실제 적용하지 않고 제안만 반환
 * @returns {Object} 개선 결과
 */
async function runAutoImprove(promptId, dryRun = false) {
  const db = getDb();

  // 성능 분석
  const analysis = analyzePromptPerformance(promptId);

  if (!analysis.needsImprovement) {
    return {
      success: true,
      action: 'no_action_needed',
      analysis
    };
  }

  // 프롬프트 조회
  const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(promptId);
  if (!prompt) {
    return {
      success: false,
      error: 'prompt_not_found'
    };
  }

  // 자동 피드백 생성
  const autoFeedback = generateAutoFeedback(analysis);

  logger.info('자동 개선 프로세스 시작', `prompt:${prompt.prompt_key}`,
    `이유: ${analysis.reasons.join(', ')}`);

  try {
    // AI 기반 개선 실행
    const improvement = await improvePromptWithFeedback(
      prompt.prompt_key,
      prompt.prompt_text,
      autoFeedback
    );

    if (!improvement || !improvement.improved_prompt) {
      return {
        success: false,
        error: 'improvement_failed',
        analysis
      };
    }

    // 개선 결과 저장 (dryRun이 아닌 경우)
    if (!dryRun) {
      // 현재 버전 백업
      const maxVersion = db.prepare(`
        SELECT COALESCE(MAX(version), 0) as max_version
        FROM prompt_versions WHERE prompt_id = ?
      `).get(promptId);

      const newVersion = (maxVersion?.max_version || 0) + 1;

      db.prepare(`
        INSERT INTO prompt_versions (prompt_id, prompt_key, version, prompt_text, change_reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        promptId,
        prompt.prompt_key,
        newVersion,
        prompt.prompt_text,
        `자동 개선: ${analysis.reasons.join(', ')}`
      );

      // 프롬프트 업데이트
      db.prepare(`
        UPDATE prompts
        SET prompt_text = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(improvement.improved_prompt, promptId);

      // 메트릭스 재계산
      await calculateMetrics(promptId, false);

      // 개선 이력 피드백 저장
      db.prepare(`
        INSERT INTO prompt_feedback (prompt_id, prompt_key, prompt_version, feedback_type, feedback_text, source, applied)
        VALUES (?, ?, ?, 'auto_improve', ?, 'system', 1)
      `).run(promptId, prompt.prompt_key, newVersion, autoFeedback);

      logger.info('자동 개선 완료', `prompt:${prompt.prompt_key}`,
        `버전 ${newVersion}으로 업데이트`);
    }

    return {
      success: true,
      action: dryRun ? 'improvement_suggested' : 'improvement_applied',
      analysis,
      improvement: {
        changes: improvement.changes_made,
        notes: improvement.notes,
        newPrompt: dryRun ? improvement.improved_prompt : undefined
      }
    };

  } catch (error) {
    logger.error('자동 개선 실패', `prompt:${prompt.prompt_key}`, error);
    return {
      success: false,
      error: error.message,
      analysis
    };
  }
}

/**
 * 분석 결과를 기반으로 자동 피드백 생성
 */
function generateAutoFeedback(analysis) {
  const feedbackParts = [];

  if (analysis.reasons.includes('low_approve_rate')) {
    feedbackParts.push(
      `현재 승인율이 ${analysis.approveRate.toFixed(1)}%로 낮습니다. ` +
      `문항 생성 시 정확한 형식과 구조를 더 명확히 지시해주세요.`
    );
  }

  if (analysis.reasons.includes('low_avg_score')) {
    feedbackParts.push(
      `평균 문항 점수가 ${analysis.avgScore.toFixed(1)}점으로 기준 미달입니다. ` +
      `수능 형식에 맞는 구체적인 예시와 지침을 추가해주세요.`
    );
  }

  if (analysis.reasons.includes('consecutive_failures')) {
    feedbackParts.push(
      `최근 ${AUTO_IMPROVE_THRESHOLDS.CONSECUTIVE_FAILS}회 연속 실패가 발생했습니다. ` +
      `프롬프트의 핵심 지시사항을 점검하고, JSON 출력 형식을 더 명확히 해주세요.`
    );
  }

  return feedbackParts.join('\n\n');
}

/**
 * 모든 프롬프트 성능 스캔 및 개선 필요 목록 반환
 */
function scanAllPromptsForImprovement() {
  const db = getDb();

  const prompts = db.prepare(`
    SELECT p.id, p.prompt_key, pm.items_generated, pm.approve_rate, pm.avg_item_score
    FROM prompts p
    LEFT JOIN prompt_metrics pm ON p.id = pm.prompt_id
    WHERE p.active = 1 AND pm.items_generated >= ?
  `).all(AUTO_IMPROVE_THRESHOLDS.MIN_ITEMS_GENERATED);

  const needsImprovement = [];

  for (const prompt of prompts) {
    const analysis = analyzePromptPerformance(prompt.id);
    if (analysis.needsImprovement) {
      needsImprovement.push(analysis);
    }
  }

  return {
    scanned: prompts.length,
    needsImprovement: needsImprovement.length,
    prompts: needsImprovement.sort((a, b) => {
      // severity 기준 정렬
      const severityOrder = { critical: 0, high: 1, medium: 2, none: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
  };
}

/**
 * 버전별 성능 비교
 */
function compareVersionPerformance(promptId) {
  const db = getDb();

  // 버전별 생성 문항 및 성능 조회
  const versionStats = db.prepare(`
    SELECT
      ir.prompt_version,
      COUNT(*) as total_items,
      SUM(CASE WHEN ir.status = 'OK' THEN 1 ELSE 0 END) as ok_count,
      SUM(CASE WHEN ir.status = 'FAIL' THEN 1 ELSE 0 END) as fail_count,
      AVG(CASE WHEN im.final_score IS NOT NULL THEN im.final_score ELSE NULL END) as avg_score
    FROM item_requests ir
    LEFT JOIN item_metrics im ON ir.request_id = im.request_id
    WHERE ir.prompt_id = ? AND ir.prompt_version IS NOT NULL
    GROUP BY ir.prompt_version
    ORDER BY ir.prompt_version DESC
  `).all(promptId);

  // 버전별 승인율 계산
  const results = versionStats.map(v => ({
    version: v.prompt_version,
    totalItems: v.total_items,
    okCount: v.ok_count,
    failCount: v.fail_count,
    approveRate: v.total_items > 0 ? (v.ok_count / v.total_items * 100) : 0,
    avgScore: v.avg_score || 0
  }));

  // 버전 간 개선/퇴보 판단
  let trend = 'stable';
  if (results.length >= 2) {
    const latest = results[0];
    const previous = results[1];

    if (latest.approveRate > previous.approveRate + 10) {
      trend = 'improving';
    } else if (latest.approveRate < previous.approveRate - 10) {
      trend = 'declining';
    }
  }

  return {
    promptId,
    versionCount: results.length,
    versions: results,
    trend
  };
}

module.exports = {
  analyzePromptPerformance,
  runAutoImprove,
  scanAllPromptsForImprovement,
  compareVersionPerformance,
  AUTO_IMPROVE_THRESHOLDS
};
