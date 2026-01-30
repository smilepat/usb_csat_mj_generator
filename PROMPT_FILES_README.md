# 프롬프트 파일 관리 가이드

## 파일 구조 (혼합 방식)

```
f:\usb_csat_mj_generator\
├── prompts_active.json              # 현재 사용 중인 메인 프롬프트 (seed 스크립트 기본)
├── prompt_versions\                  # 버전별 아카이브
│   └── prompts_v2026-01-19.json     # 2026-01-19 버전
├── docs\
│   └── prompt2026_01_24_allset.json # 참조용 (01_24 버전)
├── backups\                          # 자동 생성 백업
│   └── prompts_backup_*.json
└── web-app\server\scripts\
    └── seedAllPrompts.js             # 프롬프트 시드 스크립트
```

## 파일 설명

### 메인 파일 (현재 사용 중)
- **`prompts_active.json`**: 현재 활성화된 메인 프롬프트 파일
  - seed 스크립트의 기본 소스
  - RC18-RC40: 상세한 개별 프롬프트
  - RC41_42, RC43_45: 세트 프롬프트

### 버전 아카이브
- **`prompt_versions/`** 폴더에 버전별 파일 저장
- 파일명 형식: `prompts_vYYYY-MM-DD.json`
- 예시:
  - `prompts_v2026-01-19.json`: 2026-01-19 버전

### 참조용 파일
- **`docs/prompt2026_01_24_allset.json`**: 01_24 버전
  - RC41-RC45 개별 프롬프트는 placeholder 수준
  - 필요시 참조용으로만 사용

### 자동 백업 파일
- **`backups/`** 폴더에 자동 생성
- 형식: `prompts_backup_YYYY-MM-DDTHH-MM-SS.json`
- seed 스크립트 실행 시 자동 백업

## 프롬프트 관리 방법

### 1. 웹 UI에서 관리 (권장)
```
프롬프트 관리 페이지 → 프롬프트 선택 → 수정 → 저장
```
- 버전 히스토리 자동 저장
- 이전 버전으로 복원 가능

### 2. JSON 파일에서 Import
```
프롬프트 관리 페이지 → Import/Export 버튼 → 파일 선택 → 로드
```
- **추가만**: 기존에 없는 프롬프트만 추가
- **덮어쓰기**: 기존 프롬프트도 업데이트 (히스토리 저장됨)

### 3. Seed 스크립트 실행 (초기 설정 또는 전체 초기화)
```bash
cd web-app/server
node scripts/seedAllPrompts.js [옵션]
```

옵션:
- `--force, -f`: 확인 없이 실행
- `--no-backup`: 백업 없이 실행 (비권장)
- `--json=<경로>`: 다른 JSON 파일 사용
- `--help`: 도움말

예시:
```bash
# 기본 실행 (prompts_active.json 사용)
node scripts/seedAllPrompts.js

# 특정 버전 파일 사용
node scripts/seedAllPrompts.js --json=../../../prompt_versions/prompts_v2026-01-19.json

# 강제 실행 (확인 없음)
node scripts/seedAllPrompts.js --force
```

## 버전 관리 워크플로우

### 새 버전 생성 시
1. 현재 `prompts_active.json`을 `prompt_versions/`에 복사
   ```bash
   cp prompts_active.json prompt_versions/prompts_v$(date +%Y-%m-%d).json
   ```
2. `prompts_active.json` 업데이트
3. UI에서 수정하거나 seed 스크립트 실행

### 이전 버전으로 복원 시
```bash
# 특정 버전으로 seed 실행
node scripts/seedAllPrompts.js --json=../../../prompt_versions/prompts_v2026-01-19.json

# 또는 직접 파일 교체
cp prompt_versions/prompts_v2026-01-19.json prompts_active.json
```

## 주의사항

1. **seed 스크립트는 기존 프롬프트를 덮어씁니다**
   - 실행 전 자동 백업이 생성됩니다
   - UI에서 수정한 내용이 JSON 파일 내용으로 대체됩니다

2. **기본값 설정**
   - UI에서 설정: 해당 문항에 대해서만 기본값 설정
   - seed 스크립트: 모든 프롬프트가 기본값으로 설정됨

3. **권장 워크플로우**
   ```
   초기: seed 스크립트 실행 (1회)
       ↓
   운영: 웹 UI에서 프롬프트 수정/관리
       ↓
   백업: Import/Export 기능으로 JSON 내보내기
       ↓
   버전 저장: prompt_versions/에 날짜별 버전 보관
   ```

## JSON 파일 형식

```json
{
  "exported_at": "2026-01-19T00:00:00.000Z",
  "total_count": 41,
  "prompts": [
    {
      "prompt_key": "RC29",
      "title": "읽기 RC29 문항 (어법)",
      "prompt_text": "Create a CSAT Reading Item 29...",
      "active": 1,
      "is_default": 1,
      "status": "approved"
    },
    ...
  ]
}
```

필수 필드:
- `prompt_key`: 프롬프트 식별자 (예: RC29, LC01, MASTER_PROMPT)
- `prompt_text`: 프롬프트 내용

선택 필드:
- `title`: 표시 제목
- `active`: 활성화 여부 (기본값: 1)
- `is_default`: 기본값 여부 (기본값: 0)
- `status`: 상태 (draft, testing, approved, archived)
