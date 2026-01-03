/**
 * 프롬프트 목록 조회 스크립트
 */
const { getDb, initDatabase } = require('../server/db/database');

async function listPrompts() {
  await initDatabase();
  const db = getDb();

  const prompts = db.prepare('SELECT id, prompt_key, title, prompt_text, active, is_default FROM prompts ORDER BY prompt_key').all();

  console.log('=== 전체 프롬프트 목록 ===');
  console.log('총 ' + prompts.length + '개\n');

  // prompt_key 기반으로 유형별 그룹화
  const groups = {
    'MASTER': [],
    'LC': [],
    'RC': [],
    'PASSAGE': [],
    'OTHER': []
  };

  prompts.forEach(p => {
    const key = p.prompt_key || '';
    if (key === 'MASTER_PROMPT') {
      groups['MASTER'].push(p);
    } else if (key.startsWith('LC')) {
      groups['LC'].push(p);
    } else if (key.startsWith('RC')) {
      groups['RC'].push(p);
    } else if (key.startsWith('P')) {
      groups['PASSAGE'].push(p);
    } else {
      groups['OTHER'].push(p);
    }
  });

  Object.keys(groups).forEach(type => {
    if (groups[type].length === 0) return;

    console.log('\n========================================');
    console.log('[' + type + '] - ' + groups[type].length + '개');
    console.log('========================================');

    groups[type].forEach(p => {
      const status = p.active ? 'Y' : 'N';
      const def = p.is_default ? '*' : ' ';
      console.log('\n  [' + status + ']' + def + ' ' + p.prompt_key + ': ' + (p.title || '(제목없음)'));

      // 내용 미리보기 (처음 300자)
      if (p.prompt_text) {
        const preview = p.prompt_text.substring(0, 300).replace(/\n/g, ' ').trim();
        console.log('      >> ' + preview + (p.prompt_text.length > 300 ? '...' : ''));
      }
    });
  });
}

listPrompts().catch(console.error);
