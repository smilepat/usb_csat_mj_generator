/**
 * 프롬프트 목록 조회 스크립트
 * 정렬 우선순위: MASTER_PROMPT → PASSAGE_MASTER → LC01~LC17 → RC18~RC45 → 순수숫자 → P1~P45 → 기타
 */
const { getDb, initDatabase } = require('../server/db/database');

// 정렬 함수
function getPromptSortOrder(key) {
  // 그룹 0: MASTER_PROMPT
  if (key === 'MASTER_PROMPT') return { group: 0, order: 0 };
  // 그룹 1: PASSAGE_MASTER
  if (key === 'PASSAGE_MASTER') return { group: 1, order: 0 };
  // 그룹 2: LC01~LC17 (듣기)
  const lcMatch = key.match(/^LC(\d+)/i);
  if (lcMatch) return { group: 2, order: parseInt(lcMatch[1]) };
  // 그룹 3: RC18~RC45 (독해)
  const rcMatch = key.match(/^RC(\d+)/i);
  if (rcMatch) return { group: 3, order: parseInt(rcMatch[1]) };
  // 그룹 4: 순수 숫자
  if (/^\d+$/.test(key)) return { group: 4, order: parseInt(key) };
  // 그룹 5: P + 숫자 (지문용)
  const pMatch = key.match(/^P(\d+)/i);
  if (pMatch) return { group: 5, order: parseInt(pMatch[1]) };
  // 그룹 6: 기타
  return { group: 6, order: 0, alpha: key };
}

async function listPrompts() {
  await initDatabase();
  const db = getDb();

  const prompts = db.prepare('SELECT id, prompt_key, title, prompt_text, active, is_default FROM prompts').all();

  // 정렬
  prompts.sort((a, b) => {
    const orderA = getPromptSortOrder(a.prompt_key);
    const orderB = getPromptSortOrder(b.prompt_key);
    if (orderA.group !== orderB.group) return orderA.group - orderB.group;
    if (orderA.order !== orderB.order) return orderA.order - orderB.order;
    if (orderA.alpha && orderB.alpha) return orderA.alpha.localeCompare(orderB.alpha);
    return 0;
  });

  console.log('=== 전체 프롬프트 목록 ===');
  console.log('총 ' + prompts.length + '개\n');

  // prompt_key 기반으로 유형별 그룹화 (정렬 순서대로)
  const groups = {
    'MASTER': [],
    'PASSAGE_MASTER': [],
    'LC': [],
    'RC': [],
    'NUMBER': [],
    'PASSAGE': [],
    'OTHER': []
  };

  prompts.forEach(p => {
    const key = p.prompt_key || '';
    if (key === 'MASTER_PROMPT') {
      groups['MASTER'].push(p);
    } else if (key === 'PASSAGE_MASTER') {
      groups['PASSAGE_MASTER'].push(p);
    } else if (/^LC\d+/i.test(key)) {
      groups['LC'].push(p);
    } else if (/^RC\d+/i.test(key)) {
      groups['RC'].push(p);
    } else if (/^\d+$/.test(key)) {
      groups['NUMBER'].push(p);
    } else if (/^P\d+/i.test(key)) {
      groups['PASSAGE'].push(p);
    } else {
      groups['OTHER'].push(p);
    }
  });

  const groupLabels = {
    'MASTER': '마스터 프롬프트',
    'PASSAGE_MASTER': '지문 마스터',
    'LC': '듣기 (LC01~LC17)',
    'RC': '독해 (RC18~RC45)',
    'NUMBER': '순수 숫자 (기존 형식)',
    'PASSAGE': '지문용 (P1~P45)',
    'OTHER': '기타'
  };

  Object.keys(groups).forEach(type => {
    if (groups[type].length === 0) return;

    console.log('\n========================================');
    console.log('[' + type + '] ' + groupLabels[type] + ' - ' + groups[type].length + '개');
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
