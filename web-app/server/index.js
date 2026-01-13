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
const configRoutes = require('./routes/config');
const promptRoutes = require('./routes/prompts');
const itemRoutes = require('./routes/items');
const setRoutes = require('./routes/sets');
const chartRoutes = require('./routes/charts');
const logRoutes = require('./routes/logs');
const metricsRoutes = require('./routes/metrics');
const libraryRoutes = require('./routes/library');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
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
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// 정적 파일 서빙 (프로덕션)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// API 라우트
app.use('/api/config', configRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/sets', setRoutes);
app.use('/api/charts', chartRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/library', libraryRoutes);

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA 폴백 (프로덕션)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  res.status(500).json({
    error: '서버 오류가 발생했습니다.',
    message: err.message
  });
});

// 서버 시작
async function startServer() {
  try {
    await initDatabase();
    console.log('데이터베이스 초기화 완료');

    const server = app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║     🎓 수능 문항 생성-검증 시스템                    ║
║     KSAT Item Generator & Validator               ║
╠═══════════════════════════════════════════════════╣
║  서버 실행 중: http://localhost:${PORT}              ║
║  환경: ${process.env.NODE_ENV || 'development'}                             ║
╚═══════════════════════════════════════════════════╝
      `);
    });

    // 서버 오류 처리
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`포트 ${PORT}가 이미 사용 중입니다.`);
        process.exit(1);
      } else {
        console.error('서버 오류:', error);
      }
    });

  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
}

// 프로세스 종료 처리
process.on('uncaughtException', (error) => {
  console.error('처리되지 않은 예외:', error);
  // 서버는 계속 실행되도록 함 (종료하지 않음)
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 Promise 거부:', reason);
  // 서버는 계속 실행되도록 함 (종료하지 않음)
});

process.on('SIGTERM', () => {
  console.log('SIGTERM 신호 수신, 서버 종료 중...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT 신호 수신, 서버 종료 중...');
  process.exit(0);
});

startServer();
