/**
 * server/middleware/auth.js
 * 인증 및 권한 미들웨어
 */

const logger = require('../services/logger');

/**
 * API 키 기반 인증 미들웨어
 * 헤더에서 X-API-Key를 확인하거나 세션 기반 인증 사용
 */
function apiKeyAuth(req, res, next) {
  // 개발 환경에서는 인증 비활성화 옵션
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_ACCESS_KEY;

  // API 키가 설정되어 있고 요청에 API 키가 있는 경우
  if (validApiKey && apiKey) {
    if (apiKey === validApiKey) {
      return next();
    }
    logger.warn('AUTH', req.ip, 'Invalid API key attempt');
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: '유효하지 않은 API 키입니다.'
      }
    });
  }

  // 세션 기반 인증 확인
  if (req.session && req.session.authenticated) {
    return next();
  }

  // API 키가 설정되지 않은 경우 (개발/로컬 환경) - 통과
  if (!validApiKey) {
    return next();
  }

  logger.warn('AUTH', req.ip, 'Unauthorized access attempt');
  return res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: '인증이 필요합니다.'
    }
  });
}

/**
 * 간단한 로그인 처리 (세션 기반)
 */
function login(req, res) {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    // 비밀번호가 설정되지 않은 경우 로그인 불필요
    req.session.authenticated = true;
    return res.json({ success: true, message: '인증되었습니다.' });
  }

  if (password === adminPassword) {
    req.session.authenticated = true;
    logger.info('AUTH', req.ip, 'Login successful');
    return res.json({ success: true, message: '로그인 성공' });
  }

  logger.warn('AUTH', req.ip, 'Login failed - invalid password');
  return res.status(401).json({
    success: false,
    error: {
      code: 'INVALID_PASSWORD',
      message: '비밀번호가 올바르지 않습니다.'
    }
  });
}

/**
 * 로그아웃 처리
 */
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      logger.error('AUTH', req.ip, err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: '로그아웃 중 오류가 발생했습니다.'
        }
      });
    }
    res.json({ success: true, message: '로그아웃 되었습니다.' });
  });
}

/**
 * 인증 상태 확인
 */
function checkAuth(req, res) {
  const isAuthenticated = req.session && req.session.authenticated;
  res.json({
    success: true,
    data: {
      authenticated: !!isAuthenticated
    }
  });
}

/**
 * 요청 로깅 미들웨어
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    if (logLevel === 'warn') {
      logger.warn('HTTP', req.ip, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    } else if (process.env.LOG_REQUESTS === 'true') {
      logger.info('HTTP', req.ip, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
}

/**
 * Rate limiting 미들웨어 (간단한 메모리 기반)
 */
const rateLimitStore = new Map();

function rateLimit(options = {}) {
  const {
    windowMs = 60 * 1000, // 1분
    max = 100, // 최대 요청 수
    message = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  } = options;

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, startTime: now });
      return next();
    }

    const record = rateLimitStore.get(key);

    if (now - record.startTime > windowMs) {
      // 윈도우 리셋
      rateLimitStore.set(key, { count: 1, startTime: now });
      return next();
    }

    record.count++;

    if (record.count > max) {
      logger.warn('RATE_LIMIT', req.ip, `Rate limit exceeded: ${record.count}/${max}`);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message
        }
      });
    }

    next();
  };
}

// 주기적으로 오래된 rate limit 기록 정리
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.startTime > 5 * 60 * 1000) { // 5분 이상 된 기록 삭제
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // 1분마다 정리

module.exports = {
  apiKeyAuth,
  login,
  logout,
  checkAuth,
  requestLogger,
  rateLimit
};
