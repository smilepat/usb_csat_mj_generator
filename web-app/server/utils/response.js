/**
 * server/utils/response.js
 * API 응답 형식 통일을 위한 헬퍼 함수
 */

/**
 * 성공 응답 생성
 * @param {any} data - 응답 데이터
 * @param {string} message - 성공 메시지 (선택)
 * @param {Object} meta - 추가 메타 정보 (pagination 등)
 */
function success(data, message = null, meta = null) {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  if (meta) {
    Object.assign(response, meta);
  }

  return response;
}

/**
 * 에러 응답 생성
 * @param {string} code - 에러 코드
 * @param {string} message - 에러 메시지
 * @param {any} details - 추가 에러 정보 (선택)
 */
function error(code, message, details = null) {
  const response = {
    success: false,
    error: {
      code,
      message
    }
  };

  if (details) {
    response.error.details = details;
  }

  return response;
}

/**
 * 페이지네이션 응답 생성
 * @param {Array} data - 데이터 배열
 * @param {number} total - 전체 개수
 * @param {number} limit - 페이지당 개수
 * @param {number} offset - 시작 위치
 */
function paginated(data, total, limit, offset) {
  return {
    success: true,
    data,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: offset + data.length < total
    }
  };
}

/**
 * Express res 객체에 헬퍼 메서드 추가하는 미들웨어
 */
function responseHelpers(req, res, next) {
  res.success = (data, message = null, meta = null) => {
    return res.json(success(data, message, meta));
  };

  res.error = (statusCode, code, message, details = null) => {
    return res.status(statusCode).json(error(code, message, details));
  };

  res.paginated = (data, total, limit, offset) => {
    return res.json(paginated(data, total, limit, offset));
  };

  res.created = (data, message = '생성되었습니다.') => {
    return res.status(201).json(success(data, message));
  };

  res.noContent = () => {
    return res.status(204).send();
  };

  res.badRequest = (message = '잘못된 요청입니다.', code = 'BAD_REQUEST', details = null) => {
    return res.status(400).json(error(code, message, details));
  };

  res.notFound = (message = '리소스를 찾을 수 없습니다.', code = 'NOT_FOUND') => {
    return res.status(404).json(error(code, message));
  };

  res.serverError = (message = '서버 오류가 발생했습니다.', code = 'INTERNAL_ERROR') => {
    return res.status(500).json(error(code, message));
  };

  next();
}

module.exports = {
  success,
  error,
  paginated,
  responseHelpers
};
