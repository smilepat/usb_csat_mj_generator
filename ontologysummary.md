# CSAT Item Generator 시스템 온톨로지 분석 보고서

## 1. 시스템 개요

**시스템명:** 수능 문항 생성-검증-개선 시스템 (KSAT Item Generator & Validator)

**아키텍처:** Full-stack Node.js + React 애플리케이션

**기술 스택:**
- **Backend:** Node.js + Express.js, SQL.js (SQLite), Gemini/OpenAI API
- **Frontend:** React 18, React Router, React Icons
- **Database:** SQL.js (in-memory with file persistence)

---

## 2. 핵심 개념 구조 (Core Concepts)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CSAT Item Generator Ontology                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Prompt    │───▶│   Request   │───▶│    Item     │───▶│   Output    │  │
│  │  (템플릿)    │    │  (요청)      │    │  (문항)      │    │  (결과물)    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                  │                  │                  │          │
│         ▼                  ▼                  ▼                  ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Metrics    │    │  Pipeline   │    │  Validator  │    │   Library   │  │
│  │  (성능지표)   │    │  (파이프라인) │    │  (검증기)    │    │  (보관소)    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 개념 정의 (Concept Definitions)

| 개념 | 정의 | 주요 속성 |
|------|------|----------|
| **Prompt** | 문항 생성 지시문 템플릿 | key, title, text, active, is_default |
| **Request** | 문항 생성 요청 인스턴스 | request_id, item_no, status, passage |
| **Item** | 생성된 문항 데이터 | raw_json, normalized_json, final_json |
| **Output** | 최종 형식화된 출력물 | question, options, answer, explanation |
| **Metrics** | 성능 측정 데이터 | total_score, grade, approve_rate |
| **Validator** | 품질 검증 규칙 세트 | common, grammar, gap, chart, format |
| **Pipeline** | 생성 워크플로우 | passage → prompt → LLM → parse → validate |
| **Library** | 승인된 문항 저장소 | 재사용 가능한 고품질 문항 |

---

## 4. 기능 간 연관 관계 (Ontological Relations)

```
┌──────────────┐  composes   ┌──────────────────┐  invokes    ┌──────────────┐
│ MASTER_PROMPT│────────────▶│  PromptBuilder   │────────────▶│   LLMClient  │
│  (공통 규칙)  │             │  (프롬프트 구성)   │             │  (API 호출)   │
└──────────────┘             └──────────────────┘             └──────────────┘
       │                              │                              │
       │ extends                      │ uses                         │ returns
       ▼                              ▼                              ▼
┌──────────────┐  selected    ┌──────────────────┐  parses    ┌──────────────┐
│ Type Prompt  │─────────────▶│  ItemPipeline    │───────────▶│   JsonUtils  │
│ (LC/RC 템플릿)│             │  (생성 파이프라인)  │             │  (JSON 파싱)  │
└──────────────┘             └──────────────────┘             └──────────────┘
                                      │                              │
                                      │ validates                    │ normalizes
                                      ▼                              ▼
                              ┌──────────────────┐  evaluates  ┌──────────────┐
                              │   Validators     │────────────▶│ ItemEvaluator│
                              │  (규칙 기반 검증)  │             │ (LLM 품질평가) │
                              └──────────────────┘             └──────────────┘
                                      │                              │
                                      │ stores                       │ scores
                                      ▼                              ▼
                              ┌──────────────────┐  tracks     ┌──────────────┐
                              │    Database      │────────────▶│   Metrics    │
                              │  (SQLite/SQL.js) │             │  (성능 추적)   │
                              └──────────────────┘             └──────────────┘
```

---

## 5. 관계 유형 설명

| 관계 | 소스 → 타겟 | 의미 |
|------|------------|------|
| **composes** | MASTER_PROMPT → PromptBuilder | 공통 규칙이 모든 프롬프트에 합성됨 |
| **extends** | Type Prompt → MASTER_PROMPT | 문항별 템플릿이 마스터를 확장함 |
| **selected** | Type Prompt → ItemPipeline | 문항 번호에 따라 적절한 템플릿 선택 |
| **invokes** | PromptBuilder → LLMClient | 구성된 프롬프트로 LLM API 호출 |
| **parses** | ItemPipeline → JsonUtils | LLM 응답에서 JSON 추출 |
| **normalizes** | JsonUtils → Normalized JSON | 필드명 표준화 |
| **validates** | ItemPipeline → Validators | 생성 결과에 규칙 기반 검증 적용 |
| **evaluates** | Validators → ItemEvaluator | 규칙 통과 후 LLM 품질 평가 |
| **stores** | ItemPipeline → Database | 모든 결과물 영구 저장 |
| **tracks** | Database → Metrics | 프롬프트/문항 성능 추적 |

---

## 6. 레이어 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Layer 1: Presentation (프레젠테이션 계층)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  React Components: Dashboard, ItemCreate, Prompts, ItemRequests, Config    │
│  Context: AppContext (전역 상태), ThemeContext (테마)                        │
│  Hooks: usePrompts, useMessage                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTP REST API
┌─────────────────────────────────────────────────────────────────────────────┐
│ Layer 2: API (API 계층)                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Routes: /prompts, /items, /config, /sets, /charts, /logs, /metrics        │
│  Middleware: auth, errorHandler, validate, apiVersion                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ Service Calls
┌─────────────────────────────────────────────────────────────────────────────┐
│ Layer 3: Business Logic (비즈니스 로직 계층)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Core Services:                                                             │
│  ├── itemPipeline.js      (문항 생성 워크플로우)                              │
│  ├── promptBuilder.js     (프롬프트 구성)                                    │
│  ├── passageGenerator.js  (지문 자동 생성)                                   │
│  ├── llmClient.js         (LLM API 통합)                                    │
│  └── jsonUtils.js         (JSON 파싱/정규화)                                 │
│                                                                             │
│  Validation Services:                                                       │
│  ├── validators/common.js    (공통 필드 검증)                                │
│  ├── validators/format.js    (형식 검증)                                     │
│  ├── validators/grammar.js   (RC29 어법 검증)                                │
│  ├── validators/gap.js       (RC31-33 빈칸 검증)                             │
│  ├── validators/chart.js     (RC25 차트 검증)                                │
│  ├── validators/listening.js (LC1-17 듣기 검증)                              │
│  └── validators/set.js       (연계 문항 검증)                                │
│                                                                             │
│  Quality Services:                                                          │
│  ├── itemEvaluator.js        (LLM 기반 품질 평가)                            │
│  ├── promptEvaluator.js      (프롬프트 품질 평가)                             │
│  ├── metricsService.js       (메트릭스 집계)                                 │
│  └── autoImproveService.js   (자동 개선 제안)                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ Repository Pattern
┌─────────────────────────────────────────────────────────────────────────────┐
│ Layer 4: Data Access (데이터 접근 계층)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Repositories: baseRepository, promptRepository, itemRepository            │
│  Database: SQL.js (SQLite in-memory with file persistence)                 │
│  Tables: prompts, item_requests, item_json, item_output, metrics, logs...  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. 문항 생성 파이프라인 상세 흐름

### 7.1 생성 워크플로우 (Generation Workflow)

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Request │───▶│ Passage │───▶│ Prompt  │───▶│   LLM   │───▶│  Parse  │
│ 생성요청 │    │ 지문생성 │    │ 프롬프트 │    │  호출   │    │  파싱   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                                  │
     ┌────────────────────────────────────────────────────────────┘
     ▼
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│Normalize│───▶│Validate │───▶│Evaluate │───▶│  Score  │───▶│  Store  │
│ 정규화  │    │  검증   │    │  평가   │    │  채점   │    │  저장   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### 7.2 검증 계층 구조 (Validation Layers)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Validation Pipeline                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: Format Validation (형식 검증)                                      │
│  ├── JSON 구조 유효성                                                        │
│  ├── 필수 필드 존재 여부                                                      │
│  ├── 언어 혼용 규칙 (지문=영어, 발문=한글)                                     │
│  └── 지문 길이 범위 검사                                                      │
│                                                                             │
│  Layer 2: Common Validation (공통 검증)                                      │
│  ├── 5개 선택지 존재                                                         │
│  ├── correct_answer 1-5 범위                                                │
│  ├── 선택지 중복 여부                                                        │
│  └── LLM 메타정보 누출 검사                                                   │
│                                                                             │
│  Layer 3: Type-Specific Validation (유형별 검증)                             │
│  ├── RC29 (어법): 밑줄 5개, 정확히 1개 오류                                    │
│  ├── RC31-33 (빈칸): 빈칸 위치, 선택지 완성도                                  │
│  ├── RC25 (차트): 차트 데이터 일치, 비교 표현                                  │
│  ├── LC01-17 (듣기): 대화 턴, 화자 마커, 시간                                 │
│  └── Sets (연계): 공통 지문, 문항 간 일관성                                    │
│                                                                             │
│  Layer 4: Quality Evaluation (품질 평가) - LLM 기반                          │
│  ├── A. 정답 적합성 (30점)                                                   │
│  ├── B. 오답 설계 품질 (25점)                                                │
│  ├── C. 변별력 (20점)                                                        │
│  ├── D. 문항 유형 적합성 (15점)                                              │
│  └── E. 자연스러움 (10점)                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. 프롬프트 계층 구조

```
                    ┌─────────────────────────┐
                    │     MASTER_PROMPT       │
                    │   (공통 규칙 - 저작권,    │
                    │    출력 형식, 어휘 수준)  │
                    └───────────┬─────────────┘
                                │ inherits
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │  LC Prompts   │   │  RC Prompts   │   │  Set Prompts  │
    │   (듣기 1-17)  │   │  (독해 18-45) │   │  (연계 문항)   │
    └───────┬───────┘   └───────┬───────┘   └───────────────┘
            │                   │
    ┌───────┴───────┐   ┌───────┴───────────────────┐
    ▼               ▼   ▼                           ▼
┌───────┐       ┌───────┐                       ┌───────┐
│ LC01  │  ...  │ LC17  │   RC18 ... RC40 ...   │ RC45  │
│목적파악│       │세트듣기│                       │장문독해│
└───────┘       └───────┘                       └───────┘
```

---

## 9. 프롬프트-문항 매핑

| 프롬프트 키 | 문항 번호 | 평가 영역 |
|------------|----------|----------|
| LC01-LC17 | 1-17번 | 듣기 |
| RC18-RC19 | 18-19번 | 독해 (목적/심경) |
| RC20-RC24 | 20-24번 | 독해 (주장/함의/요지/주제/제목) |
| RC25-RC28 | 25-28번 | 독해 (도표/실용문/인물/어휘) |
| RC29-RC30 | 29-30번 | 독해 (어법/어휘) |
| RC31-RC34 | 31-34번 | 독해 (빈칸추론) |
| RC35-RC37 | 35-37번 | 독해 (무관문장/순서) |
| RC38-RC40 | 38-40번 | 독해 (삽입/요약) |
| RC41-RC45 | 41-45번 | 독해 (장문) |

---

## 10. 데이터 생명주기

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Data Lifecycle                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Creation Phase (생성 단계)                                               │
│     User Request → item_requests (status: pending)                          │
│                                                                             │
│  2. Generation Phase (처리 단계)                                             │
│     item_requests → LLM → item_json (raw_json, normalized_json)             │
│                                                                             │
│  3. Validation Phase (검증 단계)                                             │
│     item_json → Validators → validation_result, validation_log              │
│                                                                             │
│  4. Evaluation Phase (평가 단계)                                             │
│     validated item → ItemEvaluator → item_metrics (score, grade)            │
│                                                                             │
│  5. Storage Phase (저장 단계)                                                │
│     final_json → item_output (question, options, answer, explanation)       │
│                                                                             │
│  6. Archive Phase (보관 단계)                                                │
│     approved items → library (재사용 가능 문항)                               │
│                                                                             │
│  7. Analytics Phase (분석 단계)                                              │
│     all data → prompt_metrics, item_generation_history, logs                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. 외래 키 관계

```
prompts (1) ──────────────────┬──────────────────── (N) prompt_versions
    │                         │
    │ prompt_id               │ prompt_id
    ▼                         ▼
item_requests (1) ─────────── (N) item_json
    │                              │
    │ request_id                   │ request_id
    ▼                              ▼
item_output (1) ──────────────── item_metrics
    │
    │ item_id
    ▼
library (보관된 문항)
```

---

## 12. 데이터베이스 스키마 요약

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|----------|
| **config** | 시스템 설정 | key, value, description |
| **prompts** | 프롬프트 템플릿 | prompt_key, title, prompt_text, active, is_default |
| **item_requests** | 문항 생성 요청 | request_id, status, item_no, passage |
| **item_json** | 원시/정규화 JSON | raw_json, normalized_json, validation_result |
| **item_output** | 최종 출력물 | question, option_1-5, answer, explanation |
| **item_metrics** | 품질 메트릭스 | total_score, grade, classification |
| **prompt_versions** | 버전 히스토리 | version, prompt_text, change_reason |
| **prompt_metrics** | 프롬프트 성능 | items_generated, approve_rate |
| **library** | 승인된 문항 | 재사용 가능 고품질 문항 |
| **logs** | 시스템 로그 | timestamp, level, tag, message |
| **errors** | 에러 로그 | func_name, message, stack |

---

## 13. 온톨로지 핵심 요약

이 시스템은 **"프롬프트 중심 문항 생성 시스템"**으로, 모든 기능이 프롬프트를 축으로 연결되어 있습니다.

```
                         ┌─────────────────┐
                         │    PROMPT       │
                         │   (중심 엔티티)   │
                         └────────┬────────┘
                                  │
        ┌─────────────┬───────────┼───────────┬─────────────┐
        ▼             ▼           ▼           ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Version │  │ Metrics │  │ Request │  │Validator│  │Evaluator│
   │ (버전)   │  │ (성능)   │  │ (요청)   │  │ (검증)   │  │ (평가)   │
   └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
        │             │           │           │             │
        └─────────────┴───────────┴───────────┴─────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  Feedback Loop  │
                         │   (개선 사이클)   │
                         └─────────────────┘
```

### 주요 온톨로지 관계:

1. **계층적 관계 (is-a)**
   - MASTER_PROMPT → LC/RC Prompt → 개별 문항 프롬프트

2. **구성 관계 (has-a)**
   - ItemRequest → Passage, ItemNo, PromptId, Status

3. **의존 관계 (depends-on)**
   - ItemPipeline → PromptBuilder, LLMClient, Validators

4. **순환 관계 (feedback-to)**
   - Metrics → PromptImprovement → Better Prompts → Better Items

---

## 14. 결론

시스템의 모든 기능은 궁극적으로 **고품질 수능 영어 문항 자동 생성**이라는 단일 목표를 향해 유기적으로 연결되어 있습니다. 프롬프트가 중심 엔티티로서 문항 생성의 품질을 결정하며, 메트릭스와 피드백 루프를 통해 지속적인 개선이 이루어지는 구조입니다.

---

*작성일: 2026-01-20*
*시스템 버전: CSAT Item Generator v1.0*
