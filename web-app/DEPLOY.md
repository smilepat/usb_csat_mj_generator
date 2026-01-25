# KSAT 문항 생성 시스템 - 배포 가이드

## 빠른 배포 (Railway 권장)

### 1단계: Railway 계정 생성
1. https://railway.app 접속
2. GitHub 계정으로 로그인

### 2단계: 프로젝트 배포
1. **New Project** 클릭
2. **Deploy from GitHub repo** 선택
3. 이 저장소 선택 (`usb_csat_mj_generator`)
4. `web-app` 폴더를 Root Directory로 설정

### 3단계: 환경 변수 설정
Railway 대시보드 → Variables 탭에서 추가:

```
NODE_ENV=production
PROVIDER=azure

# Azure OpenAI (권장)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_key_here
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# 또는 Gemini
# PROVIDER=gemini
# GEMINI_API_KEY=your_key_here

# 보안
SESSION_SECRET=랜덤문자열생성하여입력
```

### 4단계: 배포 확인
- 자동 빌드 시작 (약 3-5분 소요)
- 완료 후 제공되는 URL로 접속

---

## Render.com 배포 (대안)

### 1단계: Render 계정 생성
1. https://render.com 접속
2. GitHub 계정으로 로그인

### 2단계: 새 Web Service 생성
1. **New** → **Web Service** 클릭
2. GitHub 저장소 연결
3. 설정:
   - **Root Directory**: `web-app`
   - **Build Command**: `npm install && cd client && npm install && npm run build`
   - **Start Command**: `npm start`

### 3단계: 환경 변수 설정
Environment 탭에서 Railway와 동일하게 설정

---

## 환경 변수 설명

| 변수 | 필수 | 설명 |
|------|------|------|
| `PROVIDER` | O | LLM 제공자 (`azure`, `gemini`, `openai`) |
| `AZURE_OPENAI_ENDPOINT` | △ | Azure 사용 시 필수 |
| `AZURE_OPENAI_API_KEY` | △ | Azure 사용 시 필수 |
| `AZURE_OPENAI_DEPLOYMENT` | △ | Azure 사용 시 필수 |
| `GEMINI_API_KEY` | △ | Gemini 사용 시 필수 |
| `OPENAI_API_KEY` | △ | OpenAI 사용 시 필수 |
| `SESSION_SECRET` | O | 세션 암호화 키 (랜덤 문자열) |
| `NODE_ENV` | O | `production` 설정 |

### SESSION_SECRET 생성 방법
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 배포 후 확인사항

1. **Health Check**: `https://your-app.railway.app/api/health`
2. **메인 페이지**: `https://your-app.railway.app`
3. **문항 생성 테스트**: LC01 또는 RC29 문항 생성 시도

---

## 문제 해결

### 빌드 실패
- Node.js 버전 확인 (18.x 이상 필요)
- `npm install` 로그 확인

### API 오류
- 환경 변수 설정 확인
- LLM API 키 유효성 확인

### 데이터베이스
- SQLite 파일은 `data/csat.db`에 자동 생성됨
- 재배포 시 데이터 초기화됨 (영구 저장 필요시 외부 DB 사용)

---

## 로컬 테스트

배포 전 로컬에서 프로덕션 모드 테스트:

```bash
cd web-app
npm run build
NODE_ENV=production npm start
```

http://localhost:3001 접속하여 확인
