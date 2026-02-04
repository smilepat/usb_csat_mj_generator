/**
 * api/index.js
 * Vercel 서버리스 함수 엔트리포인트
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initDatabase } = require('../server/db/database');

let dbInitialized = false;
let initPromise = null;

async function ensureDb() {
  if (dbInitialized) return;
  if (!initPromise) {
    initPromise = initDatabase()
      .then(() => { dbInitialized = true; })
      .catch(err => {
        console.error('DB init failed:', err);
        initPromise = null;
        throw err;
      });
  }
  await initPromise;
}

// Express 앱 import
const app = require('../server/index');

module.exports = async (req, res) => {
  try {
    await ensureDb();
    return app(req, res);
  } catch (err) {
    console.error('Serverless function error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
