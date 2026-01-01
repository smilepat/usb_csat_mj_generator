# 프로젝트 개발 문서

## 프로젝트 정보
- **GitHub**: csat_mj_generator
- **경로**: c:\csat_mj_generator
- **환경**: Home PC

## 프로젝트 개요
수능 영어 문항 생성 시스템 - Gemini API를 활용한 문항 자동 생성 및 3겹 검증 시스템

## 기술 스택
| 구분 | 기술 |
|------|------|
| Backend | Node.js + Express (port 3001) |
| Frontend | React (port 3000) |
| Database | SQLite (sql.js) |
| LLM | Google Gemini API |

## 데이터 구조

### 프롬프트 키 매핑
| 범위 | 유형 | 키 패턴 |
|------|------|---------|
| 16-17 | 듣기 (LC) | LC16, LC17 |
| 18-45 | 읽기 (RC) | RC18 ~ RC45 |
| 1-45 | 기본 | P1 ~ P45 |

### 3겹 검증 시스템
| Layer | 항목 | 가중치 | 설명 |
|-------|------|--------|------|
| Layer 1 | 구조 검증 | 40% | 필수 필드, 형식 검사 |
| Layer 2 | 내용 품질 | 25% | 정답 범위, 선택지 중복, 해설 |
| Layer 3 | 수능 적합성 | 35% | 단어수, 문장 복잡도, 형식 |

### 등급 기준
| 등급 | 점수 범위 | 분류 |
|------|----------|------|
| A | 90-100 | APPROVE |
| B | 80-89 | APPROVE |
| C | 70-79 | REVIEW |
| D | 60-69 | REVIEW |
| F | 0-59 | REJECT |

## 현재 상태 체크리스트

### 완료 항목
- [x] 백엔드 서버 구축 (Express + SQLite)
- [x] 프론트엔드 UI (React)
- [x] 프롬프트 관리 시스템
- [x] 문항 생성 파이프라인
- [x] 3겹 검증 시스템 구현
- [x] 품질 대시보드 UI
- [x] 프롬프트 개선 프로세스 가이드 모달

### 진행 중
- [ ] AI 기반 Layer 2 검증 고도화
- [ ] 사용자 피드백 수집 시스템

## 실행 방법

### 백엔드 서버 시작
```bash
cd c:\csat_mj_generator\web-app
node server/index.js
# 또는
npm start
```

### 프론트엔드 서버 시작
```bash
cd c:\csat_mj_generator\web-app\client
npm start
```

### 접속
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 개발 로그 (2026-01-01)

### 1. 프롬프트 개선 프로세스 가이드 추가
**파일**: `web-app/client/src/pages/Dashboard.js`

대시보드에 "프롬프트 개선 프로세스" 버튼 및 모달 추가:
- 5단계 프로세스 가이드
- 검증 옵션 표 (빠른 검증, AI 검증, 사용자 피드백)
- 3겹 검증 기준 설명
- 등급표

```javascript
const [showPromptGuide, setShowPromptGuide] = useState(false);

<button
  className="btn btn-secondary"
  onClick={() => setShowPromptGuide(true)}
>
  💬 프롬프트 개선 프로세스
</button>
```

### 2. 피드백 적용 버튼 활성화
**파일**: `web-app/client/src/pages/Prompts.js`

피드백 반영 결과의 "적용하기" 버튼에 disabled 조건 추가:

```javascript
<button
  className="btn btn-primary btn-sm"
  onClick={handleApplyFeedbackImproved}
  disabled={!improvementResult?.improved_prompt}
>
  📝 적용하기
</button>
```

### 3. 프롬프트 적용 시스템 확인
- 프롬프트는 SQLite DB에 저장됨
- 문항 생성 시 `promptService.getPrompt(key)`로 최신 버전 조회
- 캐싱 없이 매번 DB에서 직접 조회하므로 즉시 반영됨

## 핵심 파일 구조

```
web-app/
├── server/
│   ├── index.js                 # 서버 진입점
│   ├── db/database.js           # SQLite 연결
│   ├── services/
│   │   ├── promptService.js     # 프롬프트 CRUD
│   │   ├── metricsService.js    # 3겹 검증 메트릭스
│   │   ├── pipeline.js          # 문항 생성 파이프라인
│   │   └── validators/          # 검증기 모듈
│   └── routes/                  # API 라우트
└── client/
    └── src/pages/
        ├── Dashboard.js         # 메인 대시보드
        ├── Prompts.js           # 프롬프트 관리
        └── QualityDashboard.js  # 품질 대시보드
```

## 참고 사항
- 프롬프트 저장 후 새 문항 생성 시 최신 프롬프트가 자동 적용됨
- Layer 1 검증 실패 시 최종 점수는 최대 40점으로 제한됨
- 문항 번호별로 지문 길이 기준이 다르게 적용됨 (16-17: 듣기, 41-45: 장문 등)
