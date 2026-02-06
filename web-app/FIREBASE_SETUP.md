# Firebase Firestore 설정 가이드

Vercel 프로덕션 환경에서 데이터를 영속적으로 저장하려면 Firebase Firestore를 설정해야 합니다.

## 보안 개요

이 프로젝트는 다음과 같은 보안 아키텍처를 사용합니다:

| 구성 요소 | 인증 방식 | 설명 |
|-----------|-----------|------|
| **서버 (Node.js)** | Service Account | Firebase Admin SDK로 전체 접근 권한 |
| **클라이언트 (React)** | Web Config | Analytics만 사용, Firestore 직접 접근 불가 |
| **API** | API Key + Session | 서버 API를 통해서만 데이터 접근 |

> **중요**: 클라이언트의 Firebase API 키는 공개되도록 설계되었습니다. 보안은 Firestore Security Rules와 서버 측 인증으로 보장됩니다.

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `csat-mj-generator`)
4. Google Analytics 설정 (선택사항)
5. "프로젝트 만들기" 클릭

## 2. Firestore 데이터베이스 활성화

1. Firebase Console에서 프로젝트 선택
2. 좌측 메뉴에서 "Firestore Database" 클릭
3. "데이터베이스 만들기" 클릭
4. **프로덕션 모드**로 시작 선택
5. 리전 선택 (권장: `asia-northeast3` - 서울)
6. "사용 설정" 클릭

## 3. Firestore 보안 규칙 설정

Firestore Console에서 "규칙" 탭으로 이동하여 다음 규칙을 설정합니다:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 서버에서만 접근 가능 (서비스 계정 사용)
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

> 참고: 서비스 계정을 사용하면 이 규칙과 관계없이 접근 가능합니다.

## 4. 서비스 계정 키 생성

1. Firebase Console > 프로젝트 설정 (톱니바퀴 아이콘)
2. "서비스 계정" 탭 클릭
3. "새 비공개 키 생성" 클릭
4. JSON 파일 다운로드

## 5. Vercel 환경 변수 설정

1. [Vercel Dashboard](https://vercel.com/dashboard)에서 프로젝트 선택
2. "Settings" > "Environment Variables" 이동
3. 다음 환경 변수 추가:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `FIREBASE_SERVICE_ACCOUNT` | `{"type":"service_account",...}` | 다운로드한 JSON 파일 내용 (한 줄로) |

### JSON 한 줄로 변환하기

다운로드한 서비스 계정 JSON 파일을 한 줄로 변환합니다:

**PowerShell (Windows):**
```powershell
(Get-Content serviceAccountKey.json -Raw) -replace '\s+', ' ' | Set-Clipboard
```

**Bash (Mac/Linux):**
```bash
cat serviceAccountKey.json | jq -c . | pbcopy
```

**Node.js:**
```javascript
const fs = require('fs');
const json = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8'));
console.log(JSON.stringify(json));
```

## 6. 배포 및 확인

```bash
# Vercel 배포
vercel --prod
```

배포 후 API 상태 확인:
```
https://your-app.vercel.app/api/health
```

응답에 `"database": "firestore"`가 포함되면 Firebase가 정상 작동 중입니다.

## 컬렉션 구조

Firebase Firestore에 생성되는 컬렉션:

- `config` - 시스템 설정
- `prompts` - 프롬프트 템플릿
- `item_requests` - 문항 생성 요청
- `item_json` - 생성된 문항 JSON
- `item_output` - 최종 문항 출력
- `item_sets` - 문항 세트
- `item_metrics` - 문항 품질 메트릭스
- `logs` - 시스템 로그
- `errors` - 에러 로그

## 로컬 개발

로컬에서는 기존대로 SQLite를 사용합니다. `FIREBASE_SERVICE_ACCOUNT` 환경 변수가 없으면 자동으로 SQLite 모드로 동작합니다.

## 문제 해결

### "FIREBASE_SERVICE_ACCOUNT 환경 변수가 설정되지 않았습니다"
- Vercel 환경 변수가 올바르게 설정되었는지 확인
- 재배포 필요할 수 있음

### "Firestore 초기화 실패"
- 서비스 계정 JSON이 올바른 형식인지 확인
- `private_key`의 줄바꿈(`\n`)이 유지되고 있는지 확인

### 데이터가 저장되지 않음

- Firebase Console에서 Firestore가 활성화되어 있는지 확인
- 서비스 계정에 Firestore 접근 권한이 있는지 확인

## 보안 체크리스트

### 필수 설정

- [ ] Firestore 보안 규칙이 클라이언트 접근을 차단하는지 확인
- [ ] `FIREBASE_SERVICE_ACCOUNT` 환경 변수가 Vercel에만 설정되어 있는지 확인
- [ ] 서비스 계정 JSON 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] `API_ACCESS_KEY` 환경 변수로 API 보호 활성화
- [ ] `ADMIN_PASSWORD` 환경 변수로 관리자 로그인 보호

### 권장 설정

- [ ] `SESSION_SECRET`을 강력한 무작위 문자열로 설정
- [ ] 프로덕션에서 HTTPS 강제 활성화
- [ ] Firebase Console에서 앱 체크(App Check) 활성화 고려

### 환경 변수 예시 (Vercel)

```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
API_ACCESS_KEY=your-secure-api-key
ADMIN_PASSWORD=your-secure-password
SESSION_SECRET=random-32-character-string
NODE_ENV=production
```
