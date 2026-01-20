/**
 * 상세 문항별 프롬프트 시드 스크립트 (2026-01-14 업데이트 버전)
 * 실행: node server/scripts/seedDetailedPrompts.js
 *
 * 이 스크립트는 앱에서 수정된 상세 프롬프트를 데이터베이스에 기본값으로 저장합니다.
 * seedPrompts.js 실행 후 이 스크립트를 실행하면 상세 프롬프트가 추가/업데이트됩니다.
 */

const fs = require('fs');
const path = require('path');
const { initDatabase, getDb, saveDatabase, closeDatabase } = require('../db/database');

// 오늘 업데이트된 상세 프롬프트 (2026-01-14)
const detailedPrompts = [
  {
    prompt_key: 'LC03',
    title: '듣기 LC03 문항',
    prompt_text: `Create a CSAT Listening Item 3 (Main Point Identification) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying the main point of an advice-giving monologue
- **Cognitive Process**: Listen to advice → Extract central message → Identify key takeaway
- **Difficulty Level**: Intermediate comprehension requiring synthesis of advice content

### Discourse Type & Structure
- **Format**: Advice-giving monologue with instructional tone
- **Structure Pattern**: Problem/situation → Advice/solution → Reasoning → Benefits/results
- **Content Flexibility**: Any topic suitable for giving practical advice or tips
- **Speaker Role**: Advisor, expert, or experienced person sharing guidance

### Language Specifications
- **Transcript Length**: 100-120 words (approximately 50-60 seconds)
- **Sentence Complexity**: Moderate complexity with some subordination
- **Vocabulary Level**: Mix of concrete and moderately abstract terms
- **Speech Rate**: Measured pace appropriate for advice delivery
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "다음을 듣고, [남자/여자]가 하는 말의 요지로 가장 적절한 것을 고르시오."
- **Options**: 5 Korean statements expressing main points or central messages
- **Correct Answer**: Must capture the essential advice or main message
- **Distractors**: Supporting details, partial points, related but not central ideas, opposite advice

### Content Generation Guidelines
- Create advice scenarios on topics like study methods, life skills, or personal development
- Ensure the main point is clearly supported by reasoning and examples
- Include practical, actionable advice relevant to Korean high school students
- Maintain a helpful, instructional tone throughout

**Required JSON Output Format:**
{
"question": "다음을 듣고, [남자/여자]가 하는 말의 요지로 가장 적절한 것을 고르시오.",
"transcript": "[100-120 word advice-giving monologue in English]",
"options": ["요지1이다", "요지2이다", "요지3이다", "요지4이다", "요지5이다"],
"correct_answer": [1-5],
"explanation": "[Korean explanation of the main point]"
}

## Distractor Design Guidelines (오답 설계 지침)

### 선택지 구성 원칙
- **5개 선택지**: 정답 1개 + 매력적 오답 4개
- **변별력**: 화자 간 관계 추론 능력

### 개별 선택지 역할
① **정답**: 대화 내용으로 추론 가능한 정확한 관계
② **오답**: 대화 장소/상황에서 예상 가능한 다른 관계
③ **오답**: 일부 발화와 일치하지만 전체와 불일치
④ **오답**: 유사한 상황의 다른 관계
⑤ **오답**: 명백히 부적절한 관계

### 오답 매력도 확보 전략
- 대화 초반 단서만으로 오인 가능한 관계
- 직업/역할 관련 어휘의 중의성 활용`,
    active: 1
  },
  {
    prompt_key: 'LC04',
    title: '듣기 LC04 문항',
    prompt_text: `Create a CSAT Listening Item 4 (Picture Content Mismatch) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying mismatches between visual and auditory information
- **Cognitive Process**: Process visual elements → Listen to descriptions → Compare and identify discrepancies
- **Difficulty Level**: Basic visual-auditory integration with concrete elements

### Discourse Type & Structure
- **Format**: Two-person dialogue describing visual elements
- **Structure Pattern**: Scene setting → Systematic description of visual elements → Detailed observations
- **Content Flexibility**: Any observable scene with multiple identifiable objects, people, or activities
- **Interaction Type**: Collaborative observation and description

### Language Specifications
- **Transcript Length**: 80-110 words (approximately 35-45 seconds)
- **Sentence Complexity**: Simple descriptive sentences
- **Vocabulary Level**: Concrete, observable vocabulary (colors, shapes, positions, actions)
- **Speech Rate**: Clear, descriptive pace with emphasis on visual details
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "대화를 듣고, 그림에서 대화의 내용과 일치하지 <u>않는</u> 것을 고르시오."
- **Options**: 5 Korean descriptions of visual elements that appear in the picture
- **Correct Answer**: Must be the one element that contradicts the dialogue description
- **Distractors**: Elements that match the dialogue description exactly

### Content Generation Guidelines
- Create scenes with 5-7 clearly identifiable visual elements
- Ensure 4 elements are accurately described and 1 is contradicted in the dialogue
- Include realistic settings like parks, markets, classrooms, or public spaces
- Use precise descriptive language for colors, positions, quantities, and states

### Required JSON Output Format
{
  "question": "대화를 듣고, 그림에서 대화의 내용과 일치하지 <u>않는</u> 것을 고르시오.",
  "transcript": "[80-110 word descriptive dialogue with M:/W: indicators]",
  "options": ["시각요소1", "시각요소2", "시각요소3", "시각요소4", "시각요소5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the mismatch]",
  "image_prompt": "Cartoon-style black-and-white exam illustration..."
}

## Distractor Design Guidelines (오답 설계 지침)

### 선택지 구성 원칙
- **5개 선택지**: 정답 1개 + 매력적 오답 4개
- **변별력**: 그림/도표 정보와 대화 내용 매칭 능력

### 개별 선택지 역할
① **정답**: 대화 내용과 완전히 일치하는 그림
② **오답**: 일부 특징만 일치하는 그림
③ **오답**: 언급된 특징과 반대되는 그림
④ **오답**: 언급되지 않은 특징이 있는 그림
⑤ **오답**: 대화 초반 언급과만 일치하는 그림

### 오답 매력도 확보 전략
- 복수의 시각적 특징을 순차적으로 언급
- 마지막 확정 정보가 핵심 단서`,
    active: 1
  }
];

async function seedDetailedPrompts() {
  try {
    // 업데이트된 프롬프트 JSON 파일 로드
    const jsonPath = path.join(__dirname, '../../..', 'docs', 'updated_prompts_2026-01-14.json');

    if (!fs.existsSync(jsonPath)) {
      console.error('오류: updated_prompts_2026-01-14.json 파일이 없습니다.');
      console.log('먼저 updateSeedPrompts.js를 실행하여 파일을 생성하세요.');
      process.exit(1);
    }

    const updatedPrompts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    await initDatabase();
    const db = getDb();

    console.log('상세 프롬프트 업데이트 시작...');
    console.log(`총 ${updatedPrompts.length}개의 프롬프트를 처리합니다.\n`);

    let updated = 0;
    let inserted = 0;

    for (const prompt of updatedPrompts) {
      const { prompt_key, title, prompt_text, active } = prompt;

      // 기존 프롬프트 확인
      const existing = db.prepare(`
        SELECT id FROM prompts WHERE prompt_key = ?
      `).get(prompt_key);

      if (existing) {
        // 업데이트
        db.prepare(`
          UPDATE prompts
          SET title = ?, prompt_text = ?, active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE prompt_key = ?
        `).run(title, prompt_text, active, prompt_key);
        console.log(`[UPDATE] ${prompt_key}: ${title}`);
        updated++;
      } else {
        // 삽입
        db.prepare(`
          INSERT INTO prompts (prompt_key, title, prompt_text, active)
          VALUES (?, ?, ?, ?)
        `).run(prompt_key, title, prompt_text, active);
        console.log(`[INSERT] ${prompt_key}: ${title}`);
        inserted++;
      }
    }

    // 변경사항 저장
    saveDatabase();

    console.log('\n========================================');
    console.log(`완료: ${updated}개 업데이트, ${inserted}개 삽입`);
    console.log('========================================\n');

    closeDatabase();
    process.exit(0);

  } catch (error) {
    console.error('오류 발생:', error);
    process.exit(1);
  }
}

seedDetailedPrompts();
