/**
 * server/middleware/index.js
 * 미들웨어 모듈 통합 내보내기
 */

const {
  apiKeyAuth,
  login,
  logout,
  checkAuth,
  requestLogger,
  rateLimit
} = require('./auth');

const {
  ApiError,
  notFoundHandler,
  globalErrorHandler,
  asyncHandler,
  setupGlobalErrorHandlers
} = require('./errorHandler');

const {
  validate,
  schemas,
  sanitizeInput,
  sanitizeBody
} = require('./validate');

const {
  CURRENT_VERSION,
  SUPPORTED_VERSIONS,
  DEFAULT_VERSION,
  extractApiVersion,
  requireVersion,
  transformResponse,
  getApiInfo
} = require('./apiVersion');

module.exports = {
  // 인증 관련
  apiKeyAuth,
  login,
  logout,
  checkAuth,
  requestLogger,
  rateLimit,

  // 에러 처리 관련
  ApiError,
  notFoundHandler,
  globalErrorHandler,
  asyncHandler,
  setupGlobalErrorHandlers,

  // 유효성 검사 관련
  validate,
  schemas,
  sanitizeInput,
  sanitizeBody,

  // API 버전 관련
  CURRENT_VERSION,
  SUPPORTED_VERSIONS,
  DEFAULT_VERSION,
  extractApiVersion,
  requireVersion,
  transformResponse,
  getApiInfo
};
