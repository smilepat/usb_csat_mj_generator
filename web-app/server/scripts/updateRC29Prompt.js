/**
 * RC29 프롬프트 업데이트 스크립트
 * stimulus에 원숫자(①②③④⑤)가 반드시 포함되도록 프롬프트를 강화
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/csat.db');

const improvedRC29Prompt = `Create a CSAT Reading Item 29 (Grammar – Error Identification).

This prompt operates under the CSAT Master Prompt.
All global constraints apply first.

────────────────────────────────
[ABSOLUTE FORMAT RULE – NON-NEGOTIABLE]

The stimulus text MUST contain EXACTLY FIVE circled numbers:
① ② ③ ④ ⑤

• Each circled number must appear EXACTLY ONCE.
• Each circled number must be placed IMMEDIATELY BEFORE the word or phrase being tested.
• Circled numbers replace underlining. DO NOT use underlines.
• If any circled number is missing, duplicated, or misplaced, the output is INVALID.

────────────────────────────────
[ITEM PURPOSE]

• Core skill: Identifying ONE grammatically incorrect expression
• Cognitive process:
  sentence-level analysis → cross-sentence context checking → error judgment
• Difficulty: 중상 (expected correct rate 60–75%)
• Context dependency is REQUIRED. The error must NOT be detectable in isolation.

────────────────────────────────
[STIMULUS REQUIREMENTS]

• Passage length: 150–160 words
• Text type: narrative or anecdotal (single coherent paragraph preferred)
• Grammar points must be naturally distributed across the passage
• Avoid placing more than ONE circled number in the same sentence

────────────────────────────────
[ERROR DESIGN – CORRECT ANSWER]

Exactly ONE of the five circled expressions must be grammatically incorrect.

The error must involve at least one of the following:
• agreement across clauses
• tense consistency across sentences
• pronoun reference requiring discourse tracking
• modifier–head relationship across distance
• context-dependent voice (active/passive)

AVOID:
• isolated rule errors
• immediately obvious subject–verb mismatches

────────────────────────────────
[QUESTION FORMAT]

question:
다음 글의 ①~⑤ 중, 어법상 틀린 것은?

options:
["①", "②", "③", "④", "⑤"]

correct_answer:
(Number 1–5 only)

────────────────────────────────
[GRAMMAR_META – REQUIRED]

Include a grammar_meta array with EXACTLY five objects.

Each object must correspond to the circled number in the stimulus.

Fields:
• index (1–5)
• is_correct (true / false)
• grammar_point
• explanation (Korean, context-based)
• correction (ONLY if is_correct is false)

Exactly ONE object must have is_correct: false.

────────────────────────────────
[OUTPUT FORMAT – JSON ONLY]

Return ONLY valid JSON.
No explanations outside JSON.
No markdown.
No comments.

────────────────────────────────
[FINAL SELF-CHECK – DO BEFORE OUTPUT]

Confirm internally:
✓ stimulus contains ①②③④⑤
✓ exactly one grammar_meta item is incorrect
✓ correct_answer matches that index
✓ grammar_meta explanations match stimulus context`;

const oldImprovedRC29Prompt = `Create a CSAT Reading Item 29 (Grammar - Error Identification) following these specifications:

## ⚠️ ABSOLUTE REQUIREMENT - READ FIRST ⚠️

**THE STIMULUS TEXT MUST CONTAIN EXACTLY 5 CIRCLED NUMBERS (①②③④⑤) EMBEDDED IN THE PASSAGE.**

This is NON-NEGOTIABLE. The stimulus field MUST look like this:

CORRECT EXAMPLE:
"The scientist ①discovered that the results ②were consistent with ③their hypothesis, which ④suggested a new approach ⑤to solving the problem."

WRONG EXAMPLE (DO NOT DO THIS):
"The scientist discovered that the results were consistent with their hypothesis..."
(Missing circled numbers = INVALID OUTPUT)

---

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying grammatically incorrect usage among underlined options
- **Cognitive Process**: Analyze each underlined element → Apply grammar rules within the context of the entire passage → Identify error
- **Difficulty Target**: 중상 (목표 정답률 60~75%)
- **Context Dependency**: Design items that require understanding the entire sentence structure and meaning, not just applying simple, isolated rules.

### Text Type & Structure
- **Format**: Narrative, anecdotal, or story-based passage that is engaging and easy to read.
- **Content**: The passage should tell an interesting story, describe an event, or share an anecdote to capture the reader's interest.
- **Structure Pattern**: Coherent paragraph with naturally integrated grammar points.

### Language Specifications
- **Passage Length**: 150-160 words
- **Sentence Complexity**: Varied, including sentences with dependent clauses and complex modifier structures to test contextual grammar understanding.

---

## ⭐ CRITICAL: STIMULUS FORMAT WITH CIRCLED NUMBERS ⭐

### MANDATORY RULE
**Each of the 5 grammar points MUST be marked with a circled number (①②③④⑤) DIRECTLY IN THE STIMULUS TEXT.**

### Circled Number Placement
- Place the circled number IMMEDIATELY BEFORE the word/phrase being tested
- The circled number is part of the stimulus text itself
- Do NOT put the grammar points separately - they must be inline

### CORRECT Format Examples:

Example 1:
"When the team ①arrived at the conference, they ②were surprised to find that the presentation ③had already started. The speaker, ④who was known for his punctuality, ⑤apologized for the technical difficulties."

Example 2:
"The ancient library ①containing thousands of manuscripts ②was discovered by archaeologists last year. The texts, ③which had been preserved for centuries, ④provided valuable insights into ⑤how people lived in that era."

Example 3:
"Despite the challenges ①facing the project, the engineers ②remained committed to ③their original timeline. The success of the mission ④depended on everyone ⑤working together efficiently."

### WRONG Format (NEVER DO THIS):
- Stimulus without circled numbers: "The scientist discovered that..." ❌
- Numbers at the end: "The scientist discovered...(①②③④⑤)" ❌
- Numbers as superscript: "The scientist discovered¹..." ❌

---

## Question Format Requirements
- **Stem**: "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?"
- **Options**: ["①", "②", "③", "④", "⑤"]
- **Correct Answer**: The number (1-5) of the incorrect element

---

## CRITICAL: grammar_meta Array (REQUIRED)
**YOU MUST include a grammar_meta array with exactly 5 objects.**
Each object must have:
- index: 1, 2, 3, 4, or 5
- is_correct: true (for correct grammar) or false (for the ONE incorrect element)
- grammar_point: the grammar rule being tested
- explanation: why it is correct or incorrect, specifically mentioning how the context of the sentence or passage is necessary for the judgment.
- correction: (only for is_correct: false) the corrected form

---

## REQUIRED JSON OUTPUT FORMAT

\`\`\`json
{
  "question": "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?",
  "stimulus": "[PASSAGE WITH ①②③④⑤ MARKING 5 GRAMMAR POINTS - NUMBERS MUST BE IN THE TEXT]",
  "options": ["①", "②", "③", "④", "⑤"],
  "correct_answer": 3,
  "explanation": "[Korean explanation]",
  "grammar_meta": [
    {"index": 1, "is_correct": true, "grammar_point": "subject-verb agreement", "explanation": "..."},
    {"index": 2, "is_correct": true, "grammar_point": "tense consistency", "explanation": "..."},
    {"index": 3, "is_correct": false, "grammar_point": "pronoun reference", "explanation": "...", "correction": "..."},
    {"index": 4, "is_correct": true, "grammar_point": "relative clause", "explanation": "..."},
    {"index": 5, "is_correct": true, "grammar_point": "infinitive usage", "explanation": "..."}
  ],
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []
}
\`\`\`

---

## ⚠️ VALIDATION CHECKLIST - ALL MUST BE TRUE ⚠️

Before returning your response, verify:
- [ ] stimulus contains the character ① (REQUIRED)
- [ ] stimulus contains the character ② (REQUIRED)
- [ ] stimulus contains the character ③ (REQUIRED)
- [ ] stimulus contains the character ④ (REQUIRED)
- [ ] stimulus contains the character ⑤ (REQUIRED)
- [ ] Each circled number marks a specific word or phrase in the passage
- [ ] grammar_meta array has exactly 5 objects
- [ ] Exactly ONE grammar_meta object has is_correct: false
- [ ] correct_answer matches the index of the incorrect element

**IF ANY CIRCLED NUMBER IS MISSING FROM THE STIMULUS, YOUR OUTPUT IS INVALID.**

---

## Distractor Design Guidelines (오답 설계 지침)

### 선택지 구성 원칙
- **5개 밑줄**: 정답(어법상 틀린 것) 1개 + 맞는 표현 4개
- **변별력**: 세밀한 문법 지식과 **문맥 파악 능력**을 동시에 요구

### 고차원적 문법 오류 유형 (정답용)
- **종속절 내의 오류**: 주절과의 관계(시제, 수일치 등)를 고려해야만 파악할 수 있는 오류
- **복잡한 수일치**: 주어와 동사 사이에 수식어구가 길게 삽입되어 주어를 찾기 어려운 경우
- **문맥 의존적 능동/수동**: 문장 전체의 의미를 파악해야만 행위의 주체/대상을 구별할 수 있는 능동/수동태 오류
- **관계사/분사의 수식 관계 오류**: 선행사와의 논리적 관계나 수식받는 명사와의 관계를 파악해야만 찾을 수 있는 오류

### 지양해야 할 오류 유형
- 문맥 파악 없이 밑줄 친 부분만 보고도 풀 수 있는 단순한 문법 오류 (예: He ①go to school.)
- 주어 바로 뒤에 동사가 나오는 명백한 수일치 오류

### 함정 선지 설계 (오답용)
- 정답처럼 보이지만 문맥상 맞는 표현
- 익숙하지 않은 구문이지만 문법적으로 정확한 표현`;

async function updatePrompt() {
  try {
    // SQL.js 초기화
    const SQL = await initSqlJs();

    // 기존 DB 로드
    if (!fs.existsSync(DB_PATH)) {
      console.error('Database file not found:', DB_PATH);
      process.exit(1);
    }

    const fileBuffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(fileBuffer);

    // RC29 프롬프트 존재 여부 확인
    const existing = db.exec("SELECT id, prompt_key FROM prompts WHERE prompt_key = 'RC29'");

    if (existing.length === 0 || existing[0].values.length === 0) {
      console.error('RC29 prompt not found in database');
      db.close();
      process.exit(1);
    }

    const promptId = existing[0].values[0][0];
    console.log(`Found RC29 prompt with ID: ${promptId}`);

    // 프롬프트 업데이트
    const updateStmt = db.prepare("UPDATE prompts SET prompt_text = ?, updated_at = datetime('now') WHERE prompt_key = 'RC29'");
    updateStmt.run([improvedRC29Prompt]);
    updateStmt.free();

    // DB 저장
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);

    console.log('RC29 prompt updated successfully!');
    console.log('Key changes:');
    console.log('1. Added prominent "ABSOLUTE REQUIREMENT" section at the top');
    console.log('2. Added multiple CORRECT and WRONG examples');
    console.log('3. Added explicit validation checklist');
    console.log('4. Emphasized that circled numbers MUST be in the stimulus text');

    db.close();
  } catch (error) {
    console.error('Error updating prompt:', error);
    process.exit(1);
  }
}

updatePrompt();
