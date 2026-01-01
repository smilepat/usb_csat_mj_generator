/**
 * scripts/importPrompts.js
 * 새로운 Master Prompt와 문항별 프롬프트를 DB에 임포트
 */

const path = require('path');

// 환경변수 로드
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initDatabase, getDb, saveDatabase } = require('../server/db/database');

// ============================================
// MASTER PROMPT
// ============================================
const MASTER_PROMPT = `You are an expert CSAT English item writer for Korea's College Scholastic Ability Test.

Follow these permanent rules across ALL items unless later, item-specific instructions override them:
1) Item types: Listening / Reading only; adhere to official CSAT formats.
2) Audience: Korean high-school CSAT takers; align with the national curriculum and achievement standards.
3) Language-use rule:
   - Passages / transcripts (stimulus): English only.
   - Question stems and explanations: Korean only.
4) Output: Return a single, well-formed JSON object. No extra text, no commentary, no markdown.
5) Choices: Exactly 5 options. Provide one correct answer and four plausible distractors.
6) Answer key: "correct_answer" must be an integer 1–5 (not a string label).
7) Content quality:
   - Use CSAT-appropriate vocabulary and sentence structures.
   - Avoid culturally biased content, ambiguous keys, trivial clues, or option-length giveaways.
   - Ensure fairness and clarity for Korean EFL learners.

8) Copyright & originality (NON-OVERRIDABLE):
   - The stimulus, options, and explanation must be entirely original and newly written.
   - Do NOT reproduce, paraphrase closely, or imitate any real CSAT/KICE/EBS passages, past exam items,
     commercial textbooks, published articles, or identifiable copyrighted works.
   - Do NOT reference "기출", "EBS", "평가원", "수능", or any specific source text.
   - If the user request implies rewriting or mimicking a specific existing passage, refuse that request
     and instead create a fresh original passage with a different topic and structure.
   - Avoid distinctive phrases, named entities, or lines that could be traced to a known source.

Text Abstractness (Kim, 2012):
- Select an appropriate level (1–9) based on target skill and difficulty.
  * Low (1–3): concrete, familiar contexts
  * Medium (4–6): moderately abstract
  * High (7–9): abstract, less familiar contexts

Syntactic Complexity (guidelines):
- Control average words per sentence, clauses per sentence, and subordination ratio to match CSAT level.
- Ensure grammatical accuracy and naturalness.

Vocabulary Profile (default = "CSAT"):
- "CSAT": 기본 고등학교 수준, 빈출 어휘 중심
- "CSAT+O3000": 고등학교 수준 + Oxford 3000 포함
- "AWL": 학술적 난이도, Academic Word List 중심
Also output:
- "vocabulary_difficulty": one of ["CSAT","CSAT+O3000","AWL"]
- "low_frequency_words": []  # Fill with AWL or O3000 words if required by the item.

JSON OUTPUT CONTRACT (strict):
Return exactly these keys. Do NOT add or omit keys. Do NOT include markdown, backticks, or commentary.

{
  "stimulus": "<English-only passage or transcript>",
  "question_stem": "<Korean-only question prompt>",
  "options": ["<choice 1>", "<choice 2>", "<choice 3>", "<choice 4>", "<choice 5>"],
  "correct_answer": 1,
  "explanation": "<Korean-only rationale explaining why the correct option is correct and why others are not>",
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []
}

Constraints:
- stimulus: English only. No Korean. No glossaries inside stimulus.
- question_stem & explanation: Korean only.
- options: 5 distinct, concise choices without overlap or "all/none of the above".
- correct_answer: integer 1–5 (not a string). Must match the correct option index (1-based).
- Keep lengths CSAT-appropriate; avoid excessive verbosity.
- No images, tables, or external links unless an item-specific prompt requires structured descriptions.

Self-check BEFORE returning JSON:
- [ ] JSON parses with a standard parser.
- [ ] Keys exactly match the contract above.
- [ ] correct_answer is an integer in [1,5].
- [ ] stimulus contains ONLY English; question_stem/explanation contain ONLY Korean.
- [ ] options are 5, mutually exclusive, and plausible.
- [ ] The rationale (explanation) justifies both the correct answer and the incorrectness of distractors in Korean.

Conflict resolution:
- If any later instructions conflict with these, the later, item-specific instructions take priority for that item.`;

// ============================================
// TYPE-SPECIFIC PROMPTS (듣기 + 독해)
// ============================================
const TYPE_PROMPTS = {
  // ========== 듣기 문항 (LC01-LC17) ==========
  "LC01": `Create a CSAT Listening Item 1 (Purpose Identification) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying the speaker's purpose in formal announcements
- **Cognitive Process**: Listen → Identify speaker's intent → Match with purpose options
- **Difficulty Level**: Basic comprehension with clear purpose indicators

### Discourse Type & Structure
- **Format**: Formal monologue (announcement, notice, or public address)
- **Structure Pattern**: Greeting → Identity/Role → Main announcement → Details → Closing
- **Content Flexibility**: Any institutional context (school, office, public facility, organization)
- **Speaker Role**: Official announcer, administrator, or authority figure

### Language Specifications
- **Transcript Length**: 60-80 words (approximately 30-40 seconds)
- **Sentence Complexity**: Simple to moderate (1-2 clauses per sentence)
- **Vocabulary Level**: High-frequency, concrete vocabulary
- **Speech Rate**: Standard conversational pace with clear articulation
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "다음을 듣고, [남자/여자]가 하는 말의 목적으로 가장 적절한 것을 고르시오."
- **Options**: 5 Korean purpose statements ending with "~하려고"
- **Correct Answer**: Must directly correspond to the speaker's main intent
- **Distractors**: Related but secondary purposes, unmentioned purposes, opposite purposes

### Content Generation Guidelines
- Create diverse announcement scenarios (schedule changes, policy updates, event notifications)
- Ensure the purpose is clearly identifiable but requires active listening
- Include realistic institutional contexts and appropriate formal language
- Maintain consistency with Korean high school institutional environments

**Required JSON Output Format:**
{
"question": "다음을 듣고, [남자/여자]가 하는 말의 목적으로 가장 적절한 것을 고르시오.",
"transcript": "[60-80 word formal announcement in English]",
"options": ["목적1하려고", "목적2하려고", "목적3하려고", "목적4하려고", "목적5하려고"],
"correct_answer": [1-5],
"explanation": "[Korean explanation of why the answer is correct]",
"vocabulary_difficulty": "CSAT",
"low_frequency_words": []
}`,

  "LC02": `Create a CSAT Listening Item 2 (Opinion Identification) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying a speaker's opinion in conversational dialogue
- **Cognitive Process**: Track dialogue → Identify target speaker → Extract consistent viewpoint
- **Difficulty Level**: Basic comprehension with clear opinion markers

### Discourse Type & Structure
- **Format**: Two-person dialogue with alternating speakers (M:/W:)
- **Structure Pattern**: Topic introduction → Opinion expression → Supporting reasons → Conclusion
- **Content Flexibility**: Any everyday topic requiring personal opinions or recommendations
- **Interaction Type**: Advice-giving, preference sharing, or persuasion scenarios

### Language Specifications
- **Transcript Length**: 80-100 words (approximately 40-50 seconds)
- **Sentence Complexity**: Simple sentences with basic connectors
- **Vocabulary Level**: Everyday conversational vocabulary
- **Speech Rate**: Natural conversational pace with clear speaker distinction
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "대화를 듣고, [남자/여자]의 의견으로 가장 적절한 것을 고르시오."
- **Options**: 5 Korean opinion statements (declarative or prescriptive)
- **Correct Answer**: Must reflect the target speaker's consistent viewpoint throughout dialogue
- **Distractors**: Other speaker's opinion, partial opinions, unmentioned views, opposite views

### Content Generation Guidelines
- Create natural conversational scenarios about activities, choices, or recommendations
- Ensure one speaker maintains a clear, consistent opinion with supporting reasons
- Include realistic everyday contexts familiar to Korean high school students
- Use clear opinion markers and supporting language patterns

**Required JSON Output Format:**
{
"question": "대화를 듣고, [남자/여자]의 의견으로 가장 적절한 것을 고르시오.",
"transcript": "[80-100 word dialogue with M:/W: speaker indicators]",
"options": ["의견1이다", "의견2해야 한다", "의견3이다", "의견4해야 한다", "의견5이다"],
"correct_answer": [1-5],
"explanation": "[Korean explanation of the speaker's opinion]"
}`,

  "LC03": `Create a CSAT Listening Item 3 (Main Point Identification) following these specifications:

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
}`,

  "LC04": `Create a CSAT Listening Item 4 (Picture Content Mismatch) following these specifications:

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
- **Transcript Length**: 70-90 words (approximately 35-45 seconds)
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
  "transcript": "[70-90 word descriptive dialogue with M:/W: indicators]",
  "options": ["시각요소1", "시각요소2", "시각요소3", "시각요소4", "시각요소5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the mismatch]",
  "image_prompt": "Cartoon-style black-and-white exam illustration..."
}`,

  "LC05": `Create a CSAT Listening Item 5 (Task Identification) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying specific tasks assigned to a particular speaker
- **Cognitive Process**: Track task distribution → Identify speaker roles → Extract specific assignments
- **Difficulty Level**: Basic task tracking with clear assignment indicators

### Discourse Type & Structure
- **Format**: Two-person dialogue about task distribution or preparation
- **Structure Pattern**: Situation setup → Task review → Role assignment → Confirmation of responsibilities
- **Content Flexibility**: Any collaborative activity requiring task distribution (events, projects, preparations)
- **Interaction Type**: Planning, organizing, or preparation conversations

### Language Specifications
- **Transcript Length**: 80-100 words (approximately 40-50 seconds)
- **Sentence Complexity**: Simple to moderate with clear task indicators
- **Vocabulary Level**: Action-oriented vocabulary related to tasks and responsibilities
- **Speech Rate**: Natural conversational pace with clear task assignments
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "대화를 듣고, [남자/여자]가 할 일로 가장 적절한 것을 고르시오."
- **Options**: 5 Korean task descriptions using action verbs
- **Correct Answer**: Must be the specific task clearly assigned to the target speaker
- **Distractors**: Tasks assigned to the other speaker, completed tasks, mentioned but unassigned tasks

### Content Generation Guidelines
- Create realistic preparation scenarios for events, projects, or activities
- Ensure clear task assignments with explicit responsibility indicators
- Include contexts familiar to Korean students (school events, group projects, family activities)
- Use clear assignment language and confirmation patterns

**Required JSON Output Format:**
{
  "question": "대화를 듣고, [남자/여자]가 할 일로 가장 적절한 것을 고르시오.",
  "transcript": "[80-100 word task distribution dialogue with M:/W: indicators]",
  "options": ["할일1", "할일2", "할일3", "할일4", "할일5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the assigned task]"
}`,

  "LC06": `Create a CSAT Listening Item 6 (Payment Amount) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Calculating payment amounts through mental arithmetic
- **Cognitive Process**: Extract clear numerical info → Apply one simple discount or condition → Multiply quantities → Compute final total
- **Difficulty Level**: Intermediate, designed for quick mental calculation (2 steps, maximum 3)

### Discourse Type & Structure
- **Format**: Transactional dialogue (e.g., ticket booking, ordering food, buying items)
- **Structure Pattern** (5 turns min, 10 turns max):
  1) Inquiry / need
  2) Unit price(s) stated (integers only)
  3) Discount/condition stated (integer-result only)
  4) Quantity confirmation (may repeat numbers once)
  5) **Payment action phrase** (no numbers) → END

### CRITICAL ANTI-LEAK GUARDRAILS
- **HARD BAN**: The **consumer's final payment amount** must **never** appear in the transcript.
- The transcript **must not** contain any utterance that computes/sums/quotes the total.
- The **last TWO turns must contain ZERO digits, currency symbols, or number words**.
- The customer **must not ask** "How much will it be?" / "총 얼마인가요?"류 질문.
- The clerk **must not** perform or verbalize any calculation.

### Language Specifications
- Transcript Length: 100–120 words (50–60 seconds)
- Sentence Complexity: Moderate (no long embeddings)
- Vocabulary: Everyday commercial
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "대화를 듣고, [남자/여자]가 지불할 금액을 고르시오."
- **Options**: 5 integer amounts, close in value
- **Option Spacing Rule**: All five options must differ from each other by at least 2.

**Required JSON Output Format:**
{
  "question": "대화를 듣고, [남자/여자]가 지불할 금액을 고르시오.",
  "transcript": "[100–120 word transactional dialogue; NO final total; last two turns contain no numerals.]",
  "options": ["$정수금액1", "$정수금액2", "$정수금액3", "$정수금액4", "$정수금액5"],
  "correct_answer": [1-5],
  "explanation": "[계산 과정을 단계별로 서술]"
}`,

  "LC07": `Create a CSAT Listening Item 7 (Reason Identification) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying specific reasons for inability to participate in events
- **Cognitive Process**: Track invitation → Identify refusal → Extract actual reason from multiple possibilities
- **Difficulty Level**: Intermediate comprehension requiring reason discrimination

### Discourse Type & Structure
- **Format**: Two-person dialogue about event participation
- **Structure Pattern**: Invitation/suggestion → Interest but inability → Reason exploration → Actual reason revelation
- **Content Flexibility**: Any social event or activity invitation scenario
- **Interaction Type**: Social invitation and polite refusal with explanation

### Language Specifications
- **Transcript Length**: 90-110 words (approximately 45-55 seconds)
- **Sentence Complexity**: Moderate with causal expressions and explanations
- **Vocabulary Level**: Social and explanatory vocabulary
- **Speech Rate**: Natural conversational pace with clear reason indicators
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "대화를 듣고, [남자/여자]가 [이벤트]에 갈 수 <u>없는</u> 이유를 고르시오."
- **Options**: 5 Korean reason statements using causal expressions
- **Correct Answer**: Must be the actual reason explicitly stated by the speaker
- **Distractors**: Suggested but rejected reasons, related but incorrect reasons, opposite situations

**Required JSON Output Format:**
{
  "question": "대화를 듣고, [남자/여자]가 [이벤트]에 갈 수 <u>없는</u> 이유를 고르시오.",
  "transcript": "[90-110 word invitation dialogue with M:/W: indicators]",
  "options": ["이유1때문에", "이유2해야 해서", "이유3때문에", "이유4해야 해서", "이유5때문에"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the reason]"
}`,

  "LC08": `Create a CSAT Listening Item 8 (Not Mentioned) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying information not mentioned in event-related dialogue
- **Cognitive Process**: Track mentioned information → Compare with options → Identify omissions
- **Difficulty Level**: Intermediate information tracking with systematic checking

### Discourse Type & Structure
- **Format**: Two-person dialogue about event information
- **Structure Pattern**: Event discovery → Information gathering → Detail confirmation → Additional inquiries
- **Content Flexibility**: Any event, program, or activity with multiple informational aspects
- **Interaction Type**: Information exchange and inquiry

### Language Specifications
- **Transcript Length**: 90-110 words (approximately 45-55 seconds)
- **Sentence Complexity**: Moderate with information-dense content
- **Vocabulary Level**: Informational and descriptive vocabulary
- **Speech Rate**: Natural pace with clear information delivery
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "대화를 듣고, [Event/Program/Activity in English]에 관해 언급되지 <u>않은</u> 것을 고르시오."
- **Options**: 5 Korean information categories related to the topic
- **Correct Answer**: Must be the information category not mentioned in the dialogue
- **Distractors**: Information categories explicitly mentioned in the dialogue

**Required JSON Output Format:**
{
  "question": "대화를 듣고, [Event/Program/Activity in English]에 관해 언급되지 <u>않은</u> 것을 고르시오.",
  "transcript": "[90-110 word information dialogue with M:/W: indicators]",
  "options": ["정보항목1", "정보항목2", "정보항목3", "정보항목4", "정보항목5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of what was not mentioned]"
}`,

  "LC09": `Create a CSAT Listening Item 9 (Content Mismatch) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying factual inconsistencies between monologue content and options
- **Cognitive Process**: Process announcement information → Compare with factual statements → Identify contradictions
- **Difficulty Level**: Intermediate factual verification with detailed information

### Discourse Type & Structure
- **Format**: Formal announcement monologue
- **Structure Pattern**: Introduction → Event details → Schedule information → Procedures → Additional information
- **Content Flexibility**: Any formal event or program announcement
- **Speaker Role**: Official announcer or event organizer

### Language Specifications
- **Transcript Length**: 110-130 words (approximately 55-65 seconds)
- **Sentence Complexity**: Moderate with detailed factual information
- **Vocabulary Level**: Formal and informational vocabulary
- **Speech Rate**: Clear, measured pace appropriate for announcements
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- **Stem**: "「{event_name}」에 관한 다음 내용을 듣고, 일치하지 <u>않는</u> 것을 고르시오."
- **Options**: 5 Korean factual statements about the announced content
- **Correct Answer**: Must be the statement that contradicts the announcement
- **Distractors**: Statements that accurately reflect the announcement content

**Required JSON Output Format:**
{
  "question": "「{event_name}」에 관한 다음 내용을 듣고, 일치하지 <u>않는</u> 것을 고르시오.",
  "transcript": "[110-130 word formal announcement in English]",
  "options": ["사실1", "사실2", "사실3", "사실4", "사실5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the contradiction]"
}`,

  "LC10": `Create a CSAT Listening Item 10 (Chart Information) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- Core Skill: Integrating auditory criteria with visual chart information for elimination and final selection
- Cognitive Process: Sequential elimination → Apply each criterion in order → Narrow down to final choice
- Difficulty Level: Intermediate multi-modal information integration

### Discourse Type & Structure
- Format: Two-person dialogue about selection from chart options
- Structure Pattern: Need identification → Chart consultation → Criteria specification → Step-by-step elimination → Final decision
- Content Flexibility: Any selection scenario with multiple criteria (products, services, options)
- Interaction Type: Collaborative decision-making with criteria application

### Language Specifications
- Transcript Length: 90-110 words (approximately 45-55 seconds)
- Sentence Complexity: Moderate with comparative and conditional expressions
- Vocabulary Level: Comparative and criteria-based vocabulary
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []

### Question Format Requirements
- Stem: "다음 표를 보면서 대화를 듣고, [화자]가 구입할 [상품]을 고르시오."
- Options: 5 chart entries representing different combinations of attributes
- Correct Answer: Must be the option that satisfies all stated criteria

### Chart Structure
- Chart: 5 items × 4 attributes
- Sequential Elimination: At each stage, exactly one option must be eliminated (5 → 4 → 3 → 2 → 1)

**Required JSON Output Format:**
{
  "item_type": "LC_CHART",
  "question": "다음 표를 보면서 대화를 듣고, [화자]가 구입할 [상품]을 고르시오.",
  "transcript": "[90-110 word dialogue with M:/W: indicators]",
  "chart_data": {
    "headers": ["Item", "Attribute 1", "Attribute 2", "Attribute 3", "Attribute 4"],
    "rows": [
      ["1", "...", "...", "...", "..."],
      ["2", "...", "...", "...", "..."],
      ["3", "...", "...", "...", "..."],
      ["4", "...", "...", "...", "..."],
      ["5", "...", "...", "...", "..."]
    ]
  },
  "options": ["1","2","3","4","5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation]"
}`,

  "LC11": `Create a CSAT Listening Item 11 (Short Response Inference) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Inferring appropriate responses to final statements in short dialogues
- **Cognitive Process**: Follow dialogue context → Analyze final statement → Select logical response
- **Difficulty Level**: Advanced contextual inference requiring pragmatic understanding

### Discourse Type & Structure
- **Format**: Brief two-person dialogue (2-3 exchanges)
- **Structure Pattern**: Situation setup → Problem/request → Final statement requiring response
- **Content Flexibility**: Any everyday situation requiring immediate, contextually appropriate responses
- **Interaction Type**: Problem-solving, request-response, or social interaction

### Language Specifications
- **Transcript Length**: 60-80 words (approximately 30-40 seconds)
- **Sentence Complexity**: Simple to moderate with clear contextual cues
- **Vocabulary Level**: Everyday conversational vocabulary
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []

### Formatting Instructions for Transcript
- 대화문은 M: (남자 화자), W: (여자 화자) 표기를 사용한다.
- 남자가 먼저 말하고, 여자가 마지막에 말하며, 그 마지막 발화가 문제에서 응답해야 하는 대상이 된다.

### Question Format Requirements
- **Stem**: "대화를 듣고, 남자의 마지막 말에 대한 여자의 응답으로 가장 적절한 것을 고르시오. [3점]"
- **Options**: 5 English response options
- **Correct Answer**: Must be the most contextually appropriate and natural response
- **Distractors**: Contextually inappropriate, logically inconsistent, or socially awkward responses

**Required JSON Output Format:**
{
  "question": "대화를 듣고, [화자]의 마지막 말에 대한 [상대방]의 응답으로 가장 적절한 것을 고르시오. [3점]",
  "transcript": "[60-80 word short dialogue with M:/W: indicators]",
  "options": ["Response 1", "Response 2", "Response 3", "Response 4", "Response 5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of why the response is appropriate]"
}`,

  "LC12": `Create a CSAT Listening Item 12 (Short Response Inference) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Inferring appropriate responses to final statements in short dialogues
- **Cognitive Process**: Follow dialogue context → Analyze final statement → Select logical response
- **Difficulty Level**: Intermediate contextual inference with clear response patterns

### Discourse Type & Structure
- **Format**: Brief two-person dialogue (2-3 exchanges)
- **Structure Pattern**: Proposal → Concern expression → Reassurance → Response needed
- **Content Flexibility**: Any situation involving initial hesitation followed by reassurance
- **Interaction Type**: Invitation acceptance after concern resolution

### Language Specifications
- **Transcript Length**: 50-70 words (approximately 25-35 seconds)
- **Sentence Complexity**: Simple with clear reassurance patterns
- **Vocabulary Level**: Basic conversational vocabulary
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []

### Transcript Formatting Instructions
- 여자가 먼저 말하고, 마지막 발화도 반드시 여자의 대사(W:)로 끝난다.
- 남자의 응답은 transcript에 포함하지 않으며, 보기가 남자의 응답 후보가 된다.

### Question Format Requirements
- **Stem**: "대화를 듣고, 여자의 마지막 말에 대한 남자의 응답으로 가장 적절한 것을 고르시오."
- **Options**: 5 English response options
- **Correct Answer**: Must show acceptance after reassurance

**Required JSON Output Format:**
{
  "question": "대화를 듣고, [화자]의 마지막 말에 대한 [상대방]의 응답으로 가장 적절한 것을 고르시오.",
  "transcript": "[50-70 word dialogue ending with W: line]",
  "options": ["Response 1", "Response 2", "Response 3", "Response 4", "Response 5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the response logic]"
}`,

  "LC13": `Create a CSAT Listening Item 13 (Long Response Inference) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Inferring appropriate responses in extended dialogue contexts
- **Cognitive Process**: Track extended conversation → Understand contribution context → Select appreciative response
- **Difficulty Level**: Intermediate contextual inference with extended dialogue tracking

### Discourse Type & Structure
- **Format**: Extended two-person dialogue
- **Turn Pattern**: Exactly **9 turns total** → M: 5 times, W: 4 times
- **Structure Pattern**: Contact → Proposal → Interest → Contribution offer → Acceptance → Response needed
- **Content Flexibility**: Any collaborative or charitable activity scenario
- **Interaction Type**: Voluntary contribution and appreciation

### Language Specifications
- **Transcript Length**: 100-120 words (approximately 50-60 seconds)
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []

### Transcript Formatting Instructions
- 총 **9턴**: 남자(M) 5회, 여자(W) 4회.
- 마지막 발화는 반드시 **M:으로 끝나야** 하며, 여자의 최종 응답은 transcript에 포함하지 않는다.

### Question Format Requirements
- **Stem**: "대화를 듣고, 남자의 마지막 말에 대한 여자의 응답으로 가장 적절한 것을 고르시오."
- **Options**: 5 English response options
- **Correct Answer**: Must express appreciation and encouragement for the contribution

**Required JSON Output Format:**
{
  "question": "대화를 듣고, 남자의 마지막 말에 대한 여자의 응답으로 가장 적절한 것을 고르시오.",
  "transcript": "[100-120 word extended dialogue with exactly 9 turns (M:5, W:4), ending with M:]",
  "options": ["(Woman's response) 1", "(Woman's response) 2", "(Woman's response) 3", "(Woman's response) 4", "(Woman's response) 5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation]"
}`,

  "LC14": `Create a CSAT Listening Item 14 (Long Response Inference) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Inferring appropriate responses in complex extended dialogues
- **Cognitive Process**: Track complex conversation → Understand scheduling context → Select appropriate response
- **Difficulty Level**: Advanced contextual inference with complex dialogue tracking

### Discourse Type & Structure
- **Format**: Extended two-person dialogue
- **Scenario Type**: Professional **telephone conversation**
- **Turn Pattern**: Exactly **9 turns total** → W: 5 times, M: 4 times
- **Structure Pattern**: Request → Acceptance → Scheduling conflict → Coordination → Promise → Response needed
- **Interaction Type**: Professional scheduling and commitment

### Language Specifications
- **Transcript Length**: 120-140 words (approximately 60-70 seconds)
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []

### Transcript Formatting Instructions
- 총 **9턴**: 여자(W) 5회, 남자(M) 4회.
- 마지막 발화는 반드시 **W:**로 끝나야 하며, 남자의 최종 응답은 transcript에 포함하지 않는다.
- 상황은 반드시 **전화 통화**여야 한다.

### Question Format Requirements
- **Stem**: "대화를 듣고, 여자의 마지막 말에 대한 남자의 응답으로 가장 적절한 것을 고르시오. [3점]"
- **Options**: 5 English response options
- **Correct Answer**: Must express hope and positive expectation for the promised response

**Required JSON Output Format:**
{
  "question": "대화를 듣고, 여자의 마지막 말에 대한 남자의 응답으로 가장 적절한 것을 고르시오. [3점]",
  "transcript": "[120-140 word professional telephone dialogue with exactly 9 turns (W:5, M:4), ending with W:]",
  "options": ["(Man's response) 1", "(Man's response) 2", "(Man's response) 3", "(Man's response) 4", "(Man's response) 5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation]"
}`,

  "LC15": `Create a CSAT Listening Item 15 (Situational Response) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Selecting appropriate utterances for complex situational contexts
- **Cognitive Process**: Analyze complex situation → Understand speaker motivation → Select optimal expression
- **Difficulty Level**: Advanced situational inference requiring deep contextual understanding

### Discourse Type & Structure
- **Format**: Situational description monologue
- **Structure Pattern**: Background → Initial plan → Complication → Experience factor → Advice motivation → Utterance selection
- **Content Flexibility**: Any advice-giving situation based on experience and expertise
- **Speaker Role**: Experienced advisor offering guidance based on personal knowledge

### Language Specifications
- **Transcript Length**: 140-160 words (approximately 70-80 seconds)
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []

### Transcript Formatting Instructions
- transcript의 마지막 문장은 반드시 다음 영어 문장으로 끝난다:
  "In this situation, what would [화자] most likely to say to [상대방]?"

### Question Format Requirements
- **Stem**: "다음 상황 설명을 듣고, [화자]가 [상대방]에게 할 말로 가장 적절한 것을 고르시오. [3점]"
- **Options**: 5 English utterance options
- **Correct Answer**: Must be the most contextually appropriate and helpful utterance

**Required JSON Output Format:**
{
  "question": "다음 상황 설명을 듣고, [화자]가 [상대방]에게 할 말로 가장 적절한 것을 고르시오. [3점]",
  "transcript": "[140-160 word situational description ending with the required final line]",
  "options": ["Utterance 1", "Utterance 2", "Utterance 3", "Utterance 4", "Utterance 5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the situational appropriateness]"
}`,

  "LC16_17": `Create a CSAT Listening Item 16-17 (Long Listening Set) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Dual assessment - topic identification and detail tracking in extended monologue
- **Cognitive Process**: Process extended content → Extract main topic → Track specific details → Dual evaluation
- **Difficulty Level**: Advanced extended listening with dual assessment requirements

### Discourse Type & Structure
- **Format**: Extended informational monologue
- **Structure Pattern**: Introduction → Topic establishment → Systematic enumeration → Detail explanation → Conclusion
- **Content Flexibility**: Any academic or informational topic with categorizable elements
- **Speaker Role**: Educator, expert, or informational presenter

### Language Specifications
- **Transcript Length**: 180-220 words (approximately 90-110 seconds)
- **Vocabulary Profile**:
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []

### Question Format Requirements
- **Item 16 Stem**: "[화자]가 하는 말의 주제로 가장 적절한 것은?"
- **Item 17 Stem**: "언급된 [항목 유형]이 <u>아닌</u> 것은?"
- **Options**: 5 English options for each question

**Required JSON Output Format:**
{
  "set_instruction": "[16~17] 다음을 듣고, 물음에 답하시오.",
  "transcript": "[180-220 word academic monologue in English]",
  "questions": [
    {
      "question_number": 16,
      "question": "[화자]가 하는 말의 주제로 가장 적절한 것은?",
      "options": ["topic1", "topic2", "topic3", "topic4", "topic5"],
      "correct_answer": [1-5],
      "explanation": "[Korean explanation of the topic]"
    },
    {
      "question_number": 17,
      "question": "언급된 [항목 유형]이 <u>아닌</u> 것은?",
      "options": ["item1", "item2", "item3", "item4", "item5"],
      "correct_answer": [1-5],
      "explanation": "[Korean explanation of what was not mentioned]"
    }
  ]
}`,

  // ========== 독해 문항 (RC18-RC45) ==========
  "RC18": `Create a CSAT Reading Item 18 (Purpose Identification) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying the primary communicative purpose of a formal notice or announcement
- **Cognitive Process**: Analyze background situation → Trace cause and anticipated outcomes → Infer the writer's main intent → Match with the most accurate purpose option
- **Difficulty Target**: 중상 (예상 정답률 81–95%, 변별도 0.1–0.2)

### Abstractness & Complexity Controls
- **Abstractness Level (1–9)**: 3
- **Vocabulary Profile**: CSAT+O3000

### Text Type & Structure
- **Format**: Official notice, public letter, or announcement
- **Structure Pattern (mandatory 5-step logic)**:
  A. 상황 설명 (Context Setup) →
  B. 원인 설명 (Cause/Reason) →
  C. 기대 내용 (Expected outcome/anticipation) →
  D. 결론 (Key decision/action) →
  E. 정서적 마무리 (Closure: thanks/request/next steps)
- **Purpose Location Strategy**: The main communicative intent must become fully clear only in D–E after A–C build-up.

### Language Specifications
- **Passage Length**: 130-160 words
- **Sentence Complexity**: Moderate (2-3 clauses per sentence)
- **Vocabulary Level**: Formal, institutional vocabulary

### Question Format Requirements
- **Stem**: "다음 글의 목적으로 가장 적절한 것은?"
- **Options**: 5 Korean purpose statements
- **Correct Answer**: Must reflect the writer's primary communicative intent

**Required JSON Output Format:**
{
  "question": "다음 글의 목적으로 가장 적절한 것은?",
  "stimulus": "[130-160 word formal notice in English]",
  "options": ["목적1", "목적2", "목적3", "목적4", "목적5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation]",
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []
}`,

  "RC19": `Create a CSAT Reading Item 19 (Mood/Atmosphere Identification) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying the emotional atmosphere of narrative passages
- **Cognitive Process**: Process narrative details → Identify emotional indicators → Determine dominant mood
- **Difficulty Target**: 중상 (예상 정답률 81–95%)

### Text Type & Structure
- **Format**: Narrative passage with strong atmospheric elements
- **Structure Pattern**: Setting description → Character actions → Emotional climax → Resolution
- **Mood Expression**: Through sensory details, character reactions, and descriptive language

### Language Specifications
- **Passage Length**: 150-180 words
- **Sentence Complexity**: Varied for narrative effect
- **Vocabulary Level**: Literary and descriptive vocabulary

### Question Format Requirements
- **Stem**: "다음 글에 드러난 'I'의 심경으로 가장 적절한 것은?" or "다음 글의 분위기로 가장 적절한 것은?"
- **Options**: 5 Korean mood/emotion descriptors (adjective pairs)
- **Correct Answer**: Must accurately reflect the dominant emotional tone

**Required JSON Output Format:**
{
  "question": "다음 글에 드러난 'I'의 심경으로 가장 적절한 것은?",
  "stimulus": "[150-180 word narrative passage in English]",
  "options": ["심경1 → 심경2", "심경1 → 심경2", "심경1 → 심경2", "심경1 → 심경2", "심경1 → 심경2"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the mood indicators]",
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []
}`,

  "RC20": `Create a CSAT Reading Item 20 (Writer's Claim/Opinion) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying the writer's main claim or opinion in argumentative text
- **Cognitive Process**: Analyze argument structure → Identify thesis → Extract main claim
- **Difficulty Target**: 중 (예상 정답률 70–85%)

### Text Type & Structure
- **Format**: Opinion/argumentative essay excerpt
- **Structure Pattern**: Hook → Thesis statement → Supporting arguments → Conclusion/Restatement
- **Claim Expression**: Clear position on debatable topic with supporting reasoning

### Language Specifications
- **Passage Length**: 140-170 words
- **Sentence Complexity**: Moderate with logical connectors
- **Vocabulary Level**: Academic and argumentative vocabulary

### Question Format Requirements
- **Stem**: "다음 글에서 필자가 주장하는 바로 가장 적절한 것은?"
- **Options**: 5 Korean claim statements
- **Correct Answer**: Must reflect the writer's central argument

**Required JSON Output Format:**
{
  "question": "다음 글에서 필자가 주장하는 바로 가장 적절한 것은?",
  "stimulus": "[140-170 word argumentative passage in English]",
  "options": ["주장1", "주장2", "주장3", "주장4", "주장5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the claim]",
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []
}`,

  "RC21": `Create a CSAT Reading Item 21 (Implied Meaning) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Understanding implied or indirect meanings in context
- **Cognitive Process**: Analyze context → Interpret figurative/idiomatic expressions → Infer implied meaning
- **Difficulty Target**: 중상 (예상 정답률 65–80%)

### Text Type & Structure
- **Format**: Narrative or expository with underlined expression
- **Structure Pattern**: Context setup → Expression in context → Supporting details
- **Expression Type**: Figurative language, idioms, or context-dependent meanings

### Language Specifications
- **Passage Length**: 130-160 words
- **Sentence Complexity**: Moderate with context clues
- **Vocabulary Level**: Mix of literal and figurative language

### Question Format Requirements
- **Stem**: "밑줄 친 [expression]이 다음 글에서 의미하는 바로 가장 적절한 것은?"
- **Options**: 5 Korean interpretation statements
- **Correct Answer**: Must capture the contextual meaning of the underlined expression

**Required JSON Output Format:**
{
  "question": "밑줄 친 [expression]이 다음 글에서 의미하는 바로 가장 적절한 것은?",
  "stimulus": "[130-160 word passage with underlined expression in English]",
  "options": ["의미1", "의미2", "의미3", "의미4", "의미5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the implied meaning]",
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []
}`,

  "RC22": `Create a CSAT Reading Item 22 (Main Idea/Gist) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying the main idea or central theme of expository text
- **Cognitive Process**: Process paragraph structure → Identify topic sentences → Synthesize main idea
- **Difficulty Target**: 중 (예상 정답률 75–90%)

### Text Type & Structure
- **Format**: Expository paragraph with clear topic development
- **Structure Pattern**: Topic introduction → Development → Examples → Conclusion
- **Main Idea Location**: Typically in topic sentence or synthesized from multiple sentences

### Language Specifications
- **Passage Length**: 140-170 words
- **Sentence Complexity**: Moderate with clear logical flow
- **Vocabulary Level**: Academic vocabulary appropriate for topic

### Question Format Requirements
- **Stem**: "다음 글의 요지로 가장 적절한 것은?"
- **Options**: 5 Korean main idea statements
- **Correct Answer**: Must capture the essential message of the passage

**Required JSON Output Format:**
{
  "question": "다음 글의 요지로 가장 적절한 것은?",
  "stimulus": "[140-170 word expository passage in English]",
  "options": ["요지1", "요지2", "요지3", "요지4", "요지5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the main idea]",
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []
}`,

  "RC23": `Create a CSAT Reading Item 23 (Topic Identification) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying the topic or subject matter of a passage
- **Cognitive Process**: Scan for recurring themes → Identify central subject → Match with topic options
- **Difficulty Target**: 중 (예상 정답률 75–90%)

### Text Type & Structure
- **Format**: Expository or informational text
- **Structure Pattern**: Introduction → Topic development → Supporting details → Conclusion
- **Topic Expression**: Through repeated references, key terms, and thematic consistency

### Language Specifications
- **Passage Length**: 130-160 words
- **Sentence Complexity**: Moderate with clear topic markers
- **Vocabulary Level**: Topic-specific vocabulary

### Question Format Requirements
- **Stem**: "다음 글의 주제로 가장 적절한 것은?"
- **Options**: 5 English topic phrases
- **Correct Answer**: Must accurately identify the central subject matter

**Required JSON Output Format:**
{
  "question": "다음 글의 주제로 가장 적절한 것은?",
  "stimulus": "[130-160 word expository passage in English]",
  "options": ["topic phrase 1", "topic phrase 2", "topic phrase 3", "topic phrase 4", "topic phrase 5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the topic]",
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []
}`,

  "RC24": `Create a CSAT Reading Item 24 (Title Selection) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Selecting the most appropriate title for a passage
- **Cognitive Process**: Comprehend main idea → Evaluate title options → Select most representative title
- **Difficulty Target**: 중 (예상 정답률 70–85%)

### Text Type & Structure
- **Format**: Expository or argumentative text
- **Structure Pattern**: Clear thesis → Development → Conclusion
- **Title Criteria**: Accurate, concise, engaging representation of content

### Language Specifications
- **Passage Length**: 140-170 words
- **Sentence Complexity**: Moderate with clear thematic development
- **Vocabulary Level**: Academic vocabulary

### Question Format Requirements
- **Stem**: "다음 글의 제목으로 가장 적절한 것은?"
- **Options**: 5 English title options
- **Correct Answer**: Must be the most accurate and representative title

**Required JSON Output Format:**
{
  "question": "다음 글의 제목으로 가장 적절한 것은?",
  "stimulus": "[140-170 word passage in English]",
  "options": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of title selection]",
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []
}`,

  "RC29": `Create a CSAT Reading Item 29 (Grammar - Error Identification) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying grammatically incorrect usage among underlined options
- **Cognitive Process**: Analyze each underlined element → Apply grammar rules → Identify error
- **Difficulty Target**: 중상 (예상 정답률 60–75%)

### Text Type & Structure
- **Format**: Expository passage with 5 underlined grammatical elements
- **Structure Pattern**: Coherent paragraph with natural grammar points
- **Grammar Points**: Mix of verb forms, pronouns, modifiers, conjunctions, etc.

### Language Specifications
- **Passage Length**: 140-170 words
- **Sentence Complexity**: Varied to showcase different grammar structures
- **Underlined Elements**: 5 numbered elements, exactly 1 incorrect

### Question Format Requirements
- **Stem**: "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?"
- **Options**: References to 5 underlined elements (①, ②, ③, ④, ⑤)
- **Correct Answer**: Must be the grammatically incorrect element

**Required JSON Output Format:**
{
  "question": "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?",
  "stimulus": "[140-170 word passage with 5 underlined elements marked as ①, ②, ③, ④, ⑤]",
  "options": ["①", "②", "③", "④", "⑤"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the grammar error and correction]",
  "grammar_meta": [
    {"index": 1, "is_correct": true, "grammar_point": "...", "explanation": "..."},
    {"index": 2, "is_correct": false, "grammar_point": "...", "explanation": "...", "correction": "..."},
    ...
  ],
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []
}`,

  "RC30": `Create a CSAT Reading Item 30 (Vocabulary - Inappropriate Word) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying contextually inappropriate vocabulary usage
- **Cognitive Process**: Analyze context → Evaluate word choices → Identify misfit
- **Difficulty Target**: 중상 (예상 정답률 60–75%)

### Text Type & Structure
- **Format**: Expository passage with 5 underlined vocabulary items
- **Structure Pattern**: Coherent paragraph with natural vocabulary usage
- **Vocabulary Points**: Mix of verbs, adjectives, adverbs, nouns

### Language Specifications
- **Passage Length**: 140-170 words
- **Sentence Complexity**: Moderate with clear context clues
- **Underlined Elements**: 5 numbered words, exactly 1 contextually inappropriate

### Question Format Requirements
- **Stem**: "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?"
- **Options**: References to 5 underlined words (①, ②, ③, ④, ⑤)
- **Correct Answer**: Must be the contextually inappropriate word

**Required JSON Output Format:**
{
  "question": "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?",
  "stimulus": "[140-170 word passage with 5 underlined words marked as ①, ②, ③, ④, ⑤]",
  "options": ["①", "②", "③", "④", "⑤"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of why the word is inappropriate and what should be used]",
  "vocabulary_meta": [
    {"index": 1, "word": "...", "is_appropriate": true, "explanation": "..."},
    {"index": 2, "word": "...", "is_appropriate": false, "explanation": "...", "better_word": "..."},
    ...
  ],
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []
}`,

  "RC31": `Create a CSAT Reading Item 31 (Blank Filling - Short Phrase) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Selecting appropriate phrase to complete a logical gap
- **Cognitive Process**: Analyze passage logic → Identify gap function → Select fitting phrase
- **Difficulty Target**: 상 (예상 정답률 50–65%)

### Text Type & Structure
- **Format**: Expository passage with one blank for a short phrase
- **Structure Pattern**: Logical argument with clear gap for completion
- **Blank Function**: Key phrase that completes the argument or transition

### Language Specifications
- **Passage Length**: 150-180 words
- **Sentence Complexity**: Moderate to complex
- **Blank Position**: Strategic position requiring logical inference

### Question Format Requirements
- **Stem**: "다음 빈칸에 들어갈 말로 가장 적절한 것은? [3점]"
- **Options**: 5 English phrase options
- **Correct Answer**: Must logically and contextually fit the blank

**Required JSON Output Format:**
{
  "question": "다음 빈칸에 들어갈 말로 가장 적절한 것은? [3점]",
  "stimulus": "[150-180 word passage with blank marked as _________ in English]",
  "options": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the blank-filling logic]",
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []
}`,

  "RC32": `Create a CSAT Reading Item 32 (Blank Filling - Short Phrase) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Selecting appropriate phrase to complete a logical gap
- **Cognitive Process**: Analyze passage logic → Identify gap function → Select fitting phrase
- **Difficulty Target**: 상 (예상 정답률 50–65%)

### Text Type & Structure
- **Format**: Expository passage with one blank for a short phrase
- **Structure Pattern**: Logical argument with clear gap for completion
- **Blank Function**: Key phrase that completes the argument or transition

### Language Specifications
- **Passage Length**: 150-180 words
- **Sentence Complexity**: Moderate to complex
- **Vocabulary Profile**: CSAT+O3000

### Question Format Requirements
- **Stem**: "다음 빈칸에 들어갈 말로 가장 적절한 것은?"
- **Options**: 5 English phrase options
- **Correct Answer**: Must logically and contextually fit the blank

**Required JSON Output Format:**
{
  "question": "다음 빈칸에 들어갈 말로 가장 적절한 것은?",
  "stimulus": "[150-180 word passage with blank marked as _________ in English]",
  "options": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation]",
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []
}`,

  "RC33": `Create a CSAT Reading Item 33 (Blank Filling - Long Phrase/Clause) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Selecting appropriate clause or long phrase to complete complex argument
- **Cognitive Process**: Deep comprehension → Logical inference → Clause selection
- **Difficulty Target**: 최상 (예상 정답률 35–50%, 킬러 문항)

### Text Type & Structure
- **Format**: Complex expository passage with one blank for a clause
- **Structure Pattern**: Abstract argument requiring deep inference
- **Blank Function**: Critical clause that captures the main argument or conclusion

### Language Specifications
- **Passage Length**: 160-200 words
- **Sentence Complexity**: Complex with abstract concepts
- **Vocabulary Profile**: AWL (Academic Word List)

### Question Format Requirements
- **Stem**: "다음 빈칸에 들어갈 말로 가장 적절한 것은? [3점]"
- **Options**: 5 English clause options (longer than RC31/32)
- **Correct Answer**: Must capture the logical conclusion or key insight

**Required JSON Output Format:**
{
  "question": "다음 빈칸에 들어갈 말로 가장 적절한 것은? [3점]",
  "stimulus": "[160-200 word complex passage with blank in English]",
  "options": ["clause 1", "clause 2", "clause 3", "clause 4", "clause 5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the complex inference]",
  "vocabulary_difficulty": "AWL",
  "low_frequency_words": []
}`,

  "RC34": `Create a CSAT Reading Item 34 (Blank Filling - Double Blanks) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Selecting appropriate word pairs to complete two related blanks
- **Cognitive Process**: Analyze relationship between blanks → Identify logical pair → Select fitting combination
- **Difficulty Target**: 상 (예상 정답률 45–60%)

### Text Type & Structure
- **Format**: Expository passage with two blanks (A) and (B)
- **Structure Pattern**: Parallel or contrasting structure requiring paired completion
- **Blank Relationship**: Complementary, contrasting, or cause-effect pairs

### Language Specifications
- **Passage Length**: 150-180 words
- **Sentence Complexity**: Moderate to complex
- **Vocabulary Profile**: CSAT+O3000

### Question Format Requirements
- **Stem**: "다음 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?"
- **Options**: 5 pairs of words in format "(A) — (B)"
- **Correct Answer**: Must be the pair that fits both blanks logically

**Required JSON Output Format:**
{
  "question": "다음 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?",
  "stimulus": "[150-180 word passage with blanks marked as (A) and (B) in English]",
  "options": ["(A) word1 — (B) word1", "(A) word2 — (B) word2", "(A) word3 — (B) word3", "(A) word4 — (B) word4", "(A) word5 — (B) word5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the word pair logic]",
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []
}`,

  "RC35": `Create a CSAT Reading Item 35 (Irrelevant Sentence) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying the sentence that does not belong in the paragraph
- **Cognitive Process**: Analyze paragraph unity → Identify topic → Find deviation
- **Difficulty Target**: 중상 (예상 정답률 60–75%)

### Text Type & Structure
- **Format**: Expository paragraph with 5 numbered sentences
- **Structure Pattern**: Unified paragraph with one off-topic sentence
- **Irrelevant Sentence**: Related to general topic but deviates from specific focus

### Language Specifications
- **Passage Length**: 140-170 words
- **Sentence Complexity**: Moderate with clear topic development
- **Vocabulary Profile**: CSAT

### Question Format Requirements
- **Stem**: "다음 글에서 전체 흐름과 관계 없는 문장은?"
- **Options**: References to 5 numbered sentences (①, ②, ③, ④, ⑤)
- **Correct Answer**: Must be the sentence that breaks paragraph unity

**Required JSON Output Format:**
{
  "question": "다음 글에서 전체 흐름과 관계 없는 문장은?",
  "stimulus": "[140-170 word passage with 5 numbered sentences ①②③④⑤ in English]",
  "options": ["①", "②", "③", "④", "⑤"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of why the sentence is irrelevant]",
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []
}`,

  "RC36": `Create a CSAT Reading Item 36 (Sentence Ordering) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Arranging sentences in logical order to form coherent paragraph
- **Cognitive Process**: Analyze cohesive devices → Identify logical sequence → Order sentences
- **Difficulty Target**: 중상 (예상 정답률 55–70%)

### Text Type & Structure
- **Format**: Topic sentence + 3 scrambled sentences (A), (B), (C)
- **Structure Pattern**: Clear logical progression with cohesive devices
- **Cohesion Markers**: Pronouns, connectors, time/sequence markers

### Language Specifications
- **Passage Length**: 130-160 words total
- **Sentence Complexity**: Moderate with clear connections
- **Vocabulary Profile**: CSAT

### Question Format Requirements
- **Stem**: "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?"
- **Options**: 5 ordering options like "(A)-(C)-(B)", "(B)-(A)-(C)", etc.
- **Correct Answer**: Must be the most logical sequence

**Required JSON Output Format:**
{
  "question": "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?",
  "stimulus": {
    "intro": "[Topic sentence in English]",
    "sentences": {
      "A": "[Sentence A in English]",
      "B": "[Sentence B in English]",
      "C": "[Sentence C in English]"
    }
  },
  "options": ["(A)-(C)-(B)", "(B)-(A)-(C)", "(B)-(C)-(A)", "(C)-(A)-(B)", "(C)-(B)-(A)"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the ordering logic]",
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []
}`,

  "RC37": `Create a CSAT Reading Item 37 (Sentence Ordering) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Arranging sentences in logical order to form coherent paragraph
- **Cognitive Process**: Analyze cohesive devices → Identify logical sequence → Order sentences
- **Difficulty Target**: 중상 (예상 정답률 55–70%)

### Text Type & Structure
- **Format**: Topic sentence + 3 scrambled sentences (A), (B), (C)
- **Structure Pattern**: Clear logical progression with cohesive devices
- **Cohesion Markers**: Pronouns, connectors, time/sequence markers

### Language Specifications
- **Passage Length**: 140-170 words total
- **Sentence Complexity**: Moderate to complex
- **Vocabulary Profile**: CSAT+O3000

### Question Format Requirements
- **Stem**: "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?"
- **Options**: 5 ordering options
- **Correct Answer**: Must be the most logical sequence

**Required JSON Output Format:**
{
  "question": "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?",
  "stimulus": {
    "intro": "[Topic sentence in English]",
    "sentences": {
      "A": "[Sentence A in English]",
      "B": "[Sentence B in English]",
      "C": "[Sentence C in English]"
    }
  },
  "options": ["(A)-(C)-(B)", "(B)-(A)-(C)", "(B)-(C)-(A)", "(C)-(A)-(B)", "(C)-(B)-(A)"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation]",
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []
}`,

  "RC38": `Create a CSAT Reading Item 38 (Sentence Insertion) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying the correct position to insert a given sentence
- **Cognitive Process**: Analyze given sentence → Identify cohesive links → Find insertion point
- **Difficulty Target**: 중상 (예상 정답률 55–70%)

### Text Type & Structure
- **Format**: Passage with 5 potential insertion points marked ①②③④⑤
- **Structure Pattern**: Coherent paragraph with one optimal insertion point
- **Given Sentence**: Contains clear cohesive devices linking to context

### Language Specifications
- **Passage Length**: 140-170 words
- **Sentence Complexity**: Moderate with clear flow
- **Vocabulary Profile**: CSAT

### Question Format Requirements
- **Stem**: "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?"
- **Given Sentence**: Displayed before the passage
- **Options**: Position markers ①, ②, ③, ④, ⑤
- **Correct Answer**: Must be the position where the sentence best fits

**Required JSON Output Format:**
{
  "question": "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?",
  "given_sentence": "[Sentence to be inserted in English]",
  "stimulus": "[140-170 word passage with insertion points ①②③④⑤ in English]",
  "options": ["①", "②", "③", "④", "⑤"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation of the insertion logic]",
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []
}`,

  "RC39": `Create a CSAT Reading Item 39 (Sentence Insertion) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Identifying the correct position to insert a given sentence
- **Cognitive Process**: Analyze given sentence → Identify cohesive links → Find insertion point
- **Difficulty Target**: 상 (예상 정답률 50–65%)

### Text Type & Structure
- **Format**: Passage with 5 potential insertion points marked ①②③④⑤
- **Structure Pattern**: Complex paragraph with one optimal insertion point
- **Given Sentence**: Contains cohesive devices requiring careful analysis

### Language Specifications
- **Passage Length**: 150-180 words
- **Sentence Complexity**: Moderate to complex
- **Vocabulary Profile**: CSAT+O3000

### Question Format Requirements
- **Stem**: "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?"
- **Options**: Position markers ①, ②, ③, ④, ⑤
- **Correct Answer**: Must be the optimal position

**Required JSON Output Format:**
{
  "question": "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?",
  "given_sentence": "[Sentence to be inserted in English]",
  "stimulus": "[150-180 word passage with insertion points in English]",
  "options": ["①", "②", "③", "④", "⑤"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation]",
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []
}`,

  "RC40": `Create a CSAT Reading Item 40 (Summary Completion) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Completing a summary by selecting appropriate word pairs
- **Cognitive Process**: Comprehend passage → Analyze summary → Select fitting words
- **Difficulty Target**: 중상 (예상 정답률 55–70%)

### Text Type & Structure
- **Format**: Expository passage + summary with two blanks (A), (B)
- **Structure Pattern**: Passage presents main idea, summary condenses it
- **Summary Function**: Accurate condensation of passage content

### Language Specifications
- **Passage Length**: 160-200 words
- **Summary Length**: 40-60 words
- **Vocabulary Profile**: CSAT+O3000

### Question Format Requirements
- **Stem**: "다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?"
- **Options**: 5 pairs of words "(A) — (B)"
- **Correct Answer**: Must accurately complete the summary

**Required JSON Output Format:**
{
  "question": "다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?",
  "stimulus": "[160-200 word passage in English]",
  "summary": "[Summary sentence with blanks (A) and (B) in English]",
  "options": ["(A) word1 — (B) word1", "(A) word2 — (B) word2", "(A) word3 — (B) word3", "(A) word4 — (B) word4", "(A) word5 — (B) word5"],
  "correct_answer": [1-5],
  "explanation": "[Korean explanation]",
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []
}`,

  "RC41_42": `Create a CSAT Reading Item 41-42 (Long Passage Set - Title + Content Match) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Dual assessment - title selection and content matching for long passage
- **Cognitive Process**: Comprehend extended text → Identify main theme → Verify details
- **Difficulty Target**: 중 (예상 정답률 70–85%)

### Text Type & Structure
- **Format**: Extended passage (biography, narrative, or informational)
- **Structure Pattern**: Introduction → Development → Details → Conclusion
- **Content**: Rich with both thematic and factual information

### Language Specifications
- **Passage Length**: 250-300 words
- **Sentence Complexity**: Varied
- **Vocabulary Profile**: CSAT

### Question Format Requirements
- **Item 41**: Title selection - "위 글의 제목으로 가장 적절한 것은?"
- **Item 42**: Content match - "위 글의 [주제]에 관한 내용과 일치하지 않는 것은?"

**Required JSON Output Format:**
{
  "set_instruction": "[41~42] 다음 글을 읽고, 물음에 답하시오.",
  "stimulus": "[250-300 word passage in English]",
  "questions": [
    {
      "question_number": 41,
      "question": "위 글의 제목으로 가장 적절한 것은?",
      "options": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"],
      "correct_answer": [1-5],
      "explanation": "[Korean explanation]"
    },
    {
      "question_number": 42,
      "question": "위 글의 [주제]에 관한 내용과 일치하지 않는 것은?",
      "options": ["사실1", "사실2", "사실3", "사실4", "사실5"],
      "correct_answer": [1-5],
      "explanation": "[Korean explanation]"
    }
  ],
  "vocabulary_difficulty": "CSAT",
  "low_frequency_words": []
}`,

  "RC43_45": `Create a CSAT Reading Item 43-45 (Long Passage Set - Order + Insertion + Vocabulary) following these specifications:

## ITEM CHARACTERISTICS & METHODOLOGY

### Assessment Objective
- **Core Skill**: Triple assessment - sentence ordering, sentence insertion, and vocabulary
- **Cognitive Process**: Complex text analysis requiring multiple reading skills
- **Difficulty Target**: 상 (예상 정답률 50–65%)

### Text Type & Structure
- **Format**: Extended passage with scrambled sections
- **Structure Pattern**: Given intro + 3 scrambled paragraphs (A), (B), (C)
- **Complexity**: Requires understanding of both macro and micro structure

### Language Specifications
- **Passage Length**: 280-350 words total
- **Sentence Complexity**: Complex with sophisticated cohesion
- **Vocabulary Profile**: CSAT+O3000 or AWL

### Question Format Requirements
- **Item 43**: Ordering - "주어진 글 (A)에 이어질 내용을 순서에 맞게 배열한 것으로 가장 적절한 것은?"
- **Item 44**: Insertion - "밑줄 친 (a)~(e) 중에서 가리키는 대상이 나머지 넷과 다른 것은?"
- **Item 45**: Content match - "윗글에 관한 내용으로 적절하지 않은 것은?"

**Required JSON Output Format:**
{
  "set_instruction": "[43~45] 다음 글을 읽고, 물음에 답하시오.",
  "stimulus": {
    "intro": "[Given introduction paragraph in English]",
    "paragraphs": {
      "A": "[Paragraph A in English]",
      "B": "[Paragraph B in English]",
      "C": "[Paragraph C in English]"
    }
  },
  "questions": [
    {
      "question_number": 43,
      "question": "주어진 글 (A)에 이어질 내용을 순서에 맞게 배열한 것으로 가장 적절한 것은?",
      "options": ["(A)-(C)-(B)", "(B)-(A)-(C)", "(B)-(C)-(A)", "(C)-(A)-(B)", "(C)-(B)-(A)"],
      "correct_answer": [1-5],
      "explanation": "[Korean explanation]"
    },
    {
      "question_number": 44,
      "question": "밑줄 친 (a)~(e) 중에서 가리키는 대상이 나머지 넷과 다른 것은?",
      "options": ["(a)", "(b)", "(c)", "(d)", "(e)"],
      "correct_answer": [1-5],
      "explanation": "[Korean explanation]"
    },
    {
      "question_number": 45,
      "question": "윗글에 관한 내용으로 적절하지 않은 것은?",
      "options": ["내용1", "내용2", "내용3", "내용4", "내용5"],
      "correct_answer": [1-5],
      "explanation": "[Korean explanation]"
    }
  ],
  "vocabulary_difficulty": "CSAT+O3000",
  "low_frequency_words": []
}`
};

// ============================================
// 프롬프트 임포트 실행
// ============================================
async function importPrompts() {
  console.log('프롬프트 임포트 시작...\n');

  try {
    // 데이터베이스 초기화
    await initDatabase();
    const db = getDb();

    // 1. Master Prompt 업데이트
    console.log('1. Master Prompt 업데이트 중...');
    db.prepare(`
      UPDATE prompts
      SET prompt_text = ?,
          title = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE prompt_key = ?
    `).run(MASTER_PROMPT, 'CSAT Master Prompt (English/Korean)', 'MASTER_PROMPT');
    console.log('   ✓ MASTER_PROMPT 업데이트 완료\n');

    // 2. 듣기 문항 프롬프트 (LC01-LC17)
    console.log('2. 듣기 문항 프롬프트 추가 중...');
    const lcKeys = Object.keys(TYPE_PROMPTS).filter(k => k.startsWith('LC'));
    for (const key of lcKeys) {
      const title = `듣기 ${key} 문항`;
      const prompt = TYPE_PROMPTS[key];

      // 기존 프롬프트가 있으면 업데이트, 없으면 삽입
      const existing = db.prepare('SELECT id FROM prompts WHERE prompt_key = ?').get(key);
      if (existing) {
        db.prepare(`
          UPDATE prompts
          SET prompt_text = ?, title = ?, updated_at = CURRENT_TIMESTAMP
          WHERE prompt_key = ?
        `).run(prompt, title, key);
      } else {
        db.prepare(`
          INSERT INTO prompts (prompt_key, title, prompt_text, active)
          VALUES (?, ?, ?, 1)
        `).run(key, title, prompt);
      }
      console.log(`   ✓ ${key} 완료`);
    }
    console.log(`   총 ${lcKeys.length}개 듣기 프롬프트 처리 완료\n`);

    // 3. 독해 문항 프롬프트 (RC18-RC45)
    console.log('3. 독해 문항 프롬프트 추가 중...');
    const rcKeys = Object.keys(TYPE_PROMPTS).filter(k => k.startsWith('RC'));
    for (const key of rcKeys) {
      const title = `독해 ${key} 문항`;
      const prompt = TYPE_PROMPTS[key];

      const existing = db.prepare('SELECT id FROM prompts WHERE prompt_key = ?').get(key);
      if (existing) {
        db.prepare(`
          UPDATE prompts
          SET prompt_text = ?, title = ?, updated_at = CURRENT_TIMESTAMP
          WHERE prompt_key = ?
        `).run(prompt, title, key);
      } else {
        db.prepare(`
          INSERT INTO prompts (prompt_key, title, prompt_text, active)
          VALUES (?, ?, ?, 1)
        `).run(key, title, prompt);
      }
      console.log(`   ✓ ${key} 완료`);
    }
    console.log(`   총 ${rcKeys.length}개 독해 프롬프트 처리 완료\n`);

    // DB 저장
    saveDatabase();

    // 결과 확인
    const totalPrompts = db.prepare('SELECT COUNT(*) as count FROM prompts').get();
    console.log('========================================');
    console.log(`프롬프트 임포트 완료!`);
    console.log(`총 프롬프트 수: ${totalPrompts.count}개`);
    console.log('========================================\n');

    // 프롬프트 목록 출력
    console.log('등록된 프롬프트 목록:');
    const allPrompts = db.prepare('SELECT prompt_key, title FROM prompts ORDER BY prompt_key').all();
    allPrompts.forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.prompt_key}] ${p.title}`);
    });

  } catch (error) {
    console.error('프롬프트 임포트 오류:', error);
    process.exit(1);
  }
}

// 실행
importPrompts();
