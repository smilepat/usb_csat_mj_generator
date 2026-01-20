/**
 * 최신 업데이트된 프롬프트 확인
 */

const { initDatabase, getDb, closeDatabase } = require('../db/database');

async function checkLatestPrompts() {
  await initDatabase();
  const db = getDb();

  // 최근 업데이트된 프롬프트 조회
  const prompts = db.prepare(`
    SELECT id, prompt_key, title,
           length(prompt_text) as text_length,
           created_at, updated_at
    FROM prompts
    WHERE active = 1
    ORDER BY updated_at DESC
    LIMIT 20
  `).all();

  console.log('=== 최근 업데이트된 프롬프트 (상위 20개) ===\n');

  prompts.forEach(p => {
    console.log(`Key: ${p.prompt_key} | Title: ${p.title}`);
    console.log(`  Updated: ${p.updated_at} | Length: ${p.text_length} chars`);
    console.log('');
  });

  // 날짜별 업데이트 현황
  const dateStats = db.prepare(`
    SELECT date(updated_at) as update_date, COUNT(*) as count
    FROM prompts
    WHERE active = 1
    GROUP BY date(updated_at)
    ORDER BY update_date DESC
    LIMIT 10
  `).all();

  console.log('=== 날짜별 업데이트 현황 ===');
  dateStats.forEach(s => {
    console.log(`${s.update_date}: ${s.count}개`);
  });

  closeDatabase();
}

checkLatestPrompts().catch(console.error);
