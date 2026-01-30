# 프롬프트 3종류 가이드

## 개요

프롬프트 관리 시스템에는 세 가지 종류의 프롬프트가 있습니다:
1. **숫자만 있는 프롬프트 (1~45)** - 간소화 버전
2. **LC/RC 프롬프트 (LC01~RC45)** - 상세 버전
3. **P 시리즈 프롬프트 (P01~P45)** - 지문 전용

---

## 1. 숫자만 있는 프롬프트 (1~45) - "간소화 버전"

### 파일 위치
- `docs/updated_prompts_2026-01-12.json`
- `GOOGLE_SHEETS_MIGRATION_GUIDE.md`

### 예시 (프롬프트 키 "1")
```
[LC1 Purpose] Create a short 2–3 turn dialogue where the purpose
of one speaker's speech can be inferred. Do NOT use explicit cues
like "I'm calling to…". Question: "What is the purpose of the
woman's (or man's) speech?" Provide 5 purpose options. Length: 60–80 words.
```

### 특징
- **매우 짧음** (50~150 단어)
- 핵심 지침만 포함
- **MASTER_PROMPT와 함께 사용** 필수
- Google Sheets 마이그레이션용으로 설계

### 번호 체계
| 번호 | 문항 유형 |
|------|----------|
| 1~17 | LC (듣기) 문항 |
| 18~45 | RC (독해) 문항 |

---

## 2. LC/RC 프롬프트 (LC01~LC17, RC18~RC45) - "상세 버전"

### 파일 위치
- `prompt2026_01_19_allset.json`
- `docs/prompt2026_01_24_allset.json`

### 예시 (프롬프트 키 "LC01")
```
Create a CSAT Listening Item 1 (Purpose Identification)...

## ITEM CHARACTERISTICS & METHODOLOGY
### Assessment Objective
- Core Skill: Identifying the speaker's purpose...
- Cognitive Process: Listen → Identify speaker's intent...
- Difficulty Level: 하 (예상 정답률 85-95%)

### Discourse Type & Structure
- Format: Formal monologue...
- Structure Pattern: Greeting → Identity/Role → Main announcement...

### Language Specifications
- Transcript Length: 60-80 words
- Sentence Complexity: Simple to moderate...

## DISTRACTOR DESIGN GUIDELINES (오답 설계 지침)
### 선택지 구성 원칙
- 5개 선택지: 정답 1개 + 매력적 오답 4개
...

## REQUIRED JSON OUTPUT FORMAT
{
  "question": "...",
  "transcript": "...",
  ...
}
```

### 특징
- **매우 상세함** (1000~3000+ 단어)
- 평가 목표, 난이도, 오답 설계 지침 등 포함
- **독립적으로 사용 가능** (MASTER_PROMPT 없이도 동작)
- 전문 출제위원용 상세 가이드

### 포함 내용
- Assessment Objective (평가 목표)
- Discourse Type & Structure (담화 유형 및 구조)
- Language Specifications (언어적 명세)
- Question Format Requirements (문항 형식 요구사항)
- Distractor Design Guidelines (오답 설계 지침)
- Required JSON Output Format (출력 형식)

---

## 3. P 시리즈 프롬프트 (P01~P45) - "지문 전용"

### 파일 위치
- `docs/prompt2026_01_24_allset.json`
- `GOOGLE_SHEETS_MIGRATION_GUIDE.md`

### 예시 (프롬프트 키 "P01" 또는 "P1")
```
당신은 한국 수능 영어 듣기 1번(여자가 하는 말의 목적) 스타일의 대화를
쓰는 출제위원이다. '여자가 하는 말의 목적'을 파악할 수 있는 3~4턴짜리
짧은 대화를 영어로 작성하라. 화자는 Woman(W)과 Man(M) 두 사람이며...
문제·보기·정답은 쓰지 말고 W:, M: 라벨을 붙인 영어 대화만 출력한다.
```

### 특징
- **지문만 생성** (문항, 선택지, 정답 없음)
- 한국어로 작성됨
- **PASSAGE_MASTER와 함께 사용**
- 2단계 생성 프로세스의 1단계용

### 번호 체계
| 번호 | 대응 문항 | 출력물 |
|------|----------|--------|
| P01~P17 | LC01~LC17 | 듣기 스크립트 (lc_script) |
| P18~P45 | RC18~RC45 | 독해 지문 (passage) |

---

## 비교표

| 구분 | 숫자만 (1~45) | LC/RC | P시리즈 |
|------|--------------|-------|---------|
| **길이** | 짧음 (50~150 단어) | 매우 김 (1000~3000 단어) | 중간 (100~200 단어) |
| **언어** | 영어 | 영어+한국어 혼합 | 한국어 |
| **출력물** | 지문+문항+선택지+해설 | 지문+문항+선택지+해설 | **지문만** |
| **시스템 프롬프트** | MASTER_PROMPT 필수 | 선택적 | PASSAGE_MASTER 필수 |
| **오답 설계 지침** | 없음 | **상세히 포함** | 없음 |
| **난이도 명세** | 없음 | **상세히 포함** | 없음 |
| **용도** | 빠른 생성, Google Sheets | 전문 출제, 고품질 | 지문 먼저 생성 |

---

## 시스템 프롬프트

### MASTER_PROMPT
```
[Role] You are an expert item writer for the Korean CSAT (KSAT)
English test. Your task is to create exactly ONE test item in
JSON format that strictly follows the MASTER schema and the
item-specific instructions...
```
- 문항 생성 시 사용
- 숫자 프롬프트(1~45)와 함께 필수 사용

### PASSAGE_MASTER
```
[역할] 당신은 한국 수능 영어 지문을 쓰는 전문 출제위원입니다.
입력으로 주어지는 ITEM 유형, LEVEL(난이도), TOPIC(주제) 정보를
참고하여 KSAT 스타일의 영어 지문만 작성합니다...
```
- 지문 생성 시 사용
- P시리즈 프롬프트와 함께 필수 사용

---

## 사용 시나리오별 권장 프롬프트

### 시나리오 1: 빠른 프로토타이핑
```
사용: 숫자 프롬프트 (1~45) + MASTER_PROMPT
특징: API 1회 호출, 간단한 결과
적합: 테스트, 데모, 빠른 확인
```

### 시나리오 2: 고품질 문항 (한 번에)
```
사용: LC/RC 프롬프트 (LC01~RC45)
특징: API 1회 호출, 상세한 품질 제어
적합: 실제 출제, 전문가 검토용
```

### 시나리오 3: 2단계 생성 (지문 검토 후 문항)
```
STEP 1: P시리즈 (P01~P45) + PASSAGE_MASTER → 지문 생성
        [검토/수정]
STEP 2: 숫자(1~45) 또는 LC/RC + MASTER_PROMPT → 문항 생성
특징: 지문 품질 확보 후 문항 생성
적합: 고품질 요구, 지문 재활용
```

---

## 숫자 프롬프트가 존재하는 이유

1. **Google Sheets 호환성**: 셀에 긴 텍스트 저장이 어려워 간소화
2. **토큰 비용 절감**: MASTER_PROMPT에 공통 지침을 넣고 개별 프롬프트는 최소화
3. **유연한 조합**: 시스템 프롬프트를 변경하면 모든 문항에 적용
4. **초기 버전 호환**: 레거시 시스템과의 호환성 유지

---

## 프롬프트 선택 가이드

```
┌─────────────────────────────────────────────────────────────────┐
│                    프롬프트 선택 흐름도                           │
└─────────────────────────────────────────────────────────────────┘

                    시작
                      │
                      ▼
            ┌─────────────────┐
            │ 지문을 먼저     │
            │ 검토하고 싶은가? │
            └────────┬────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
         예                    아니오
          │                     │
          ▼                     ▼
    ┌───────────┐      ┌─────────────────┐
    │ P시리즈   │      │ 상세한 품질     │
    │ 사용      │      │ 제어가 필요한가? │
    │ (2단계)   │      └────────┬────────┘
    └───────────┘               │
                     ┌──────────┴──────────┐
                     │                     │
                    예                   아니오
                     │                     │
                     ▼                     ▼
              ┌───────────┐         ┌───────────┐
              │ LC/RC     │         │ 숫자(1~45)│
              │ 프롬프트  │         │ + MASTER  │
              │ 사용      │         │ 사용      │
              └───────────┘         └───────────┘
```

---

## 파일별 프롬프트 현황

| 파일 | 숫자(1~45) | LC/RC | P시리즈 | 시스템 |
|------|-----------|-------|---------|--------|
| updated_prompts_2026-01-12.json | ✅ 44개 | ❌ | ❌ | ❌ |
| prompt2026_01_19_allset.json | ❌ | ✅ 41개 | ❌ | ❌ |
| prompt2026_01_24_allset.json | ❌ | ✅ 50개 | ✅ 45개 | ✅ 2개 |
| GOOGLE_SHEETS_MIGRATION_GUIDE.md | ✅ | ❌ | ✅ | ✅ |

---

*작성일: 2026-01-28*
