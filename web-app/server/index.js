/**
 * server/index.js
 * 수능 문항 생성-검증 시스템 메인 서버
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const { initDatabase } = require('./db/database');
const logger = require('./services/logger');

// 미들웨어
const {
  apiKeyAuth,
  login,
  logout,
  checkAuth,
  requestLogger,
  rateLimit,
  notFoundHandler,
  globalErrorHandler,
  setupGlobalErrorHandlers,
  sanitizeBody
} = require('./middleware');

// 유틸리티
const { responseHelpers } = require('./utils');

// 라우트
const configRoutes = require('./routes/config');
const promptRoutes = require('./routes/prompts');
const itemRoutes = require('./routes/items');
const setRoutes = require('./routes/sets');
const chartRoutes = require('./routes/charts');
const logRoutes = require('./routes/logs');
const metricsRoutes = require('./routes/metrics');
const libraryRoutes = require('./routes/library');
const docsRoutes = require('./routes/docs');

const app = express();
const PORT = process.env.PORT || 3001;

// 전역 에러 핸들러 설정
setupGlobalErrorHandlers();

// 기본 미들웨어
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL || true
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'csat-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// 커스텀 미들웨어
app.use(requestLogger);
app.use(sanitizeBody);
app.use(responseHelpers);

// Rate limiting (API 엔드포인트에만 적용)
app.use('/api', rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 200, // 분당 최대 200 요청
  message: '요청이 너무 많습니다. 1분 후 다시 시도해주세요.'
}));

// 인증 관련 라우트 (인증 미들웨어 적용 전)
app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/check', checkAuth);

// 헬스 체크 (인증 불필요)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// API 인증 미들웨어 적용
app.use('/api', apiKeyAuth);

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../client/build')));

// API 라우트
app.use('/api/config', configRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/sets', setRoutes);
app.use('/api/charts', chartRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/docs', docsRoutes);

// SPA 폴백
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// 404 핸들러 (API 라우트에만)
app.use('/api', notFoundHandler);

// 전역 에러 핸들러
app.use(globalErrorHandler);

// 서버 시작
async function startServer() {
  try {
    await initDatabase();
    logger.info('SERVER', 'startup', '데이터베이스 초기화 완료');

    const server = app.listen(PORT, () => {
      logger.info('SERVER', 'startup', `서버 시작: http://localhost:${PORT}`);
      console.log(`
╔═══════════════════════════════════════════════════╗
║     수능 문항 생성-검증 시스템                       ║
║     KSAT Item Generator & Validator               ║
╠═══════════════════════════════════════════════════╣
║  서버 실행 중: http://localhost:${PORT}              ║
║  환경: ${(process.env.NODE_ENV || 'development').padEnd(12)}                       ║
╚═══════════════════════════════════════════════════╝
      `);
    });

    // 서버 오류 처리
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error('SERVER', 'startup', `포트 ${PORT}가 이미 사용 중입니다.`);
        process.exit(1);
      } else {
        logger.error('SERVER', 'runtime', error);
      }
    });

  } catch (error) {
    logger.error('SERVER', 'startup', error);
    process.exit(1);
  }
}

// 프로세스 종료 처리
process.on('SIGTERM', () => {
  logger.info('SERVER', 'shutdown', 'SIGTERM 신호 수신, 서버 종료 중...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SERVER', 'shutdown', 'SIGINT 신호 수신, 서버 종료 중...');
  process.exit(0);
});

// Vercel 서버리스 환경에서는 app만 export, 로컬에서는 서버 시작
if (process.env.VERCEL) {
  module.exports = app;
} else {
  startServer();
}
