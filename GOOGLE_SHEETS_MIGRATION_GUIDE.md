# 수능 영어 문항 생성 시스템 - Google Sheets 마이그레이션 가이드

## 개요
이 문서는 현재 Node.js/SQLite 기반 앱의 프롬프트와 검증 시스템을 Google Sheets + Apps Script로 마이그레이션하는 완전한 가이드입니다.

---

## Part 1: Google Sheets 구조 (총 15개 시트)

### 시트 목록
| 번호 | 시트명 | 용도 |
|------|--------|------|
| 1 | Prompts_Master | 프롬프트 목록 (메타데이터) |
| 2 | Prompts_Content | 프롬프트 본문 (실제 텍스트) |
| 3 | Prompts_Versions | 버전 히스토리 |
| 4 | Thinking_Types | 문항별 사고 유형 + 키워드 |
| 5 | Keyword_Categories | 오답/변별력/난이도/출력포맷 키워드 |
| 6 | Word_Count_Ranges | 문항별 지문 길이 기준 |
| 7 | Forbidden_Patterns | 금지 패턴 (정규식) |
| 8 | Prompt_Validation_Rules | 프롬프트 검증 규칙 |
| 9 | Item_Validation_Rules | 문항 검증 규칙 |
| 10 | LLM_Evaluation_Criteria | LLM 평가 기준 |
| 11 | Verdict_Rules | 판정 규칙 |
| 12 | Regeneration_Triggers | 재생성 트리거 |
| 13 | Distractor_Error_Types | 오답 오류 유형 |
| 14 | Config | 시스템 설정 |
| 15 | Metrics | 성능 메트릭스 |

---

## Part 2: 각 시트 데이터 (탭 구분 - 복사하여 붙여넣기)

### Sheet 1: Prompts_Master (prompt2026_01_24_allset.json 기준 - 총 95개)

**데이터 소스**: `docs/prompt2026_01_24_allset.json`

```
prompt_key	title	category	status	is_default	active	created_at	updated_at
MASTER_PROMPT	KSAT System Prompt	SYSTEM	published	1	1	2026-01-03	2026-01-24
PASSAGE_MASTER	KSAT Passage Generator	SYSTEM	published	1	1	2026-01-03	2026-01-24
LC01	듣기 LC01 문항 (목적)	LC	published	1	1	2026-01-03	2026-01-24
LC02	듣기 LC02 문항 (의견)	LC	published	1	1	2026-01-03	2026-01-24
LC03	듣기 LC03 문항	LC	published	1	1	2026-01-03	2026-01-24
LC04	듣기 LC04 문항	LC	published	1	1	2026-01-03	2026-01-24
LC05	듣기 LC05 문항	LC	published	1	1	2026-01-03	2026-01-24
LC06	듣기 LC06 문항 (금액)	LC	published	1	1	2026-01-03	2026-01-24
LC07	듣기 LC07 문항	LC	published	1	1	2026-01-03	2026-01-24
LC08	듣기 LC08 문항	LC	published	1	1	2026-01-03	2026-01-24
LC09	듣기 LC09 문항	LC	published	1	1	2026-01-03	2026-01-24
LC10	듣기 LC10 문항	LC	published	1	1	2026-01-03	2026-01-24
LC11	듣기 LC11 문항	LC	published	1	1	2026-01-03	2026-01-24
LC12	듣기 LC12 문항	LC	published	1	1	2026-01-03	2026-01-24
LC13	듣기 LC13 문항	LC	published	1	1	2026-01-03	2026-01-24
LC14	듣기 LC14 문항	LC	published	1	1	2026-01-03	2026-01-24
LC15	듣기 LC15 문항	LC	published	1	1	2026-01-03	2026-01-24
LC16	듣기 LC16 문항	LC	published	1	1	2026-01-24	2026-01-24
LC16_17	듣기 LC16_17 문항	LC_SET	published	1	1	2026-01-03	2026-01-24
LC17	듣기 LC17 문항	LC	published	1	1	2026-01-24	2026-01-24
RC18	독해 RC18 문항	RC	published	1	1	2026-01-03	2026-01-24
RC19	독해 RC19 문항	RC	published	1	1	2026-01-03	2026-01-24
RC20	읽기 RC20 문항 (주장)	RC	published	1	1	2026-01-03	2026-01-24
RC21	읽기 RC21 문항 (함축의미)	RC	published	1	1	2026-01-03	2026-01-24
RC22	독해 RC22 문항	RC	published	1	1	2026-01-03	2026-01-24
RC23	독해 RC23 문항	RC	published	1	1	2026-01-03	2026-01-24
RC24	독해 RC24 문항	RC	published	1	1	2026-01-03	2026-01-24
RC25	읽기 RC25 문항 (도표)	RC	published	1	1	2026-01-15	2026-01-24
RC26	읽기 RC26 문항 (인물 내용일치)	RC	published	1	1	2026-01-15	2026-01-24
RC27	읽기 RC27 문항 (실용문 내용일치)	RC	published	1	1	2026-01-15	2026-01-24
RC28	읽기 RC28 문항 (실용문 내용일치)	RC	published	1	1	2026-01-15	2026-01-24
RC29	RC29 어법(밑줄) - Grammar Error	RC	published	1	1	2026-01-03	2026-01-24
RC30	독해 RC30 문항	RC	published	1	1	2026-01-03	2026-01-24
RC31	독해 RC31 문항	RC	published	1	1	2026-01-03	2026-01-24
RC32	독해 RC32 문항	RC	published	1	1	2026-01-03	2026-01-24
RC33	독해 RC33 문항	RC	published	1	1	2026-01-03	2026-01-24
RC34	읽기 RC34 문항 (빈칸 - 고난도)	RC	published	1	1	2026-01-03	2026-01-24
RC35	읽기 RC35 문항 (무관한 문장)	RC	published	1	1	2026-01-03	2026-01-24
RC36	읽기 RC36 문항 (순서배열)	RC	published	1	1	2026-01-03	2026-01-24
RC37	읽기 RC37 문항 (순서배열 고난도)	RC	published	1	1	2026-01-03	2026-01-24
RC38	읽기 RC38 문항 (문장삽입)	RC	published	1	1	2026-01-03	2026-01-24
RC39	읽기 RC39 문항 (문장삽입 고난도)	RC	published	1	1	2026-01-03	2026-01-24
RC40	읽기 RC40 문항 (요약문)	RC	published	1	1	2026-01-03	2026-01-24
RC41	읽기 RC41 문항	RC	published	1	1	2026-01-24	2026-01-24
RC41_42	읽기 RC41-42 세트 문항	RC_SET	published	1	1	2026-01-03	2026-01-24
RC42	읽기 RC42 문항	RC	published	1	1	2026-01-24	2026-01-24
RC43	읽기 RC43 문항	RC	published	1	1	2026-01-24	2026-01-24
RC43_45	읽기 RC43-45 세트 문항	RC_SET	published	1	1	2026-01-03	2026-01-24
RC44	읽기 RC44 문항	RC	published	1	1	2026-01-24	2026-01-24
RC45	읽기 RC45 문항	RC	published	1	1	2026-01-24	2026-01-24
P01	LC01 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P02	LC02 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P03	LC03 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P04	LC04 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P05	LC05 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P06	LC06 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P07	LC07 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P08	LC08 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P09	LC09 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P10	LC10 지문 생성	PASSAGE	published	1	1	2026-01-03	2026-01-24
P11	LC11 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P12	LC12 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P13	LC13 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P14	LC14 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P15	LC15 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P16	LC16 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P17	LC17 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P18	RC18 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P19	RC19 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P20	RC20 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P21	RC21 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P22	RC22 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P23	RC23 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P24	RC24 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P25	RC25 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P26	RC26 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P27	RC27 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P28	RC28 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P29	RC29 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P30	RC30 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P31	RC31 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P32	RC32 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P33	RC33 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P34	RC34 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P35	RC35 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P36	RC36 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P37	RC37 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P38	RC38 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P39	RC39 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P40	RC40 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P41	RC41 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P42	RC42 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P43	RC43 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P44	RC44 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
P45	RC45 지문 생성	PASSAGE	published	1	1	2026-01-24	2026-01-24
```

---

### Sheet 2: Prompts_Content (실제 프롬프트 본문)

**주의**: 각 행은 `prompt_key` + TAB + `prompt_text` 형식입니다.

```
prompt_key	prompt_text
MASTER_PROMPT	[Role] You are an expert item writer for the Korean CSAT (KSAT) English test. Your task is to create exactly ONE test item in JSON format that strictly follows the MASTER schema and the item-specific instructions. Output ONLY a single JSON object (no code fences, no extra text). Required fields include: item_no, section (LC/RC), question, options (5), answer (1–5), explanation, and type-specific fields such as lc_script, passage, grammar_meta, gapped_passage, meta. Do not change the given passage text for RC. For LC, use lc_script for the listening script.
PASSAGE_MASTER	[역할] 당신은 한국 수능 영어 지문을 쓰는 전문 출제위원입니다. 입력으로 주어지는 ITEM 유형, LEVEL(난이도), TOPIC(주제) 정보를 참고하여 KSAT 스타일의 영어 지문만 작성합니다. 지문에는 질문, 선택지, 밑줄, 빈칸, 해설 등을 절대 포함하지 않습니다. 여러 문단이 필요하면 문단 사이에 한 줄을 비워 구분합니다. TYPE(예: RC29/31/33, 세트 41–45 등)에 따라 요구되는 분량(단어 수)과 글의 성격(설명/논설)을 맞추되, 항상 자연스럽고 논리적인 영어 글을 생성합니다.
1	[LC1 Purpose] Create a short 2–3 turn dialogue where the purpose of one speaker's speech can be inferred (e.g., to ask, to request, to confirm, to complain, to inform). Do NOT use explicit cues like "I'm calling to…". Question: "What is the purpose of the woman's (or man's) speech?" Provide 5 purpose options; only one must match the dialogue. Length: about 60–80 words.
2	[LC2 Location] Generate a 2–3 turn conversation where the location is not named directly but is inferable from contextual clues (objects, actions, announcements). Question: "Where is the conversation most likely taking place?" Provide 5 location options; only one must be strongly supported. Length: 55–75 words.
3	[LC3 Relationship] Generate a 2–3 turn conversation where the relationship between speakers (teacher–student, client–agent, buyer–seller, coworkers, etc.) is implied by tone and behavior, not explicitly stated. Question: "What is the relationship between the speakers?" Provide 5 relationship options; only one fits. Length: 55–80 words.
4	[LC4 Attitude] Create a conversation showing a clear emotional tone or attitude (relieved, disappointed, annoyed, grateful, worried) without naming it directly. Question: "How does the woman feel?" or "What is the man's attitude?" Provide 5 adjective options; one correct, others semantically close but wrong. Length: 60–80 words.
5	[LC5 Detail/True/NotMentioned] Write a 3-turn conversation including 3–4 key facts (time, place, plan, preference). Question: either "Which of the following is NOT mentioned?" or "Which statement is true according to the conversation?" Provide 5 statements; exactly one must satisfy the question type. Length: 65–90 words.
6	[LC6 Picture Matching] Create a conversation that would match exactly one picture among five. In this system, each option is written as a short description of a picture. Question: "Which picture matches the conversation?" Provide 5 distinct descriptions; only one fully matches the dialogue. Length: 50–70 words.
7	[LC7 Topic] Write a dialogue in which two speakers discuss one main topic (e.g., planning an event, solving a problem, sharing an opinion). Question: "What are the speakers mainly talking about?" Provide 5 topic options; only one must summarize the conversation. Length: 55–80 words.
8	[LC8 Detail] Construct a conversation that clearly includes a key detail (time, date, place, quantity, selected option). Question asks for this detail (e.g., "When will they meet?"). Provide 5 close options; only one matches. Length: 60–90 words.
9	[LC9 Next Action] Create a dialogue where a logical next action of one speaker is implied by the discussion. Avoid explicit "I will now…" statements. Question: "What will the woman do next?" or similar. Provide 5 actions; only one naturally follows. Length: 60–85 words.
10	[LC10 Reason] Generate a conversation where a reason or cause (for being late, disappointed, worried, etc.) is implied. Question: "Why does the man feel disappointed?" or similar. Provide 5 possible reasons; only one is supported by the dialogue. Length: 60–85 words.
11	[LC11 Suggestion] Write a conversation where one speaker suggests or recommends something as a solution or idea. Question: "What does the woman suggest the man do?" Provide 5 suggestions; only one matches. Length: 60–90 words.
12	[LC12 Phone Message] Create a phone message or voicemail-style monologue: greeting → main message (info + request) → closing. Question: "What is the purpose of the message?" Provide 5 purpose options (ask for help, confirm, apologize, invite, inform of a change); one correct. Length: 70–95 words.
13	[LC13 Announcement] Produce a short announcement/advertisement/notice (e.g., event, sale, schedule change, lost item). Question: "What is the announcement mainly about?" or "What is being advertised?" Provide 5 topic options; only one correct. Length: 60–90 words.
14	[LC14 Table/Chart Listening] Generate a conversation where speakers refer to simple quantitative info (prices, times, amounts). Question asks for a specific numerical fact. Provide 5 numeric options; only one is correct. Length: 65–95 words.
15	[LC15 Informational Speech] Write a monologue-style informational speech or announcement (greeting → purpose → key points → closing). Question: "What is the main purpose of the announcement?" Provide 5 purpose options (inform, instruct, warn, invite, remind); one correct. Length: 80–110 words.
16	[LC16 Set Q1] This item is the first question of the LC16–17 listening set sharing a single lc_script. For item 16, create a question focusing on global meaning or key information of the shared script (topic, main idea, or important detail). Use only the shared script; do not create a new one here. Provide 5 options; one correct.
17	[LC17 Set Q2] This item is the second question of the LC16–17 set. Create a question targeting a different aspect of the same shared lc_script (e.g., speaker's attitude, another detail, or next action). Ensure there is no overlap with LC16's focus. Provide 5 options; one correct.
18	[RC18 Topic] Given the reading passage, create a question asking for the main topic or subject. Provide 5 options; only one should clearly capture the topic of the whole passage. Distractors should be related but too narrow, too broad, or off-focus. Do not modify the passage.
19	[RC19 Title] Create a 'best title' question for the given passage. The correct title must concisely express the overall message. Distractors should be plausible but incomplete, overly specific, or overly general. Provide 5 options; one correct.
20	[RC20 Gist] Make a question asking for the gist or core message of the passage. Provide 5 summary statements; only one must match the main point. Distractors may focus on supporting details or partial ideas.
21	[RC21 Author's Purpose] Create a question about the author's purpose (to persuade, to criticize, to explain, to warn, to encourage, etc.). Provide 5 options in the form "To ~". Only one should match the overall intent of the passage.
22	[RC22 Emphasis] Produce a question asking what the author emphasizes in the passage. The correct option must represent the main argument or key emphasis. Distractors should represent secondary or background ideas.
23	[RC23 Claim] Create a question identifying the author's main claim or assertion. Provide 5 statements; only one must match the central claim supported by the passage.
24	[RC24 Function of Example] Create a question asking what role a specific example or illustration plays in the passage. Options should describe functions such as "to support the main idea", "to provide a contrast", "to give an explanation", "to show a consequence", etc.
25	[RC25 Chart/Graph] Using CHART_DATA provided in context, create a KSAT-style chart/graph interpretation item. Generate 5 statements about the chart; exactly one must be correct (or incorrect) according to the instructions. All numeric and comparative information must be logically consistent with CHART_DATA. Do not rewrite or alter the underlying data.
26	[RC26 Sentence Blank] Create a question asking which sentence best fits a given blank in the passage. Provide 5 sentence options; only one must restore logical flow and coherence. Distractors should be locally plausible but globally inconsistent. Do not modify other sentences.
27	[RC27 Abstract Blank] Make a higher-level blank-completion question requiring abstract or conceptual inference. One option must integrate ideas before and after the blank in a meaningful way. Avoid trivial or purely factual completions. Provide 5 options; one correct.
28	[RC28 Function/Transition] Create a question asking how a specific underlined sentence functions in the passage (introducing a topic, contrasting, giving an example, summarizing, etc.). Provide 5 functional descriptions; only one fits the sentence in context.
29	[RC29 Grammar] Based on the given passage with exactly 5 underlined segments (<u>...</u>), write a question asking which underlined part is grammatically incorrect or inappropriate. Provide 5 options corresponding to each underlined segment, answer (1–5), explanation, and grammar_meta (error type). Never change non-underlined text.
30	[RC30 Vocabulary] Create a vocabulary-in-context question about an underlined word/phrase. Provide 5 meaning options; one closest in meaning, others semantically related but incorrect. Avoid dictionary-style meta-language; stay within context.
31	[RC31 Single Blank] From the given passage, form a single-blank item by removing one key sentence or clause. Output gapped_passage (with a single [BLANK] or equivalent marker) and 5 completion options. Only one option must make the passage logically and semantically coherent. Do not alter non-blank text.
32	[RC32 Summary] Create a question asking for the best summary of a specified paragraph or section. Provide 5 summary statements; only one accurately reflects the central content. Distractors must focus on partial or peripheral information.
33	[RC33 Long Single Blank] For a longer multi-paragraph passage, create a single-blank completion item that tests global logical flow. Provide 5 options; only one should maintain the deeper argument or reasoning. Academic/abstract style required.
34	[RC34 Sentence Insertion] Design a sentence insertion item. Provide 5 sentence options; only one must fit at a marked insertion point in the passage, given pronoun reference, discourse markers, and logical order.
35	[RC35 Ordering] Provide 5 choices representing different orders of 3–5 given scrambled sentences. Only one order should form a coherent paragraph. Ensure that temporal, causal, and referential cues support the correct sequence.
36	[RC36 Logical Completion] Create a blank-completion item requiring higher-order logical inference (e.g., contrast, concession, cause–effect). The correct option must be consistent with both the local sentence and the global argument.
37	[RC37 Practical Reading] Create a question based on a practical text (notice, flyer, schedule, instructions). Provide 5 options; only one matches explicit information in the text. Focus on realistic reading tasks.
38	[RC38 Structure] Make a question asking about the passage's overall organizational pattern (comparison-contrast, cause-effect, problem-solution, definition-example, etc.). Provide 5 structure labels or descriptions; one correct.
39	[RC39 Reference] Create a question asking what a pronoun or referring expression (it, they, this, such a phenomenon, etc.) refers to. Provide 5 candidate antecedents; only one is correct in context.
40	[RC40 Logical Flow] Construct a question about the logical relation between ideas or paragraphs (e.g., cause–effect, contrast, elaboration, concession, sequence). Provide 5 descriptions; only one matches the relation in the passage.
41	[RC41 Set Q1] This is the first item of a two-question reading set (41–42) sharing one passage. For item 41, create a global comprehension question (main idea, best title, or author's purpose). The question must require understanding of the entire passage. Provide 5 options; one correct.
42	[RC42 Set Q2] This is the second item of the 41–42 set. Using the same passage, create a question that focuses on a different skill (inference, specific detail, paragraph function, etc.). Ensure that RC42 does not duplicate the focus of RC41.
43	[RC43 Set Q1] This is the first item of a three-question reading set (43–45). Using the shared passage, create a global comprehension question (main idea, title, or purpose). Provide 5 options; one correct.
44	[RC44 Set Q2] Using the same passage as RC43, create a question focusing on inference, detail, or author's attitude. Avoid overlap with RC43 and RC45. Provide 5 options; one correct.
45	[RC45 Set Q3] Using the same passage as RC43 and RC44, create a question about logical structure, sentence insertion, or partial summary. Ensure that the three questions together cover complementary aspects of the passage.
P1	당신은 한국 수능 영어 듣기 1번(여자가 하는 말의 목적) 스타일의 대화를 쓰는 출제위원이다. '여자가 하는 말의 목적'을 파악할 수 있는 3~4턴짜리 짧은 대화를 영어로 작성하라. 화자는 Woman(W)과 Man(M) 두 사람이며, 마지막에 여자의 발화에 그녀의 의도(요청, 제안, 안내, 확인, 사과 등)가 분명히 드러나게 한다. 문제·보기·정답은 쓰지 말고 W:, M: 라벨을 붙인 영어 대화만 출력한다.
P2	당신은 한국 수능 영어 듣기 2번(남자의 의견/태도) 스타일의 대화를 쓰는 출제위원이다. '남자의 의견이나 태도'를 추론할 수 있는 3~4턴짜리 대화를 영어로 작성하라. 화자는 W와 M이며, 남자는 어떤 제안·상황·계획 등에 대해 자신의 태도(찬성, 반대, 걱정, 망설임 등)를 말로 드러내야 한다. 태도는 너무 직설적이지 않지만, 듣고 나면 한 가지로 추론 가능한 수준이어야 한다. 문제·보기·정답은 쓰지 말고 W:, M: 형식의 대화만 출력한다.
P3	당신은 한국 수능 영어 듣기 3번(여자의 말의 요지) 스타일의 대화를 쓰는 출제위원이다. 여자의 발화 전체의 핵심 내용(요지)을 파악할 수 있는 3~4턴짜리 대화를 영어로 작성하라. 여자는 자신의 생각이나 조언, 설명을 비교적 길게 말하고, 남자는 짧게 반응한다. 세부 예시는 1~2개만 포함하고, 전체 메시지가 하나의 요지로 정리될 수 있도록 구성한다. 문제·보기·정답은 쓰지 말고 W:, M: 라벨을 붙인 대화만 출력한다.
P4	당신은 한국 수능 영어 듣기 4번(그림/장면 일치) 스타일의 대화를 쓰는 출제위원이다. 어떤 그림 또는 장면과 일치 여부를 판단할 수 있는 3~4턴짜리 영어 대화를 작성하라. 두 화자는 사람·사물의 위치, 행동, 복장, 개수 등 시각적 요소를 3~5개 정도 언급한다. 대화를 들으면 한 가지 장면이 떠오르도록 구체적으로 표현하되 지나치게 복잡하게 만들지 않는다. 문제·보기·정답은 만들지 말고 W:, M: 형식의 대화만 출력한다.
P5	당신은 한국 수능 영어 듣기 5번(대화 후 남자가 할 일) 스타일의 대화를 쓰는 출제위원이다. 대화가 끝난 뒤 남자가 앞으로 할 일을 한 가지로 추론할 수 있는 3~4턴짜리 영어 대화를 작성하라. 두 화자는 일정, 약속, 준비물, 장소 이동 등과 관련된 내용을 이야기하고, 마지막 부분에서 남자가 무엇을 하기로 결정하는지 분명히 드러나게 한다. 문제·보기·정답은 쓰지 말고 W:, M: 형식의 대화만 출력한다.
P6	당신은 한국 수능 영어 듣기 6번(지불할 금액) 스타일의 대화를 쓰는 출제위원이다. 두 사람이 물건이나 서비스의 가격, 수량, 할인, 쿠폰, 세금 등을 이야기하는 3~4턴짜리 영어 대화를 작성하라. 대화 속 정보만으로 최종 지불해야 할 금액을 계산할 수 있어야 한다. 숫자와 단위($, dollars, won 등)를 자연스럽게 포함하고, 계산 과정이 한 번에 추론 가능하도록 정보를 제공한다. 문제·보기·정답은 만들지 말고 W:, M: 형식의 대화만 출력한다.
P7	당신은 한국 수능 영어 듣기 7번(참석 불가 이유) 스타일의 대화를 쓰는 출제위원이다. 두 사람이 어떤 행사나 모임, 약속에 대해 이야기하면서 남자 또는 여자가 참석하지 못하는 이유를 설명하는 3~4턴짜리 영어 대화를 작성하라. 일정 충돌, 건강, 교통, 가족 행사 등 일상적인 이유를 사용하며, 마지막에는 불참 이유가 한 가지로 명확히 드러나야 한다. 문제·보기·정답은 쓰지 말고 W:, M: 형식의 대화만 출력한다.
P8	당신은 한국 수능 영어 듣기 8번(안내문에서 언급되지 않은 정보) 스타일의 대화를 쓰는 출제위원이다. 두 사람이 어떤 행사 안내문, 광고, 게시물 등을 보고 대화를 나누는 상황을 영어로 작성하라. 대화 속에서 안내문에 적혀 있는 정보와 적혀 있지 않은 정보를 구분할 수 있어야 한다. 안내문에 포함될 만한 정보(시간, 장소, 대상, 조건 등)를 3~5개 정도 언급하되, 일부 정보는 의도적으로 빠져 있도록 구성한다. 문제·보기·정답은 만들지 말고 W:, M: 형식의 대화만 출력한다.
P9	당신은 한국 수능 영어 듣기 9번(실용문 내용 불일치) 스타일의 지문을 쓰는 출제위원이다. 어떤 공지, 광고, 안내, 이메일 등 실용문 한 편을 영어로 작성하라. 수험생은 이후 제시되는 진술 중 어느 것이 지문 내용과 일치하지 않는지를 찾게 된다. 따라서 사실 정보(날짜, 장소, 조건, 대상, 금액 등)를 4~6개 정도 포함하고, 서로 혼동될 수 있는 요소도 일부 넣되 모순은 만들지 않는다. 길이는 약 120~150단어로 하고, 실용문 형식을 유지한다.
P10	당신은 한국 수능 영어 듣기 10번(표 정보 선택) 스타일의 지문을 쓰는 출제위원이다. 표 또는 일정표와 함께 제시될 짧은 설명문을 영어로 작성하라. 설명문에는 일정, 프로그램, 좌석, 가격대 등 표의 항목과 연결되는 정보가 포함되어야 한다. 수험생은 듣기 후 표에서 알맞은 항목을 선택할 수 있어야 하므로, 서로 다른 선택지를 구분할 수 있을 만큼 구체적으로 정보를 제시한다. 길이는 약 100~130단어로 한다.
P11	당신은 한국 수능 영어 듣기 11번(마지막 말에 대한 응답, 3점) 스타일의 대화를 쓰는 출제위원이다. 대화의 마지막에 한 사람이 말한 내용에 대해 적절한 응답을 고를 수 있는 3~4턴짜리 영어 대화를 작성하라. 마지막 화자의 발화는 상황과 감정, 의도 등이 드러나도록 하고, 그에 어울리는 다양한 응답이 떠오를 수 있도록 약간 복합적인 맥락을 제공한다. 문제·보기·정답은 만들지 말고 W:, M: 형식의 대화만 출력한다.
P12	당신은 한국 수능 영어 듣기 12번(마지막 말에 대한 응답) 스타일의 대화를 쓰는 출제위원이다. 일상적이고 비교적 간단한 상황에서 마지막 화자의 말에 어울리는 응답을 고를 수 있는 3~4턴짜리 영어 대화를 작성하라. 맥락은 너무 복잡하지 않게 하되, 단순 암기가 아니라 상황 이해가 필요하도록 구성한다. 문제·보기·정답은 만들지 말고 W:, M: 형식의 대화만 출력한다.
P13	당신은 한국 수능 영어 듣기 13번(마지막 말에 대한 응답) 스타일의 대화를 쓰는 출제위원이다. 학교, 동아리, 친구 사이 등의 상황에서 마지막 화자의 말에 대한 적절한 응답을 고를 수 있는 3~4턴짜리 영어 대화를 작성하라. 화자들의 관계와 상황이 자연스럽게 드러나도록 하고, 마지막 말은 의문, 제안, 감사, 사과, 위로 등 여러 유형이 가능하도록 구성한다. 문제·보기·정답은 만들지 말고 W:, M: 형식의 대화만 출력한다.
P14	당신은 한국 수능 영어 듣기 14번(마지막 말에 대한 응답, 3점) 스타일의 대화를 쓰는 출제위원이다. 직장, 진로, 프로젝트, 동아리 활동 등 비교적 복잡한 상황에서 마지막 화자의 말에 대한 적절한 응답을 고를 수 있는 3~4턴짜리 영어 대화를 작성하라. 대화 중에 여러 정보와 감정이 섞여 있어, 마지막 말을 이해하려면 앞 내용을 종합해야 한다. 문제·보기·정답은 만들지 말고 W:, M: 형식의 대화만 출력한다.
P15	당신은 한국 수능 영어 듣기 15번(상황 설명에 대한 반응, 3점) 스타일의 대화를 쓰는 출제위원이다. 한 화자가 자신의 상황이나 문제를 설명하고, 다른 화자가 적절한 반응을 보이는 3~4턴짜리 영어 대화를 작성하라. 상황 설명에는 시간 제약, 선택의 갈등, 예기치 못한 사건 등이 포함될 수 있으며, 이를 이해해야 올바른 반응을 고를 수 있도록 구성한다. 문제·보기·정답은 만들지 말고 W:, M: 형식의 대화만 출력한다.
P16	당신은 한국 수능 영어 듣기 16·17번 세트 지문(주제/언급X) 스타일의 공통 지문을 쓰는 출제위원이다. 한 편의 비교적 짧은 설명문 또는 인터뷰 스크립트를 영어로 작성하라. 이 지문은 16번에서 전체 주제를 묻고, 17번에서 지문에서 언급되지 않은 정보를 묻는 데 사용된다. 주제는 하나로 명확해야 하며, 세부 정보는 4~6개 정도 포함한다. 길이는 약 150~180단어로 하고, 질문·보기·정답은 포함하지 않는다.
P17	당신은 한국 수능 영어 듣기 16·17번 세트 지문과 동일한 유형의 공통 지문을 쓰는 출제위원이다. 실제 시스템에서는 보통 16번에서 생성한 지문을 재사용하므로, 이 프롬프트도 16번과 동일한 형식의 설명문 또는 인터뷰 스크립트를 상정한다. 주제는 하나로 통일하고, 세부 정보는 4~6개 정도 포함하며, 길이는 약 150~180단어로 한다. 질문·보기·정답은 포함하지 않는다.
P18	당신은 한국 수능 영어 RC18(안내문의 목적) 문항용 실용문을 쓰는 출제위원이다. 행사 안내, 서비스 변경, 프로그램 신청, 규정 변경 등 안내문의 전형적인 상황 중 하나를 선택하여 영어 안내문을 작성하라. 안내문의 전체 목적이 하나로 명확하게 정리될 수 있어야 하며, 시간·장소·대상·조건 등 사실 정보를 3~5개 정도 포함한다. 길이는 약 110~150단어로 하고, 제목은 쓰지 말며 본문만 작성한다.
P19	당신은 한국 수능 영어 RC19(심경 변화) 문항용 지문을 쓰는 출제위원이다. 한 인물이 겪는 사건과 그에 따른 감정 변화를 추론할 수 있는 짧은 내러티브를 영어로 작성하라. 글 앞부분에서는 인물의 초기 감정을 암시적으로, 뒷부분에서는 달라진 감정을 비교적 분명하게 드러내며, 사건은 일상적이되 의미 있는 변화의 계기가 되어야 한다. 길이는 약 130~160단어로 한다.
P20	당신은 한국 수능 영어 RC20(필자의 주장) 문항용 논설문을 쓰는 출제위원이다. 교육, 사회, 환경, 기술, 인간관계 등 일반적인 주제 중 하나를 선택하여 필자의 주장을 분명히 드러내는 글을 영어로 작성하라. 도입부에서 문제를 제기하고, 본문에서 근거 2~3개를 제시하며, 결론에서 주장을 다시 정리한다. 주장은 글 전체에서 일관되게 유지되어야 한다. 길이는 약 150~180단어로 한다.
P21	당신은 한국 수능 영어 RC21(비유적 표현/함축 의미) 문항용 지문을 쓰는 출제위원이다. 한두 개의 비유적 표현이나 은유, 상징적 표현을 포함한 단락을 영어로 작성하라. 수험생은 문맥을 통해 그 표현의 의미를 추론해야 하며, 비유가 글의 주제와 자연스럽게 연결되어야 한다. 글의 길이는 약 130~160단어이며, 비유적 표현은 지나치게 난해하지 않게 한다.
P22	당신은 한국 수능 영어 RC22(요지) 문항용 지문을 쓰는 출제위원이다. 글 전체의 핵심 메시지가 하나로 통일된 단락을 영어로 작성하라. 주제는 교육, 인간관계, 환경, 기술, 진로 등 일반적인 범위에서 선택하고, 예시나 세부 사항은 그 핵심 메시지를 뒷받침하는 수준으로만 사용한다. 요지는 문단의 첫 문장 또는 마지막 문장에서 자연스럽게 드러나도록 하고, 길이는 약 130~160단어로 한다.
P23	당신은 한국 수능 영어 RC23(내용 전개/사회·경제 주제) 문항용 지문을 쓰는 출제위원이다. 사회·경제·노동·기술 변화 등과 관련된 주제를 선택하여 하나의 주장 또는 관점을 중심으로 글을 영어로 작성하라. 글은 원인–결과, 문제–해결, 비교–대조 등의 구조 중 하나를 사용해 전개하며, 핵심 아이디어는 하나로 일관되게 유지한다. 길이는 약 150~180단어로 한다.
P24	당신은 한국 수능 영어 RC24(제목) 문항용 지문을 쓰는 출제위원이다. 글 전체를 하나의 제목으로 요약할 수 있는 단락을 영어로 작성하라. 도입에서 주제를 소개하고, 본문에서 관련 이유·예시를 2~3개 제시하며, 마지막에서 중심 메시지를 다시 강조한다. 글 곳곳에서 같은 핵심 개념이 반복되어 제목을 고르기 쉽게 해야 한다. 길이는 약 120~150단어로 한다.
P25	당신은 한국 수능 영어 RC25(도표/그래프) 문항용 지문을 쓰는 출제위원이다. 이미 주어진 그래프나 표를 설명하는 짧은 영어 설명문을 작성한다고 가정하라. 도표의 제목, 축, 범주, 추세 등을 자연스럽게 언급하며, 비교나 증감 표현을 포함한다. 수험생은 진술 5개 중 도표와 일치하는 것을 고르게 되므로, 설명문은 도표의 전반적인 특징과 일부 구체적 수치를 함께 전달해야 한다. 길이는 약 120~150단어로 한다.
P26	당신은 한국 수능 영어 RC26(사실 여부 판단) 문항용 지문을 쓰는 출제위원이다. 한 인물, 단체, 제도, 물건 등을 소개하는 설명문을 영어로 작성하라. 이름, 역할, 특징, 활동, 시기 등 사실 정보를 4~6개 정도 포함하고, 서로 비교될 수 있는 요소를 적절히 섞는다. 수험생은 이후 진술이 지문 내용과 일치하는지 판단하게 되므로, 정보는 분명하되 너무 단순하지 않게 구성한다. 길이는 약 130~160단어로 한다.
P27	당신은 한국 수능 영어 RC27(실용문 일치, 패스 카드 등) 문항용 지문을 쓰는 출제위원이다. 특정 서비스, 멤버십, 패스 카드, 이용권 등을 설명하는 실용문을 영어로 작성하라. 사용 조건, 가격 구간, 혜택, 예외 사항 등을 4~6개 정도 포함하고, 서로 헷갈릴 수 있는 부분도 일부 포함한다. 길이는 약 120~150단어로 하고, 표나 그림 없이 본문만 작성한다.
P28	당신은 한국 수능 영어 RC28(실용문 일치, 안내/홍보) 문항용 지문을 쓰는 출제위원이다. 축제, 전시, 캠프, 워크숍 등 이벤트를 홍보하는 실용문을 영어로 작성하라. 날짜, 장소, 프로그램 구성, 신청 방법, 대상, 주의 사항 등 정보를 4~6개 정도 포함한다. 수험생은 이후 진술이 지문과 일치하는지 확인하게 되므로, 정보는 분명하고도 서로 구별 가능해야 한다. 길이는 약 120~150단어로 한다.
P29	당신은 한국 수능 영어 RC29(어법) 문항용 지문을 쓰는 출제위원이다. 3~4문장으로 이루어진 짧은 단락을 영어로 작성하되, 각 문장에는 시제, 주어-동사 일치, 대명사, 분사/부정사, 접속사 등 서로 다른 문법 포인트가 포함되도록 한다. 이 단계에서는 모든 문장을 문법적으로 올바르게 작성하고, 밑줄이나 번호는 사용하지 않는다. 이후 단계에서 이 지문을 바탕으로 밑줄 5개 중 하나만 틀리도록 변형할 것이다. 길이는 약 60~90단어로 한다.
P30	당신은 한국 수능 영어 RC30(문맥상 부적절한 단어) 문항용 지문을 쓰는 출제위원이다. 하나의 주제를 중심으로 자연스럽게 전개되는 단락을 영어로 작성하라. 각 문장은 의미상 연결이 되어야 하고, 특정 위치에 문맥상 어울리지 않는 단어 하나를 넣을 수 있는 구조가 되도록 작성한다. 이 단계에서는 모든 단어를 자연스럽게 맞는 단어로 쓰고, 이후 단계에서 한 단어를 문맥에 어울리지 않는 단어로 교체할 것이다. 길이는 약 130~160단어로 한다.
P31	당신은 한국 수능 영어 RC31(단일 빈칸) 문항용 지문을 쓰는 출제위원이다. 교육, 습관, 인간 행동, 협력 등 일반적인 주제를 선택하여 한 단락의 글을 영어로 작성하라. 글의 전개 과정에서 핵심 아이디어를 요약하거나 전환하는 문장을 1개 포함시키고, 그 문장이 나중에 빈칸이 될 수 있도록 논리적으로 중요한 위치에 배치한다. 이 단계에서는 빈칸 없이 완전한 문장으로 작성하며, 길이는 약 120~150단어로 한다.
P32	당신은 한국 수능 영어 RC32(고난도 단일 빈칸) 문항용 지문을 쓰는 출제위원이다. 교육 정책, 사회 변화, 사고력, 창의성 등 비교적 추상적인 주제를 선택하여 한 단락 또는 두 단락으로 영어 글을 작성하라. 글에는 개념 정의, 대비, 예시 등이 포함되어야 하며, 논리 전개상 중요한 역할을 하는 문장을 1개 포함시킨다. 이 문장은 나중에 빈칸으로 바뀔 예정이다. 이 단계에서는 빈칸 없이 완전한 문장으로 작성하고, 길이는 약 140~170단어로 한다.
P33	당신은 한국 수능 영어 RC33(장문 빈칸) 문항용 지문을 쓰는 출제위원이다. 서론–본론–결론 구조를 가진 3~4문단짜리 논설문 또는 설명문을 영어로 작성하라. 서론에서 주제를 제시하고, 본론에서 관련된 근거·예시·비교를 2~3개 제시하며, 결론에서 핵심 메시지를 다시 정리한다. 본론이나 결론 부분에는 나중에 빈칸으로 만들 수 있는 핵심 문장을 1개 이상 포함해야 한다. 이 단계에서는 빈칸 없이 완전한 글로 작성하고, 길이는 약 220~260단어로 한다.
P34	당신은 한국 수능 영어 RC34(규칙·역할 관련 단일 빈칸) 문항용 지문을 쓰는 출제위원이다. 규칙, 역할, 책임, 질서, 공정성 등과 관련된 상황이나 제도를 설명하는 한 단락짜리 글을 영어로 작성하라. 글에는 규칙의 필요성, 역할 분담, 기대되는 행동 등이 포함되고, 나중에 빈칸으로 만들 핵심 문장이 1개 있어야 한다. 이 단계에서는 완전한 문장으로만 작성하며, 길이는 약 130~160단어로 한다.
P35	당신은 한국 수능 영어 RC35(문장 삭제) 문항용 지문을 쓰는 출제위원이다. 여러 문장으로 이루어진 한 단락의 글을 영어로 작성하되, 그 중 한 문장은 삭제해도 글의 흐름에 문제가 없거나 오히려 더 좋아지는 '불필요한 문장'이 되도록 설계하라. 다른 문장들은 하나의 중심 아이디어를 향해 논리적으로 연결되어야 한다. 이 단계에서는 불필요한 문장을 포함한 완전한 단락을 작성하고, 길이는 약 140~170단어로 한다.
P36	당신은 한국 수능 영어 RC36(문장 배열) 문항용 지문을 쓰는 출제위원이다. 5~6개의 문장으로 구성된 글을 영어로 작성하되, 각 문장은 명확한 순서에 따라 논리적으로 이어져야 한다. 도입, 전개, 예시, 결론 등의 구성 요소가 분명하여 문장 순서가 바뀌면 글의 의미가 어색해지도록 설계한다. 이 단계에서는 올바른 순서대로 한 단락으로 작성하며, 길이는 약 130~160단어로 한다.
P37	당신은 한국 수능 영어 RC37(고난도 문장 배열, 3점) 문항용 지문을 쓰는 출제위원이다. 비교적 추상적인 주제를 다루는 5~6개 문장의 글을 영어로 작성하라. 각 문장은 논증의 단계(문제 제기, 주장, 근거, 예시, 반론, 결론 등)를 나타내며, 순서가 바뀌면 논리 구조가 무너져야 한다. 이 단계에서는 올바른 순서대로 한 단락으로 작성하고, 길이는 약 150~180단어로 한다.
P38	당신은 한국 수능 영어 RC38(문장 삽입) 문항용 지문을 쓰는 출제위원이다. 하나의 단락 또는 두 단락으로 이루어진 영어 글을 작성하되, 특정 위치에만 자연스럽게 들어갈 수 있는 문장을 상정하여 글을 설계하라. 글에는 주제 문장, 세부 설명, 예시, 결론 등이 있고, 삽입 문장은 그 중 일부를 연결하거나 부연하는 역할을 한다. 이 단계에서는 삽입될 문장을 따로 쓰지 않고, 삽입 위치 후보가 분명히 보이도록 전체 글만 작성한다. 길이는 약 140~170단어로 한다.
P39	당신은 한국 수능 영어 RC39(고난도 문장 삽입) 문항용 지문을 쓰는 출제위원이다. 개념적·추상적 내용을 다루는 2단락 내외의 영어 글을 작성하라. 두 단락 또는 여러 문장 사이의 논리적 연결 관계가 중요하며, 특정 위치에 들어갈 문장이 논리적 연결을 담당하도록 설계한다. 이 단계에서는 전체 글만 작성하고, 삽입 문장은 따로 쓰지 않는다. 길이는 약 150~190단어로 한다.
P40	당신은 한국 수능 영어 RC40(요약) 문항용 장문을 쓰는 출제위원이다. 서론–본론–결론 구조를 가진 2~3단락짜리 글을 영어로 작성하라. 글 전체는 하나의 핵심 메시지로 요약될 수 있어야 하며, 본문에는 그 핵심을 뒷받침하는 이유·예시·비교 등이 2~3개 포함된다. 결론 부분에서는 요약 선택지로 사용할 수 있는 문장을 1개 이상 포함한다. 길이는 약 180~220단어로 한다.
P41_45	당신은 한국 수능 영어 RC41~45 세트 문항용 공통 지문을 쓰는 출제위원이다. 장문 세트에서 제목/중심 내용, 어휘/표현, 문장 순서, 지시어, 내용 일치 여부를 모두 평가할 수 있도록 서론–본론–결론 구조를 가진 3~5단락짜리 글을 영어로 작성하라. 서론에서는 주제와 관점을 소개하고, 본론에서는 관련 아이디어나 예시를 3개 정도 제시하며, 결론에서는 핵심 메시지를 정리한다. 글 안에는 this, that, they, such, these 등의 지시어나 연결 표현이 자연스럽게 포함되어야 하며, 문단과 문장 사이의 논리 흐름이 뚜렷해야 한다. 길이는 약 350~420단어로 한다.
```

---

### Sheet 3: Thinking_Types (사고 유형) - seedPrompts.js 기준
```
item_no	category	thinking_type	keywords	description
1	LC	말의 목적	purpose, 목적, speech, dialogue	LC1 - 대화에서 화자의 말 목적 파악
2	LC	장소 추론	location, 장소, place, where	LC2 - 대화 장소 추론
3	LC	관계 추론	relationship, 관계, speakers	LC3 - 두 화자의 관계 추론
4	LC	태도/감정	attitude, feeling, 감정, 태도	LC4 - 화자의 태도/감정 파악
5	LC	언급 여부	mentioned, true, 언급, fact	LC5 - 언급된/언급되지 않은 정보
6	LC	그림 선택	picture, 그림, match, description	LC6 - 대화에 맞는 그림 선택
7	LC	주제 파악	topic, 주제, talking about	LC7 - 대화의 주제 파악
8	LC	세부 정보	detail, 세부, time, date, place	LC8 - 세부 정보 파악
9	LC	다음 행동	next action, 할 일, will do	LC9 - 화자가 다음에 할 행동
10	LC	이유 파악	reason, cause, 이유, why	LC10 - 이유/원인 파악
11	LC	제안	suggestion, recommend, 제안, suggest	LC11 - 제안 내용 파악
12	LC	전화 메시지	phone message, voicemail, 전화, message	LC12 - 전화 메시지 목적 파악
13	LC	안내/광고	announcement, ad, 안내, 광고	LC13 - 안내/광고 내용 파악
14	LC	표/도표 듣기	table, chart, 표, 숫자, numeric	LC14 - 표/도표 정보 파악 (듣기)
15	LC	정보 담화	informational, speech, 담화, 정보	LC15 - 정보 제공 담화 이해
16	LC	세트 주제	set, topic, 세트, 주제	LC16 - 세트 1번 (전체 주제)
17	LC	세트 세부	set, detail, 세트, 언급	LC17 - 세트 2번 (세부/언급 여부)
18	RC	글의 주제	topic, subject, 주제	RC18 - 글의 주제 파악
19	RC	글의 제목	title, 제목	RC19 - 글의 제목 추론
20	RC	글의 요지	gist, main point, 요지	RC20 - 글의 요지 파악
21	RC	글의 목적	purpose, author, 목적, 필자	RC21 - 필자의 목적 파악
22	RC	강조점	emphasis, 강조, main argument	RC22 - 필자가 강조하는 내용
23	RC	주장 파악	claim, assertion, 주장	RC23 - 필자의 주장 파악
24	RC	예시 기능	example, function, 예시, 역할	RC24 - 예시의 기능 파악
25	RC	도표 이해	chart, graph, table, 도표	RC25 - 도표/그래프 내용 이해
26	RC	문장 빈칸	sentence, blank, 빈칸, 문장	RC26 - 빈칸에 알맞은 문장
27	RC	추상 빈칸	abstract, blank, 추론, 개념	RC27 - 추상적 빈칸 추론
28	RC	문장 기능	function, transition, 기능, 역할	RC28 - 문장의 기능/전환 파악
29	RC	어법 판단	grammar, underlined, 어법, 밑줄	RC29 - 어법상 틀린 것 찾기
30	RC	어휘 추론	vocabulary, context, 어휘, 문맥	RC30 - 문맥상 어휘 의미 추론
31	RC	단일 빈칸	single blank, 빈칸, gap	RC31 - 단일 빈칸 완성
32	RC	문단 요약	summary, paragraph, 요약	RC32 - 문단 요약
33	RC	장문 빈칸	long blank, 빈칸, 장문	RC33 - 장문 빈칸 추론
34	RC	문장 삽입	insertion, 삽입, sentence	RC34 - 문장 삽입
35	RC	문장 순서	ordering, sequence, 순서	RC35 - 문장 순서 배열
36	RC	논리 완성	logical, completion, 논리	RC36 - 논리적 완성
37	RC	실용문	practical, notice, 실용문	RC37 - 실용문 이해
38	RC	글 구조	structure, rhetorical, 구조	RC38 - 글의 구조 파악
39	RC	지칭 추론	reference, refer, 지칭	RC39 - 지칭 대상 추론
40	RC	논리 흐름	logical flow, 흐름, relation	RC40 - 논리적 흐름 파악
41	RC	세트 전체	set, global, 장문, 전체	RC41 - 장문 세트 1 (전체 이해)
42	RC	세트 세부	set, detail, 장문, 세부	RC42 - 장문 세트 2 (세부/추론)
43	RC	세트 전체	set, global, 장문, 전체	RC43 - 장문 세트 1 (전체 이해)
44	RC	세트 세부	set, detail, 장문, 세부	RC44 - 장문 세트 2 (세부/추론)
45	RC	세트 구조	set, structure, 장문, 구조	RC45 - 장문 세트 3 (구조/순서)
```

---

### Sheet 4: Keyword_Categories (키워드 카테고리)
```
category	subcategory	keywords	description	required_count
DISTRACTOR	오답 설계 일반	오답, distractor, 매력적, 오답 선택지	오답 설계 관련 기본 키워드	1
DISTRACTOR	선택지 역할	①, ②, ③, ④, ⑤, 선택지	선택지 표시 관련	0
DISTRACTOR	변별력 관련	변별, 난이도, 매력도, 함정	변별력/난이도 관련 키워드	1
DISTRACTOR	오답 전략	부분 일치, 과잉 일반화, 반대 의미, 무관한, 범위 이탈	오답 설계 전략 키워드	2
DISTRACTOR	오답 전략(EN)	partial match, overgeneralization, opposite meaning	영문 오답 전략 키워드	0
DISCRIMINATION	변별력 지침	변별력, 변별, discrimination	변별력 핵심 키워드	1
DISCRIMINATION	등급별	상위, 중위, 하위	등급 구분 키워드	0
DISCRIMINATION	비율	정답률, 오답률	정답/오답률 관련	0
DISCRIMINATION	전략	가장 늦게, 마지막에, 매력적인 오답, attractive distractor	변별 전략 키워드	1
DIFFICULTY	난이도 일반	난이도, difficulty, level	난이도 기본 키워드	1
DIFFICULTY	난이도 수준(KR)	쉬움, 중간, 어려움, 하, 중하, 중, 중상, 상	한글 난이도 표현	0
DIFFICULTY	난이도 수준(EN)	easy, medium, hard	영문 난이도 표현	0
DIFFICULTY	등급	1등급, 2등급, 3등급, 4등급, 상위권, 중위권, 하위권	등급 표현	0
OUTPUT_FORMAT	passage	passage, stimulus, transcript, text, 지문, 대본	지문 출력 필드	1
OUTPUT_FORMAT	question	question, question_stem, questionStem, prompt, stem, 발문, 문제	발문 출력 필드	1
OUTPUT_FORMAT	options	options, choices, alternatives, 선택지, 보기	선택지 출력 필드	1
OUTPUT_FORMAT	answer	answer, correct_answer, correctAnswer, answer_key, 정답	정답 출력 필드	1
OUTPUT_FORMAT	explanation	explanation, rationale, solution, 해설, 풀이	해설 출력 필드	1
```

---

### Sheet 5: Word_Count_Ranges (지문 길이 기준)
```
item_no	item_name	min_words	max_words	category	difficulty_note
18	글의 목적	80	180	RC	중
19	심경 변화	80	180	RC	중
20	주장	100	200	RC	중
21	함축 의미	80	180	RC	중상
22	요지	100	200	RC	중
23	주제	100	200	RC	중
24	제목	100	200	RC	중
25	도표	80	160	RC	중하
26	내용 불일치(인물)	100	200	RC	중하
27	내용 불일치(실용문)	100	200	RC	중하
28	어법(밑줄 없음)	80	160	RC	중
29	어법(밑줄)	120	220	RC	중상
30	어휘	120	220	RC	중
31	빈칸(구/절)	120	220	RC	상
32	빈칸(구/절)	130	240	RC	상
33	빈칸(문장)	150	260	RC	최상
34	빈칸(문장)	150	260	RC	최상
35	무관한 문장	100	200	RC	중상
36	글의 순서	120	220	RC	중상
37	글의 순서	120	220	RC	중상
38	문장 삽입	120	220	RC	중상
39	문장 삽입	120	220	RC	중상
40	요약문	140	240	RC	상
41	장문(제목+순서)	200	350	RC	상
42	장문(제목+순서)	200	350	RC	상
43	장문 세트	250	400	RC	상
44	장문 세트	250	400	RC	상
45	장문 세트	250	400	RC	상
```

---

### Sheet 6: Forbidden_Patterns (금지 패턴)
```
pattern_id	pattern_type	pattern_regex	pattern_description	severity	applies_to
FP001	PROMPT_SHORT	^.{0,100}수능.{0,50}(만들어|생성|작성).{0,50}$	단문 프롬프트: "수능 스타일로 만들어라"	ERROR	prompt
FP002	PROMPT_SHORT	^.{0,50}문항.{0,30}(생성|만들어).{0,30}$	단문 프롬프트: "문항 생성해줘"	ERROR	prompt
FP003	PROMPT_SHORT	^(create|generate|make).{0,50}(question|item).{0,50}$	영문 단문 프롬프트	ERROR	prompt
LLM001	LLM_META	as an ai	LLM 자기 언급	ERROR	passage,question,explanation
LLM002	LLM_META	as a language model	LLM 자기 언급	ERROR	passage,question,explanation
LLM003	LLM_META	i cannot	거부 표현	WARNING	passage,question,explanation
LLM004	LLM_META	i can't	거부 표현	WARNING	passage,question,explanation
LLM005	LLM_META	i'm unable	거부 표현	WARNING	passage,question,explanation
LLM006	LLM_META	here is the answer	답변 안내	ERROR	passage,question,explanation
LLM007	LLM_META	let me help you	도움 제안	ERROR	passage,question,explanation
LLM008	LLM_META	i'd be happy to	기꺼이 표현	ERROR	passage,question,explanation
LLM009	LLM_META	certainly!	동의 표현	WARNING	passage,question,explanation
LLM010	LLM_META	i hope this helps	마무리 표현	ERROR	passage,question,explanation
LLM011	LLM_META	sure!	동의 표현	WARNING	passage,question,explanation
LLM012	LLM_META	of course!	동의 표현	WARNING	passage,question,explanation
LLM013	LLM_META	here you go	전달 표현	WARNING	passage,question,explanation
LLM014	LLM_META	feel free to ask	마무리 표현	ERROR	passage,question,explanation
OPT001	OPTION_FORBIDDEN	all of the above	복합 선택지 (수능 위반)	ERROR	options
OPT002	OPTION_FORBIDDEN	none of the above	복합 선택지 (수능 위반)	ERROR	options
OPT003	OPTION_FORBIDDEN	both a and b	복합 선택지 (수능 위반)	ERROR	options
OPT004	OPTION_FORBIDDEN	a and b	복합 선택지 (수능 위반)	ERROR	options
OPT005	OPTION_FORBIDDEN	모두 맞다	복합 선택지 (한글)	ERROR	options
OPT006	OPTION_FORBIDDEN	모두 틀리다	복합 선택지 (한글)	ERROR	options
OPT007	OPTION_FORBIDDEN	위의 모든	복합 선택지 (한글)	ERROR	options
OPT008	OPTION_FORBIDDEN	해당 없음	해당 없음 선택지	ERROR	options
```

---

### Sheet 7: Prompt_Validation_Rules (프롬프트 검증 규칙)
```
rule_id	category	rule_name	rule_type	check_method	threshold	severity	error_message
PV-A1	기본 구조	MASTER_PROMPT 참조	regex	master|시스템|system|공통	1	INFO	MASTER_PROMPT 참조가 명시되지 않았습니다 (시스템 자동 병합)
PV-A3	기본 구조	출력 포맷 명시	keyword_count	passage,question,options,answer,explanation	3	ERROR	출력 포맷 명시 부족: {missing} 필드가 없습니다
PV-A4	기본 구조	선택지 5개 고정	regex	5\s*개|five|5\s*options|①②③④⑤	1	WARNING	선택지 개수(5개) 고정이 명시되지 않았습니다
PV-B1	문항번호 필수	수능 유형 명시	regex	수능\s*{itemNo}\s*번|{itemNo}\s*번\s*(유형|문항)|RC\s*{itemNo}|LC\s*{itemNo}	1	ERROR	"수능 {itemNo}번 유형" 명시가 없습니다
PV-B2	문항번호 필수	사고 유형 선언	keyword_from_sheet	Thinking_Types.keywords	1	ERROR	사고 유형 "{type}" 관련 키워드가 없습니다
PV-B3	문항번호 필수	난이도 목표	keyword_category	DIFFICULTY	1	WARNING	난이도 목표가 명시되지 않았습니다
PV-C1	오답 설계	오답 설계 지침	keyword_category	DISTRACTOR	3	ERROR	오답 설계 지시가 전혀 없습니다
PV-C2	오답 설계	변별력 지침	keyword_category	DISCRIMINATION	1	WARNING	변별력 관련 지침이 없습니다
PV-D1	금지 패턴	단문 프롬프트 차단	length	char_count	200	ERROR	프롬프트가 너무 짧습니다 ({length}자 < 200자)
PV-D2	금지 패턴	금지 패턴 검사	regex_list	Forbidden_Patterns(PROMPT)	0	ERROR	금지 패턴 발견: {pattern}
PV-D3	금지 패턴	모호한 표현	regex	적절한\s*것|알맞은\s*것|좋은\s*문항|적당히	0	WARNING	모호한 표현이 있습니다
```

---

### Sheet 8: Item_Validation_Rules (문항 검증 규칙)
```
rule_id	category	rule_name	check_field	check_type	threshold	severity	error_message
IV-A1	형식/구조	선택지 5개	options	array_length	5	ERROR	선택지가 5개가 아닙니다 ({count}개)
IV-A2	형식/구조	정답 범위	answer	range	1-5	ERROR	정답이 1-5 범위가 아닙니다 ({answer})
IV-A3	형식/구조	지문 길이	passage	word_count_range	from_sheet:Word_Count_Ranges	WARNING	지문 길이 범위 벗어남: {count}단어
IV-A4	형식/구조	지문 존재	passage	not_empty	1	ERROR	지문이 비어 있습니다
IV-A5	형식/구조	발문 존재	question	not_empty	1	ERROR	발문(question)이 비어 있습니다
IV-B1	문항별 필수	29번 밑줄	passage	regex_count	\([a-e]\)=5	ERROR	29번 밑줄 개수 오류: {count}개 (5개 필요)
IV-B2	문항별 필수	31-34번 빈칸	gapped_passage	regex	\(___\)|_{3,}	ERROR	빈칸 표시가 없습니다
IV-B3	문항별 필수	31-32번 선택지 길이	options	word_count	2-15	WARNING	선택지 {i} 구/절 문항치고 부적절: {count}단어
IV-B4	문항별 필수	33-34번 선택지 길이	options	word_count	5-30	WARNING	선택지 {i} 문장 빈칸 문항치고 부적절: {count}단어
IV-B5	문항별 필수	27번 안내문 요소	passage	keyword_list	날짜,시간,장소,비용,신청	WARNING	안내문 필수 요소 부족
IV-C1	정답 위험	정답-지문 중복률	passage,answer_option	overlap_ratio	0.7	WARNING	정답-지문 표현 중복률 과다: {ratio}%
IV-C2	정답 위험	노골적 오답	options,passage	weak_distractor	2	WARNING	노골적 오답 {count}개 발견: {numbers}번
IV-C3	정답 위험	복수정답 위험	options	similarity	0.6	WARNING	선택지 간 높은 유사도: {pairs}
IV-C4	정답 위험	선택지 중복	options	unique_count	5	ERROR	중복된 선택지가 있습니다
IV-C5	정답 위험	금지 패턴	options	regex_list	Forbidden_Patterns(OPTION)	ERROR	선택지 {i}에 금지 패턴: {pattern}
IV-C6	정답 위험	LLM 메타 문장	passage,question,explanation	regex_list	Forbidden_Patterns(LLM_META)	ERROR	LLM 메타 문장 발견: {text}
```

---

### Sheet 9: LLM_Evaluation_Criteria (LLM 평가 기준)
```
eval_type	criterion_id	criterion_name	max_score	description	evaluation_prompt_snippet
PROMPT	PE-A1	상위권 변별 적합성	10	상위권 학생을 변별할 수 있는 요소가 있는가?	이 프롬프트로 생성된 문항이 상위권 학생(1-2등급)을 변별할 수 있는가?
PROMPT	PE-A2	오답 설계 품질	10	오답 설계 지침이 구체적이고 다양한가?	오답 설계 지침이 지엽정보/과잉해석/반대방향/무관정보 등 다양한 전략을 포함하는가?
PROMPT	PE-A3	정답 재진술 위험	10	정답이 지문 표현을 그대로 베끼지 않도록 지시했는가?	정답이 지문을 패러프레이즈하도록 명시했는가? 재진술 위험이 낮은가?
PROMPT	PE-A4	사고 유형 일치	10	해당 문항 유형에 맞는 사고 과정을 요구하는가?	{item_no}번 문항의 사고 유형({thinking_type})에 맞는 추론 과정을 요구하는가?
ITEM	IE-A	정답 적합성	30	정답이 지문 전체 논지를 반영하고 패러프레이즈 되었는가?	정답이 지문 전체 논지와 일치하는가? 부분 정보만 맞추는 것이 아닌가?
ITEM	IE-B	오답 설계 품질	25	오답이 서로 다른 오류 유형을 가지며 매력적인가?	각 오답이 지엽정보/과잉해석/반대방향/무관정보 중 다른 유형인가? 매력적인가?
ITEM	IE-C	변별력	20	정답이 가장 늦게 탈락하고 복수정답 위험이 없는가?	정답이 너무 쉽게 선택되지 않는가? 오답 중 바로 제거되는 것이 있는가?
ITEM	IE-D	문항 유형 적합성	15	해당 문항 유형의 특성에 맞는가?	빈칸 추상도/요지 예시/심경 방향성/제목 함축성이 적절한가?
ITEM	IE-E	자연스러움/수능 톤	10	지문이 수능 영어처럼 자연스러운가?	불필요한 교훈식/설교 톤이 없는가? 어휘/표현 수준이 적절한가?
```

---

### Sheet 10: Verdict_Rules (판정 규칙)
```
eval_type	verdict	condition	description	action
PROMPT	PASS	모든 criteria 7점 이상	프롬프트 품질 양호	문항 생성 진행
PROMPT	REVISE	하나 이상 5-6점	개선 권장	생성 가능하나 품질 저하 우려
PROMPT	BLOCK	하나 이상 4점 이하	필수 수정 필요	문항 생성 차단
ITEM	PASS	total_score >= 85 AND no critical triggers	문항 품질 양호	승인
ITEM	REGENERATE	any trigger TRUE OR total_score < 60	심각한 문제 발견	재생성 필요
ITEM	HUMAN_REVIEW	60 <= total_score < 85	검토 필요	사람 검토 후 결정
```

---

### Sheet 11: Regeneration_Triggers (재생성 트리거)
```
trigger_id	trigger_name	condition	description	auto_regenerate
RT001	multiple_correct_answers	2개 이상 선택지가 정답 후보	복수 정답 위험	TRUE
RT002	weak_distractors	2개 이상 오답이 노골적으로 틀림	약한 오답	TRUE
RT003	answer_copies_passage	정답-지문 중복률 >= 70%	정답 베끼기	TRUE
RT004	too_easy	변별력 점수 < 10 AND total < 70	너무 쉬움	TRUE
RT005	type_mismatch	문항 유형 적합성 < 8	유형 불일치	TRUE
RT006	distractor_types_not_diverse	오답 유형이 2가지 이하	오답 다양성 부족	TRUE
RT007	llm_meta_detected	LLM 메타 문장 발견	LLM 출력 티	TRUE
RT008	forbidden_pattern	금지 패턴 발견	수능 스타일 위반	TRUE
```

---

### Sheet 12: Distractor_Error_Types (오답 오류 유형)
```
error_type_id	error_type_kr	error_type_en	description	example
DET001	지엽정보	partial_information	지문의 일부 정보만 맞고 전체 논지와 다름	지문 한 문장만 근거로 한 선택지
DET002	과잉해석	over_interpretation	지문 내용을 지나치게 확대/과장 해석	지문보다 범위가 넓은 일반화
DET003	반대방향	opposite_direction	지문의 논지와 반대되는 내용	긍정↔부정, 증가↔감소
DET004	무관정보	irrelevant_information	지문과 전혀 관련 없는 내용	주제와 동떨어진 선택지
DET005	범위이탈	scope_deviation	지문에서 언급하지 않은 범위의 내용	지문에 없는 시간/장소/인물
DET006	세부오류	detail_error	세부 사항(숫자, 날짜 등)이 틀림	금액, 시간, 수량 오류
DET007	인과오류	causality_error	원인과 결과 관계가 뒤바뀜	원인↔결과 혼동
DET008	정답	correct_answer	정답 (오류 아님)	-
```

---

### Sheet 13: Notice_Keywords (안내문 키워드)
```
element	patterns	description
date	\\d{1,2}/\\d{1,2}, \\d{1,2}:\\d{2}, january|february|march|april|may|june|july|august|september|october|november|december, monday|tuesday|wednesday|thursday|friday|saturday|sunday	날짜 관련 패턴
time	\\d{1,2}:\\d{2}, a\\.?m\\.?|p\\.?m\\.?, morning|afternoon|evening|night	시간 관련 패턴
location	room|hall|building|center|library|gym|auditorium|cafeteria|office	장소 관련 키워드
action	register|sign up|apply|submit|contact|call|email|visit|attend|bring	행동 요구 키워드
```

---

### Sheet 14: Chart_Comparison_Keywords (도표 비교 표현)
```
category	patterns	description
comparison	more than, less than, higher than, lower than	비교 표현
degree	cheaper, longer, shorter, faster, slower	정도 비교
limit	at least, at most, no more than, no less than	제한 표현
change	increased, decreased, doubled, tripled	변화 표현
numeric	percent, %, ratio, proportion	수치 표현
```

---

### Sheet 15: Config (시스템 설정)
```
key	value	description
LLM_MODEL	gpt-4	사용 모델
OPENAI_API_KEY		OpenAI API 키 (별도 저장 권장)
MAX_RETRY	3	최대 재시도 횟수
MIN_PROMPT_LENGTH	200	최소 프롬프트 길이 (자)
OVERLAP_THRESHOLD	0.7	정답-지문 중복률 경고 임계값
SIMILARITY_THRESHOLD	0.6	선택지 유사도 경고 임계값
WEAK_DISTRACTOR_THRESHOLD	0.1	노골적 오답 판정 임계값
```

---

## Part 3: Google Apps Script 코드

### 메인 파일들

프로젝트 구조:
```
📁 Google Apps Script Project
├── Code.gs              # 메인 진입점 + 커스텀 메뉴
├── PromptService.gs     # 프롬프트 CRUD
├── PromptValidator.gs   # 프롬프트 검증 (LLM 미사용)
├── PromptEvaluator.gs   # 프롬프트 평가 (LLM 사용)
├── ItemValidator.gs     # 문항 검증 (LLM 미사용)
├── ItemEvaluator.gs     # 문항 평가 (LLM 사용)
├── LLMClient.gs         # OpenAI/Claude API 호출
├── ItemGenerator.gs     # 문항 생성 로직
├── Utils.gs             # 유틸리티 함수
└── Config.gs            # 설정 관리
```

---

## Part 4: 사용 방법

### Step 1: Google Sheets 생성
1. Google Drive에서 새 스프레드시트 생성
2. 파일명: `CSAT_Prompt_Validation_System`

### Step 2: 시트 탭 생성
하단에서 + 버튼을 눌러 15개 시트 탭 생성:
- Prompts_Master
- Prompts_Content
- Prompts_Versions
- Thinking_Types
- Keyword_Categories
- Word_Count_Ranges
- Forbidden_Patterns
- Prompt_Validation_Rules
- Item_Validation_Rules
- LLM_Evaluation_Criteria
- Verdict_Rules
- Regeneration_Triggers
- Distractor_Error_Types
- Notice_Keywords
- Config

### Step 3: 데이터 입력
1. 각 시트 탭 선택
2. 위 데이터를 복사
3. A1 셀 선택 후 붙여넣기 (Ctrl+V)
4. 열 너비 자동 조정

### Step 4: Apps Script 연결
1. 확장 프로그램 > Apps Script 선택
2. 위 코드 파일들 생성 및 붙여넣기
3. 저장 후 실행 권한 승인

---

## Part 5: Apps Script 핵심 코드 예시

### Code.gs
```javascript
/**
 * 커스텀 메뉴 생성
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎓 CSAT Generator')
    .addItem('프롬프트 검증', 'validateCurrentPrompt')
    .addItem('문항 생성', 'showGeneratorDialog')
    .addSeparator()
    .addItem('전체 프롬프트 검증', 'validateAllPrompts')
    .addItem('설정', 'showConfigDialog')
    .addToUi();
}
```

### PromptService.gs
```javascript
/**
 * 프롬프트 키로 프롬프트 조회
 */
function getPromptByKey(promptKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 메타데이터 조회
  const masterSheet = ss.getSheetByName('Prompts_Master');
  const masterData = masterSheet.getDataRange().getValues();
  const headers = masterData[0];

  let metadata = null;
  for (let i = 1; i < masterData.length; i++) {
    if (masterData[i][0] === promptKey) {
      metadata = {};
      headers.forEach((h, idx) => metadata[h] = masterData[i][idx]);
      break;
    }
  }

  if (!metadata) return null;

  // 본문 조회
  const contentSheet = ss.getSheetByName('Prompts_Content');
  const contentData = contentSheet.getDataRange().getValues();

  let promptText = '';
  for (let i = 1; i < contentData.length; i++) {
    if (contentData[i][0] === promptKey) {
      promptText = contentData[i][1];
      break;
    }
  }

  return {
    ...metadata,
    prompt_text: promptText
  };
}

/**
 * 모든 프롬프트 목록 조회
 */
function getAllPrompts(category) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Prompts_Master');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const prompts = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, idx) => row[h] = data[i][idx]);

    if (!category || row.category === category) {
      prompts.push(row);
    }
  }

  return prompts;
}
```

### PromptValidator.gs
```javascript
/**
 * 프롬프트 품질 검증 (규칙 기반, LLM 미사용)
 */
function validatePromptQuality(promptText, itemNo) {
  const allErrors = [];
  const allWarnings = [];

  // 시트에서 규칙 로드
  const rules = getValidationRules('Prompt_Validation_Rules');
  const thinkingTypes = getThinkingTypes();
  const keywords = getKeywordCategories();

  // A. 기본 구조 검증
  // A3. 출력 포맷 명시
  const outputKeywords = keywords.filter(k => k.category === 'OUTPUT_FORMAT');
  let missingFormats = [];
  for (const kw of outputKeywords) {
    const hasField = kw.keywords.split(', ').some(k =>
      promptText.toLowerCase().includes(k.toLowerCase())
    );
    if (!hasField) {
      missingFormats.push(kw.subcategory);
    }
  }
  if (missingFormats.length >= 3) {
    allErrors.push(`[A3] 출력 포맷 명시 부족: ${missingFormats.join(', ')}`);
  }

  // B. 문항 번호별 필수 선언
  // B2. 사고 유형 선언
  const thinkingInfo = thinkingTypes.find(t => String(t.item_no) === String(itemNo));
  if (thinkingInfo) {
    const thinkingKws = thinkingInfo.keywords.split(', ');
    const hasThinking = thinkingKws.some(kw =>
      promptText.toLowerCase().includes(kw.toLowerCase())
    );
    if (!hasThinking) {
      allErrors.push(`[B2] 사고 유형 "${thinkingInfo.thinking_type}" 관련 키워드 없음`);
    }
  }

  // C. 오답 설계 선언
  const distractorKws = keywords.filter(k => k.category === 'DISTRACTOR');
  let distractorCount = 0;
  for (const kw of distractorKws) {
    const kwList = kw.keywords.split(', ');
    distractorCount += kwList.filter(k =>
      promptText.toLowerCase().includes(k.toLowerCase())
    ).length;
  }
  if (distractorCount === 0) {
    allErrors.push('[C1] 오답 설계 지시가 전혀 없습니다');
  }

  // D. 금지 패턴
  if (promptText.trim().length < 200) {
    allErrors.push(`[D1] 프롬프트 너무 짧음 (${promptText.length}자 < 200자)`);
  }

  const pass = allErrors.length === 0;
  const score = Math.round((1 - allErrors.length / 10) * 100);

  return { pass, score, errors: allErrors, warnings: allWarnings };
}

/**
 * 시트에서 사고 유형 로드
 */
function getThinkingTypes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Thinking_Types');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const result = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, idx) => row[h] = data[i][idx]);
    result.push(row);
  }
  return result;
}

/**
 * 시트에서 키워드 카테고리 로드
 */
function getKeywordCategories() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Keyword_Categories');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const result = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, idx) => row[h] = data[i][idx]);
    result.push(row);
  }
  return result;
}
```

### ItemValidator.gs
```javascript
/**
 * 문항 형식 검증 (규칙 기반, LLM 미사용)
 */
function validateItemFormat(itemObj, itemNo) {
  const errors = [];
  const warnings = [];

  // 시트에서 규칙 로드
  const wordRanges = getWordCountRanges();
  const forbiddenPatterns = getForbiddenPatterns();

  // A. 형식/구조 검사
  // A1. 선택지 5개
  if (!itemObj.options || itemObj.options.length !== 5) {
    errors.push(`선택지가 5개가 아닙니다 (${itemObj.options?.length || 0}개)`);
  }

  // A2. 정답 범위
  const answer = parseInt(itemObj.answer);
  if (answer < 1 || answer > 5) {
    errors.push(`정답 범위 오류: ${answer}`);
  }

  // A3. 지문 길이
  const passage = itemObj.passage || '';
  const wordCount = countWords(passage);
  const range = wordRanges.find(r => r.item_no === itemNo);
  if (range) {
    if (wordCount < range.min_words || wordCount > range.max_words) {
      warnings.push(`지문 길이 범위 벗어남: ${wordCount}단어 (${range.min_words}-${range.max_words} 권장)`);
    }
  }

  // C. 금지 패턴 검사
  const llmPatterns = forbiddenPatterns.filter(p => p.pattern_type === 'LLM_META');
  for (const pattern of llmPatterns) {
    const regex = new RegExp(pattern.pattern_regex, 'i');
    if (regex.test(passage) || regex.test(itemObj.question || '')) {
      errors.push(`LLM 메타 문장 발견: ${pattern.pattern_description}`);
    }
  }

  // 선택지 금지 패턴
  const optPatterns = forbiddenPatterns.filter(p => p.pattern_type === 'OPTION_FORBIDDEN');
  if (itemObj.options) {
    for (let i = 0; i < itemObj.options.length; i++) {
      for (const pattern of optPatterns) {
        const regex = new RegExp(pattern.pattern_regex, 'i');
        if (regex.test(itemObj.options[i])) {
          errors.push(`선택지 ${i+1}에 금지 패턴: ${pattern.pattern_description}`);
        }
      }
    }
  }

  // E. 정답-지문 중복률
  if (itemObj.options && answer >= 1 && answer <= 5) {
    const answerText = itemObj.options[answer - 1];
    const overlap = calculateOverlap(passage, answerText);
    if (overlap >= 0.7) {
      warnings.push(`정답-지문 중복률 과다: ${Math.round(overlap * 100)}%`);
    }
  }

  return {
    pass: errors.length === 0,
    errors,
    warnings,
    stats: { wordCount }
  };
}

/**
 * 단어 수 계산
 */
function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * 중복률 계산
 */
function calculateOverlap(passage, answerText) {
  if (!passage || !answerText) return 0;
  const pWords = new Set(passage.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const aWords = answerText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (aWords.length === 0) return 0;
  const matches = aWords.filter(w => pWords.has(w)).length;
  return matches / aWords.length;
}
```

### LLMClient.gs
```javascript
/**
 * LLM API 호출
 */
function callLLM(systemPrompt, userPrompt) {
  const config = getConfig();
  const apiKey = config.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다');
  }

  const url = 'https://api.openai.com/v1/chat/completions';

  const payload = {
    model: config.LLM_MODEL || 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  if (json.error) {
    throw new Error(json.error.message);
  }

  return json.choices[0].message.content;
}

/**
 * 설정 로드
 */
function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Config');
  const data = sheet.getDataRange().getValues();

  const config = {};
  for (let i = 1; i < data.length; i++) {
    config[data[i][0]] = data[i][1];
  }
  return config;
}
```

### ItemGenerator.gs
```javascript
/**
 * 문항 생성
 */
function generateItem(itemNo, options) {
  // 1. 프롬프트 로드
  const masterPrompt = getPromptByKey('MASTER_PROMPT');
  const itemPrompt = getPromptByKey(String(itemNo));

  if (!masterPrompt || !itemPrompt) {
    throw new Error(`프롬프트를 찾을 수 없습니다: ${itemNo}`);
  }

  // 2. 프롬프트 검증
  const validation = validatePromptQuality(itemPrompt.prompt_text, itemNo);
  if (!validation.pass) {
    return {
      success: false,
      error: '프롬프트 검증 실패',
      details: validation.errors
    };
  }

  // 3. 프롬프트 번들 구성
  const systemPrompt = masterPrompt.prompt_text + '\n\n' + itemPrompt.prompt_text;
  let userPrompt = '';

  if (options.passage) {
    userPrompt += `## 제공된 지문\n${options.passage}\n\n`;
  }
  if (options.level) {
    userPrompt += `## 목표 난이도: ${options.level}\n\n`;
  }
  if (options.topic) {
    userPrompt += `## 주제: ${options.topic}\n\n`;
  }

  userPrompt += '위 지침에 따라 문항을 생성해주세요.';

  // 4. LLM 호출
  const response = callLLM(systemPrompt, userPrompt);

  // 5. JSON 파싱
  let itemObj;
  try {
    itemObj = JSON.parse(response);
  } catch (e) {
    // JSON 추출 시도
    const match = response.match(/\{[\s\S]*\}/);
    if (match) {
      itemObj = JSON.parse(match[0]);
    } else {
      throw new Error('JSON 파싱 실패');
    }
  }

  // 6. 문항 검증
  const itemValidation = validateItemFormat(itemObj, itemNo);

  return {
    success: true,
    item: itemObj,
    validation: itemValidation
  };
}
```

---

## Part 6: 파이프라인 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                         사용자 입력                          │
│            (문항 번호, 난이도, 주제, 지문 등)                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              1. 프롬프트 로드 (Prompts_Content)              │
│                  MASTER_PROMPT + ITEM_PROMPT                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              2. 프롬프트 검증 (PromptValidator.gs)           │
│                    - LLM 미사용, 규칙 기반                   │
│    ┌─────────────────────────────────────────────────┐     │
│    │ • 사고 유형 키워드 확인 (Thinking_Types)          │     │
│    │ • 오답 설계 키워드 확인 (Keyword_Categories)      │     │
│    │ • 금지 패턴 검사 (Forbidden_Patterns)             │     │
│    │ • 최소 길이 확인 (200자 이상)                     │     │
│    └─────────────────────────────────────────────────┘     │
│                    결과: PASS / BLOCK                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ PASS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              3. LLM 호출 (LLMClient.gs)                     │
│                   OpenAI / Claude API                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              4. 문항 검증 (ItemValidator.gs)                 │
│                    - LLM 미사용, 규칙 기반                   │
│    ┌─────────────────────────────────────────────────┐     │
│    │ • 선택지 5개 확인                                 │     │
│    │ • 정답 범위 확인 (1-5)                            │     │
│    │ • 지문 길이 확인 (Word_Count_Ranges)              │     │
│    │ • LLM 메타 문장 검사 (Forbidden_Patterns)         │     │
│    │ • 정답-지문 중복률 검사                           │     │
│    │ • 노골적 오답 검출                                │     │
│    └─────────────────────────────────────────────────┘     │
│            결과: PASS / WARNING / ERROR                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         5. (선택) LLM 품질 평가 (ItemEvaluator.gs)           │
│                    - LLM 사용, 고급 평가                     │
│    ┌─────────────────────────────────────────────────┐     │
│    │ • 정답 적합성 (30점)                              │     │
│    │ • 오답 설계 품질 (25점)                           │     │
│    │ • 변별력 (20점)                                   │     │
│    │ • 문항 유형 적합성 (15점)                         │     │
│    │ • 자연스러움 (10점)                               │     │
│    └─────────────────────────────────────────────────┘     │
│        결과: PASS / REGENERATE / HUMAN_REVIEW              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      6. 최종 출력                           │
│              문항 JSON + 검증 결과 + 점수                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 7: 주의사항

### Google Apps Script 제한
- **실행 시간**: 최대 6분 (LLM 호출 시 타임아웃 주의)
- **일일 API 호출**: UrlFetch 20,000회/일
- **셀 제한**: 시트당 최대 10M 셀

### API 키 보안
- Config 시트에 API 키를 직접 넣지 않는 것을 권장
- Script Properties 사용:
```javascript
function setApiKey(key) {
  PropertiesService.getScriptProperties().setProperty('OPENAI_API_KEY', key);
}

function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
}
```

### 데이터 백업
- 정기적으로 Google Drive에 백업
- 버전 히스토리 활용 (Prompts_Versions 시트)

---

## 마이그레이션 완료 체크리스트

- [ ] Google Sheets 생성 및 15개 시트 탭 생성
- [ ] Prompts_Master 데이터 입력
- [ ] Prompts_Content 데이터 입력 (모든 프롬프트 본문)
- [ ] Thinking_Types 데이터 입력
- [ ] Keyword_Categories 데이터 입력
- [ ] Word_Count_Ranges 데이터 입력
- [ ] Forbidden_Patterns 데이터 입력
- [ ] 검증 규칙 시트들 데이터 입력
- [ ] Apps Script 코드 작성
- [ ] API 키 설정
- [ ] 커스텀 메뉴 테스트
- [ ] 문항 생성 테스트
- [ ] 검증 로직 테스트
