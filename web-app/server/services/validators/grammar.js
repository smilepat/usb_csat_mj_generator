/**
 * server/services/validators/grammar.js
 * RC29 어법 문항 검증 및 수정
 *
 * 이 모듈은 RC29 관련 모든 로직을 통합:
 * - 밑줄(원숫자) 형식 검출
 * - 문항 검증
 * - 원숫자 자동 삽입 (LLM 후처리)
 */

const { callLLM } = require('../llmClient');

/**
 * 지원하는 밑줄 형식 목록
 */
const UNDERLINE_FORMATS = {
  HTML_TAG: {
    name: 'HTML 태그',
    pattern: /<u>[\s\S]*?<\/u>/g,
    example: '<u>word</u>'
  },
  CIRCLED_NUMBERS: {
    name: '원문자',
    pattern: /[①②③④⑤]/g,
    example: '①word'
  },
  BRACKET_NUMBERS: {
    name: '괄호 번호',
    pattern: /\(([1-5])\)\s*\S+/g,
    example: '(1) word'
  },
  UNDERLINE_MARKERS: {
    name: '밑줄 마커',
    pattern: /__[^_]+__/g,
    example: '__word__'
  },
  SQUARE_BRACKET: {
    name: '대괄호',
    pattern: /\[[1-5]\]\s*\S+/g,
    example: '[1] word'
  }
};

/**
 * 지문에서 밑줄 구간 개수를 다양한 형식으로 검출
 * @param {string} passage - 지문
 * @returns {{ count: number, format: string|null, formatName: string|null, suggestion: string|null }}
 */
function countUnderlinedSegments(passage) {
  if (!passage) {
    return { count: 0, format: null, formatName: null, suggestion: null };
  }

  const text = String(passage);

  // 각 형식별로 검출 시도
  for (const [formatKey, formatInfo] of Object.entries(UNDERLINE_FORMATS)) {
    const matches = text.match(formatInfo.pattern);
    if (matches && matches.length > 0) {
      return {
        count: matches.length,
        format: formatKey,
        formatName: formatInfo.name,
        suggestion: null
      };
    }
  }

  // 아무 형식도 검출되지 않음
  return {
    count: 0,
    format: null,
    formatName: null,
    suggestion: '프롬프트에서 밑줄 형식을 명시해 주세요. 지원 형식: ' +
      Object.values(UNDERLINE_FORMATS).map(f => `${f.name}(${f.example})`).join(', ')
  };
}

/**
 * 레거시 호환: 숫자만 반환하는 버전
 * @param {string} passage - 지문
 * @returns {number}
 */
function countUnderlinedSegmentsLegacy(passage) {
  const result = countUnderlinedSegments(passage);
  return result.count;
}

/**
 * RC29 어법 문항 검증
 * 지문에 원숫자(①②③④⑤)가 반드시 포함되어야 함 (필수)
 * @param {Object} itemObj - 정규화된 문항 객체
 * @param {Object} req - 요청 객체
 * @returns {{ pass: boolean, log: string, promptSuggestion: string|null }}
 */
function validateGrammarItem(itemObj, req) {
  const logs = [];
  const warnings = [];
  let pass = true;
  let promptSuggestion = null;

  const passage = req.passage || itemObj.passage || '';
  const underlineResult = countUnderlinedSegments(passage);

  // grammar_meta 먼저 검증 (핵심 검증)
  const meta = itemObj.grammar_meta;
  const hasValidMeta = Array.isArray(meta) && meta.length === 5;

  // 밑줄 개수 검증 - RC29는 반드시 지문에 원숫자 5개가 있어야 함
  if (underlineResult.count !== 5) {
    // 원숫자가 5개 미만이면 무조건 실패 (재생성 필요)
    pass = false;
    logs.push(`[필수] 지문 내 원숫자(①②③④⑤) ${underlineResult.count}개 발견 (5개 필요)`);

    if (underlineResult.count === 0) {
      promptSuggestion = '지문에 ①②③④⑤ 원숫자가 반드시 포함되어야 합니다. ' +
        '예: "The scientist ①discovered that the results ②were consistent..."';
      logs.push('[재생성 필요] ' + promptSuggestion);
    } else {
      promptSuggestion = `지문에 원숫자가 ${underlineResult.count}개만 있습니다. 5개 모두 필요합니다.`;
      logs.push('[재생성 필요] ' + promptSuggestion);
    }

    if (hasValidMeta) {
      warnings.push('grammar_meta는 있으나 지문에 원숫자 마커가 누락됨');
    }
  } else {
    logs.push(`지문 내 밑줄 5개 OK (형식: ${underlineResult.formatName})`);
  }

  // grammar_meta 검증
  if (!hasValidMeta) {
    pass = false;
    logs.push('grammar_meta 배열이 없거나 길이가 5가 아님');

    if (!meta) {
      const metaSuggestion = '프롬프트에 grammar_meta 배열 출력 지시를 추가해 주세요. ' +
        '형식: grammar_meta: [{index: 1, is_correct: true/false, explanation: "..."}, ...]';
      if (!promptSuggestion) {
        promptSuggestion = metaSuggestion;
      } else {
        promptSuggestion += ' | ' + metaSuggestion;
      }
      logs.push('[프롬프트 수정 필요] ' + metaSuggestion);
    }

    // 경고 추가
    if (warnings.length > 0) {
      logs.push('경고: ' + warnings.join('; '));
    }

    return { pass, log: logs.join('; '), promptSuggestion };
  }

  // grammar_meta 세부 검증
  let wrongCount = 0;
  const metaIssues = [];

  meta.forEach((m, i) => {
    if (typeof m.index === 'undefined') {
      metaIssues.push(`grammar_meta[${i}].index 없음`);
    }
    if (typeof m.is_correct === 'undefined') {
      metaIssues.push(`grammar_meta[${i}].is_correct 없음`);
    }
    if (m.is_correct === false) wrongCount++;
  });

  if (metaIssues.length > 0) {
    pass = false;
    logs.push(...metaIssues);
  } else {
    logs.push('grammar_meta 구조 OK');
  }

  // 틀린 항목 개수 검증
  if (wrongCount !== 1) {
    pass = false;
    logs.push(`문법상 틀린 밑줄(is_correct=false) 개수 != 1 (현재: ${wrongCount})`);

    if (wrongCount === 0) {
      const wrongSuggestion = '프롬프트에 "정확히 1개의 문법 오류(is_correct: false)를 포함" 지시를 명확히 해 주세요.';
      if (!promptSuggestion) {
        promptSuggestion = wrongSuggestion;
      }
      warnings.push('[프롬프트 검토 권장] ' + wrongSuggestion);
    }
  } else {
    logs.push('틀린 밑줄 exactly 1개 OK');
  }

  // 경고 추가
  if (warnings.length > 0) {
    logs.push('경고: ' + warnings.join('; '));
  }

  return { pass, log: logs.join('; '), promptSuggestion };
}

/**
 * 지원 형식 목록 반환 (외부에서 참조용)
 */
function getSupportedFormats() {
  return UNDERLINE_FORMATS;
}

/**
 * 원숫자 배열 (재사용)
 */
const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤'];

/**
 * RC29 지문에 원숫자(①②③④⑤) 자동 삽입
 * LLM이 원숫자를 포함하지 않은 경우 후처리로 수정
 *
 * @param {Object} normalized - 정규화된 문항 객체
 * @param {Object} config - 설정 객체
 * @param {Object} logger - 로거 (선택적)
 * @returns {Promise<Object>} 수정된 문항 객체
 */
async function repairRC29CircledNumbers(normalized, config, logger = null) {
  const log = (level, msg, detail) => {
    if (logger && typeof logger[level] === 'function') {
      logger[level](msg, detail);
    }
  };

  // passage 또는 stimulus 중 하나 사용
  const passage = normalized.passage || normalized.stimulus || '';
  const grammarMeta = normalized.grammar_meta;

  // 이미 원숫자가 5개 있으면 수정 불필요
  const underlineResult = countUnderlinedSegments(passage);
  if (underlineResult.count === 5) {
    return normalized;
  }

  // grammar_meta가 없으면 수정 불가
  if (!Array.isArray(grammarMeta) || grammarMeta.length !== 5) {
    log('warn', 'RC29 수정 불가', 'grammar_meta 유효하지 않음');
    return normalized;
  }

  log('info', 'RC29 원숫자 자동 삽입 시도', `현재 ${underlineResult.count}개 → 5개 필요`);

  // 수정용 프롬프트 생성
  const repairPrompt = `다음 영어 지문에 원숫자(①②③④⑤)를 삽입해야 합니다.

[원본 지문]
${passage}

[삽입할 문법 포인트 정보]
${grammarMeta.map((m, i) => `${i + 1}번(${CIRCLED_NUMBERS[i]}): ${m.grammar_point || m.word || ''} - ${m.explanation || ''}`).join('\n')}

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
    const response = await callLLM(systemPrompt, repairPrompt, config);

    // JSON 파싱
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.repaired_stimulus) {
        // 수정된 지문 검증
        const repairedResult = countUnderlinedSegments(parsed.repaired_stimulus);
        if (repairedResult.count === 5) {
          log('info', 'RC29 원숫자 삽입 성공', `${repairedResult.count}개 삽입됨`);
          normalized.passage = parsed.repaired_stimulus;
          normalized.stimulus = parsed.repaired_stimulus;
          return normalized;
        } else {
          log('warn', 'RC29 수정 실패: 삽입된 원숫자가 5개가 아님', `${repairedResult.count}개`);
        }
      }
    }
  } catch (e) {
    log('error', 'RC29 원숫자 삽입 실패', e.message);
  }

  return normalized;
}

/**
 * 지문에서 원숫자 개수 확인 (빠른 검사용)
 * @param {string} text - 검사할 텍스트
 * @returns {number} 원숫자 개수
 */
function countCircledNumbers(text) {
  if (!text) return 0;
  const matches = String(text).match(/[①②③④⑤]/g);
  return matches ? matches.length : 0;
}

/**
 * 원숫자가 5개 모두 있는지 검사
 * @param {string} text - 검사할 텍스트
 * @returns {{ valid: boolean, missing: string[], found: string[] }}
 */
function checkAllCircledNumbers(text) {
  const found = [];
  const missing = [];

  for (const num of CIRCLED_NUMBERS) {
    if (text && text.includes(num)) {
      found.push(num);
    } else {
      missing.push(num);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    found
  };
}

module.exports = {
  // 검증 함수
  countUnderlinedSegments,
  countUnderlinedSegmentsLegacy,
  validateGrammarItem,
  getSupportedFormats,

  // 수정 함수
  repairRC29CircledNumbers,

  // 유틸리티
  countCircledNumbers,
  checkAllCircledNumbers,

  // 상수
  UNDERLINE_FORMATS,
  CIRCLED_NUMBERS
};
