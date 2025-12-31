# 수능문항생성-검증-개선 시스템

> (origin: google appscript-mj)

## 개요

구글 앱스크립트 + 구글시트로 구성된 **"수능문항 프롬프트 - 생성 - 검증 - 재생성"** 시스템을
VS Code + Claude Code 환경에서 재구성한 개선용 앱입니다.

## 저장소 정보

| 항목 | 정보 |
|------|------|
| **로컬 저장소** | `D:\csat_mj_generator` |
| **GitHub Repository** | https://github.com/smilepat/csat_mj_generator |
| **Replit 앱** | https://replit.com/@PatHwang/CSATMJ-Generator |
| **앱 명칭** | 수능문항생성-검증-개선 시스템 |

> **Note**: 이 GitHub 저장소는 Replit 앱과 연결되어 있습니다. Replit에서 직접 앱을 실행하고 편집할 수 있습니다.

## 기술 스택

### 백엔드
- Node.js + Express.js
- SQL.js (SQLite 기반 데이터베이스)
- Gemini API / OpenAI API (LLM 연동)

### 프론트엔드
- React.js
- React Router

## 실행 방법

\`\`\`bash
# 서버 실행 (포트 3001)
cd web-app
npm run dev

# 클라이언트 실행 (포트 3000)
cd web-app/client
npm start
\`\`\`

## 주요 기능

1. **문항 생성** - LLM을 활용한 수능 영어 문항 자동 생성
2. **문항 검증** - 생성된 문항의 유효성 검증
3. **프롬프트 관리** - 마스터 프롬프트 및 문항별 프롬프트 관리
4. **세트 문항** - 연계 문항(16-17, 41-42, 43-45) 세트 관리
5. **차트 데이터** - 도표 문항용 데이터 관리

## 페이지 구성

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 대시보드 | \`/\` | 시스템 현황 요약 |
| 문항 요청 | \`/items\` | 문항 생성 요청 목록 |
| 새 문항 생성 | \`/items/create\` | 새 문항 생성 |
| 세트 문항 | \`/sets\` | 세트 문항 관리 |
| 프롬프트 관리 | \`/prompts\` | 프롬프트 편집 |
| 차트 데이터 | \`/charts\` | 도표 데이터 관리 |
| 설정 | \`/config\` | 시스템 설정 |
| 로그 | \`/logs\` | 시스템 로그 |

## 데이터베이스 테이블

- \`config\` - 시스템 설정
- \`prompts\` - 프롬프트 템플릿 (93개)
- \`item_requests\` - 문항 생성 요청 (90개)
- \`item_json\` - 생성된 문항 JSON
- \`item_output\` - 최종 출력 문항
- \`item_sets\` - 세트 문항 정보
- \`charts\` - 차트/도표 데이터
- \`logs\` - 시스템 로그
- \`errors\` - 에러 로그

## 환경 설정

\`.env\` 파일에 다음 설정이 필요합니다:

\`\`\`env
PORT=3001
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-pro
OPENAI_MODEL=gpt-4.1-mini
TEMP_BASE=0.4
MAX_RETRY=3
LOG_LEVEL=INFO
\`\`\`

## 원본 시스템

이 앱은 다음 구글 시트 기반 시스템을 Node.js/React로 재구성한 것입니다:
- Google Apps Script + Google Sheets
- 수능 영어 문항 자동 생성 및 검증 시스템

## 라이선스

Private Repository
