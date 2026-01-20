/**
 * server/middleware/errorHandler.js
 * 전역 에러 핸들링 미들웨어
 */

const logger = require('../services/logger');

/**
 * 커스텀 API 에러 클래스
 */
class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details = null) {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(message = '인증이 필요합니다.', code = 'UNAUTHORIZED') {
    return new ApiError(401, code, message);
  }

  static forbidden(message = '접근 권한이 없습니다.', code = 'FORBIDDEN') {
    return new ApiError(403, code, message);
  }

  static notFound(message = '요청한 리소스를 찾을 수 없습니다.', code = 'NOT_FOUND') {
    return new ApiError(404, code, message);
  }

  static conflict(message, code = 'CONFLICT', details = null) {
    return new ApiError(409, code, message, details);
  }

  static tooManyRequests(message = '요청이 너무 많습니다.', code = 'TOO_MANY_REQUESTS') {
    return new ApiError(429, code, message);
  }

  static internal(message = '서버 내부 오류가 발생했습니다.', code = 'INTERNAL_ERROR') {
    return new ApiError(500, code, message);
  }

  static serviceUnavailable(message = '서비스를 일시적으로 사용할 수 없습니다.', code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(503, code, message);
  }
}

/**
 * 404 핸들러 - 정의되지 않은 라우트 처리
 */
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`));
}

/**
 * 전역 에러 핸들러
 */
function globalErrorHandler(err, req, res, next) {
  // 이미 응답을 보낸 경우
  if (res.headersSent) {
    return next(err);
  }

  // 에러 정보 추출
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || '서버 오류가 발생했습니다.';
  let details = err.details || null;

  // 특정 에러 타입 처리
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'SyntaxError' && err.status === 400) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = '잘못된 JSON 형식입니다.';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    code = 'DATABASE_CONSTRAINT';
    message = '데이터베이스 제약 조건 위반';
  }

  // 프로덕션 환경에서는 내부 에러 메시지 숨김
  const isProduction = process.env.NODE_ENV === 'production';
  const isOperational = err.isOperational === true;

  if (isProduction && !isOperational && statusCode === 500) {
    message = '서버 오류가 발생했습니다. 관리자에게 문의해주세요.';
    details = null;
  }

  // 에러 로깅
  const requestId = req.headers['x-request-id'] || req.ip;

  if (statusCode >= 500) {
    logger.error('SERVER_ERROR', requestId, err);
  } else if (statusCode >= 400) {
    logger.warn('CLIENT_ERROR', requestId, `${code}: ${message}`);
  }

  // 응답 전송
  const errorResponse = {
    success: false,
    error: {
      code,
      message
    }
  };

  if (details) {
    errorResponse.error.details = details;
  }

  // 개발 환경에서는 스택 트레이스 포함
  if (!isProduction && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 비동기 라우트 핸들러 래퍼
 * try-catch 없이도 에러가 전역 에러 핸들러로 전달됨
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 처리되지 않은 예외/거부 핸들러 설정
 */
function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    logger.error('UNCAUGHT_EXCEPTION', 'process', error);
    // 심각한 에러이므로 프로세스 종료 (PM2 등이 재시작)
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED_REJECTION', 'process', reason);
  });
}

module.exports = {
  ApiError,
  notFoundHandler,
  globalErrorHandler,
  asyncHandler,
  setupGlobalErrorHandlers
};
