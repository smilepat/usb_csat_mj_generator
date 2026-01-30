/**
 * 모든 기본 프롬프트를 DB에 시드하는 스크립트
 *
 * 실행: node server/scripts/seedAllPrompts.js
 *
 * 이 스크립트는:
 * 1. 마스터 프롬프트 (MASTER_PROMPT, PASSAGE_MASTER)
 * 2. LC 문항 프롬프트 (LC01-LC17)
 * 3. RC 문항 프롬프트 (RC18-RC45)
 * 4. 세트 문항 프롬프트 (LC16_17, RC41_42, RC43_45)
 * 5. 지문 생성 프롬프트 (P01-P45)
 *
 * 를 모두 is_default=1로 설정하여 DB에 저장합니다.
 */

const fs = require('fs');
const path = require('path');
const { initDatabase, getDb, saveDatabase, closeDatabase } = require('../db/database');

// =============================================
// 마스터 프롬프트
// =============================================
const MASTER_PROMPTS = [
  {
    prompt_key: 'MASTER_PROMPT',
    title: 'KSAT System Prompt',
    prompt_text: `[Role] You are an expert item writer for the Korean CSAT (KSAT) English test. Your task is to create exactly ONE test item in JSON format that strictly follows the MASTER schema and the item-specific instructions.

## Output Requirements
- Output ONLY a single valid JSON object
- NO code fences, NO markdown, NO extra text before or after the JSON
- The JSON must be parseable by JSON.parse()

## Required Fields
All items must include:
- item_no: Integer (1-45)
- section: "LC" for items 1-17, "RC" for items 18-45
- question: Korean question text
- options: Array of exactly 5 options
- answer: Integer 1-5 indicating correct option
- explanation: Korean explanation of the answer

## Type-Specific Fields
- LC items (1-17): Include lc_script for listening transcript
- RC items (18-45): Include passage for reading passage
- RC29 (Grammar): Include grammar_meta with error type info
- RC31-34 (Blank): Include gapped_passage with [BLANK] marker

## Important Rules
- Do NOT change the given passage text for RC items
- For LC items, use lc_script for the listening script
- All Korean text should use proper Korean grammar and spacing
- Options should be plausible and properly differentiated`,
    active: 1,
    is_default: 1
  },
  {
    prompt_key: 'PASSAGE_MASTER',
    title: 'KSAT Passage Generator',
    prompt_text: `[역할] 당신은 한국 수능 영어 지문을 쓰는 전문 출제위원입니다.

## 지문 생성 지침
입력으로 주어지는 ITEM 유형, LEVEL(난이도), TOPIC(주제) 정보를 참고하여 KSAT 스타일의 영어 지문만 작성합니다.

## 금지 사항
- 질문 포함 금지
- 선택지 포함 금지
- 밑줄 표시 금지
- 빈칸 표시 금지
- 해설 포함 금지

## 형식 지침
- 여러 문단이 필요하면 문단 사이에 한 줄을 비워 구분합니다
- TYPE(예: RC29/31/33, 세트 41-45 등)에 따라 요구되는 분량(단어 수)과 글의 성격(설명/논설)을 맞춥니다
- 항상 자연스럽고 논리적인 영어 글을 생성합니다

## 문항별 지문 길이 가이드
- RC18-28: 120-180 words
- RC29-30: 80-120 words
- RC31-34: 150-200 words
- RC35-40: 180-220 words
- RC41-42 세트: 280-350 words
- RC43-45 세트: 350-420 words`,
    active: 1,
    is_default: 1
  }
];

// =============================================
// LC 문항 기본 프롬프트 (LC01-LC17)
// =============================================
const LC_BASIC_PROMPTS = {
  'LC01': {
    title: '듣기 LC01 문항 (목적)',
    prompt_text: `Create a CSAT Listening Item 1 (Purpose Identification) following these specifications:

## Assessment Objective
- Core Skill: Identifying the purpose of the woman's speech
- Question: "다음을 듣고, 여자가 하는 말의 목적으로 가장 적절한 것을 고르시오."

## Dialogue Requirements
- Format: 2-3 turn dialogue between M: and W:
- Length: 60-80 words
- The woman's purpose should be inferable (to ask, request, confirm, complain, inform, etc.)
- Do NOT use explicit cues like "I'm calling to..."

## Output Format
{
  "question": "다음을 듣고, 여자가 하는 말의 목적으로 가장 적절한 것을 고르시오.",
  "lc_script": "[English dialogue with M:/W: indicators]",
  "options": ["목적1", "목적2", "목적3", "목적4", "목적5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'LC02': {
    title: '듣기 LC02 문항 (의견)',
    prompt_text: `Create a CSAT Listening Item 2 (Opinion Identification) following these specifications:

## Assessment Objective
- Core Skill: Identifying the man's opinion
- Question: "대화를 듣고, 남자의 의견으로 가장 적절한 것을 고르시오."

## Dialogue Requirements
- Format: 3-4 turn dialogue between M: and W:
- Length: 80-100 words
- The man's opinion should be clearly inferable from context
- Opinion should relate to a topic or situation being discussed

## Output Format
{
  "question": "대화를 듣고, 남자의 의견으로 가장 적절한 것을 고르시오.",
  "lc_script": "[English dialogue with M:/W: indicators]",
  "options": ["의견1", "의견2", "의견3", "의견4", "의견5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'LC06': {
    title: '듣기 LC06 문항 (금액)',
    prompt_text: `Create a CSAT Listening Item 6 (Price Calculation) following these specifications:

## Assessment Objective
- Core Skill: Calculating the final amount to pay
- Question: "대화를 듣고, 남자/여자가 지불할 금액을 고르시오."

## Dialogue Requirements
- Format: 3-4 turn dialogue about purchasing
- Length: 80-100 words
- Include prices, quantities, discounts, or coupons
- Final amount must be calculable from dialogue information

## Calculation Elements
- Base prices of items
- Quantities ordered
- Discounts (percentage or fixed)
- Coupons or special offers
- Tax (if applicable)

## Output Format
{
  "question": "대화를 듣고, [화자]가 지불할 금액을 고르시오.",
  "lc_script": "[English dialogue with M:/W: indicators]",
  "options": ["$XX", "$YY", "$ZZ", "$AA", "$BB"],
  "answer": [1-5],
  "explanation": "[Korean explanation with calculation steps]"
}`
  },
  'LC15': {
    title: '듣기 LC15 문항 (상황 응답)',
    prompt_text: `Create a CSAT Listening Item 15 (Situational Response) following these specifications:

## Assessment Objective
- Core Skill: Selecting appropriate response to a situation description
- Question: "다음 상황 설명을 듣고, [화자]가 [상대방]에게 할 말로 가장 적절한 것을 고르시오."

## Structure Requirements
- Format: Situation narration + speaker's intended statement
- Length: 100-130 words
- Narrator describes a situation in third person
- Final part indicates what the speaker wants to say

## Content Elements
- Clear situation setup
- Character relationship
- Problem or decision point
- Appropriate response needed

## Output Format
{
  "question": "다음 상황 설명을 듣고, [화자]가 [상대방]에게 할 말로 가장 적절한 것을 고르시오. [3점]",
  "lc_script": "[Situation description in English]",
  "options": ["Response 1", "Response 2", "Response 3", "Response 4", "Response 5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  }
};

// =============================================
// RC 문항 기본 프롬프트 (RC18-RC45)
// =============================================
const RC_BASIC_PROMPTS = {
  'RC18': {
    title: '읽기 RC18 문항 (목적)',
    prompt_text: `Create a CSAT Reading Item 18 (Purpose) following these specifications:

## Assessment Objective
- Core Skill: Identifying the purpose of a practical text (letter, notice, email)
- Question: "다음 글의 목적으로 가장 적절한 것은?"

## Passage Requirements
- Format: Practical text (letter, notice, announcement, email)
- Length: 120-150 words
- Clear purpose that can be inferred
- Formal or semi-formal register

## Output Format
{
  "question": "다음 글의 목적으로 가장 적절한 것은?",
  "passage": "[English practical text]",
  "options": ["목적1", "목적2", "목적3", "목적4", "목적5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC19': {
    title: '읽기 RC19 문항 (심경변화)',
    prompt_text: `Create a CSAT Reading Item 19 (Mood Change) following these specifications:

## Assessment Objective
- Core Skill: Identifying emotional change in a narrative
- Question: "다음 글에 드러난 'I'의 심경 변화로 가장 적절한 것은?"

## Passage Requirements
- Format: First-person narrative
- Length: 150-180 words
- Clear emotional progression from beginning to end
- Concrete events causing mood shift

## Output Format
{
  "question": "다음 글에 드러난 'I'의 심경 변화로 가장 적절한 것은?",
  "passage": "[English first-person narrative]",
  "options": ["심경A → 심경B", "심경C → 심경D", "심경E → 심경F", "심경G → 심경H", "심경I → 심경J"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC20': {
    title: '읽기 RC20 문항 (주장)',
    prompt_text: `Create a CSAT Reading Item 20 (Claim) following these specifications:

## Assessment Objective
- Core Skill: Identifying the author's main claim
- Question: "다음 글에서 필자가 주장하는 바로 가장 적절한 것은?"

## Passage Requirements
- Format: Argumentative essay
- Length: 140-170 words
- Clear central claim with supporting reasons
- Logical structure

## Output Format
{
  "question": "다음 글에서 필자가 주장하는 바로 가장 적절한 것은?",
  "passage": "[English argumentative text]",
  "options": ["주장1", "주장2", "주장3", "주장4", "주장5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC21': {
    title: '읽기 RC21 문항 (함축의미)',
    prompt_text: `Create a CSAT Reading Item 21 (Implied Meaning) following these specifications:

## Assessment Objective
- Core Skill: Understanding the implied meaning of an underlined expression
- Question: "밑줄 친 [expression]이 다음 글에서 의미하는 바로 가장 적절한 것은?"

## Passage Requirements
- Format: Essay with metaphorical/figurative expression
- Length: 140-170 words
- Include one underlined expression with implied meaning
- Context should support inferring the meaning

## Output Format
{
  "question": "밑줄 친 [expression]이 다음 글에서 의미하는 바로 가장 적절한 것은?",
  "passage": "[English text with <u>underlined expression</u>]",
  "options": ["의미1", "의미2", "의미3", "의미4", "의미5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC22': {
    title: '읽기 RC22 문항 (요지)',
    prompt_text: `Create a CSAT Reading Item 22 (Main Point) following these specifications:

## Assessment Objective
- Core Skill: Identifying the main point (gist) of the passage
- Question: "다음 글의 요지로 가장 적절한 것은?"

## Passage Requirements
- Format: Expository or argumentative text
- Length: 140-170 words
- Clear main point supported by examples or reasoning

## Output Format
{
  "question": "다음 글의 요지로 가장 적절한 것은?",
  "passage": "[English text]",
  "options": ["요지1", "요지2", "요지3", "요지4", "요지5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC23': {
    title: '읽기 RC23 문항 (주제)',
    prompt_text: `Create a CSAT Reading Item 23 (Topic) following these specifications:

## Assessment Objective
- Core Skill: Identifying the main topic of the passage
- Question: "다음 글의 주제로 가장 적절한 것은?"

## Passage Requirements
- Format: Expository text
- Length: 150-180 words
- Clear topic with supporting details

## Output Format
{
  "question": "다음 글의 주제로 가장 적절한 것은?",
  "passage": "[English text]",
  "options": ["주제1", "주제2", "주제3", "주제4", "주제5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC24': {
    title: '읽기 RC24 문항 (제목)',
    prompt_text: `Create a CSAT Reading Item 24 (Title) following these specifications:

## Assessment Objective
- Core Skill: Selecting the best title for the passage
- Question: "다음 글의 제목으로 가장 적절한 것은?"

## Passage Requirements
- Format: Expository or argumentative text
- Length: 150-180 words
- Content should support a specific title choice

## Output Format
{
  "question": "다음 글의 제목으로 가장 적절한 것은?",
  "passage": "[English text]",
  "options": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC25': {
    title: '읽기 RC25 문항 (도표)',
    prompt_text: `Create a CSAT Reading Item 25 (Chart/Graph) following these specifications:

## Assessment Objective
- Core Skill: Identifying information that does NOT match the chart/graph
- Question: "[Chart Title]에 관한 다음 글의 내용과 일치하지 않는 것은?"

## Requirements
- Provide chart_data with numerical information
- Write description matching chart (except one false statement)
- Length: 120-150 words

## Output Format
{
  "question": "[Chart Title]에 관한 다음 글의 내용과 일치하지 않는 것은?",
  "passage": "[English description of chart data]",
  "chart_data": { "headers": [...], "rows": [...] },
  "options": ["Statement 1", "Statement 2", "Statement 3", "Statement 4", "Statement 5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC26': {
    title: '읽기 RC26 문항 (인물 내용일치)',
    prompt_text: `Create a CSAT Reading Item 26 (Person Content Match) following these specifications:

## Assessment Objective
- Core Skill: Identifying information that matches about a person
- Question: "[Person Name]에 관한 다음 글의 내용과 일치하는 것은?"

## Passage Requirements
- Format: Biographical text about a notable person
- Length: 150-180 words
- Include specific facts about the person

## Output Format
{
  "question": "[Person Name]에 관한 다음 글의 내용과 일치하는 것은?",
  "passage": "[English biographical text]",
  "options": ["사실1", "사실2", "사실3", "사실4", "사실5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC27': {
    title: '읽기 RC27 문항 (실용문 내용일치)',
    prompt_text: `Create a CSAT Reading Item 27 (Practical Text Match) following these specifications:

## Assessment Objective
- Core Skill: Identifying information that does NOT match the practical text
- Question: "[Event/Service Name]에 관한 다음 안내문의 내용과 일치하지 않는 것은?"

## Passage Requirements
- Format: Practical text (notice, advertisement, brochure)
- Length: 130-160 words
- Include specific details (date, time, place, conditions)

## Output Format
{
  "question": "[Event/Service]에 관한 다음 안내문의 내용과 일치하지 않는 것은?",
  "passage": "[English practical text]",
  "options": ["정보1", "정보2", "정보3", "정보4", "정보5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC28': {
    title: '읽기 RC28 문항 (실용문 내용일치)',
    prompt_text: `Create a CSAT Reading Item 28 (Practical Text Match) following these specifications:

## Assessment Objective
- Core Skill: Identifying information that does NOT match the practical text
- Question: "[Program/Event]에 관한 다음 안내문의 내용과 일치하지 않는 것은?"

## Passage Requirements
- Format: Practical text (program description, event guide)
- Length: 140-170 words
- Include specific factual details

## Output Format
{
  "question": "[Program/Event]에 관한 다음 안내문의 내용과 일치하지 않는 것은?",
  "passage": "[English practical text]",
  "options": ["정보1", "정보2", "정보3", "정보4", "정보5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC29': {
    title: '읽기 RC29 문항 (어법)',
    prompt_text: `Create a CSAT Reading Item 29 (Grammar) following these specifications:

## Assessment Objective
- Core Skill: Identifying grammatically incorrect usage
- Question: "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?"

## CRITICAL Requirements
- The passage MUST contain exactly 5 underlined segments using circled numbers: ①, ②, ③, ④, ⑤
- Format: "text text ①underlined_word text ②underlined_word text..."
- Exactly ONE underlined word must be grammatically INCORRECT
- The other 4 underlined words must be grammatically CORRECT

## Grammar Points to Test
- Subject-verb agreement
- Verb tense/form
- Pronoun reference
- Participle usage (present/past)
- Relative pronouns
- Infinitive vs gerund
- Active vs passive voice

## Output Format
{
  "question": "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?",
  "passage": "[English text with ①word1 ②word2 ③word3 ④word4 ⑤word5]",
  "stimulus": "[Same as passage - English text with circled number markers]",
  "options": ["①", "②", "③", "④", "⑤"],
  "answer": [1-5],
  "explanation": "[Korean explanation of the grammar error]",
  "grammar_meta": {
    "error_type": "[Grammar category]",
    "correct_form": "[What it should be]"
  }
}`
  },
  'RC30': {
    title: '읽기 RC30 문항 (어휘)',
    prompt_text: `Create a CSAT Reading Item 30 (Vocabulary) following these specifications:

## Assessment Objective
- Core Skill: Identifying contextually inappropriate vocabulary
- Question: "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?"

## Requirements
- 5 underlined words with circled numbers: ①, ②, ③, ④, ⑤
- ONE word must be contextually inappropriate (opposite or unrelated meaning)
- Other 4 words must fit the context perfectly
- Length: 140-170 words

## Output Format
{
  "question": "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?",
  "passage": "[English text with ①word ②word ③word ④word ⑤word]",
  "options": ["①", "②", "③", "④", "⑤"],
  "answer": [1-5],
  "explanation": "[Korean explanation]",
  "vocabulary_meta": {
    "wrong_word": "[The inappropriate word]",
    "correct_word": "[What it should be]"
  }
}`
  },
  'RC31': {
    title: '읽기 RC31 문항 (빈칸 - 단어/구)',
    prompt_text: `Create a CSAT Reading Item 31 (Blank - Word/Phrase) following these specifications:

## Assessment Objective
- Core Skill: Filling a blank with appropriate word or short phrase
- Question: "다음 빈칸에 들어갈 말로 가장 적절한 것은?"

## Requirements
- One blank marked as __________ or [BLANK]
- Length: 150-180 words
- Blank should test vocabulary or short phrase understanding

## Output Format
{
  "question": "다음 빈칸에 들어갈 말로 가장 적절한 것은?",
  "passage": "[English text with blank: __________]",
  "gapped_passage": "[Same text with [BLANK] marker]",
  "options": ["word/phrase 1", "word/phrase 2", "word/phrase 3", "word/phrase 4", "word/phrase 5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC32': {
    title: '읽기 RC32 문항 (빈칸 - 구/절)',
    prompt_text: `Create a CSAT Reading Item 32 (Blank - Phrase/Clause) following these specifications:

## Assessment Objective
- Core Skill: Filling a blank with appropriate phrase or clause
- Question: "다음 빈칸에 들어갈 말로 가장 적절한 것은?"

## Requirements
- One blank for phrase or clause
- Length: 160-190 words
- More complex inference required than RC31

## Output Format
{
  "question": "다음 빈칸에 들어갈 말로 가장 적절한 것은?",
  "passage": "[English text with blank]",
  "gapped_passage": "[Text with [BLANK] marker]",
  "options": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC33': {
    title: '읽기 RC33 문항 (빈칸 - 문장)',
    prompt_text: `Create a CSAT Reading Item 33 (Blank - Sentence) following these specifications:

## Assessment Objective
- Core Skill: Filling a blank with appropriate sentence
- Question: "다음 빈칸에 들어갈 말로 가장 적절한 것은? [3점]"

## Requirements
- One blank for a full sentence or complex clause
- Length: 180-220 words
- High-level inference and synthesis required

## Output Format
{
  "question": "다음 빈칸에 들어갈 말로 가장 적절한 것은? [3점]",
  "passage": "[English text with blank]",
  "gapped_passage": "[Text with [BLANK] marker]",
  "options": ["sentence 1", "sentence 2", "sentence 3", "sentence 4", "sentence 5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC34': {
    title: '읽기 RC34 문항 (빈칸 - 고난도)',
    prompt_text: `Create a CSAT Reading Item 34 (Blank - Advanced) following these specifications:

## Assessment Objective
- Core Skill: Filling a blank requiring abstract reasoning
- Question: "다음 빈칸에 들어갈 말로 가장 적절한 것은? [3점]"

## Requirements
- Abstract or philosophical content
- One blank requiring synthesis of multiple ideas
- Length: 180-220 words

## Output Format
{
  "question": "다음 빈칸에 들어갈 말로 가장 적절한 것은? [3점]",
  "passage": "[English text with blank]",
  "gapped_passage": "[Text with [BLANK] marker]",
  "options": ["option 1", "option 2", "option 3", "option 4", "option 5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC35': {
    title: '읽기 RC35 문항 (무관한 문장)',
    prompt_text: `Create a CSAT Reading Item 35 (Irrelevant Sentence) following these specifications:

## Assessment Objective
- Core Skill: Identifying the sentence that does not fit the flow
- Question: "다음 글에서 전체 흐름과 관계 없는 문장은?"

## Requirements
- 5 numbered sentences: ① ② ③ ④ ⑤
- ONE sentence breaks the logical flow
- Length: 150-180 words

## Output Format
{
  "question": "다음 글에서 전체 흐름과 관계 없는 문장은?",
  "passage": "[Text with ① sentence1 ② sentence2 ③ sentence3 ④ sentence4 ⑤ sentence5]",
  "options": ["①", "②", "③", "④", "⑤"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC36': {
    title: '읽기 RC36 문항 (순서배열)',
    prompt_text: `Create a CSAT Reading Item 36 (Sentence Ordering) following these specifications:

## Assessment Objective
- Core Skill: Arranging sentences in logical order
- Question: "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?"

## Requirements
- Opening sentence + three paragraphs (A), (B), (C)
- Clear logical connections between paragraphs
- Length: 150-180 words total

## Output Format
{
  "question": "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?",
  "passage": "[Opening sentence]\\n\\n(A) [paragraph A]\\n\\n(B) [paragraph B]\\n\\n(C) [paragraph C]",
  "options": ["(A)-(C)-(B)", "(B)-(A)-(C)", "(B)-(C)-(A)", "(C)-(A)-(B)", "(C)-(B)-(A)"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC37': {
    title: '읽기 RC37 문항 (순서배열 고난도)',
    prompt_text: `Create a CSAT Reading Item 37 (Sentence Ordering - Advanced) following these specifications:

## Assessment Objective
- Core Skill: Arranging sentences in logical order (advanced)
- Question: "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은? [3점]"

## Requirements
- More complex logical connections
- Abstract or academic content
- Length: 170-200 words total

## Output Format
{
  "question": "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은? [3점]",
  "passage": "[Opening sentence]\\n\\n(A) [paragraph A]\\n\\n(B) [paragraph B]\\n\\n(C) [paragraph C]",
  "options": ["(A)-(C)-(B)", "(B)-(A)-(C)", "(B)-(C)-(A)", "(C)-(A)-(B)", "(C)-(B)-(A)"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC38': {
    title: '읽기 RC38 문항 (문장삽입)',
    prompt_text: `Create a CSAT Reading Item 38 (Sentence Insertion) following these specifications:

## Assessment Objective
- Core Skill: Finding the correct position for a given sentence
- Question: "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?"

## Requirements
- Given sentence to insert
- 5 insertion points marked: ( ① ) ( ② ) ( ③ ) ( ④ ) ( ⑤ )
- Length: 150-180 words

## Output Format
{
  "question": "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?",
  "given_sentence": "[Sentence to insert]",
  "passage": "[Text with ( ① ) ( ② ) ( ③ ) ( ④ ) ( ⑤ ) markers]",
  "options": ["①", "②", "③", "④", "⑤"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC39': {
    title: '읽기 RC39 문항 (문장삽입 고난도)',
    prompt_text: `Create a CSAT Reading Item 39 (Sentence Insertion - Advanced) following these specifications:

## Assessment Objective
- Core Skill: Finding the correct position for a given sentence (advanced)
- Question: "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은? [3점]"

## Requirements
- Complex logical reasoning required
- Abstract content
- Length: 170-200 words

## Output Format
{
  "question": "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은? [3점]",
  "given_sentence": "[Sentence to insert]",
  "passage": "[Text with ( ① ) ( ② ) ( ③ ) ( ④ ) ( ⑤ ) markers]",
  "options": ["①", "②", "③", "④", "⑤"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  },
  'RC40': {
    title: '읽기 RC40 문항 (요약문)',
    prompt_text: `Create a CSAT Reading Item 40 (Summary) following these specifications:

## Assessment Objective
- Core Skill: Completing a summary with appropriate words
- Question: "다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A)와 (B)에 들어갈 말로 가장 적절한 것은?"

## Requirements
- Main passage + summary sentence with (A) and (B) blanks
- Length: 180-220 words for passage

## Output Format
{
  "question": "다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A)와 (B)에 들어갈 말로 가장 적절한 것은?",
  "passage": "[Main passage]",
  "summary": "[Summary with (A) and (B) blanks]",
  "options": ["(A) word1 - (B) word1", "(A) word2 - (B) word2", "(A) word3 - (B) word3", "(A) word4 - (B) word4", "(A) word5 - (B) word5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
  }
};

// =============================================
// 세트 문항 프롬프트
// =============================================
const SET_PROMPTS = {
  'LC16_17': {
    title: '듣기 LC16-17 세트 문항',
    prompt_text: `Create a CSAT Listening Items 16-17 Set following these specifications:

## Assessment Objective
- Two questions sharing one lc_script
- LC16: Topic identification
- LC17: Not mentioned information

## Script Requirements
- Format: Monologue or interview (150-180 words)
- Clear main topic
- 4-6 specific details mentioned

## Output Format
{
  "set_type": "LC16_17",
  "lc_script": "[Shared listening script 150-180 words]",
  "items": [
    {
      "item_no": 16,
      "question": "남자가 하는 말의 주제로 가장 적절한 것은?",
      "options": ["주제1", "주제2", "주제3", "주제4", "주제5"],
      "answer": [1-5],
      "explanation": "[Korean explanation]"
    },
    {
      "item_no": 17,
      "question": "언급된 내용이 아닌 것은?",
      "options": ["내용1", "내용2", "내용3", "내용4", "내용5"],
      "answer": [1-5],
      "explanation": "[Korean explanation]"
    }
  ]
}`,
    active: 1,
    is_default: 1
  },
  'RC41_42': {
    title: '읽기 RC41-42 세트 문항',
    prompt_text: `Create a CSAT Reading Items 41-42 Set following these specifications:

## Assessment Objective
- Two questions sharing one passage
- RC41: Title or main idea
- RC42: Specific detail or inference

## Passage Requirements
- Format: Essay or article (280-350 words)
- Clear main idea with supporting details
- Academic or general interest topic

## Output Format
{
  "set_type": "RC41_42",
  "passage": "[Shared passage 280-350 words]",
  "items": [
    {
      "item_no": 41,
      "question": "다음 글의 제목으로 가장 적절한 것은?",
      "options": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"],
      "answer": [1-5],
      "explanation": "[Korean explanation]"
    },
    {
      "item_no": 42,
      "question": "다음 글의 내용과 일치하지 않는 것은?",
      "options": ["Statement 1", "Statement 2", "Statement 3", "Statement 4", "Statement 5"],
      "answer": [1-5],
      "explanation": "[Korean explanation]"
    }
  ]
}`,
    active: 1,
    is_default: 1
  },
  'RC43_45': {
    title: '읽기 RC43-45 세트 문항',
    prompt_text: `Create a CSAT Reading Items 43-45 Set following these specifications:

## Assessment Objective
- Three questions sharing one long passage
- RC43: Sentence ordering
- RC44: Sentence insertion
- RC45: Content match

## Passage Requirements
- Format: Long essay with clear structure (350-420 words)
- Multiple paragraphs with logical connections
- Complex topic requiring careful reading

## Output Format
{
  "set_type": "RC43_45",
  "intro": "[Opening sentence]",
  "paragraphs": {
    "A": "[Paragraph A content]",
    "B": "[Paragraph B content]",
    "C": "[Paragraph C content]"
  },
  "items": [
    {
      "item_no": 43,
      "question": "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?",
      "options": ["(A)-(C)-(B)", "(B)-(A)-(C)", "(B)-(C)-(A)", "(C)-(A)-(B)", "(C)-(B)-(A)"],
      "answer": 3,
      "explanation": "[Korean explanation for why this order is correct]"
    },
    {
      "item_no": 44,
      "question": "밑줄 친 [expression]이 가리키는 대상이 나머지 넷과 다른 것은?",
      "options": ["①", "②", "③", "④", "⑤"],
      "answer": 2,
      "explanation": "[Korean explanation for the referent]"
    },
    {
      "item_no": 45,
      "question": "다음 글의 내용과 일치하지 않는 것은?",
      "options": ["Statement 1", "Statement 2", "Statement 3", "Statement 4", "Statement 5"],
      "answer": 4,
      "explanation": "[Korean explanation for the inconsistency]"
    }
  ]
}`,
    active: 1,
    is_default: 1
  }
};

// =============================================
// 지문 생성 프롬프트 (P01-P45)
// =============================================
function generatePassagePrompts() {
  const prompts = {};

  // LC 지문 (P01-P17)
  for (let i = 1; i <= 17; i++) {
    const key = `P${String(i).padStart(2, '0')}`;
    prompts[key] = {
      title: `LC${String(i).padStart(2, '0')} 지문 생성`,
      prompt_text: `Generate a KSAT-style listening script for LC${String(i).padStart(2, '0')}.

## Requirements
- Use M: and W: for speaker indicators
- Follow KSAT listening test conventions
- Appropriate length for item type ${i}
- Natural conversational flow

Output only the script, no additional text.`,
      active: 1,
      is_default: 1
    };
  }

  // RC 지문 (P18-P45)
  for (let i = 18; i <= 45; i++) {
    const key = `P${i}`;
    prompts[key] = {
      title: `RC${i} 지문 생성`,
      prompt_text: `Generate a KSAT-style reading passage for RC${i}.

## Requirements
- Follow KSAT reading test conventions
- Appropriate length and complexity for item type ${i}
- Academic or general interest topic
- Clear logical structure

Output only the passage, no additional text.`,
      active: 1,
      is_default: 1
    };
  }

  return prompts;
}

// =============================================
// 유틸리티 함수
// =============================================

/**
 * 사용자 확인 프롬프트 (CLI)
 */
function askConfirmation(question) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * 현재 DB의 프롬프트를 백업 JSON 파일로 저장
 */
function backupCurrentPrompts(db) {
  const prompts = db.prepare('SELECT * FROM prompts').all();
  if (prompts.length === 0) {
    console.log('  백업할 프롬프트가 없습니다.\n');
    return null;
  }

  const backupDir = path.join(__dirname, '../../..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(backupDir, `prompts_backup_${timestamp}.json`);

  const backupData = {
    exported_at: new Date().toISOString(),
    total_count: prompts.length,
    prompts: prompts.map(p => ({
      prompt_key: p.prompt_key,
      title: p.title,
      prompt_text: p.prompt_text,
      active: p.active,
      is_default: p.is_default,
      status: p.status
    }))
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`  ✅ 백업 완료: ${backupPath}`);
  console.log(`     (${prompts.length}개 프롬프트 저장됨)\n`);
  return backupPath;
}

/**
 * 기존 프롬프트를 버전 히스토리에 저장
 */
function saveVersionHistory(db, promptId, promptKey, promptText, reason) {
  const latestVersion = db.prepare(
    'SELECT MAX(version) as max_version FROM prompt_versions WHERE prompt_id = ?'
  ).get(promptId);

  const newVersion = (latestVersion?.max_version || 0) + 1;

  db.prepare(`
    INSERT INTO prompt_versions (prompt_id, prompt_key, version, prompt_text, change_reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(promptId, promptKey, newVersion, promptText, reason);

  return newVersion;
}

// =============================================
// 메인 시드 함수
// =============================================
async function seedAllPrompts() {
  try {
    // 명령줄 인자 파싱
    const args = process.argv.slice(2);
    const forceMode = args.includes('--force') || args.includes('-f');
    const noBackup = args.includes('--no-backup');
    const customJsonArg = args.find(a => a.startsWith('--json='));
    const customJsonPath = customJsonArg ? customJsonArg.split('=')[1] : null;

    // 도움말 출력
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
사용법: node seedAllPrompts.js [옵션]

옵션:
  --force, -f      확인 없이 바로 실행
  --no-backup      백업 없이 실행 (주의!)
  --json=<경로>    사용할 JSON 파일 경로 지정
  --help, -h       이 도움말 표시

예시:
  node seedAllPrompts.js
  node seedAllPrompts.js --force
  node seedAllPrompts.js --json=../../../prompt_versions/prompts_v2026-01-19.json
`);
      process.exit(0);
    }

    await initDatabase();
    const db = getDb();

    // 현재 DB 상태 확인
    const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM prompts').get();
    const modifiedCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM prompts
      WHERE updated_at > created_at
    `).get();

    console.log('========================================');
    console.log('⚠️  프롬프트 시드 스크립트');
    console.log('========================================\n');

    console.log('📊 현재 DB 상태:');
    console.log(`   - 총 프롬프트 수: ${existingCount.cnt}개`);
    console.log(`   - 수정된 프롬프트: ${modifiedCount.cnt}개`);
    console.log('');

    // 경고 메시지
    if (existingCount.cnt > 0) {
      console.log('⚠️  경고: 이 작업은 기존 프롬프트를 덮어씁니다!');
      console.log('   - UI에서 수정한 내용이 JSON 파일 내용으로 대체됩니다.');
      console.log('   - 백업이 자동 생성되며, 버전 히스토리도 저장됩니다.\n');

      if (!forceMode) {
        const confirmed = await askConfirmation('계속하시겠습니까? (y/N): ');
        if (!confirmed) {
          console.log('\n❌ 작업이 취소되었습니다.');
          closeDatabase();
          process.exit(0);
        }
        console.log('');
      }
    }

    // 백업 수행
    if (!noBackup && existingCount.cnt > 0) {
      console.log('📦 기존 프롬프트 백업 중...');
      backupCurrentPrompts(db);
    }

    console.log('========================================');
    console.log('모든 기본 프롬프트 시드 시작...');
    console.log('========================================\n');

    // JSON 파일에서 상세 프롬프트 로드 시도
    let detailedPrompts = [];
    const defaultJsonPath = path.join(__dirname, '../../..', 'prompts_active.json');
    const jsonPath = customJsonPath
      ? path.resolve(__dirname, customJsonPath)
      : defaultJsonPath;

    console.log(`📄 JSON 파일: ${path.basename(jsonPath)}`);

    if (fs.existsSync(jsonPath)) {
      console.log('상세 프롬프트 JSON 파일 로드 중...');
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      // JSON 구조가 { prompts: [...] } 또는 직접 배열 형태 지원
      detailedPrompts = Array.isArray(jsonData) ? jsonData : (jsonData.prompts || []);
      console.log(`  ${detailedPrompts.length}개의 상세 프롬프트를 로드했습니다.\n`);
    } else {
      console.log('⚠️  상세 프롬프트 JSON 파일이 없습니다: ' + jsonPath);
      console.log('   기본 프롬프트만 사용합니다.\n');
    }

    // 상세 프롬프트를 키로 매핑
    const detailedMap = {};
    for (const p of detailedPrompts) {
      detailedMap[p.prompt_key] = p;
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // 프롬프트 삽입/업데이트 헬퍼 함수 (버전 히스토리 저장 포함)
    function upsertPrompt(promptKey, title, promptText, active = 1) {
      const existing = db.prepare('SELECT id, prompt_text FROM prompts WHERE prompt_key = ?').get(promptKey);

      if (existing) {
        // 내용이 변경된 경우에만 버전 히스토리 저장
        if (existing.prompt_text !== promptText) {
          saveVersionHistory(
            db,
            existing.id,
            promptKey,
            existing.prompt_text,
            'Seed 스크립트 실행 전 자동 백업'
          );
        }

        db.prepare(`
          UPDATE prompts
          SET title = ?, prompt_text = ?, active = ?, is_default = 1, updated_at = CURRENT_TIMESTAMP
          WHERE prompt_key = ?
        `).run(title, promptText, active, promptKey);
        updated++;
        console.log(`[UPDATE] ${promptKey}: ${title}`);
      } else {
        db.prepare(`
          INSERT INTO prompts (prompt_key, title, prompt_text, active, is_default)
          VALUES (?, ?, ?, ?, 1)
        `).run(promptKey, title, promptText, active);
        inserted++;
        console.log(`[INSERT] ${promptKey}: ${title}`);
      }
    }

    // 1. 마스터 프롬프트 시드
    console.log('\n--- 마스터 프롬프트 ---');
    for (const prompt of MASTER_PROMPTS) {
      upsertPrompt(prompt.prompt_key, prompt.title, prompt.prompt_text, prompt.active);
    }

    // 2. LC 프롬프트 시드 (LC01-LC17)
    console.log('\n--- LC 프롬프트 (LC01-LC17) ---');
    for (let i = 1; i <= 17; i++) {
      const key = `LC${String(i).padStart(2, '0')}`;

      // 상세 프롬프트 우선 사용
      if (detailedMap[key]) {
        upsertPrompt(key, detailedMap[key].title, detailedMap[key].prompt_text, detailedMap[key].active || 1);
      } else if (LC_BASIC_PROMPTS[key]) {
        upsertPrompt(key, LC_BASIC_PROMPTS[key].title, LC_BASIC_PROMPTS[key].prompt_text, 1);
      } else {
        // 기본 템플릿 사용
        const defaultPrompt = {
          title: `듣기 LC${String(i).padStart(2, '0')} 문항`,
          prompt_text: `Create a CSAT Listening Item ${i} following KSAT specifications.

## Output Format
{
  "question": "[Korean question]",
  "lc_script": "[English listening script with M:/W: indicators]",
  "options": ["option1", "option2", "option3", "option4", "option5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
        };
        upsertPrompt(key, defaultPrompt.title, defaultPrompt.prompt_text, 1);
      }
    }

    // 3. RC 프롬프트 시드 (RC18-RC40)
    // 주의: RC41-RC45는 세트 프롬프트(RC41_42, RC43_45)로 처리하므로 개별 생성하지 않음
    console.log('\n--- RC 프롬프트 (RC18-RC40) ---');
    for (let i = 18; i <= 40; i++) {
      const key = `RC${i}`;

      // 상세 프롬프트 우선 사용 (01_19 버전에서 로드)
      if (detailedMap[key]) {
        upsertPrompt(key, detailedMap[key].title, detailedMap[key].prompt_text, detailedMap[key].active || 1);
      } else if (RC_BASIC_PROMPTS[key]) {
        upsertPrompt(key, RC_BASIC_PROMPTS[key].title, RC_BASIC_PROMPTS[key].prompt_text, 1);
      } else {
        // 기본 템플릿 사용
        const defaultPrompt = {
          title: `읽기 RC${i} 문항`,
          prompt_text: `Create a CSAT Reading Item ${i} following KSAT specifications.

## Output Format
{
  "question": "[Korean question]",
  "passage": "[English passage]",
  "options": ["option1", "option2", "option3", "option4", "option5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
        };
        upsertPrompt(key, defaultPrompt.title, defaultPrompt.prompt_text, 1);
      }
    }

    // RC41-RC45는 세트 프롬프트(RC41_42, RC43_45)만 사용
    // 개별 프롬프트가 필요한 경우를 위해 참조용으로만 생성 (비활성화 상태)
    console.log('\n--- RC41-RC45 참조용 프롬프트 (세트 프롬프트 사용 권장) ---');
    for (let i = 41; i <= 45; i++) {
      const key = `RC${i}`;

      // 01_19 버전에 상세 프롬프트가 있으면 사용, 아니면 기본 참조 템플릿
      if (detailedMap[key]) {
        upsertPrompt(key, detailedMap[key].title, detailedMap[key].prompt_text, detailedMap[key].active || 1);
      } else {
        const referencePrompt = {
          title: `읽기 RC${i} 문항 (세트 사용 권장)`,
          prompt_text: `Create a CSAT Reading Item ${i} following KSAT specifications.

## 주의사항
이 문항은 세트 문항의 일부입니다:
- RC41-42: RC41_42 세트 프롬프트 사용 권장
- RC43-45: RC43_45 세트 프롬프트 사용 권장

## Output Format
{
  "question": "[Korean question]",
  "passage": "[English passage]",
  "options": ["option1", "option2", "option3", "option4", "option5"],
  "answer": [1-5],
  "explanation": "[Korean explanation]"
}`
        };
        // 참조용으로만 생성 (기본 사용은 세트 프롬프트)
        upsertPrompt(key, referencePrompt.title, referencePrompt.prompt_text, 1);
      }
    }

    // 4. 세트 문항 프롬프트 시드
    console.log('\n--- 세트 문항 프롬프트 ---');
    for (const [key, prompt] of Object.entries(SET_PROMPTS)) {
      // 상세 프롬프트 우선 사용
      if (detailedMap[key]) {
        upsertPrompt(key, detailedMap[key].title, detailedMap[key].prompt_text, detailedMap[key].active || 1);
      } else {
        upsertPrompt(key, prompt.title, prompt.prompt_text, prompt.active);
      }
    }

    // 5. 지문 생성 프롬프트 시드
    console.log('\n--- 지문 생성 프롬프트 ---');
    const passagePrompts = generatePassagePrompts();
    for (const [key, prompt] of Object.entries(passagePrompts)) {
      // 상세 프롬프트 우선 사용
      if (detailedMap[key]) {
        upsertPrompt(key, detailedMap[key].title, detailedMap[key].prompt_text, detailedMap[key].active || 1);
      } else {
        upsertPrompt(key, prompt.title, prompt.prompt_text, prompt.active);
      }
    }

    // 변경사항 저장
    saveDatabase();

    // 통계 출력
    console.log('\n========================================');
    console.log('프롬프트 시드 완료!');
    console.log('========================================');
    console.log(`  INSERT: ${inserted}개`);
    console.log(`  UPDATE: ${updated}개`);
    console.log(`  총 처리: ${inserted + updated}개`);

    // is_default 설정 확인
    const defaultCount = db.prepare('SELECT COUNT(*) as cnt FROM prompts WHERE is_default = 1').get();
    console.log(`\n  기본값 설정된 프롬프트: ${defaultCount.cnt}개`);

    closeDatabase();
    console.log('\n데이터베이스 연결 종료');
    process.exit(0);

  } catch (error) {
    console.error('\n오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
seedAllPrompts();
