/**
 * server/middleware/validate.js
 * 요청 유효성 검사 미들웨어
 */

const { ApiError } = require('./errorHandler');

/**
 * 스키마 기반 유효성 검사 미들웨어 생성
 * @param {Object} schema - 검사할 스키마
 * @param {string} source - 검사 대상 ('body', 'query', 'params')
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // required 검사
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: rules.message || `${field}은(는) 필수입니다.`
        });
        continue;
      }

      // 값이 없고 필수가 아닌 경우 스킵
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // type 검사
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push({
            field,
            message: `${field}의 타입이 올바르지 않습니다. (expected: ${rules.type}, got: ${actualType})`
          });
          continue;
        }
      }

      // minLength 검사
      if (rules.minLength !== undefined && typeof value === 'string') {
        if (value.length < rules.minLength) {
          errors.push({
            field,
            message: `${field}은(는) 최소 ${rules.minLength}자 이상이어야 합니다.`
          });
        }
      }

      // maxLength 검사
      if (rules.maxLength !== undefined && typeof value === 'string') {
        if (value.length > rules.maxLength) {
          errors.push({
            field,
            message: `${field}은(는) 최대 ${rules.maxLength}자까지 입력 가능합니다.`
          });
        }
      }

      // min 검사 (숫자)
      if (rules.min !== undefined && typeof value === 'number') {
        if (value < rules.min) {
          errors.push({
            field,
            message: `${field}은(는) ${rules.min} 이상이어야 합니다.`
          });
        }
      }

      // max 검사 (숫자)
      if (rules.max !== undefined && typeof value === 'number') {
        if (value > rules.max) {
          errors.push({
            field,
            message: `${field}은(는) ${rules.max} 이하여야 합니다.`
          });
        }
      }

      // pattern 검사 (정규식)
      if (rules.pattern && typeof value === 'string') {
        if (!rules.pattern.test(value)) {
          errors.push({
            field,
            message: rules.patternMessage || `${field}의 형식이 올바르지 않습니다.`
          });
        }
      }

      // enum 검사
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          field,
          message: `${field}은(는) 다음 중 하나여야 합니다: ${rules.enum.join(', ')}`
        });
      }

      // custom 검사
      if (rules.custom && typeof rules.custom === 'function') {
        const customResult = rules.custom(value, data);
        if (customResult !== true) {
          errors.push({
            field,
            message: customResult || `${field}의 값이 유효하지 않습니다.`
          });
        }
      }
    }

    if (errors.length > 0) {
      return next(ApiError.badRequest('입력값 검증 실패', 'VALIDATION_ERROR', errors));
    }

    next();
  };
}

/**
 * 공통 유효성 검사 스키마
 */
const schemas = {
  // 문항 요청 생성
  createItemRequest: {
    item_no: {
      required: true,
      message: 'item_no는 필수입니다.'
    },
    passage: {
      type: 'string',
      maxLength: 10000
    },
    level: {
      type: 'string',
      enum: ['상', '중', '하', '']
    },
    extra: {
      type: 'string',
      maxLength: 5000
    },
    topic: {
      type: 'string',
      maxLength: 500
    }
  },

  // 프롬프트 업데이트
  updatePrompt: {
    prompt_text: {
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 50000,
      message: '프롬프트 텍스트는 필수입니다.'
    },
    title: {
      type: 'string',
      maxLength: 200
    }
  },

  // 차트 생성
  createChart: {
    name: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 200,
      message: '차트 이름은 필수입니다.'
    },
    chart_data: {
      required: true,
      type: 'string',
      message: '차트 데이터는 필수입니다.'
    }
  },

  // 페이지네이션
  pagination: {
    limit: {
      type: 'string',
      custom: (val) => {
        const num = parseInt(val);
        if (isNaN(num) || num < 1 || num > 1000) {
          return 'limit은 1~1000 사이의 숫자여야 합니다.';
        }
        return true;
      }
    },
    offset: {
      type: 'string',
      custom: (val) => {
        const num = parseInt(val);
        if (isNaN(num) || num < 0) {
          return 'offset은 0 이상의 숫자여야 합니다.';
        }
        return true;
      }
    }
  },

  // ID 파라미터
  idParam: {
    id: {
      required: true,
      type: 'string',
      minLength: 1,
      message: 'ID는 필수입니다.'
    }
  }
};

/**
 * 입력 문자열 이스케이프 (XSS 방지)
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * 요청 본문 sanitize 미들웨어
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        // HTML 태그가 필요한 필드는 제외 (예: prompt_text, passage)
        const allowHtmlFields = ['prompt_text', 'passage', 'chart_data', 'extra'];
        if (!allowHtmlFields.includes(key)) {
          req.body[key] = sanitizeInput(value);
        }
      }
    }
  }
  next();
}

module.exports = {
  validate,
  schemas,
  sanitizeInput,
  sanitizeBody
};
