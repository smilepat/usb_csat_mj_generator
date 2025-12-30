/**
 * server/services/promptValidator.js
 * 프롬프트 1차 검증 서비스
 * - LLM 호출 전에 프롬프트 구조 및 내용 검증
 */

const { buildPromptBundle, readMasterPrompt, readItemPrompt } = require('./promptBuilder');

/**
 * 프롬프트 구조 검증
 * @param {string} promptKey - 프롬프트 키 (예: 'MASTER_PROMPT', '29')
 * @param {string} promptText - 프롬프트 텍스트
 * @returns {Object} 검증 결과
 */
function validatePromptStructure(promptKey, promptText) {
  const errors = [];
  const warnings = [];

  // 1. 빈 프롬프트 체크
  if (!promptText || promptText.trim().length === 0) {
    errors.push('프롬프트가 비어 있습니다.');
    return { valid: false, errors, warnings };
  }

  // 2. 최소 길이 체크
  if (promptText.trim().length < 50) {
    warnings.push('프롬프트가 너무 짧습니다. (최소 50자 권장)');
  }

  // 3. MASTER_PROMPT 전용 검증
  if (promptKey === 'MASTER_PROMPT') {
    // JSON 스키마 관련 키워드 체크
    const schemaKeywords = ['JSON', 'schema', '스키마', 'itemNo', 'question', 'options', 'answer'];
    const foundKeywords = schemaKeywords.filter(kw => promptText.includes(kw));

    if (foundKeywords.length < 3) {
      warnings.push('MASTER_PROMPT에 JSON 스키마 관련 키워드가 부족합니다.');
    }

    // 필수 출력 필드 언급 체크
    const requiredFields = ['question', 'options', 'answer', 'explanation'];
    const missingFields = requiredFields.filter(f => !promptText.toLowerCase().includes(f));

    if (missingFields.length > 0) {
      warnings.push(`다음 필드에 대한 설명이 없습니다: ${missingFields.join(', ')}`);
    }
  }

  // 4. ITEM PROMPT (숫자형 키) 검증
  if (/^\d+$/.test(promptKey)) {
    const itemNo = parseInt(promptKey);

    // 유형별 필수 키워드 체크
    const typeKeywords = getTypeKeywords(itemNo);
    const missingKeywords = typeKeywords.filter(kw => !promptText.includes(kw));

    if (missingKeywords.length > 0 && typeKeywords.length > 0) {
      warnings.push(`${itemNo}번 유형에 권장되는 키워드가 없습니다: ${missingKeywords.join(', ')}`);
    }
  }

  // 5. PASSAGE 프롬프트 검증
  if (promptKey.startsWith('P') && /^P\d+/.test(promptKey)) {
    if (!promptText.includes('지문') && !promptText.includes('passage')) {
      warnings.push('지문 생성 프롬프트에 "지문" 또는 "passage" 키워드가 없습니다.');
    }
  }

  // 6. 특수문자/인코딩 문제 체크
  const problematicChars = promptText.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
  if (problematicChars) {
    errors.push('프롬프트에 문제가 될 수 있는 제어 문자가 포함되어 있습니다.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      length: promptText.length,
      lines: promptText.split('\n').length,
      words: promptText.split(/\s+/).filter(w => w).length
    }
  };
}

/**
 * 문항 유형별 권장 키워드 반환
 * @param {number} itemNo - 문항 번호
 * @returns {string[]} 권장 키워드 목록
 */
function getTypeKeywords(itemNo) {
  const keywordMap = {
    18: ['목적', 'purpose'],
    19: ['심경', '변화', 'feeling', 'mood'],
    20: ['주장', 'claim', 'argue'],
    21: ['함축', 'imply', 'meaning'],
    22: ['요지', 'main point'],
    23: ['주제', 'topic', 'subject'],
    24: ['제목', 'title'],
    25: ['도표', 'chart', 'graph', 'table'],
    26: ['인물', '일치', 'match'],
    27: ['안내문', '일치'],
    28: ['어휘', 'vocabulary', 'word'],
    29: ['어법', 'grammar', '밑줄'],
    30: ['지칭', 'refer', 'reference'],
    31: ['빈칸', 'blank', 'gap'],
    32: ['빈칸', 'blank', 'gap'],
    33: ['빈칸', 'blank', 'gap'],
    34: ['빈칸', 'blank'],
    35: ['무관', '흐름', 'irrelevant'],
    36: ['순서', 'order', 'sequence'],
    37: ['순서', 'order'],
    38: ['삽입', 'insert', 'position'],
    39: ['삽입', 'insert'],
    40: ['요약', 'summary', 'summarize']
  };

  return keywordMap[itemNo] || [];
}

/**
 * 사용자 입력 컨텍스트 검증
 * @param {Object} req - 요청 객체
 * @returns {Object} 검증 결과
 */
function validateUserContext(req) {
  const errors = [];
  const warnings = [];

  // 1. 문항 번호 유효성
  if (!req.itemNo || req.itemNo < 18 || req.itemNo > 45) {
    errors.push('문항 번호가 유효하지 않습니다. (18-45 범위)');
  }

  // 2. 난이도 유효성
  const validLevels = ['하', '중하', '중', '중상', '상'];
  if (req.level && !validLevels.includes(req.level)) {
    warnings.push(`난이도 "${req.level}"이(가) 표준 값이 아닙니다. (${validLevels.join('/')})`);
  }

  // 3. 지문 길이 체크 (지문이 있는 경우)
  if (req.passage) {
    const passageLength = req.passage.trim().length;

    if (passageLength < 100) {
      warnings.push('지문이 너무 짧습니다. (최소 100자 권장)');
    }

    if (passageLength > 3000) {
      warnings.push('지문이 매우 깁니다. LLM 토큰 제한에 주의하세요.');
    }

    // 영어 지문인지 체크
    const englishRatio = (req.passage.match(/[a-zA-Z]/g) || []).length / passageLength;
    if (englishRatio < 0.5) {
      warnings.push('지문에 영어 비율이 낮습니다. 수능 영어 지문인지 확인하세요.');
    }
  }

  // 4. RC25(도표) 전용 체크
  if (req.itemNo === 25 && !req.chartId && !req.passage) {
    warnings.push('RC25(도표) 문항은 차트 데이터가 필요합니다.');
  }

  // 5. 세트 문항 체크
  if (req.itemNo >= 41 && req.itemNo <= 45 && !req.setId) {
    warnings.push('41-45번 문항은 세트 문항입니다. 세트 ID를 지정하는 것이 좋습니다.');
  }

  // 6. 추가 메모 길이 체크
  if (req.extra && req.extra.length > 1000) {
    warnings.push('추가 메모가 매우 깁니다. 핵심 내용만 포함하세요.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 최종 프롬프트 번들 검증 및 미리보기 생성
 * @param {Object} req - 요청 객체
 * @returns {Object} 검증 결과 및 미리보기
 */
function validatePromptBundle(req) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    preview: null,
    stats: {}
  };

  try {
    // 1. 사용자 컨텍스트 검증
    const contextValidation = validateUserContext(req);
    result.errors.push(...contextValidation.errors);
    result.warnings.push(...contextValidation.warnings);

    // 2. MASTER_PROMPT 검증
    let masterPrompt;
    try {
      masterPrompt = readMasterPrompt();
      const masterValidation = validatePromptStructure('MASTER_PROMPT', masterPrompt);
      result.warnings.push(...masterValidation.warnings);
      if (!masterValidation.valid) {
        result.errors.push(...masterValidation.errors);
      }
    } catch (e) {
      result.errors.push('MASTER_PROMPT를 읽을 수 없습니다: ' + e.message);
    }

    // 3. ITEM_PROMPT 검증
    let itemPrompt;
    try {
      itemPrompt = readItemPrompt(req.itemNo);
      const itemValidation = validatePromptStructure(String(req.itemNo), itemPrompt);
      result.warnings.push(...itemValidation.warnings);
      if (!itemValidation.valid) {
        result.errors.push(...itemValidation.errors);
      }
    } catch (e) {
      result.errors.push(`ITEM_PROMPT(${req.itemNo})를 읽을 수 없습니다: ` + e.message);
    }

    // 4. 최종 번들 생성 시도
    if (result.errors.length === 0) {
      try {
        const bundle = buildPromptBundle(req);

        result.preview = {
          system: bundle.system,
          user: bundle.user,
          systemPreview: truncateText(bundle.system, 500),
          userPreview: truncateText(bundle.user, 1000)
        };

        // 토큰 추정 (대략적인 계산)
        const totalChars = (bundle.system?.length || 0) + (bundle.user?.length || 0);
        const estimatedTokens = Math.ceil(totalChars / 4); // 영어 기준 대략 4자당 1토큰

        result.stats = {
          systemLength: bundle.system?.length || 0,
          userLength: bundle.user?.length || 0,
          totalLength: totalChars,
          estimatedTokens,
          systemLines: (bundle.system || '').split('\n').length,
          userLines: (bundle.user || '').split('\n').length
        };

        // 토큰 경고
        if (estimatedTokens > 8000) {
          result.warnings.push(`추정 토큰 수가 많습니다 (${estimatedTokens}). API 제한에 주의하세요.`);
        }

      } catch (e) {
        result.errors.push('프롬프트 번들 생성 실패: ' + e.message);
      }
    }

    result.valid = result.errors.length === 0;

  } catch (e) {
    result.valid = false;
    result.errors.push('검증 중 오류 발생: ' + e.message);
  }

  return result;
}

/**
 * 텍스트 잘라내기 (미리보기용)
 * @param {string} text - 원본 텍스트
 * @param {number} maxLength - 최대 길이
 * @returns {string} 잘린 텍스트
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '\n... (이하 생략, 총 ' + text.length + '자)';
}

/**
 * 프롬프트 수정 제안 생성
 * @param {Object} validationResult - 검증 결과
 * @returns {string[]} 수정 제안 목록
 */
function generateSuggestions(validationResult) {
  const suggestions = [];

  if (validationResult.errors.length > 0) {
    suggestions.push('⚠️ 오류를 먼저 해결해야 문항 생성이 가능합니다.');
  }

  validationResult.warnings.forEach(warning => {
    if (warning.includes('짧습니다')) {
      suggestions.push('💡 프롬프트에 더 구체적인 지침을 추가하세요.');
    }
    if (warning.includes('키워드가 없습니다')) {
      suggestions.push('💡 해당 문항 유형의 특성을 프롬프트에 명시하세요.');
    }
    if (warning.includes('토큰')) {
      suggestions.push('💡 불필요한 내용을 줄여 토큰을 절약하세요.');
    }
    if (warning.includes('영어 비율')) {
      suggestions.push('💡 수능 영어 지문은 영어로 작성되어야 합니다.');
    }
  });

  return [...new Set(suggestions)]; // 중복 제거
}

module.exports = {
  validatePromptStructure,
  validateUserContext,
  validatePromptBundle,
  generateSuggestions,
  getTypeKeywords
};
