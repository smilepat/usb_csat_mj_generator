/**
 * 오늘 업데이트된 프롬프트 조회 스크립트
 */

const { initDatabase, getDb, closeDatabase } = require('../db/database');

async function findUpdatedPrompts() {
  await initDatabase();
  const db = getDb();

  // 오늘 날짜 기준으로 업데이트된 프롬프트 조회
  const today = '2026-01-12';

  const prompts = db.prepare(`
    SELECT id, prompt_key, title,
           substr(prompt_text, 1, 200) as preview,
           length(prompt_text) as text_length,
           created_at, updated_at
    FROM prompts
    WHERE date(updated_at) = date(?)
       OR date(created_at) = date(?)
    ORDER BY updated_at DESC
  `).all(today, today);

  console.log('=== 오늘(' + today + ') 수정/생성된 프롬프트 ===');
  console.log('총 ' + prompts.length + '개\n');

  prompts.forEach(p => {
    console.log('ID: ' + p.id + ' | Key: ' + p.prompt_key + ' | Title: ' + p.title);
    console.log('  Created: ' + p.created_at);
    console.log('  Updated: ' + p.updated_at);
    console.log('  Length: ' + p.text_length + ' chars');
    console.log('  Preview: ' + p.preview.substring(0, 80) + '...');
    console.log('');
  });

  closeDatabase();
}

findUpdatedPrompts().catch(console.error);
