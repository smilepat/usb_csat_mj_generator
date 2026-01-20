/**
 * server/services/promptFeedbackAnalyzer.js
 * 프롬프트 개선 피드백 분석 시스템
 *
 * Metrics → Analysis → Pattern Detection → Improvement Suggestions → Alerts
 *
 * 순환 관계: Metrics → PromptImprovement → Better Prompts → Better Items
 */

const { getDb, saveDatabase } = require('../db/database');
const logger = require('./logger');

// 경고 임계값 설정
const THRESHOLDS = {
  // 승인율 기반
  APPROVE_RATE_CRITICAL: 30,    // 30% 미만: 즉시 개선 필요
  APPROVE_RATE_WARNING: 50,      // 50% 미만: 주의 필요
  APPROVE_RATE_GOOD: 70,         // 70% 이상: 양호

  // 최소 샘플 수
  MIN_SAMPLES_FOR_ANALYSIS: 3,
  MIN_SAMPLES_FOR_PATTERN: 5,

  // 점수 기반
  AVG_SCORE_CRITICAL: 60,
  AVG_SCORE_WARNING: 70,

  // 연속 실패
  CONSECUTIVE_FAILURES: 3,

  // 레이어별 실패 비율
  LAYER_FAILURE_THRESHOLD: 0.4   // 40% 이상 실패 시 경고
};

// 경고 유형
const ALERT_TYPES = {
  CRITICAL: 'CRITICAL',    // 즉시 조치 필요
  WARNING: 'WARNING',      // 주의 필요
  INFO: 'INFO',            // 참고 사항
  SUGGESTION: 'SUGGESTION' // 개선 제안
};

// 문제 패턴 유형
const ISSUE_PATTERNS = {
  LOW_APPROVE_RATE: 'low_approve_rate',
  LAYER1_FAILURES: 'layer1_failures',      // 구조 오류
  LAYER2_FAILURES: 'layer2_failures',      // 내용 품질
  LAYER3_FAILURES: 'layer3_failures',      // CSAT 적합성
  CONSECUTIVE_FAILS: 'consecutive_fails',
  DISTRACTOR_ISSUES: 'distractor_issues',
  LENGTH_ISSUES: 'length_issues',
  DECLINING_PERFORMANCE: 'declining_performance'
};

/**
 * 프롬프트별 생성 기록 분석
 * @param {string} promptKey - 프롬프트 키 (예: "29", "31")
 * @returns {Object} 분석 결과
 */
function analyzePromptHistory(promptKey) {
  const db = getDb();

  // 해당 프롬프트로 생성된 모든 아이템 가져오기
  const items = db.prepare(`
    SELECT
      r.request_id,
      r.item_no,
      r.created_at,
      r.status,
      m.layer1_score,
      m.layer1_pass,
      m.layer2_score,
      m.layer3_score,
      m.final_score,
      m.grade,
      m.recommendation,
      m.flags,
      m.word_count,
      m.avg_sentence_length,
      j.validation_log,
      j.distractor_score
    FROM item_requests r
    LEFT JOIN item_metrics m ON r.request_id = m.request_id
    LEFT JOIN item_json j ON r.request_id = j.request_id
    WHERE r.item_no = ?
    ORDER BY r.created_at DESC
  `).all(parseInt(promptKey));

  if (items.length === 0) {
    return {
      promptKey,
      hasData: false,
      message: '생성 기록 없음'
    };
  }

  // 기본 통계
  const totalCount = items.length;
  const approveCount = items.filter(i => i.recommendation === 'APPROVE').length;
  const reviewCount = items.filter(i => i.recommendation === 'REVIEW').length;
  const rejectCount = items.filter(i => i.recommendation === 'REJECT').length;
  const approveRate = (approveCount / totalCount) * 100;

  // 레이어별 실패 분석
  const layer1Failures = items.filter(i => i.layer1_pass === 0).length;
  const layer2LowScores = items.filter(i => i.layer2_score && i.layer2_score < 60).length;
  const layer3LowScores = items.filter(i => i.layer3_score && i.layer3_score < 60).length;

  // 평균 점수
  const avgScores = {
    layer1: calculateAvg(items.map(i => i.layer1_score)),
    layer2: calculateAvg(items.map(i => i.layer2_score)),
    layer3: calculateAvg(items.map(i => i.layer3_score)),
    final: calculateAvg(items.map(i => i.final_score))
  };

  // 연속 실패 패턴 검출
  let consecutiveFailures = 0;
  let maxConsecutiveFailures = 0;
  for (const item of items) {
    if (item.recommendation === 'REJECT' || item.status === 'FAIL') {
      consecutiveFailures++;
      maxConsecutiveFailures = Math.max(maxConsecutiveFailures, consecutiveFailures);
    } else {
      consecutiveFailures = 0;
    }
  }

  // 최근 vs 이전 성능 비교 (성능 추이)
  const recentItems = items.slice(0, Math.ceil(items.length / 2));
  const olderItems = items.slice(Math.ceil(items.length / 2));
  const recentAvg = calculateAvg(recentItems.map(i => i.final_score));
  const olderAvg = calculateAvg(olderItems.map(i => i.final_score));
  const performanceTrend = recentAvg - olderAvg;

  // 공통 오류 패턴 분석
  const errorPatterns = analyzeErrorPatterns(items);

  return {
    promptKey,
    hasData: true,
    stats: {
      totalCount,
      approveCount,
      reviewCount,
      rejectCount,
      approveRate: Math.round(approveRate * 10) / 10,
      layer1FailureRate: (layer1Failures / totalCount) * 100,
      layer2LowRate: (layer2LowScores / totalCount) * 100,
      layer3LowRate: (layer3LowScores / totalCount) * 100
    },
    avgScores,
    patterns: {
      maxConsecutiveFailures,
      performanceTrend: Math.round(performanceTrend * 10) / 10,
      isImproving: performanceTrend > 0,
      errorPatterns
    },
    recentItems: items.slice(0, 5) // 최근 5개
  };
}

/**
 * 오류 패턴 분석
 */
function analyzeErrorPatterns(items) {
  const patterns = {
    lengthIssues: 0,
    distractorIssues: 0,
    formatIssues: 0,
    answerIssues: 0
  };

  for (const item of items) {
    if (item.flags) {
      try {
        const flags = typeof item.flags === 'string' ? JSON.parse(item.flags) : item.flags;
        if (Array.isArray(flags)) {
          for (const flag of flags) {
            if (flag.includes('길이') || flag.includes('length') || flag.includes('단어')) {
              patterns.lengthIssues++;
            }
            if (flag.includes('오답') || flag.includes('distractor') || flag.includes('선택지')) {
              patterns.distractorIssues++;
            }
            if (flag.includes('형식') || flag.includes('format') || flag.includes('JSON')) {
              patterns.formatIssues++;
            }
            if (flag.includes('정답') || flag.includes('answer')) {
              patterns.answerIssues++;
            }
          }
        }
      } catch (e) {
        // JSON 파싱 실패 무시
      }
    }

    if (item.validation_log) {
      const log = item.validation_log.toLowerCase();
      if (log.includes('length') || log.includes('word')) patterns.lengthIssues++;
      if (log.includes('distractor') || log.includes('option')) patterns.distractorIssues++;
    }
  }

  return patterns;
}

/**
 * 경고 및 개선 제안 생성
 * @param {Object} analysis - analyzePromptHistory 결과
 * @returns {Array} 경고 및 제안 목록
 */
function generateAlerts(analysis) {
  const alerts = [];

  if (!analysis.hasData) {
    return alerts;
  }

  const { stats, avgScores, patterns } = analysis;

  // 1. 승인율 기반 경고
  if (stats.totalCount >= THRESHOLDS.MIN_SAMPLES_FOR_ANALYSIS) {
    if (stats.approveRate < THRESHOLDS.APPROVE_RATE_CRITICAL) {
      alerts.push({
        type: ALERT_TYPES.CRITICAL,
        pattern: ISSUE_PATTERNS.LOW_APPROVE_RATE,
        title: '❌ 승인율 심각',
        message: `승인율 ${stats.approveRate}%로 매우 낮습니다 (${stats.approveCount}/${stats.totalCount})`,
        suggestion: '프롬프트 전면 수정이 필요합니다. 출력 형식과 지시사항을 명확히 하세요.',
        priority: 1
      });
    } else if (stats.approveRate < THRESHOLDS.APPROVE_RATE_WARNING) {
      alerts.push({
        type: ALERT_TYPES.WARNING,
        pattern: ISSUE_PATTERNS.LOW_APPROVE_RATE,
        title: '⚠️ 승인율 주의',
        message: `승인율 ${stats.approveRate}%입니다 (목표: 70% 이상)`,
        suggestion: '프롬프트 개선을 검토하세요. 특히 자주 발생하는 오류 유형을 확인하세요.',
        priority: 2
      });
    }
  }

  // 2. Layer 1 (구조) 실패율 경고
  if (stats.layer1FailureRate > THRESHOLDS.LAYER_FAILURE_THRESHOLD * 100) {
    alerts.push({
      type: ALERT_TYPES.CRITICAL,
      pattern: ISSUE_PATTERNS.LAYER1_FAILURES,
      title: '🔧 구조 오류 빈발',
      message: `Layer 1 (구조 검증) 실패율 ${Math.round(stats.layer1FailureRate)}%`,
      suggestion: '프롬프트에 JSON 출력 형식을 더 명확히 지정하세요. 예시를 포함하세요.',
      improvements: [
        '출력 형식을 JSON으로 명시',
        '필수 필드(question, options, answer, explanation) 나열',
        'options는 반드시 5개로 지정',
        '구체적인 예시 추가'
      ],
      priority: 1
    });
  }

  // 3. Layer 2 (내용) 저조 경고
  if (stats.layer2LowRate > THRESHOLDS.LAYER_FAILURE_THRESHOLD * 100) {
    alerts.push({
      type: ALERT_TYPES.WARNING,
      pattern: ISSUE_PATTERNS.LAYER2_FAILURES,
      title: '📝 내용 품질 저조',
      message: `Layer 2 (내용 품질) 저점수 비율 ${Math.round(stats.layer2LowRate)}%`,
      suggestion: '오답 선택지의 품질과 다양성을 높이는 지시를 추가하세요.',
      improvements: [
        '오답은 정답과 유사하되 명확히 틀리게',
        '5개 선택지 모두 서로 다른 내용',
        '오답 유형 다양화 (반대 의미, 범위 오류, 인과 혼동 등)'
      ],
      priority: 2
    });
  }

  // 4. Layer 3 (CSAT 적합성) 저조 경고
  if (stats.layer3LowRate > THRESHOLDS.LAYER_FAILURE_THRESHOLD * 100) {
    alerts.push({
      type: ALERT_TYPES.WARNING,
      pattern: ISSUE_PATTERNS.LAYER3_FAILURES,
      title: '📏 CSAT 기준 미달',
      message: `Layer 3 (CSAT 적합성) 저점수 비율 ${Math.round(stats.layer3LowRate)}%`,
      suggestion: '지문 길이와 문장 구조를 수능 기준에 맞게 조정하세요.',
      improvements: [
        '적정 단어 수 범위 명시',
        '문장당 12-28단어 권장',
        '수능 어휘 수준 유지'
      ],
      priority: 2
    });
  }

  // 5. 연속 실패 경고
  if (patterns.maxConsecutiveFailures >= THRESHOLDS.CONSECUTIVE_FAILURES) {
    alerts.push({
      type: ALERT_TYPES.CRITICAL,
      pattern: ISSUE_PATTERNS.CONSECUTIVE_FAILS,
      title: '🔴 연속 실패 감지',
      message: `최근 ${patterns.maxConsecutiveFailures}회 연속 실패/거부`,
      suggestion: '즉시 프롬프트를 검토하고 수정하세요. 최근 오류 로그를 확인하세요.',
      priority: 1
    });
  }

  // 6. 성능 하락 추세 경고
  if (patterns.performanceTrend < -10 && stats.totalCount >= THRESHOLDS.MIN_SAMPLES_FOR_PATTERN) {
    alerts.push({
      type: ALERT_TYPES.WARNING,
      pattern: ISSUE_PATTERNS.DECLINING_PERFORMANCE,
      title: '📉 성능 하락 추세',
      message: `최근 성능이 ${Math.abs(patterns.performanceTrend)}점 하락했습니다`,
      suggestion: '최근 변경사항을 확인하고, 이전 버전으로 롤백을 고려하세요.',
      priority: 2
    });
  }

  // 7. 특정 오류 패턴 제안
  if (patterns.errorPatterns.lengthIssues > stats.totalCount * 0.3) {
    alerts.push({
      type: ALERT_TYPES.SUGGESTION,
      pattern: ISSUE_PATTERNS.LENGTH_ISSUES,
      title: '📐 길이 문제 빈발',
      message: `지문/문항 길이 관련 문제가 자주 발생합니다`,
      suggestion: '프롬프트에 단어 수 범위를 명시하세요.',
      improvements: [
        '지문: 130-250 단어 (유형별 상이)',
        '문항: 10-30 단어',
        '선택지: 각 5-20 단어'
      ],
      priority: 3
    });
  }

  if (patterns.errorPatterns.distractorIssues > stats.totalCount * 0.3) {
    alerts.push({
      type: ALERT_TYPES.SUGGESTION,
      pattern: ISSUE_PATTERNS.DISTRACTOR_ISSUES,
      title: '🎯 오답지 품질 문제',
      message: `오답 선택지 관련 문제가 자주 발생합니다`,
      suggestion: '오답 생성 지침을 더 구체화하세요.',
      improvements: [
        '오답 유형 명시: 반의어, 범위 오류, 인과 혼동, 과잉 일반화',
        '정답과 유사한 길이/형식 유지',
        '모든 선택지가 문법적으로 완전한 문장'
      ],
      priority: 3
    });
  }

  // 우선순위로 정렬
  alerts.sort((a, b) => a.priority - b.priority);

  return alerts;
}

/**
 * 개선 제안 생성
 * @param {Object} analysis - 분석 결과
 * @param {Array} alerts - 경고 목록
 * @returns {Object} 구조화된 개선 제안
 */
function generateImprovementSuggestions(analysis, alerts) {
  const suggestions = {
    immediateActions: [],    // 즉시 조치
    shortTermActions: [],    // 단기 개선
    longTermActions: [],     // 장기 개선
    promptPatches: []        // 구체적인 프롬프트 수정 제안
  };

  if (!analysis.hasData) {
    return suggestions;
  }

  // CRITICAL 알림 → 즉시 조치
  const criticalAlerts = alerts.filter(a => a.type === ALERT_TYPES.CRITICAL);
  for (const alert of criticalAlerts) {
    suggestions.immediateActions.push({
      issue: alert.title,
      action: alert.suggestion,
      details: alert.improvements || []
    });
  }

  // WARNING 알림 → 단기 개선
  const warningAlerts = alerts.filter(a => a.type === ALERT_TYPES.WARNING);
  for (const alert of warningAlerts) {
    suggestions.shortTermActions.push({
      issue: alert.title,
      action: alert.suggestion,
      details: alert.improvements || []
    });
  }

  // 패턴 기반 구체적 프롬프트 수정 제안
  if (analysis.stats.layer1FailureRate > 20) {
    suggestions.promptPatches.push({
      target: '출력 형식',
      currentIssue: 'JSON 구조 오류 빈발',
      patch: `
다음 JSON 형식으로 정확히 출력하세요:
{
  "question": "문제 내용",
  "options": ["①선택지1", "②선택지2", "③선택지3", "④선택지4", "⑤선택지5"],
  "answer": 정답번호(1-5),
  "explanation": "정답 해설"
}`
    });
  }

  if (analysis.patterns.errorPatterns.distractorIssues > 2) {
    suggestions.promptPatches.push({
      target: '오답 선택지',
      currentIssue: '오답 품질 불량',
      patch: `
오답 선택지 작성 지침:
1. 반의어 오류: 지문의 핵심 단어와 반대 의미 사용
2. 범위 오류: 지문보다 좁거나 넓은 범위로 왜곡
3. 인과 혼동: 원인과 결과를 뒤바꿈
4. 과잉 일반화: "모든", "항상" 등 과도한 일반화
5. 모든 선택지는 서로 다른 오류 유형을 사용`
    });
  }

  if (analysis.patterns.errorPatterns.lengthIssues > 2) {
    suggestions.promptPatches.push({
      target: '길이 조절',
      currentIssue: '지문/문항 길이 부적절',
      patch: `
길이 기준:
- 지문: 130-250 단어 (${analysis.promptKey}번 유형 기준)
- 문장당 12-28 단어
- 전체 5-8 문장으로 구성`
    });
  }

  // 장기 개선
  suggestions.longTermActions.push({
    action: 'A/B 테스트 수행',
    description: '개선된 프롬프트와 기존 프롬프트를 비교 테스트'
  });

  if (analysis.stats.approveRate < 70) {
    suggestions.longTermActions.push({
      action: '프롬프트 재설계',
      description: '구조를 전면 개편하여 명확성과 구체성 향상'
    });
  }

  return suggestions;
}

/**
 * 모든 프롬프트에 대한 경고 알림 조회
 * @returns {Array} 경고가 필요한 프롬프트 목록
 */
function getAllPromptAlerts() {
  const db = getDb();

  // 활성 프롬프트 목록
  const prompts = db.prepare(`
    SELECT DISTINCT item_no
    FROM item_requests
    WHERE item_no IS NOT NULL
    GROUP BY item_no
    HAVING COUNT(*) >= ?
  `).all(THRESHOLDS.MIN_SAMPLES_FOR_ANALYSIS);

  const allAlerts = [];

  for (const prompt of prompts) {
    const promptKey = String(prompt.item_no);
    const analysis = analyzePromptHistory(promptKey);
    const alerts = generateAlerts(analysis);

    if (alerts.length > 0) {
      const suggestions = generateImprovementSuggestions(analysis, alerts);

      allAlerts.push({
        promptKey,
        itemNo: prompt.item_no,
        stats: analysis.stats,
        alertCount: alerts.length,
        criticalCount: alerts.filter(a => a.type === ALERT_TYPES.CRITICAL).length,
        warningCount: alerts.filter(a => a.type === ALERT_TYPES.WARNING).length,
        alerts,
        suggestions
      });
    }
  }

  // 심각도 순으로 정렬
  allAlerts.sort((a, b) => {
    if (a.criticalCount !== b.criticalCount) {
      return b.criticalCount - a.criticalCount;
    }
    return b.warningCount - a.warningCount;
  });

  return allAlerts;
}

/**
 * 피드백 요약 (Dashboard용)
 * @returns {Object} 요약 정보
 */
function getFeedbackSummary() {
  const allAlerts = getAllPromptAlerts();

  const summary = {
    totalPromptsWithIssues: allAlerts.length,
    criticalPrompts: allAlerts.filter(a => a.criticalCount > 0).length,
    warningPrompts: allAlerts.filter(a => a.warningCount > 0 && a.criticalCount === 0).length,
    topIssues: [],
    promptsNeedingAttention: allAlerts.slice(0, 5)
  };

  // 가장 흔한 문제 패턴 집계
  const patternCounts = {};
  for (const promptAlert of allAlerts) {
    for (const alert of promptAlert.alerts) {
      patternCounts[alert.pattern] = (patternCounts[alert.pattern] || 0) + 1;
    }
  }

  summary.topIssues = Object.entries(patternCounts)
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return summary;
}

/**
 * 프롬프트 피드백 저장
 * @param {number} promptId - 프롬프트 ID
 * @param {Object} feedback - 피드백 내용
 */
function savePromptFeedback(promptId, feedback) {
  const db = getDb();

  try {
    db.prepare(`
      INSERT INTO prompt_feedback (
        prompt_id, prompt_key, prompt_version,
        feedback_type, feedback_text, source,
        request_id, item_score, applied
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      promptId,
      feedback.promptKey || null,
      feedback.version || null,
      feedback.type || 'auto_improvement',
      feedback.text,
      feedback.source || 'system',
      feedback.requestId || null,
      feedback.itemScore || null,
      0
    );

    saveDatabase();
    return true;
  } catch (error) {
    logger.error('피드백 저장 실패', error);
    return false;
  }
}

/**
 * 평균 계산 유틸리티
 */
function calculateAvg(values) {
  const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (valid.length === 0) return 0;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

module.exports = {
  analyzePromptHistory,
  generateAlerts,
  generateImprovementSuggestions,
  getAllPromptAlerts,
  getFeedbackSummary,
  savePromptFeedback,
  THRESHOLDS,
  ALERT_TYPES,
  ISSUE_PATTERNS
};
