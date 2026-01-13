# 수능 문항 생성-검증 시스템 실행 가이드

## 빠른 시작

### 1. 시스템 시작
프로젝트 루트 디렉토리에서 `start.bat` 파일을 더블클릭하거나 실행합니다.

```bash
start.bat
```

- 백엔드 서버: http://localhost:3001
- 프론트엔드 클라이언트: http://localhost:3000

### 2. 시스템 종료
`stop.bat` 파일을 실행하여 모든 프로세스를 종료합니다.

```bash
stop.bat
```

## 수동 실행

### 서버만 실행
```bash
cd web-app
npm start
```

### 클라이언트만 실행
```bash
cd web-app/client
npm start
```

## 포트 설정

시스템은 다음 포트에서 실행됩니다:
- **프론트엔드**: 3000 (React)
- **백엔드**: 3001 (Express)

포트를 변경하려면:
1. 백엔드: `web-app/.env` 파일의 `PORT=3001` 수정
2. 프론트엔드: `web-app/client/package.json`의 `"proxy": "http://localhost:3001"` 수정

## 주요 URL

- **메인 페이지**: http://localhost:3000
- **프롬프트 관리**: http://localhost:3000/prompts
- **문항 생성**: http://localhost:3000/items
- **품질 대시보드**: http://localhost:3000/quality
- **API 헬스체크**: http://localhost:3001/api/health

## 문제 해결

### 포트가 이미 사용 중인 경우
```bash
stop.bat
```
위 명령으로 실행 중인 프로세스를 종료한 후 다시 시작하세요.

### 수동으로 프로세스 종료
```bash
# 포트 3001 종료
netstat -ano | findstr :3001
taskkill /F /PID [PID번호]

# 포트 3000 종료
netstat -ano | findstr :3000
taskkill /F /PID [PID번호]
```

## 개발 환경

- Node.js: v16 이상
- npm: v8 이상
- Windows 10/11
