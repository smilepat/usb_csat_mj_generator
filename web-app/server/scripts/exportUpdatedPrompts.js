/**
 * 오늘 업데이트된 프롬프트를 JSON 파일로 내보내기
 */

const fs = require('fs');
const path = require('path');
const { initDatabase, getDb, closeDatabase } = require('../db/database');

async function exportUpdatedPrompts() {
  await initDatabase();
  const db = getDb();

  const today = '2026-01-12';

  // 오늘 수정된 프롬프트 전체 조회
  const prompts = db.prepare(`
    SELECT id, prompt_key, title, prompt_text, active, created_at, updated_at
    FROM prompts
    WHERE date(updated_at) = date(?)
       OR date(created_at) = date(?)
    ORDER BY
      CASE
        WHEN prompt_key GLOB '[0-9]*' THEN CAST(prompt_key AS INTEGER)
        ELSE 1000
      END,
      prompt_key
  `).all(today, today);

  console.log(`총 ${prompts.length}개의 프롬프트를 내보냅니다.\n`);

  // JSON 파일로 저장
  const outputPath = path.join(__dirname, '../../..', 'docs', 'updated_prompts_' + today + '.json');
  fs.writeFileSync(outputPath, JSON.stringify(prompts, null, 2), 'utf8');
  console.log(`JSON 저장 완료: ${outputPath}`);

  // Markdown 파일로도 저장
  const mdPath = path.join(__dirname, '../../..', 'docs', 'updated_prompts_' + today + '.md');

  let mdContent = `# 수정된 프롬프트 목록 (${today})

> 총 ${prompts.length}개 프롬프트가 오답 설계 지침(Distractor Design Guidelines)과 함께 업데이트되었습니다.

---

## 목차

`;

  // 목차 생성
  prompts.forEach((p, idx) => {
    mdContent += `${idx + 1}. [${p.prompt_key} - ${p.title}](#${p.prompt_key.toLowerCase().replace(/[^a-z0-9]/g, '-')})\n`;
  });

  mdContent += '\n---\n\n';

  // 각 프롬프트 내용
  prompts.forEach((p, idx) => {
    mdContent += `## ${p.prompt_key} - ${p.title} {#${p.prompt_key.toLowerCase().replace(/[^a-z0-9]/g, '-')}}

**ID**: ${p.id}
**Key**: ${p.prompt_key}
**Title**: ${p.title}
**Active**: ${p.active ? 'Yes' : 'No'}
**Created**: ${p.created_at}
**Updated**: ${p.updated_at}

### 프롬프트 내용

\`\`\`
${p.prompt_text}
\`\`\`

---

`;
  });

  fs.writeFileSync(mdPath, mdContent, 'utf8');
  console.log(`Markdown 저장 완료: ${mdPath}`);

  closeDatabase();
}

exportUpdatedPrompts().catch(console.error);
