/**
 * server/services/validators/listening.js
 * 듣기 문항 (LC1-17) 검증기
 */

// ============================================
// 프리컴파일된 정규식 (성능 최적화)
// ============================================
const RE_SPEAKER_TURN = /^(M:|W:|Man:|Woman:|Narrator:)/gim;
const RE_SPEAKER_MARKER = /^(M:|W:|Man:|Woman:)/im;
const RE_WHITESPACE = /\s+/;
const RE_ENGLISH = /[a-zA-Z]/g;
const RE_NUMERIC = /[\d$₩,]+/;

/**
 * LC 문항 유형별 검증 규칙
 */
const LC_ITEM_RULES = {
  // LC1: 목적 파악
  1: {
    name: '목적 파악',
    requiresScript: true,
    minScriptLength: 50,
    maxScriptLength: 120,
    requiresSpeakers: true,
    minTurns: 2,
    maxTurns: 6
  },
  // LC2: 의견 파악
  2: {
    name: '의견 파악',
    requiresScript: true,
    minScriptLength: 60,
    maxScriptLength: 130,
    requiresSpeakers: true,
    minTurns: 2,
    maxTurns: 6
  },
  // LC3: 요지 파악
  3: {
    name: '요지 파악',
    requiresScript: true,
    minScriptLength: 80,
    maxScriptLength: 150,
    requiresSpeakers: true,
    minTurns: 3,
    maxTurns: 6
  },
  // LC4: 그림 불일치
  4: {
    name: '그림 불일치',
    requiresScript: true,
    minScriptLength: 60,
    maxScriptLength: 120,
    requiresSpeakers: true,
    requiresImagePrompt: true
  },
  // LC5: 할 일 파악
  5: {
    name: '할 일 파악',
    requiresScript: true,
    minScriptLength: 60,
    maxScriptLength: 130,
    requiresSpeakers: true,
    minTurns: 2,
    maxTurns: 6
  },
  // LC6: 지불할 금액
  6: {
    name: '지불할 금액',
    requiresScript: true,
    minScriptLength: 80,
    maxScriptLength: 150,
    requiresSpeakers: true,
    requiresNumericOptions: true
  },
  // LC7: 이유 파악
  7: {
    name: '이유 파악',
    requiresScript: true,
    minScriptLength: 70,
    maxScriptLength: 140,
    requiresSpeakers: true,
    minTurns: 3,
    maxTurns: 6
  },
  // LC8: 언급되지 않은 것
  8: {
    name: '언급되지 않은 것',
    requiresScript: true,
    minScriptLength: 70,
    maxScriptLength: 140,
    requiresSpeakers: true
  },
  // LC9: 내용 불일치
  9: {
    name: '내용 불일치',
    requiresScript: true,
    minScriptLength: 90,
    maxScriptLength: 160,
    allowsMonologue: true
  },
  // LC10: 도표 정보
  10: {
    name: '도표 정보',
    requiresScript: true,
    minScriptLength: 70,
    maxScriptLength: 140,
    requiresSpeakers: true,
    requiresChartData: true
  },
  // LC11: 짧은 응답 (1)
  11: {
    name: '짧은 응답(1)',
    requiresScript: true,
    minScriptLength: 50,
    maxScriptLength: 100,
    requiresSpeakers: true,
    minTurns: 2,
    maxTurns: 4,
    requiresEnglishOptions: true
  },
  // LC12: 짧은 응답 (2)
  12: {
    name: '짧은 응답(2)',
    requiresScript: true,
    minScriptLength: 40,
    maxScriptLength: 90,
    requiresSpeakers: true,
    minTurns: 2,
    maxTurns: 4,
    requiresEnglishOptions: true
  },
  // LC13: 긴 응답 (1)
  13: {
    name: '긴 응답(1)',
    requiresScript: true,
    minScriptLength: 80,
    maxScriptLength: 150,
    requiresSpeakers: true,
    minTurns: 6,
    maxTurns: 10,
    requiresEnglishOptions: true
  },
  // LC14: 긴 응답 (2) [3점]
  14: {
    name: '긴 응답(2)',
    requiresScript: true,
    minScriptLength: 100,
    maxScriptLength: 170,
    requiresSpeakers: true,
    minTurns: 6,
    maxTurns: 10,
    requiresEnglishOptions: true,
    isHighDifficulty: true
  },
  // LC15: 상황에 적절한 말 [3점]
  15: {
    name: '상황에 적절한 말',
    requiresScript: true,
    minScriptLength: 120,
    maxScriptLength: 200,
    allowsMonologue: true,
    requiresEnglishOptions: true,
    isHighDifficulty: true
  },
  // LC16-17: 긴 담화 세트
  16: {
    name: '긴 담화 세트 Q1',
    requiresScript: true,
    minScriptLength: 150,
    maxScriptLength: 260,
    allowsMonologue: true,
    isSetItem: true,
    setPattern: [16, 17]
  },
  17: {
    name: '긴 담화 세트 Q2',
    requiresScript: true,
    minScriptLength: 150,
    maxScriptLength: 260,
    allowsMonologue: true,
    isSetItem: true,
    setPattern: [16, 17]
  }
};

/**
 * 스크립트에서 화자 턴 수 계산
 * @param {string} script - 대화 스크립트
 * @returns {number} 턴 수
 */
function countSpeakerTurns(script) {
  if (!script) return 0;
  RE_SPEAKER_TURN.lastIndex = 0;
  const matches = script.match(RE_SPEAKER_TURN);
  return matches ? matches.length : 0;
}

/**
 * 스크립트에 화자 표시가 있는지 확인
 * @param {string} script - 대화 스크립트
 * @returns {boolean}
 */
function hasSpeakerMarkers(script) {
  if (!script) return false;
  RE_SPEAKER_MARKER.lastIndex = 0;
  return RE_SPEAKER_MARKER.test(script);
}

/**
 * 단어 수 계산
 * @param {string} text - 텍스트
 * @returns {number}
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(RE_WHITESPACE).filter(w => w.length > 0).length;
}

/**
 * 옵션이 영어인지 확인
 * @param {Array} options - 선택지 배열
 * @returns {boolean}
 */
function areOptionsEnglish(options) {
  if (!Array.isArray(options)) return false;
  // 영어 문자가 30% 이상이면 영어로 판단
  return options.every(opt => {
    const text = String(opt || '');
    RE_ENGLISH.lastIndex = 0;
    const englishChars = (text.match(RE_ENGLISH) || []).length;
    return englishChars > text.length * 0.3;
  });
}

/**
 * 옵션이 숫자(금액)인지 확인
 * @param {Array} options - 선택지 배열
 * @returns {boolean}
 */
function areOptionsNumeric(options) {
  if (!Array.isArray(options)) return false;
  return options.every(opt => RE_NUMERIC.test(String(opt || '')));
}

/**
 * LC 문항 검증
 * @param {Object} itemObj - 정규화된 문항 객체
 * @param {number} itemNo - 문항 번호 (1-17)
 * @returns {{ pass: boolean, log: string, warnings: string[] }}
 */
function validateListeningItem(itemObj, itemNo) {
  const logs = [];
  const warnings = [];
  let pass = true;

  const rules = LC_ITEM_RULES[itemNo];
  if (!rules) {
    return {
      pass: true,
      log: `LC${itemNo}에 대한 검증 규칙이 정의되지 않음 (기본 통과)`,
      warnings: []
    };
  }

  // lc_script 또는 transcript 필드 확인
  const script = itemObj.lc_script || itemObj.transcript || itemObj.script || '';

  // 1. 스크립트 존재 여부
  if (rules.requiresScript) {
    if (!script.trim()) {
      pass = false;
      logs.push('lc_script(대화/담화 스크립트)가 없음');
    } else {
      const wordCount = countWords(script);

      // 2. 스크립트 길이 검사
      if (rules.minScriptLength && wordCount < rules.minScriptLength) {
        warnings.push(`스크립트 길이 부족: ${wordCount}단어 (권장 ${rules.minScriptLength}단어 이상)`);
      }
      if (rules.maxScriptLength && wordCount > rules.maxScriptLength) {
        warnings.push(`스크립트 길이 초과: ${wordCount}단어 (권장 ${rules.maxScriptLength}단어 이하)`);
      }

      // 3. 화자 표시 검사
      if (rules.requiresSpeakers && !rules.allowsMonologue) {
        if (!hasSpeakerMarkers(script)) {
          warnings.push('화자 표시(M:/W:)가 없음 - 대화 형식 필요');
        }
      }

      // 4. 턴 수 검사
      if (rules.minTurns || rules.maxTurns) {
        const turns = countSpeakerTurns(script);
        if (rules.minTurns && turns < rules.minTurns) {
          warnings.push(`대화 턴 수 부족: ${turns}턴 (권장 ${rules.minTurns}턴 이상)`);
        }
        if (rules.maxTurns && turns > rules.maxTurns) {
          warnings.push(`대화 턴 수 초과: ${turns}턴 (권장 ${rules.maxTurns}턴 이하)`);
        }
      }
    }
  }

  // 5. 영어 선택지 검사 (응답 문항)
  if (rules.requiresEnglishOptions) {
    if (!areOptionsEnglish(itemObj.options)) {
      warnings.push('선택지가 영어로 작성되어야 함 (응답 선택 문항)');
    }
  }

  // 6. 숫자 선택지 검사 (금액 문항)
  if (rules.requiresNumericOptions) {
    if (!areOptionsNumeric(itemObj.options)) {
      warnings.push('선택지에 금액/숫자가 포함되어야 함 (LC6 금액 문항)');
    }
  }

  // 7. 그림 프롬프트 검사 (LC4)
  if (rules.requiresImagePrompt) {
    if (!itemObj.imagePrompt && !itemObj.image_prompt) {
      warnings.push('그림 생성용 프롬프트(imagePrompt)가 없음');
    }
  }

  // 8. 차트 데이터 검사 (LC10)
  if (rules.requiresChartData) {
    if (!itemObj.chartData && !itemObj.chart_data) {
      warnings.push('표/도표 데이터(chartData)가 없음');
    }
  }

  // 9. 세트 문항 검사 (LC16-17)
  if (rules.isSetItem) {
    if (!itemObj.set_instruction && !itemObj.setInstruction) {
      warnings.push('세트 문항 안내(set_instruction)가 없음');
    }
  }

  // 10. 고난도 문항 표시 확인
  if (rules.isHighDifficulty) {
    if (!itemObj.difficulty && !itemObj.level) {
      warnings.push('고난도[3점] 문항 - 난이도 표시 권장');
    }
  }

  return {
    pass: pass,
    log: logs.length > 0 ? logs.join('; ') : 'OK',
    warnings: warnings
  };
}

/**
 * 문항 번호가 LC 문항인지 확인
 * @param {number|string} itemNo - 문항 번호
 * @returns {boolean}
 */
function isListeningItem(itemNo) {
  const num = parseInt(itemNo, 10);
  return num >= 1 && num <= 17;
}

module.exports = {
  LC_ITEM_RULES,
  countSpeakerTurns,
  hasSpeakerMarkers,
  countWords,
  areOptionsEnglish,
  areOptionsNumeric,
  validateListeningItem,
  isListeningItem
};
