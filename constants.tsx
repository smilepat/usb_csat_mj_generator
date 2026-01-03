/**
 * constants.tsx
 * 수능 영어 문항 생성을 위한 프롬프트 상수 정의
 * Google AI Studio 형식
 */

export const MASTER_PROMPT = `You are an expert CSAT English item writer for Korea's College Scholastic Ability Test.

Follow these permanent rules across ALL items unless later, item-specific instructions override them:
1) Item types: Listening / Reading only; adhere to official CSAT formats.
2) Audience: Korean high-school CSAT takers; align with the national curriculum and achievement standards.
3) Language-use rule:
   - Passages / transcripts (stimulus): English only.
   - Question stems and explanations: Korean only.
4) Output: Return a single, well-formed JSON object. No extra text, no commentary, no markdown.
5) Choices: Exactly 5 options. Provide one correct answer and four plausible distractors.
6) Answer key: "answer" must be an integer 1–5 (not a string label).
7) Content quality:
   - Use CSAT-appropriate vocabulary and sentence structures.
   - Avoid culturally biased content, ambiguous keys, trivial clues, or option-length giveaways.
   - Ensure fairness and clarity for Korean EFL learners.

8) Copyright & originality (NON-OVERRIDABLE):
   - The stimulus, options, and explanation must be entirely original and newly written.
   - Do NOT reproduce, paraphrase closely, or imitate any real CSAT/KICE/EBS passages, past exam items, commercial textbooks, published articles, or identifiable copyrighted works.
   - Do NOT reference "기출", "EBS", "평가원", "수능", or any specific source text.
   - If the user request implies rewriting or mimicking a specific existing passage, refuse that request and instead create a fresh original passage with a different topic and structure.
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

9) Explanation Standards:
   - "overallAnalysis": Provide a 2-3 sentence overview in Korean explaining the intended testing point and logic architecture (e.g., inferring hidden causality).
   - "correctReason": The "logic" must explicitly explain the logical bridge. The "evidence" must be the exact English sentence from the stimulus.
   - "distractorAnalysis": For each distractor, provide a deep "reason" explaining the specific trap logic (e.g., overgeneralization, context mismatch).

Conflict resolution:
- If any later instructions conflict with these, the later, item-specific instructions take priority for that item.`;

export interface PassageStructure {
  id: string;
  label: string;
  description: string;
  applicableTypes: string[];
}

export const PASSAGE_STRUCTURES: PassageStructure[] = [
  { id: 'informal_dialogue', label: '일상적 대화 스크립트', description: '친구, 가족, 동료 간의 일상적인 대화와 상황 설정 중심의 구조입니다.', applicableTypes: ['listening'] },
  { id: 'formal_announcement', label: '공식 담화/발표', description: '교내 방송, 라디오 광고, 안내 멘트 등 격식 있는 1인 담화 구조입니다.', applicableTypes: ['listening'] },
  { id: 'business_letter', label: '공식 서신 (Email/Letter)', description: '요청, 사과, 안내 등을 목적으로 하는 비즈니스 서신 형식의 글입니다.', applicableTypes: ['reading_purpose'] },
  { id: 'narrative_scenic', label: '묘사 위주의 서사', description: '장소나 상황의 분위기, 인물의 감정 변화가 드러나는 서사적 구조입니다.', applicableTypes: ['reading_purpose', 'reading_long'] },
  { id: 'data_analytical', label: '데이터 분석/설명', description: '통계, 그래프의 추이 및 수치를 객관적으로 설명하는 구조입니다.', applicableTypes: ['reading_data'] },
  { id: 'factual_report', label: '사실 중심의 보고서', description: '특정 인물의 일대기나 사물의 특징을 객관적으로 나열하는 구조입니다.', applicableTypes: ['reading_data'] },
  { id: 'general_to_specific', label: '일반적 진술 - 구체적 예시', description: '핵심 주제문을 먼저 제시하고 예시나 상세 설명을 통해 논지를 강화합니다.', applicableTypes: ['reading_academic'] },
  { id: 'claim_counterclaim', label: '통념 비판 - 대조', description: '일반적인 통념을 제시한 후 이를 반박하며 새로운 관점을 제시하는 구조입니다.', applicableTypes: ['reading_academic'] },
  { id: 'cause_effect_analysis', label: '원인 분석 및 파급 효과', description: '어떤 현상의 발생 원인을 심층 분석하고 그 결과를 논리적으로 연결합니다.', applicableTypes: ['reading_academic', 'reading_logic'] },
  { id: 'hypothesis_experiment', label: '연구/실험 및 결론 도출', description: '가설 설정, 실험 과정, 결과 및 시사점으로 이어지는 전형적인 학술 구조입니다.', applicableTypes: ['reading_academic', 'reading_logic'] },
  { id: 'problem_resolution_path', label: '문제 제기 - 해결책 모색', description: '특정 문제 상황을 설정하고 이를 해결해 나가는 논리적 흐름을 가집니다.', applicableTypes: ['reading_logic'] },
  { id: 'chronological_logical', label: '시간적/논리적 순차 전개', description: '단계별 과정이나 시간의 흐름에 따른 논리적 인과 관계가 뚜렷한 구조입니다.', applicableTypes: ['reading_logic', 'reading_long'] }
];

export interface QuestionType {
  id: number;
  label: string;
  prompt: string;
  category: string;
}

export const QUESTION_TYPES: QuestionType[] = [
  // ========== Listening Section (1-17) ==========
  {
    id: 1,
    label: "01번: 목적 파악",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 1 (Purpose Identification).

## Assessment Objective
- Core Skill: Identifying the speaker's purpose in formal announcements
- Cognitive Process: Listen → Identify speaker's intent → Match with purpose options
- Difficulty Level: Basic comprehension with clear purpose indicators

## Discourse Type & Structure
- Format: Formal monologue (announcement, notice, or public address)
- Structure Pattern: Greeting → Identity/Role → Main announcement → Details → Closing
- Content Flexibility: Any institutional context (school, office, public facility, organization)
- Speaker Role: Official announcer, administrator, or authority figure

## Language Specifications
- Transcript Length: 60-80 words (approximately 30-40 seconds)
- Sentence Complexity: Simple to moderate (1-2 clauses per sentence)
- Vocabulary Level: High-frequency, concrete vocabulary
- Vocabulary Profile: "CSAT"

## Question Format Requirements
- Stem: "다음을 듣고, [남자/여자]가 하는 말의 목적으로 가장 적절한 것을 고르시오."
- Options: 5 Korean purpose statements ending with "~하려고"
- Correct Answer: Must directly correspond to the speaker's main intent
- Distractors: Related but secondary purposes, unmentioned purposes, opposite purposes`
  },
  {
    id: 2,
    label: "02번: 의견 파악",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 2 (Opinion Identification).

## Assessment Objective
- Core Skill: Identifying a speaker's opinion in conversational dialogue
- Cognitive Process: Track dialogue → Identify target speaker → Extract consistent viewpoint
- Difficulty Level: Basic comprehension with clear opinion markers

## Discourse Type & Structure
- Format: Two-person dialogue with alternating speakers (M:/W:)
- Structure Pattern: Topic introduction → Opinion expression → Supporting reasons → Conclusion
- Content Flexibility: Any everyday topic requiring personal opinions or recommendations
- Interaction Type: Advice-giving, preference sharing, or persuasion scenarios

## Language Specifications
- Transcript Length: 80-100 words (approximately 40-50 seconds)
- Sentence Complexity: Simple sentences with basic connectors
- Vocabulary Level: Everyday conversational vocabulary
- Vocabulary Profile: "CSAT"

## Question Format Requirements
- Stem: "대화를 듣고, [남자/여자]의 의견으로 가장 적절한 것을 고르시오."
- Options: 5 Korean opinion statements (declarative or prescriptive)
- Correct Answer: Must reflect the target speaker's consistent viewpoint throughout dialogue
- Distractors: Other speaker's opinion, partial opinions, unmentioned views, opposite views`
  },
  {
    id: 3,
    label: "03번: 요지 파악",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 3 (Main Point Identification).

## Assessment Objective
- Core Skill: Identifying the main point of an advice-giving monologue
- Cognitive Process: Listen to advice → Extract central message → Identify key takeaway
- Difficulty Level: Intermediate comprehension requiring synthesis of advice content

## Discourse Type & Structure
- Format: Advice-giving monologue with instructional tone
- Structure Pattern: Problem/situation → Advice/solution → Reasoning → Benefits/results
- Content Flexibility: Any topic suitable for giving practical advice or tips
- Speaker Role: Advisor, expert, or experienced person sharing guidance

## Language Specifications
- Transcript Length: 100-120 words (approximately 50-60 seconds)
- Sentence Complexity: Moderate complexity with some subordination
- Vocabulary Level: Mix of concrete and moderately abstract terms
- Vocabulary Profile: "CSAT"

## Question Format Requirements
- Stem: "다음을 듣고, [남자/여자]가 하는 말의 요지로 가장 적절한 것을 고르시오."
- Options: 5 Korean statements expressing main points or central messages
- Correct Answer: Must capture the essential advice or main message
- Distractors: Supporting details, partial points, related but not central ideas, opposite advice`
  },
  {
    id: 4,
    label: "04번: 그림 불일치",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 4 (Picture Content Mismatch).

## Assessment Objective
- Core Skill: Identifying mismatches between visual and auditory information
- Cognitive Process: Process visual elements → Listen to descriptions → Compare and identify discrepancies
- Difficulty Level: Basic visual-auditory integration with concrete elements

## Discourse Type & Structure
- Format: Two-person dialogue describing visual elements
- Structure Pattern: Scene setting → Systematic description of visual elements → Detailed observations
- Content Flexibility: Any observable scene with multiple identifiable objects, people, or activities
- Interaction Type: Collaborative observation and description

## Language Specifications
- Transcript Length: 70-90 words (approximately 35-45 seconds)
- Sentence Complexity: Simple descriptive sentences
- Vocabulary Level: Concrete, observable vocabulary (colors, shapes, positions, actions)
- Vocabulary Profile: "CSAT"

## Question Format Requirements
- Stem: "대화를 듣고, 그림에서 대화의 내용과 일치하지 않는 것을 고르시오."
- Options: 5 Korean descriptions of visual elements that appear in the picture
- Correct Answer: Must be the one element that contradicts the dialogue description
- Distractors: Elements that match the dialogue description exactly
- Include: "imagePrompt" field for picture generation`
  },
  {
    id: 5,
    label: "05번: 할 일 파악",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 5 (Task Identification).

## Assessment Objective
- Core Skill: Identifying specific tasks assigned to a particular speaker
- Cognitive Process: Track task distribution → Identify speaker roles → Extract specific assignments
- Difficulty Level: Basic task tracking with clear assignment indicators

## Discourse Type & Structure
- Format: Two-person dialogue about task distribution or preparation
- Structure Pattern: Situation setup → Task review → Role assignment → Confirmation of responsibilities
- Content Flexibility: Any collaborative activity requiring task distribution (events, projects, preparations)
- Interaction Type: Planning, organizing, or preparation conversations

## Language Specifications
- Transcript Length: 80-100 words (approximately 40-50 seconds)
- Sentence Complexity: Simple to moderate with clear task indicators
- Vocabulary Level: Action-oriented vocabulary related to tasks and responsibilities
- Vocabulary Profile: "CSAT"

## Question Format Requirements
- Stem: "대화를 듣고, [남자/여자]가 할 일로 가장 적절한 것을 고르시오."
- Options: 5 Korean task descriptions using action verbs
- Correct Answer: Must be the specific task clearly assigned to the target speaker
- Distractors: Tasks assigned to the other speaker, completed tasks, mentioned but unassigned tasks`
  },
  {
    id: 6,
    label: "06번: 지불할 금액",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 6 (Payment Amount).

## Assessment Objective
- Core Skill: Calculating payment amounts through mental arithmetic
- Cognitive Process: Extract clear numerical info → Apply one simple discount or condition → Multiply quantities → Compute final total
- Difficulty Level: Intermediate, designed for quick mental calculation (2 steps, maximum 3)

## Discourse Type & Structure
- Format: Transactional dialogue (e.g., ticket booking, ordering food, buying items)
- Structure Pattern (5 turns min, 10 turns max):
  1) Inquiry / need
  2) Unit price(s) stated (integers only)
  3) Discount/condition stated (integer-result only)
  4) Quantity confirmation (may repeat numbers once)
  5) Payment action phrase (no numbers) → END

## CRITICAL ANTI-LEAK GUARDRAILS
- HARD BAN: The consumer's final payment amount must NEVER appear in the transcript.
- The transcript must not contain any utterance that computes/sums/quotes the total.
- The last TWO turns must contain ZERO digits, currency symbols, or number words.
- The customer must not ask "How much will it be?" / "총 얼마인가요?"류 질문.
- The clerk must not perform or verbalize any calculation.

## Language Specifications
- Transcript Length: 100–120 words (50–60 seconds)
- Sentence Complexity: Moderate (no long embeddings)
- Vocabulary: Everyday commercial
- Vocabulary Profile: "CSAT"

## Question Format Requirements
- Stem: "대화를 듣고, [남자/여자]가 지불할 금액을 고르시오."
- Options: 5 integer amounts, close in value
- Option Spacing Rule: All five options must differ from each other by at least 2.`
  },
  {
    id: 7,
    label: "07번: 이유 파악",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 7 (Reason Identification).

## Assessment Objective
- Core Skill: Identifying specific reasons for inability to participate in events
- Cognitive Process: Track invitation → Identify refusal → Extract actual reason from multiple possibilities
- Difficulty Level: Intermediate comprehension requiring reason discrimination

## Discourse Type & Structure
- Format: Two-person dialogue about event participation
- Structure Pattern: Invitation/suggestion → Interest but inability → Reason exploration → Actual reason revelation
- Content Flexibility: Any social event or activity invitation scenario
- Interaction Type: Social invitation and polite refusal with explanation

## Language Specifications
- Transcript Length: 90-110 words (approximately 45-55 seconds)
- Sentence Complexity: Moderate with causal expressions and explanations
- Vocabulary Level: Social and explanatory vocabulary
- Vocabulary Profile: "CSAT"

## Question Format Requirements
- Stem: "대화를 듣고, [남자/여자]가 [이벤트]에 갈 수 없는 이유를 고르시오."
- Options: 5 Korean reason statements using causal expressions
- Correct Answer: Must be the actual reason explicitly stated by the speaker
- Distractors: Suggested but rejected reasons, related but incorrect reasons, opposite situations`
  },
  {
    id: 8,
    label: "08번: 언급되지 않은 것",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 8 (Not Mentioned).

## Assessment Objective
- Core Skill: Identifying information not mentioned in event-related dialogue
- Cognitive Process: Track mentioned information → Compare with options → Identify omissions
- Difficulty Level: Intermediate information tracking with systematic checking

## Discourse Type & Structure
- Format: Two-person dialogue about event information
- Structure Pattern: Event discovery → Information gathering → Detail confirmation → Additional inquiries
- Content Flexibility: Any event, program, or activity with multiple informational aspects
- Interaction Type: Information exchange and inquiry

## Language Specifications
- Transcript Length: 90-110 words (approximately 45-55 seconds)
- Sentence Complexity: Moderate with information-dense content
- Vocabulary Level: Informational and descriptive vocabulary
- Vocabulary Profile: "CSAT"

## Question Format Requirements
- Stem: "대화를 듣고, [Event/Program/Activity in English]에 관해 언급되지 않은 것을 고르시오."
- Options: 5 Korean information categories related to the topic
- Correct Answer: Must be the information category not mentioned in the dialogue
- Distractors: Information categories explicitly mentioned in the dialogue`
  },
  {
    id: 9,
    label: "09번: 내용 불일치",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 9 (Content Mismatch).

## Assessment Objective
- Core Skill: Identifying factual inconsistencies between monologue content and options
- Cognitive Process: Process announcement information → Compare with factual statements → Identify contradictions
- Difficulty Level: Intermediate factual verification with detailed information

## Discourse Type & Structure
- Format: Formal announcement monologue
- Structure Pattern: Introduction → Event details → Schedule information → Procedures → Additional information
- Content Flexibility: Any formal event or program announcement
- Speaker Role: Official announcer or event organizer

## Language Specifications
- Transcript Length: 110-130 words (approximately 55-65 seconds)
- Sentence Complexity: Moderate with detailed factual information
- Vocabulary Level: Formal and informational vocabulary
- Vocabulary Profile: "CSAT"

## Question Format Requirements
- Stem: "「{event_name}」에 관한 다음 내용을 듣고, 일치하지 않는 것을 고르시오."
- Options: 5 Korean factual statements about the announced content
- Correct Answer: Must be the statement that contradicts the announcement
- Distractors: Statements that accurately reflect the announcement content`
  },
  {
    id: 10,
    label: "10번: 도표 정보",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 10 (Chart Information).

## Assessment Objective
- Core Skill: Integrating auditory criteria with visual chart information for elimination and final selection
- Cognitive Process: Sequential elimination → Apply each criterion in order → Narrow down to final choice
- Difficulty Level: Intermediate multi-modal information integration

## Discourse Type & Structure
- Format: Two-person dialogue about selection from chart options
- Structure Pattern: Need identification → Chart consultation → Criteria specification → Step-by-step elimination → Final decision
- Content Flexibility: Any selection scenario with multiple criteria (products, services, options)
- Interaction Type: Collaborative decision-making with criteria application

## Language Specifications
- Transcript Length: 90-110 words (approximately 45-55 seconds)
- Sentence Complexity: Moderate with comparative and conditional expressions
- Vocabulary Level: Comparative and criteria-based vocabulary
- Vocabulary Profile: "CSAT"

## Question Format Requirements
- Stem: "다음 표를 보면서 대화를 듣고, [화자]가 구입할 [상품]을 고르시오."
- Options: 5 chart entries representing different combinations of attributes
- Correct Answer: Must be the option that satisfies all stated criteria

## Chart Structure
- Chart: 5 items × 4 attributes
- Sequential Elimination: At each stage, exactly one option must be eliminated (5 → 4 → 3 → 2 → 1)
- Include: "chartData" field in JSON output`
  },
  {
    id: 11,
    label: "11번: 짧은 응답(1)",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 11 (Short Response Inference).

## Assessment Objective
- Core Skill: Inferring appropriate responses to final statements in short dialogues
- Cognitive Process: Follow dialogue context → Analyze final statement → Select logical response
- Difficulty Level: Advanced contextual inference requiring pragmatic understanding

## Discourse Type & Structure
- Format: Brief two-person dialogue (2-3 exchanges)
- Structure Pattern: Situation setup → Problem/request → Final statement requiring response
- Content Flexibility: Any everyday situation requiring immediate, contextually appropriate responses
- Interaction Type: Problem-solving, request-response, or social interaction

## Language Specifications
- Transcript Length: 60-80 words (approximately 30-40 seconds)
- Sentence Complexity: Simple to moderate with clear contextual cues
- Vocabulary Level: Everyday conversational vocabulary
- Vocabulary Profile: "CSAT+O3000"

## Formatting Instructions for Transcript
- 대화문은 M: (남자 화자), W: (여자 화자) 표기를 사용한다.
- 남자가 먼저 말하고, 여자가 마지막에 말하며, 그 마지막 발화가 문제에서 응답해야 하는 대상이 된다.

## Question Format Requirements
- Stem: "대화를 듣고, 남자의 마지막 말에 대한 여자의 응답으로 가장 적절한 것을 고르시오. [3점]"
- Options: 5 English response options
- Correct Answer: Must be the most contextually appropriate and natural response
- Distractors: Contextually inappropriate, logically inconsistent, or socially awkward responses`
  },
  {
    id: 12,
    label: "12번: 짧은 응답(2)",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 12 (Short Response Inference).

## Assessment Objective
- Core Skill: Inferring appropriate responses to final statements in short dialogues
- Cognitive Process: Follow dialogue context → Analyze final statement → Select logical response
- Difficulty Level: Intermediate contextual inference with clear response patterns

## Discourse Type & Structure
- Format: Brief two-person dialogue (2-3 exchanges)
- Structure Pattern: Proposal → Concern expression → Reassurance → Response needed
- Content Flexibility: Any situation involving initial hesitation followed by reassurance
- Interaction Type: Invitation acceptance after concern resolution

## Language Specifications
- Transcript Length: 50-70 words (approximately 25-35 seconds)
- Sentence Complexity: Simple with clear reassurance patterns
- Vocabulary Level: Basic conversational vocabulary
- Vocabulary Profile: "CSAT+O3000"

## Transcript Formatting Instructions
- 여자가 먼저 말하고, 마지막 발화도 반드시 여자의 대사(W:)로 끝난다.
- 남자의 응답은 transcript에 포함하지 않으며, 보기가 남자의 응답 후보가 된다.

## Question Format Requirements
- Stem: "대화를 듣고, 여자의 마지막 말에 대한 남자의 응답으로 가장 적절한 것을 고르시오."
- Options: 5 English response options
- Correct Answer: Must show acceptance after reassurance`
  },
  {
    id: 13,
    label: "13번: 긴 응답(1)",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 13 (Long Response Inference).

## Assessment Objective
- Core Skill: Inferring appropriate responses in extended dialogue contexts
- Cognitive Process: Track extended conversation → Understand contribution context → Select appreciative response
- Difficulty Level: Intermediate contextual inference with extended dialogue tracking

## Discourse Type & Structure
- Format: Extended two-person dialogue
- Turn Pattern: Exactly 9 turns total → M: 5 times, W: 4 times
- Structure Pattern: Contact → Proposal → Interest → Contribution offer → Acceptance → Response needed
- Content Flexibility: Any collaborative or charitable activity scenario
- Interaction Type: Voluntary contribution and appreciation

## Language Specifications
- Transcript Length: 100-120 words (approximately 50-60 seconds)
- Vocabulary Profile: "CSAT+O3000"

## Transcript Formatting Instructions
- 총 9턴: 남자(M) 5회, 여자(W) 4회.
- 마지막 발화는 반드시 M:으로 끝나야 하며, 여자의 최종 응답은 transcript에 포함하지 않는다.

## Question Format Requirements
- Stem: "대화를 듣고, 남자의 마지막 말에 대한 여자의 응답으로 가장 적절한 것을 고르시오."
- Options: 5 English response options
- Correct Answer: Must express appreciation and encouragement for the contribution`
  },
  {
    id: 14,
    label: "14번: 긴 응답(2)",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 14 (Long Response Inference) [3점].

## Assessment Objective
- Core Skill: Inferring appropriate responses in complex extended dialogues
- Cognitive Process: Track complex conversation → Understand scheduling context → Select appropriate response
- Difficulty Level: Advanced contextual inference with complex dialogue tracking

## Discourse Type & Structure
- Format: Extended two-person dialogue
- Scenario Type: Professional telephone conversation
- Turn Pattern: Exactly 9 turns total → W: 5 times, M: 4 times
- Structure Pattern: Request → Acceptance → Scheduling conflict → Coordination → Promise → Response needed
- Interaction Type: Professional scheduling and commitment

## Language Specifications
- Transcript Length: 120-140 words (approximately 60-70 seconds)
- Vocabulary Profile: "CSAT+O3000"

## Transcript Formatting Instructions
- 총 9턴: 여자(W) 5회, 남자(M) 4회.
- 마지막 발화는 반드시 W:로 끝나야 하며, 남자의 최종 응답은 transcript에 포함하지 않는다.
- 상황은 반드시 전화 통화여야 한다.

## Question Format Requirements
- Stem: "대화를 듣고, 여자의 마지막 말에 대한 남자의 응답으로 가장 적절한 것을 고르시오. [3점]"
- Options: 5 English response options
- Correct Answer: Must express hope and positive expectation for the promised response`
  },
  {
    id: 15,
    label: "15번: 상황에 적절한 말",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 15 (Situational Response) [3점].

## Assessment Objective
- Core Skill: Selecting appropriate utterances for complex situational contexts
- Cognitive Process: Analyze complex situation → Understand speaker motivation → Select optimal expression
- Difficulty Level: Advanced situational inference requiring deep contextual understanding

## Discourse Type & Structure
- Format: Situational description monologue
- Structure Pattern: Background → Initial plan → Complication → Experience factor → Advice motivation → Utterance selection
- Content Flexibility: Any advice-giving situation based on experience and expertise
- Speaker Role: Experienced advisor offering guidance based on personal knowledge

## Language Specifications
- Transcript Length: 140-160 words (approximately 70-80 seconds)
- Vocabulary Profile: "CSAT+O3000"

## Transcript Formatting Instructions
- transcript의 마지막 문장은 반드시 다음 영어 문장으로 끝난다:
  "In this situation, what would [화자] most likely to say to [상대방]?"

## Question Format Requirements
- Stem: "다음 상황 설명을 듣고, [화자]가 [상대방]에게 할 말로 가장 적절한 것을 고르시오. [3점]"
- Options: 5 English utterance options
- Correct Answer: Must be the most contextually appropriate and helpful utterance`
  },
  {
    id: 16,
    label: "16-17번: 긴 담화 세트",
    category: 'listening',
    prompt: `Create a CSAT Listening Item 16-17 (Long Listening Set).

## Assessment Objective
- Core Skill: Dual assessment - topic identification and detail tracking in extended monologue
- Cognitive Process: Process extended content → Extract main topic → Track specific details → Dual evaluation
- Difficulty Level: Advanced extended listening with dual assessment requirements

## Discourse Type & Structure
- Format: Extended informational monologue
- Structure Pattern: Introduction → Topic establishment → Systematic enumeration → Detail explanation → Conclusion
- Content Flexibility: Any academic or informational topic with categorizable elements
- Speaker Role: Educator, expert, or informational presenter

## Language Specifications
- Transcript Length: 180-220 words (approximately 90-110 seconds)
- Vocabulary Profile: "CSAT+O3000"

## Question Format Requirements
- Item 16 Stem: "[화자]가 하는 말의 주제로 가장 적절한 것은?"
- Item 17 Stem: "언급된 [항목 유형]이 아닌 것은?"
- Options: 5 English options for each question

## JSON Output Format
Return JSON with "set_instruction" and "questions" array containing both items.`
  },

  // ========== Reading Section (18-45) ==========
  {
    id: 18,
    label: "18번: 글의 목적",
    category: 'reading_purpose',
    prompt: `Create a CSAT Reading Item 18 (Purpose Identification).

## Assessment Objective
- Core Skill: Identifying the primary communicative purpose of a formal notice or announcement
- Cognitive Process: Analyze background situation → Trace cause and anticipated outcomes → Infer the writer's main intent → Match with the most accurate purpose option
- Difficulty Target: 중상 (예상 정답률 81–95%, 변별도 0.1–0.2)

## Abstractness & Complexity Controls
- Abstractness Level (1–9): 3
- Vocabulary Profile: CSAT+O3000

## Text Type & Structure
- Format: Official notice, public letter, or announcement
- Structure Pattern (mandatory 5-step logic):
  A. 상황 설명 (Context Setup) →
  B. 원인 설명 (Cause/Reason) →
  C. 기대 내용 (Expected outcome/anticipation) →
  D. 결론 (Key decision/action) →
  E. 정서적 마무리 (Closure: thanks/request/next steps)
- Purpose Location Strategy: The main communicative intent must become fully clear only in D–E after A–C build-up.

## Language Specifications
- Passage Length: 130-160 words
- Sentence Complexity: Moderate (2-3 clauses per sentence)
- Vocabulary Level: Formal, institutional vocabulary

## Question Format Requirements
- Stem: "다음 글의 목적으로 가장 적절한 것은?"
- Options: 5 Korean purpose statements
- Correct Answer: Must reflect the writer's primary communicative intent`
  },
  {
    id: 19,
    label: "19번: 심경 변화",
    category: 'reading_purpose',
    prompt: `Create a CSAT Reading Item 19 (Mood/Atmosphere Identification).

## Assessment Objective
- Core Skill: Identifying the emotional atmosphere of narrative passages
- Cognitive Process: Process narrative details → Identify emotional indicators → Determine dominant mood
- Difficulty Target: 중상 (예상 정답률 81–95%)

## Text Type & Structure
- Format: Narrative passage with strong atmospheric elements
- Structure Pattern: Setting description → Character actions → Emotional climax → Resolution
- Mood Expression: Through sensory details, character reactions, and descriptive language

## Language Specifications
- Passage Length: 150-180 words
- Sentence Complexity: Varied for narrative effect
- Vocabulary Level: Literary and descriptive vocabulary
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "다음 글에 드러난 'I'의 심경으로 가장 적절한 것은?" or "다음 글의 분위기로 가장 적절한 것은?"
- Options: 5 Korean mood/emotion descriptors (adjective pairs like "심경1 → 심경2")
- Correct Answer: Must accurately reflect the dominant emotional tone`
  },
  {
    id: 20,
    label: "20번: 필자의 주장",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 20 (Writer's Claim/Opinion).

## Assessment Objective
- Core Skill: Identifying the writer's main claim or opinion in argumentative text
- Cognitive Process: Analyze argument structure → Identify thesis → Extract main claim
- Difficulty Target: 중 (예상 정답률 70–85%)

## Text Type & Structure
- Format: Opinion/argumentative essay excerpt
- Structure Pattern: Hook → Thesis statement → Supporting arguments → Conclusion/Restatement
- Claim Expression: Clear position on debatable topic with supporting reasoning

## Language Specifications
- Passage Length: 140-170 words
- Sentence Complexity: Moderate with logical connectors
- Vocabulary Level: Academic and argumentative vocabulary
- Vocabulary Profile: CSAT+O3000

## Question Format Requirements
- Stem: "다음 글에서 필자가 주장하는 바로 가장 적절한 것은?"
- Options: 5 Korean claim statements
- Correct Answer: Must reflect the writer's central argument`
  },
  {
    id: 21,
    label: "21번: 함축 의미",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 21 (Implied Meaning).

## Assessment Objective
- Core Skill: Understanding implied or indirect meanings in context
- Cognitive Process: Analyze context → Interpret figurative/idiomatic expressions → Infer implied meaning
- Difficulty Target: 중상 (예상 정답률 65–80%)

## Text Type & Structure
- Format: Narrative or expository with underlined expression
- Structure Pattern: Context setup → Expression in context → Supporting details
- Expression Type: Figurative language, idioms, or context-dependent meanings

## Language Specifications
- Passage Length: 130-160 words
- Sentence Complexity: Moderate with context clues
- Vocabulary Level: Mix of literal and figurative language
- Vocabulary Profile: CSAT+O3000

## Question Format Requirements
- Stem: "밑줄 친 [expression]이 다음 글에서 의미하는 바로 가장 적절한 것은?"
- Options: 5 Korean interpretation statements
- Correct Answer: Must capture the contextual meaning of the underlined expression`
  },
  {
    id: 22,
    label: "22번: 요지 파악",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 22 (Main Idea/Gist).

## Assessment Objective
- Core Skill: Identifying the main idea or central theme of expository text
- Cognitive Process: Process paragraph structure → Identify topic sentences → Synthesize main idea
- Difficulty Target: 중 (예상 정답률 75–90%)

## Text Type & Structure
- Format: Expository paragraph with clear topic development
- Structure Pattern: Topic introduction → Development → Examples → Conclusion
- Main Idea Location: Typically in topic sentence or synthesized from multiple sentences

## Language Specifications
- Passage Length: 140-170 words
- Sentence Complexity: Moderate with clear logical flow
- Vocabulary Level: Academic vocabulary appropriate for topic
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "다음 글의 요지로 가장 적절한 것은?"
- Options: 5 Korean main idea statements
- Correct Answer: Must capture the essential message of the passage`
  },
  {
    id: 23,
    label: "23번: 주제 파악",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 23 (Topic Identification).

## Assessment Objective
- Core Skill: Identifying the topic or subject matter of a passage
- Cognitive Process: Scan for recurring themes → Identify central subject → Match with topic options
- Difficulty Target: 중 (예상 정답률 75–90%)

## Text Type & Structure
- Format: Expository or informational text
- Structure Pattern: Introduction → Topic development → Supporting details → Conclusion
- Topic Expression: Through repeated references, key terms, and thematic consistency

## Language Specifications
- Passage Length: 130-160 words
- Sentence Complexity: Moderate with clear topic markers
- Vocabulary Level: Topic-specific vocabulary
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "다음 글의 주제로 가장 적절한 것은?"
- Options: 5 English topic phrases
- Correct Answer: Must accurately identify the central subject matter`
  },
  {
    id: 24,
    label: "24번: 제목 파악",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 24 (Title Selection).

## Assessment Objective
- Core Skill: Selecting the most appropriate title for a passage
- Cognitive Process: Comprehend main idea → Evaluate title options → Select most representative title
- Difficulty Target: 중 (예상 정답률 70–85%)

## Text Type & Structure
- Format: Expository or argumentative text
- Structure Pattern: Clear thesis → Development → Conclusion
- Title Criteria: Accurate, concise, engaging representation of content

## Language Specifications
- Passage Length: 140-170 words
- Sentence Complexity: Moderate with clear thematic development
- Vocabulary Level: Academic vocabulary
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "다음 글의 제목으로 가장 적절한 것은?"
- Options: 5 English title options
- Correct Answer: Must be the most accurate and representative title`
  },
  {
    id: 25,
    label: "25번: 도표 정보",
    category: 'reading_data',
    prompt: `Create a CSAT Reading Item 25 (Chart/Graph Information).

## Assessment Objective
- Core Skill: Verifying data accuracy between chart and textual statements
- Cognitive Process: Analyze chart data → Compare with statements → Identify mismatch
- Difficulty Target: 중 (예상 정답률 75–90%)

## Text Type & Structure
- Format: Data description with chart reference
- Include: chartData field with headers and rows

## Language Specifications
- Passage Length: 120-150 words
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "다음 도표의 내용과 일치하지 않는 것은?"
- Options: 5 Korean factual statements about the chart
- Include: chartData in JSON output`
  },
  {
    id: 26,
    label: "26번: 내용 불일치",
    category: 'reading_data',
    prompt: `Create a CSAT Reading Item 26 (Content Mismatch).

## Assessment Objective
- Core Skill: Identifying factual inconsistencies in biographical/descriptive text
- Difficulty Target: 중 (예상 정답률 75–90%)

## Text Type & Structure
- Format: Biography, discovery report, or factual description
- Content: 4-6 verifiable facts about a person, object, or concept

## Language Specifications
- Passage Length: 130-160 words
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "다음 글의 내용과 일치하지 않는 것은?"
- Options: 5 Korean factual statements`
  },
  {
    id: 27,
    label: "27번: 안내문 일치",
    category: 'reading_data',
    prompt: `Create a CSAT Reading Item 27 (Notice Information Match).

## Assessment Objective
- Core Skill: Matching practical notice information with statements
- Difficulty Target: 중 (예상 정답률 75–90%)

## Text Type & Structure
- Format: Practical notice, announcement, or guide
- Content: Service details, conditions, prices, schedules

## Language Specifications
- Passage Length: 120-150 words
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "안내문의 내용과 일치하는 것은?"
- Options: 5 Korean statements about the notice`
  },
  {
    id: 28,
    label: "28번: 안내문 불일치",
    category: 'reading_data',
    prompt: `Create a CSAT Reading Item 28 (Notice Information Mismatch).

## Assessment Objective
- Core Skill: Identifying mismatched information in practical notices
- Difficulty Target: 중 (예상 정답률 75–90%)

## Text Type & Structure
- Format: Event notice, promotion, or practical announcement
- Content: Dates, locations, programs, conditions

## Language Specifications
- Passage Length: 120-150 words
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "안내문의 내용과 일치하지 않는 것은?"
- Options: 5 Korean statements about the notice`
  },
  {
    id: 29,
    label: "29번: 어법 틀린 것",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 29 (Grammar - Error Identification).

## Assessment Objective
- Core Skill: Identifying grammatically incorrect usage among underlined options
- Cognitive Process: Analyze each underlined element → Apply grammar rules → Identify error
- Difficulty Target: 중상 (예상 정답률 60–75%)

## Text Type & Structure
- Format: Expository passage with 5 underlined grammatical elements
- Structure Pattern: Coherent paragraph with natural grammar points
- Grammar Points: Mix of verb forms, pronouns, modifiers, conjunctions, etc.
- Coverage: Verbs, relative clauses, parallelism, subject-verb agreement

## Language Specifications
- Passage Length: 140-170 words
- Sentence Complexity: Varied to showcase different grammar structures
- Underlined Elements: 5 numbered elements (①②③④⑤), exactly 1 incorrect
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?"
- Options: ①, ②, ③, ④, ⑤
- Correct Answer: Must be the grammatically incorrect element`
  },
  {
    id: 30,
    label: "30번: 어휘 부적절",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 30 (Vocabulary - Inappropriate Word).

## Assessment Objective
- Core Skill: Identifying contextually inappropriate vocabulary usage
- Cognitive Process: Analyze context → Evaluate word choices → Identify misfit
- Difficulty Target: 중상 (예상 정답률 60–75%)

## Text Type & Structure
- Format: Expository passage with 5 underlined vocabulary items
- Structure Pattern: Coherent paragraph with natural vocabulary usage
- Vocabulary Points: Mix of verbs, adjectives, adverbs, nouns

## Language Specifications
- Passage Length: 140-170 words
- Sentence Complexity: Moderate with clear context clues
- Underlined Elements: 5 numbered words (①②③④⑤), exactly 1 contextually inappropriate
- Vocabulary Profile: CSAT+O3000

## Question Format Requirements
- Stem: "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?"
- Options: ①, ②, ③, ④, ⑤
- Correct Answer: Must be the contextually inappropriate word`
  },
  {
    id: 31,
    label: "31번: 빈칸(단어)",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 31 (Blank Filling - Word).

## Assessment Objective
- Core Skill: Selecting appropriate word to complete a logical gap
- Cognitive Process: Analyze passage logic → Identify gap function → Select fitting word
- Difficulty Target: 상 (예상 정답률 50–65%)

## Abstractness Level: 7

## Text Type & Structure
- Format: Expository passage with one blank for a single word
- Structure Pattern: Logical argument with clear gap for completion
- Blank Function: Key word that completes the argument or transition

## Language Specifications
- Passage Length: 150-180 words
- Sentence Complexity: Moderate to complex
- Vocabulary Profile: CSAT+O3000

## Question Format Requirements
- Stem: "다음 빈칸에 들어갈 말로 가장 적절한 것은?"
- Options: 5 English word options
- Correct Answer: Must logically and contextually fit the blank`
  },
  {
    id: 32,
    label: "32번: 빈칸(구)",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 32 (Blank Filling - Phrase).

## Assessment Objective
- Core Skill: Selecting appropriate phrase to complete a logical gap
- Cognitive Process: Analyze passage logic → Identify gap function → Select fitting phrase
- Difficulty Target: 상 (예상 정답률 50–65%)

## Abstractness Level: 7

## Text Type & Structure
- Format: Expository passage with one blank for a short phrase
- Structure Pattern: Logical argument with clear gap for completion
- Blank Function: Key phrase that completes the argument or transition

## Language Specifications
- Passage Length: 150-180 words
- Sentence Complexity: Moderate to complex
- Vocabulary Profile: CSAT+O3000

## Question Format Requirements
- Stem: "다음 빈칸에 들어갈 말로 가장 적절한 것은?"
- Options: 5 English phrase options
- Correct Answer: Must logically and contextually fit the blank`
  },
  {
    id: 33,
    label: "33번: 빈칸(절)",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 33 (Blank Filling - Clause) [3점] - KILLER ITEM.

## Assessment Objective
- Core Skill: Selecting appropriate clause to complete complex argument
- Cognitive Process: Deep comprehension → Logical inference → Clause selection
- Difficulty Target: 최상 (예상 정답률 35–50%, 킬러 문항)

## Abstractness Level: 9

## Design Principle
- Include paradox or hidden truth that requires deep inference
- Abstract concepts with non-obvious logical connections

## Text Type & Structure
- Format: Complex expository passage with one blank for a clause
- Structure Pattern: Abstract argument requiring deep inference
- Blank Function: Critical clause that captures the main argument or conclusion

## Language Specifications
- Passage Length: 160-200 words
- Sentence Complexity: Complex with abstract concepts
- Vocabulary Profile: AWL (Academic Word List)

## Question Format Requirements
- Stem: "다음 빈칸에 들어갈 말로 가장 적절한 것은? [3점]"
- Options: 5 English clause options (longer than word/phrase blanks)
- Correct Answer: Must capture the logical conclusion or key insight`
  },
  {
    id: 34,
    label: "34번: 빈칸(절)",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 34 (Blank Filling - Clause) [3점].

## Assessment Objective
- Core Skill: Selecting appropriate clause to complete logical argument
- Cognitive Process: Complex reasoning → Pattern recognition → Clause selection
- Difficulty Target: 상 (예상 정답률 45–60%)

## Abstractness Level: 8

## Text Type & Structure
- Format: Expository passage with one blank for a clause
- Structure Pattern: Complex logical argument
- Blank Function: Key clause for argument completion

## Language Specifications
- Passage Length: 150-180 words
- Sentence Complexity: Moderate to complex
- Vocabulary Profile: CSAT+O3000

## Question Format Requirements
- Stem: "다음 빈칸에 들어갈 말로 가장 적절한 것은? [3점]"
- Options: 5 English clause options
- Correct Answer: Must logically fit the argument structure`
  },
  {
    id: 35,
    label: "35번: 관계없는 문장",
    category: 'reading_logic',
    prompt: `Create a CSAT Reading Item 35 (Irrelevant Sentence).

## Assessment Objective
- Core Skill: Identifying the sentence that does not belong in the paragraph
- Cognitive Process: Analyze paragraph unity → Identify topic → Find deviation
- Difficulty Target: 중상 (예상 정답률 60–75%)

## Text Type & Structure
- Format: Expository paragraph with 5 numbered sentences (①②③④⑤)
- Structure Pattern: Unified paragraph with one off-topic sentence
- Irrelevant Sentence: Related to general topic but deviates from specific focus

## Language Specifications
- Passage Length: 140-170 words
- Sentence Complexity: Moderate with clear topic development
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "다음 글에서 전체 흐름과 관계 없는 문장은?"
- Options: ①, ②, ③, ④, ⑤
- Correct Answer: Must be the sentence that breaks paragraph unity`
  },
  {
    id: 36,
    label: "36번: 순서 배열(1)",
    category: 'reading_logic',
    prompt: `Create a CSAT Reading Item 36 (Sentence Ordering).

## Assessment Objective
- Core Skill: Arranging sentences in logical order to form coherent paragraph
- Cognitive Process: Analyze cohesive devices → Identify logical sequence → Order sentences
- Difficulty Target: 중상 (예상 정답률 55–70%)

## Text Type & Structure
- Format: Topic sentence + 3 scrambled sentences (A), (B), (C)
- Structure Pattern: Clear logical progression with cohesive devices
- Cohesion Markers: Pronouns, connectors, time/sequence markers

## Language Specifications
- Passage Length: 130-160 words total
- Sentence Complexity: Moderate with clear connections
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?"
- Options: 5 ordering options like "(A)-(C)-(B)", "(B)-(A)-(C)", etc.
- Correct Answer: Must be the most logical sequence`
  },
  {
    id: 37,
    label: "37번: 순서 배열(2)",
    category: 'reading_logic',
    prompt: `Create a CSAT Reading Item 37 (Sentence Ordering) [3점].

## Assessment Objective
- Core Skill: Arranging complex sentences in logical order
- Cognitive Process: Advanced cohesion analysis → Complex sequence identification
- Difficulty Target: 상 (예상 정답률 50–65%)

## Text Type & Structure
- Format: Topic sentence + 3 scrambled sentences (A), (B), (C)
- Structure Pattern: Abstract academic topic with sophisticated cohesion
- Cohesion Markers: Complex pronouns, logical connectors, abstract references

## Language Specifications
- Passage Length: 140-170 words total
- Sentence Complexity: Complex with sophisticated connections
- Vocabulary Profile: CSAT+O3000

## Question Format Requirements
- Stem: "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은? [3점]"
- Options: 5 ordering options
- Correct Answer: Must be the most logical sequence`
  },
  {
    id: 38,
    label: "38번: 문장 삽입(1)",
    category: 'reading_logic',
    prompt: `Create a CSAT Reading Item 38 (Sentence Insertion).

## Assessment Objective
- Core Skill: Identifying the correct position to insert a given sentence
- Cognitive Process: Analyze given sentence → Identify cohesive links → Find insertion point
- Difficulty Target: 중상 (예상 정답률 55–70%)

## Text Type & Structure
- Format: Passage with 5 potential insertion points marked ①②③④⑤
- Structure Pattern: Coherent paragraph with one optimal insertion point
- Given Sentence: Contains clear cohesive devices linking to context

## Language Specifications
- Passage Length: 140-170 words
- Sentence Complexity: Moderate with clear flow
- Vocabulary Profile: CSAT

## Question Format Requirements
- Stem: "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?"
- Given Sentence: Displayed before the passage
- Options: ①, ②, ③, ④, ⑤
- Correct Answer: Must be the position where the sentence best fits`
  },
  {
    id: 39,
    label: "39번: 문장 삽입(2)",
    category: 'reading_logic',
    prompt: `Create a CSAT Reading Item 39 (Sentence Insertion) [3점].

## Assessment Objective
- Core Skill: Identifying correct position for complex sentence insertion
- Cognitive Process: Advanced cohesion analysis → Complex link identification
- Difficulty Target: 상 (예상 정답률 50–65%)

## Text Type & Structure
- Format: Passage with 5 potential insertion points marked ①②③④⑤
- Structure Pattern: Complex paragraph with one optimal insertion point
- Given Sentence: Contains sophisticated cohesive devices

## Language Specifications
- Passage Length: 150-180 words
- Sentence Complexity: Complex with abstract concepts
- Vocabulary Profile: CSAT+O3000

## Question Format Requirements
- Stem: "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은? [3점]"
- Given Sentence: Displayed before the passage
- Options: ①, ②, ③, ④, ⑤
- Correct Answer: Must be the optimal position`
  },
  {
    id: 40,
    label: "40번: 요약문 완성",
    category: 'reading_academic',
    prompt: `Create a CSAT Reading Item 40 (Summary Completion).

## Assessment Objective
- Core Skill: Completing a summary by selecting appropriate word pairs
- Cognitive Process: Comprehend passage → Analyze summary → Select fitting words
- Difficulty Target: 중상 (예상 정답률 55–70%)

## Text Type & Structure
- Format: Expository passage + summary with two blanks (A), (B)
- Structure Pattern: Passage presents main idea, summary condenses it
- Summary Function: Accurate condensation of passage content

## Language Specifications
- Passage Length: 160-200 words
- Summary Length: 40-60 words
- Vocabulary Profile: CSAT+O3000

## Question Format Requirements
- Stem: "다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?"
- Options: 5 pairs of words "(A) — (B)"
- Correct Answer: Must accurately complete the summary`
  },
  {
    id: 41,
    label: "41-42번: 장문 세트 1",
    category: 'reading_long',
    prompt: `Create a CSAT Reading Item 41-42 (Long Passage Set).

## Assessment Objective
- Core Skill: Dual assessment - title selection and vocabulary/content matching
- Cognitive Process: Comprehend extended text → Identify main theme → Verify details
- Difficulty Target: 중 (예상 정답률 70–85%)

## Text Type & Structure
- Format: Extended passage (biography, narrative, or academic/informational)
- Structure Pattern: Introduction → Development → Details → Conclusion
- Content: Rich with both thematic and factual information

## Language Specifications
- Passage Length: 250-300 words
- Sentence Complexity: Varied
- Vocabulary Profile: CSAT

## Question Format Requirements
- Item 41: Title selection - "위 글의 제목으로 가장 적절한 것은?"
- Item 42: Vocabulary mismatch - "위 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?"

## JSON Output Format
Return JSON with "set_instruction", "stimulus", and "questions" array containing both items.`
  },
  {
    id: 43,
    label: "43-45번: 장문 세트 2",
    category: 'reading_long',
    prompt: `Create a CSAT Reading Item 43-45 (Long Passage Set - Scrambled Narrative).

## Assessment Objective
- Core Skill: Triple assessment - sentence ordering, referent identification, and fact matching
- Cognitive Process: Complex text analysis requiring multiple reading skills
- Difficulty Target: 상 (예상 정답률 50–65%)

## Text Type & Structure
- Format: Extended narrative with scrambled sections
- Structure Pattern: Given intro (A) + 3 scrambled paragraphs (B), (C), (D)
- Complexity: Requires understanding of both macro and micro structure

## Language Specifications
- Passage Length: 280-350 words total
- Sentence Complexity: Complex with sophisticated cohesion
- Vocabulary Profile: CSAT+O3000

## Question Format Requirements
- Item 43: Ordering - "주어진 글 (A)에 이어질 내용을 순서에 맞게 배열한 것으로 가장 적절한 것은?"
- Item 44: Referent - "밑줄 친 (a)~(e) 중에서 가리키는 대상이 나머지 넷과 다른 것은?"
- Item 45: Fact Match - "윗글에 관한 내용으로 적절하지 않은 것은?"

## JSON Output Format
Return JSON with "set_instruction", "stimulus" (with intro and paragraphs), and "questions" array containing all three items.`
  }
];

// ========== Utility Functions ==========
export function getQuestionTypeById(id: number): QuestionType | undefined {
  return QUESTION_TYPES.find(q => q.id === id);
}

export function getQuestionTypesByCategory(category: string): QuestionType[] {
  return QUESTION_TYPES.filter(q => q.category === category);
}

export function getPassageStructuresByType(type: string): PassageStructure[] {
  return PASSAGE_STRUCTURES.filter(p => p.applicableTypes.includes(type));
}

export function buildFullPrompt(questionType: QuestionType, options?: {
  topic?: string;
  difficulty?: string;
  passageStructure?: string;
}): string {
  let fullPrompt = questionType.prompt;

  if (options?.topic) {
    fullPrompt += `\n\n## Topic Specification\nGenerate content about: ${options.topic}`;
  }

  if (options?.difficulty) {
    fullPrompt += `\n\n## Difficulty Level\nTarget difficulty: ${options.difficulty}`;
  }

  if (options?.passageStructure) {
    const structure = PASSAGE_STRUCTURES.find(p => p.id === options.passageStructure);
    if (structure) {
      fullPrompt += `\n\n## Passage Structure\nUse ${structure.label}: ${structure.description}`;
    }
  }

  return fullPrompt;
}
