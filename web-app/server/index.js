/**
 * server/index.js
 * 수능 문항 생성-검증 시스템 메인 서버
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const { initDatabase } = require('./db/database');
const configRoutes = require('./routes/config');
const promptRoutes = require('./routes/prompts');
const itemRoutes = require('./routes/items');
const setRoutes = require('./routes/sets');
const chartRoutes = require('./routes/charts');
const logRoutes = require('./routes/logs');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors({
  origin: 'http://localhost:3000',
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

    app.listen(PORT, () => {
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
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
}

startServer();
