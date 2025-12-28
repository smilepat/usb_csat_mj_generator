# 수능 문항 생성-검증 시스템 (KSAT Item Generator)

LLM(Gemini/OpenAI)을 활용한 수능 영어 문항 자동 생성 및 검증 웹 애플리케이션입니다.

## 주요 기능

### 문항 생성
- RC18~RC40 다양한 문항 유형 지원
- 지문 자동 생성 또는 수동 입력
- 난이도 설정 (하/중하/중/중상/상)
- 주제/상황 지정 가능

### 유형별 검증
- **RC29 (어법)**: 밑줄 5개, 틀린 표현 1개 검증
- **RC31-33 (빈칸)**: 빈칸 개수, 지문 변형 검사
- **RC25 (도표)**: 차트 데이터 연동
- **세트 문항**: 16-17, 41-42, 43-45 패턴 검증

### 세트 문항 관리
- 공통 지문 공유
- 난이도 프로파일 설정
- 일괄 생성 및 검증

### 프롬프트 관리
- 마스터 프롬프트 커스터마이징
- 문항 유형별 프롬프트 편집
- 지문 생성 프롬프트 관리

## 설치 및 실행

### 요구 사항
- Node.js 18 이상
- npm 또는 yarn

### 설치

```bash
# 프로젝트 폴더로 이동
cd web-app

# 의존성 설치 (서버 + 클라이언트)
npm run install:all
```

### 환경 변수 설정

`.env.example`을 `.env`로 복사하고 API 키를 설정합니다:

```bash
cp .env.example .env
```

`.env` 파일 내용:
```env
PORT=3001
NODE_ENV=development

# API 키 (필수)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# LLM 설정
PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-pro
OPENAI_MODEL=gpt-4.1-mini
TEMP_BASE=0.4
MAX_RETRY=3
LOG_LEVEL=INFO

SESSION_SECRET=your_session_secret
```

### 실행

```bash
# 서버 실행 (개발 모드)
npm run dev

# 또는 프로덕션 모드
npm start
```

서버가 시작되면 `http://localhost:3001`에서 접속할 수 있습니다.

## 프로젝트 구조

```
web-app/
├── server/                 # 백엔드 서버
│   ├── index.js           # 메인 서버 파일
│   ├── db/
│   │   └── database.js    # SQLite 데이터베이스
│   ├── routes/            # API 라우트
│   │   ├── config.js      # 설정 API
│   │   ├── prompts.js     # 프롬프트 API
│   │   ├── items.js       # 문항 요청 API
│   │   ├── sets.js        # 세트 API
│   │   ├── charts.js      # 차트 API
│   │   └── logs.js        # 로그 API
│   └── services/          # 비즈니스 로직
│       ├── llmClient.js   # LLM API 클라이언트
│       ├── promptBuilder.js
│       ├── passageGenerator.js
│       ├── jsonUtils.js
│       ├── itemPipeline.js
│       ├── configService.js
│       ├── logger.js
│       └── validators/    # 검증기 모듈
│           ├── common.js
│           ├── grammar.js
│           ├── gap.js
│           ├── chart.js
│           └── set.js
├── client/                # React 프론트엔드
│   ├── public/
│   └── src/
│       ├── api/           # API 클라이언트
│       ├── pages/         # 페이지 컴포넌트
│       └── styles/        # 스타일시트
├── data/                  # SQLite 데이터베이스 저장
├── package.json
└── .env
```

## API 엔드포인트

### 설정 (`/api/config`)
- `GET /` - 모든 설정 조회
- `PUT /:key` - 설정 업데이트
- `POST /batch` - 일괄 업데이트

### 프롬프트 (`/api/prompts`)
- `GET /` - 모든 프롬프트 조회
- `GET /:key` - 특정 프롬프트 조회
- `POST /` - 프롬프트 생성
- `PUT /:key` - 프롬프트 수정
- `DELETE /:key` - 프롬프트 삭제

### 문항 요청 (`/api/items`)
- `GET /requests` - 요청 목록 조회
- `GET /requests/:id` - 요청 상세 조회
- `POST /requests` - 새 요청 생성
- `POST /generate/:id` - 문항 생성 실행
- `POST /generate-pending` - PENDING 일괄 처리
- `DELETE /requests/:id` - 요청 삭제
- `GET /outputs` - 생성된 문항 조회

### 세트 (`/api/sets`)
- `GET /` - 세트 목록 조회
- `GET /:setId` - 세트 상세 조회
- `POST /` - 세트 생성
- `PUT /:setId` - 세트 수정
- `DELETE /:setId` - 세트 삭제
- `POST /:setId/generate` - 세트 문항 생성
- `POST /:setId/requests` - 세트에 요청 추가

### 차트 (`/api/charts`)
- `GET /` - 차트 목록 조회
- `GET /:chartId` - 차트 상세 조회
- `POST /` - 차트 생성
- `PUT /:chartId` - 차트 수정
- `DELETE /:chartId` - 차트 삭제

### 로그 (`/api/logs`)
- `GET /` - 일반 로그 조회
- `GET /errors` - 에러 로그 조회
- `GET /stats` - 로그 통계
- `DELETE /clear` - 오래된 로그 삭제

## 문항 생성 파이프라인

1. **지문 생성** (필요시): 지문이 없으면 LLM이 자동 생성
2. **프롬프트 구성**: 마스터 + 유형별 프롬프트 조합
3. **LLM 호출**: Gemini 또는 OpenAI API 호출
4. **JSON 파싱**: 응답에서 JSON 추출
5. **정규화**: 표준 스키마로 변환
6. **공통 검증**: 필수 필드 확인
7. **유형별 검증**: RC29/RC31-33/RC25 등 추가 검증
8. **결과 저장**: DB에 결과 기록

## 기술 스택

### 백엔드
- Node.js + Express
- SQLite (better-sqlite3)
- Gemini API / OpenAI API

### 프론트엔드
- React 18
- React Router DOM
- CSS (커스텀 스타일)

## 라이선스

MIT License
