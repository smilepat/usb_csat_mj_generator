/**
 * 오늘(2026-01-14) 업데이트된 프롬프트를 seedPrompts.js의 기본값으로 반영
 */

const fs = require('fs');
const path = require('path');
const { initDatabase, getDb, closeDatabase } = require('../db/database');

async function updateSeedPrompts() {
  await initDatabase();
  const db = getDb();

  // 오늘 업데이트된 프롬프트 조회
  const today = '2026-01-14';
  const updatedPrompts = db.prepare(`
    SELECT id, prompt_key, title, prompt_text, active, created_at, updated_at
    FROM prompts
    WHERE date(updated_at) = date(?)
      AND active = 1
    ORDER BY prompt_key
  `).all(today);

  console.log(`오늘(${today}) 업데이트된 프롬프트: ${updatedPrompts.length}개\n`);

  // JSON 파일로 저장
  const outputPath = path.join(__dirname, '../../..', 'docs', `updated_prompts_${today}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(updatedPrompts, null, 2), 'utf8');
  console.log(`JSON 저장 완료: ${outputPath}`);

  // 각 프롬프트 내용 출력
  updatedPrompts.forEach(p => {
    console.log(`\n--- ${p.prompt_key}: ${p.title} ---`);
    console.log(`Length: ${p.prompt_text.length} chars`);
  });

  closeDatabase();
}

updateSeedPrompts().catch(console.error);
