/**
 * server/services/validators/grammar.js
 * RC29 어법 문항 검증
 */

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

module.exports = {
  countUnderlinedSegments,
  countUnderlinedSegmentsLegacy,
  validateGrammarItem,
  getSupportedFormats,
  UNDERLINE_FORMATS
};
