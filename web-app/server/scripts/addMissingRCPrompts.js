/**
 * 누락된 RC25~RC28 프롬프트 추가 스크립트
 */

const { initDatabase, getDb, saveDatabase, closeDatabase } = require('../db/database');

const missingPrompts = [
  {
    prompt_key: 'RC25',
    title: '독해 RC25 문항',
    prompt_text: `Create a CSAT Reading Item 25 (Chart/Graph Interpretation) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Interpreting and verifying information from charts, graphs, or tables
- **Cognitive Process**: Read visual data → Compare with written statements → Identify accurate/inaccurate information
- **Difficulty Level**: Intermediate data interpretation with numerical comparison

### Discourse Type & Structure
- **Format**: Descriptive passage explaining chart/graph data with comparative analysis
- **Structure Pattern**: Introduction of data source → Key findings → Trend analysis → Notable comparisons
- **Content Types**: Bar graphs, line graphs, pie charts, tables with statistical data
- **Data Categories**: Demographics, surveys, economic indicators, educational statistics

### Language Specifications
- **Passage Length**: 120-150 words describing the visual data
- **Sentence Complexity**: Clear comparative sentences with numerical references
- **Vocabulary Level**: Statistical terminology (increase, decrease, proportion, ratio)
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "다음 도표의 내용과 일치하지 <u>않는</u> 것은?" or "다음 도표의 내용과 일치하는 것은?"
- **Options**: 5 Korean statements about the chart/graph data
- **Correct Answer**: The statement that does/does not match the visual data
- **Distractors**: Statements with slight numerical errors, reversed comparisons, or misattributed data

### Content Generation Guidelines
- Include clear visual data with 4-6 data points or categories
- Ensure numerical precision in the passage and options
- Use realistic statistical contexts (surveys, research findings, market data)
- Include both absolute numbers and comparative relationships

**Required JSON Output Format:**
{
  "question": "다음 도표의 내용과 일치하지 않는 것은?",
  "passage": "[120-150 word description of chart/graph data]",
  "options": ["진술1", "진술2", "진술3", "진술4", "진술5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of why the answer is correct/incorrect]",
  "chart_data": "[Description of the chart structure and data]",
  "image_prompt": "Clean statistical chart showing..."
}

## Distractor Design Guidelines (오답 설계 지침)

### 선택지 구성 원칙
- **5개 선택지**: 정답 1개 + 매력적 오답 4개
- **변별력**: 도표/그래프 정보의 정확한 해석 능력

### 개별 선택지 역할
① **정답**: 도표 내용과 일치하지 않는(또는 일치하는) 진술
② **오답**: 도표의 수치를 정확히 반영한 진술
③ **오답**: 도표의 비교 관계를 정확히 설명한 진술
④ **오답**: 도표의 추세를 정확히 기술한 진술
⑤ **오답**: 도표의 특정 항목을 정확히 설명한 진술

### 오답 매력도 확보 전략
- 유사한 수치 간의 혼동 유도 (예: 35% vs 53%)
- 비교 대상의 순서 변경 (A가 B보다 → B가 A보다)
- 연도나 범주 간 데이터 혼동`,
    active: 1
  },
  {
    prompt_key: 'RC26',
    title: '독해 RC26 문항',
    prompt_text: `Create a CSAT Reading Item 26 (Content Match - Person/Entity) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying accurate information about a person, organization, or entity
- **Cognitive Process**: Read biographical/informational text → Extract specific facts → Match with statements
- **Difficulty Level**: Intermediate factual comprehension with detail verification

### Discourse Type & Structure
- **Format**: Biographical or informational passage about a notable person, organization, or entity
- **Structure Pattern**: Introduction → Background/History → Achievements → Notable facts → Legacy/Impact
- **Content Types**: Historical figures, scientists, artists, organizations, inventions, movements
- **Information Categories**: Dates, locations, accomplishments, relationships, characteristics

### Language Specifications
- **Passage Length**: 150-180 words
- **Sentence Complexity**: Informative sentences with specific details
- **Vocabulary Level**: Academic vocabulary appropriate for biographical/historical content
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "[제목]에 관한 다음 글의 내용과 일치하지 <u>않는</u> 것은?" or "...일치하는 것은?"
- **Options**: 5 Korean statements about the passage content
- **Correct Answer**: The statement that does/does not match the passage
- **Distractors**: Statements with altered details, confused facts, or partial truths

### Content Generation Guidelines
- Include 5-7 specific, verifiable facts in the passage
- Use precise dates, numbers, and names
- Create a coherent narrative flow while embedding factual details
- Avoid overly obscure or highly specialized information

**Required JSON Output Format:**
{
  "question": "[제목]에 관한 다음 글의 내용과 일치하지 않는 것은?",
  "passage": "[150-180 word informational passage]",
  "options": ["사실1", "사실2", "사실3", "사실4", "사실5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation identifying the mismatched information]"
}

## Distractor Design Guidelines (오답 설계 지침)

### 선택지 구성 원칙
- **5개 선택지**: 정답 1개 + 매력적 오답 4개
- **변별력**: 지문의 세부 정보 정확히 파악하는 능력

### 개별 선택지 역할
① **정답**: 지문 내용과 일치하지 않는(또는 일치하는) 사실
② **오답**: 지문의 날짜/시간 정보와 일치하는 진술
③ **오답**: 지문의 장소/위치 정보와 일치하는 진술
④ **오답**: 지문의 업적/성과 정보와 일치하는 진술
⑤ **오답**: 지문의 특성/특징 정보와 일치하는 진술

### 오답 매력도 확보 전략
- 지문에 언급된 사실의 일부만 변경 (연도, 숫자, 장소 등)
- 지문에 없는 그럴듯한 사실 추가
- 두 가지 사실의 조합 오류`,
    active: 1
  },
  {
    prompt_key: 'RC27',
    title: '독해 RC27 문항',
    prompt_text: `Create a CSAT Reading Item 27 (Practical Text - Service/Membership) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Understanding practical information from service descriptions, membership details, or usage guides
- **Cognitive Process**: Read practical text → Extract specific conditions → Verify statement accuracy
- **Difficulty Level**: Intermediate practical reading with condition-based comprehension

### Discourse Type & Structure
- **Format**: Service description, membership guide, or practical information text
- **Structure Pattern**: Service overview → Features/Benefits → Conditions/Requirements → Exceptions/Notes
- **Content Types**: Membership cards, service passes, subscription plans, facility guides
- **Information Categories**: Prices, validity periods, benefits, restrictions, eligibility

### Language Specifications
- **Passage Length**: 130-160 words
- **Sentence Complexity**: Clear informative sentences with conditional clauses
- **Vocabulary Level**: Practical vocabulary related to services and transactions
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "[서비스/멤버십]에 관한 다음 안내문의 내용과 일치하지 <u>않는</u> 것은?"
- **Options**: 5 Korean statements about the service/membership details
- **Correct Answer**: The statement that does not match the practical text
- **Distractors**: Statements accurately reflecting the text's information

### Content Generation Guidelines
- Include 5-6 specific details about the service/membership
- Use realistic pricing, time periods, and conditions
- Include both benefits and restrictions/exceptions
- Create scenarios relevant to daily life (transportation, entertainment, education)

**Required JSON Output Format:**
{
  "question": "[서비스명]에 관한 다음 안내문의 내용과 일치하지 않는 것은?",
  "passage": "[130-160 word practical information text]",
  "options": ["조건1", "조건2", "조건3", "조건4", "조건5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the mismatched information]"
}

## Distractor Design Guidelines (오답 설계 지침)

### 선택지 구성 원칙
- **5개 선택지**: 정답 1개 + 매력적 오답 4개
- **변별력**: 실용문의 세부 조건 정확히 파악하는 능력

### 개별 선택지 역할
① **정답**: 안내문 내용과 일치하지 않는 조건/정보
② **오답**: 가격/비용 정보와 정확히 일치하는 진술
③ **오답**: 이용 조건/자격과 정확히 일치하는 진술
④ **오답**: 혜택/서비스 내용과 정확히 일치하는 진술
⑤ **오답**: 제한/예외 사항과 정확히 일치하는 진술

### 오답 매력도 확보 전략
- 가격이나 할인율의 미세한 변경
- 이용 조건의 범위 변경 (주중→주말, 성인→학생 등)
- 혜택의 적용 범위 혼동`,
    active: 1
  },
  {
    prompt_key: 'RC28',
    title: '독해 RC28 문항',
    prompt_text: `Create a CSAT Reading Item 28 (Practical Text - Event/Program) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Understanding practical information from event announcements or program descriptions
- **Cognitive Process**: Read promotional/informational text → Extract event details → Verify statement accuracy
- **Difficulty Level**: Intermediate practical reading with multiple detail verification

### Discourse Type & Structure
- **Format**: Event announcement, program description, or promotional material
- **Structure Pattern**: Event introduction → Date/Time/Location → Program details → Registration/Participation info → Additional notes
- **Content Types**: Festivals, workshops, camps, exhibitions, competitions, community events
- **Information Categories**: Schedule, venue, target audience, fees, registration methods, requirements

### Language Specifications
- **Passage Length**: 140-170 words
- **Sentence Complexity**: Informative sentences with specific details
- **Vocabulary Level**: Event-related vocabulary and practical expressions
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "[행사/프로그램명]에 관한 다음 안내문의 내용과 일치하지 <u>않는</u> 것은?"
- **Options**: 5 Korean statements about the event/program details
- **Correct Answer**: The statement that does not match the announcement
- **Distractors**: Statements accurately reflecting the event information

### Content Generation Guidelines
- Include 5-7 specific details about the event/program
- Use realistic dates, times, locations, and fees
- Include both main information and supplementary details
- Create engaging, realistic event scenarios

**Required JSON Output Format:**
{
  "question": "[행사명]에 관한 다음 안내문의 내용과 일치하지 않는 것은?",
  "passage": "[140-170 word event/program announcement]",
  "options": ["정보1", "정보2", "정보3", "정보4", "정보5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the mismatched information]"
}

## Distractor Design Guidelines (오답 설계 지침)

### 선택지 구성 원칙
- **5개 선택지**: 정답 1개 + 매력적 오답 4개
- **변별력**: 행사/프로그램 안내문의 세부 정보 파악 능력

### 개별 선택지 역할
① **정답**: 안내문 내용과 일치하지 않는 정보
② **오답**: 일시/장소 정보와 정확히 일치하는 진술
③ **오답**: 대상/참가 자격과 정확히 일치하는 진술
④ **오답**: 프로그램 내용과 정확히 일치하는 진술
⑤ **오답**: 신청 방법/비용과 정확히 일치하는 진술

### 오답 매력도 확보 전략
- 날짜나 시간의 미세한 변경
- 장소나 위치의 부분적 변경
- 참가 조건이나 비용의 혼동
- 프로그램 세부 내용의 순서 변경`,
    active: 1
  }
];

async function addMissingRCPrompts() {
  await initDatabase();
  const db = getDb();

  console.log('RC25~RC28 프롬프트 추가 시작...\n');

  for (const prompt of missingPrompts) {
    const existing = db.prepare('SELECT id FROM prompts WHERE prompt_key = ?').get(prompt.prompt_key);

    if (existing) {
      db.prepare(`
        UPDATE prompts
        SET title = ?, prompt_text = ?, active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE prompt_key = ?
      `).run(prompt.title, prompt.prompt_text, prompt.active, prompt.prompt_key);
      console.log(`[UPDATE] ${prompt.prompt_key}: ${prompt.title}`);
    } else {
      db.prepare(`
        INSERT INTO prompts (prompt_key, title, prompt_text, active)
        VALUES (?, ?, ?, ?)
      `).run(prompt.prompt_key, prompt.title, prompt.prompt_text, prompt.active);
      console.log(`[INSERT] ${prompt.prompt_key}: ${prompt.title}`);
    }
  }

  saveDatabase();
  console.log('\n완료: RC25~RC28 프롬프트가 추가되었습니다.');

  closeDatabase();
}

addMissingRCPrompts().catch(console.error);
