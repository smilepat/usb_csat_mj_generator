# 문항 검증기 점검 및 개선 TODO

## 1. 문항번호별 스펙 정의

### 1.1 Item Spec 구조 (`item_specs.json`)

```json
{
  "18": {
    "item_no": "18",
    "item_type": "purpose",
    "category": "RC",
    "description": "글의 목적 파악",
    "keywords": ["목적", "purpose", "글을 쓴 이유"],
    "passage": {
      "min_words": 150,
      "max_words": 200,
      "required_elements": ["writer_intent", "situation_context"]
    },
    "question": {
      "template": "다음 글의 목적으로 가장 적절한 것은?",
      "variations_allowed": false
    },
    "options": {
      "count": 5,
      "format": "purpose_statement",
      "distractors": {
        "plausibility": "high",
        "distinction": "clear"
      }
    },
    "validation_rules": [
      "passage_has_clear_purpose",
      "options_are_purpose_statements",
      "answer_is_inferrable"
    ]
  }
}
```

### 1.2 검증기 통합 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Prompt Validator│────▶│  AI Validator   │────▶│  Item Validator │
│  (규칙 기반)     │     │  (LLM 기반)      │     │  (스펙 기반)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Validation Result                             │
│  - prompt_issues: []                                             │
│  - ai_suggestions: []                                            │
│  - item_violations: []                                           │
│  - overall_score: 0-100                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 문항번호별 검증 규칙

### 2.1 듣기 문항 (1-17번)

| 번호 | 유형 | 필수 요소 | 검증 규칙 |
|------|------|-----------|-----------|
| 1 | 목적 | 대화/담화 스크립트 | `has_dialogue`, `purpose_clear` |
| 2 | 의견 | 화자 의견 | `opinion_expressed`, `reasoning_present` |
| 3 | 관계 | 두 화자 | `two_speakers`, `relationship_inferrable` |
| 4 | 그림 | 이미지 설명 | `visual_elements`, `5_options_images` |
| 5 | 할 일 | 행동 계획 | `action_items`, `future_tense` |
| 6-7 | 이유/금액 | 수치 정보 | `numbers_present`, `calculation_needed` |
| 8-9 | 언급 안 된 것 | NOT 문제 | `5_mentioned_items`, `1_not_mentioned` |
| 10 | 도표 | 표/그래프 | `data_table`, `matching_required` |
| 11-12 | 내용 일치 | 세부 정보 | `factual_statements`, `true_false_check` |
| 13-14 | 상황 발화 | 상황 설명 | `situation_context`, `appropriate_response` |
| 15-17 | 세트 | 긴 담화 | `long_passage`, `multiple_questions` |

### 2.2 읽기 문항 (18-45번)

| 번호 | 유형 | 필수 요소 | 검증 규칙 |
|------|------|-----------|-----------|
| 18 | 목적 | 편지/글 | `letter_format`, `clear_purpose` |
| 19 | 심경 변화 | 감정 어휘 | `emotion_words`, `change_evident` |
| 20 | 주장 | 논설문 | `argument_structure`, `claim_clear` |
| 21 | 함축 의미 | 밑줄 문장 | `underlined_sentence`, `context_dependent` |
| 22 | 요지 | 핵심 메시지 | `main_point`, `supporting_details` |
| 23 | 주제 | 중심 생각 | `topic_sentence`, `coherence` |
| 24 | 제목 | 요약 제목 | `title_captures_main_idea` |
| 25 | 도표 | 그래프 해석 | `chart_data`, `interpretation` |
| 26-28 | 내용 일치 | 사실 확인 | `factual_accuracy`, `detail_match` |
| 29 | 어법 | 문법 오류 | `grammar_point`, `3_underlined` |
| 30 | 어휘 | 적절한 어휘 | `vocabulary_context`, `3_underlined` |
| 31-34 | 빈칸 | 빈칸 추론 | `blank_position`, `context_clues` |
| 35 | 무관한 문장 | 흐름 파악 | `irrelevant_sentence`, `5_numbered` |
| 36-37 | 순서 | 문장 배열 | `paragraph_order`, `(A)(B)(C)` |
| 38-39 | 문장 삽입 | 위치 파악 | `insertion_point`, `4_positions` |
| 40 | 요약 | 요약문 완성 | `summary_blanks`, `(A)(B)` |
| 41-42 | 장문 1 | 긴 지문 | `long_passage`, `2_questions` |
| 43-45 | 장문 2 | 긴 지문 | `long_passage`, `3_questions` |

---

## 3. 상세 스펙 (29-34번, 40-45번)

### 3.1 29번 (어법)

```json
{
  "item_no": "29",
  "item_type": "grammar",
  "validation": {
    "underlined_count": 3,
    "grammar_points": [
      "subject_verb_agreement",
      "tense_consistency",
      "relative_pronouns",
      "participles",
      "to_infinitive_vs_gerund"
    ],
    "answer_format": "one_incorrect_among_three",
    "option_format": ["①", "②", "③", "④", "⑤"]
  }
}
```

### 3.2 30번 (어휘)

```json
{
  "item_no": "30",
  "item_type": "vocabulary",
  "validation": {
    "underlined_count": 3,
    "word_pairs": "antonyms_or_confusables",
    "context_dependency": "high",
    "answer_format": "one_inappropriate_among_three"
  }
}
```

### 3.3 31-34번 (빈칸)

```json
{
  "item_no": "31-34",
  "item_type": "blank_fill",
  "validation": {
    "blank_types": {
      "31": "phrase_in_passage",
      "32": "phrase_in_passage",
      "33": "sentence_completion",
      "34": "sentence_completion"
    },
    "context_clues_required": true,
    "logical_inference": true,
    "option_length": "varies_by_type"
  }
}
```

### 3.4 40번 (요약)

```json
{
  "item_no": "40",
  "item_type": "summary",
  "validation": {
    "summary_structure": "passage → summary_with_blanks",
    "blank_count": 2,
    "blank_labels": ["(A)", "(B)"],
    "option_format": "paired_choices",
    "options_count": 5
  }
}
```

### 3.5 41-45번 (장문)

```json
{
  "item_no": "41-45",
  "item_type": "long_passage",
  "validation": {
    "41-42": {
      "passage_count": 1,
      "question_count": 2,
      "question_types": ["title/topic", "blank_fill"]
    },
    "43-45": {
      "passage_count": 1,
      "question_count": 3,
      "question_types": ["content_match", "blank_fill", "order/insert"]
    }
  }
}
```

---

## 4. AI Validator 개선

### 4.1 Issue Codes

```javascript
const AI_ISSUE_CODES = {
  // 지문 관련
  'P001': 'passage_too_short',
  'P002': 'passage_too_long',
  'P003': 'passage_off_topic',
  'P004': 'passage_difficulty_mismatch',

  // 문제 관련
  'Q001': 'question_unclear',
  'Q002': 'question_type_mismatch',
  'Q003': 'question_format_error',

  // 선택지 관련
  'O001': 'options_count_wrong',
  'O002': 'options_overlap',
  'O003': 'distractor_too_obvious',
  'O004': 'distractor_too_similar',
  'O005': 'answer_not_best',

  // 정답 관련
  'A001': 'answer_ambiguous',
  'A002': 'multiple_correct_answers',
  'A003': 'no_correct_answer'
};
```

### 4.2 AI Validator Output Schema

```json
{
  "validation_result": {
    "passed": true/false,
    "score": 0-100,
    "issues": [
      {
        "code": "O003",
        "severity": "warning",
        "message": "선택지 ②가 명백히 오답으로 보임",
        "suggestion": "좀 더 그럴듯한 오답으로 수정 필요",
        "location": "options[1]"
      }
    ],
    "improvements": [
      {
        "type": "distractor_enhancement",
        "original": "completely unrelated option",
        "suggested": "plausible but incorrect option",
        "reason": "오답의 매력도 향상"
      }
    ]
  }
}
```

---

## 5. 구현 체크리스트

### 5.1 데이터 구조
- [ ] `item_specs.json` 파일 생성
- [ ] 1-45번 모든 문항 스펙 정의
- [ ] 검증 규칙 ID 체계화

### 5.2 Prompt Validator
- [ ] 문항번호별 키워드 검증 강화
- [ ] 필수 요소 체크 로직
- [ ] 규칙 기반 빠른 검증

### 5.3 AI Validator
- [ ] Issue code 시스템 구현
- [ ] 문항 유형별 검증 프롬프트 작성
- [ ] 개선 제안 생성 로직

### 5.4 Item Validator
- [ ] 스펙 기반 검증기 구현
- [ ] 구조 검증 (선택지 개수, 형식 등)
- [ ] 내용 검증 (지문 길이, 필수 요소 등)

### 5.5 통합 테스트
- [ ] 각 문항 유형별 테스트 케이스
- [ ] Edge case 처리
- [ ] 성능 최적화

---

## 6. 우선순위

### Phase 1 (High Priority)
1. `item_specs.json` 기본 구조 생성
2. 주요 문항 유형 스펙 정의 (18, 20, 29-34)
3. Prompt Validator 연동

### Phase 2 (Medium Priority)
1. 나머지 문항 스펙 완성
2. AI Validator issue code 구현
3. 검증 결과 UI 개선

### Phase 3 (Low Priority)
1. Item Validator 고도화
2. 자동 개선 제안 기능
3. 검증 리포트 생성

---

## 7. 참고 자료

- 수능 영어 출제 매뉴얼
- 기출 문항 분석 자료
- EBS 연계 교재 형식

---

*마지막 업데이트: 2026-01-02*
