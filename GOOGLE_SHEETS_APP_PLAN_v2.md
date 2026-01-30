# 수능 영어 문항 생성 시스템 - Google Sheets + Apps Script 구현 계획서 (v2)

## 개요

이 문서는 현재 Node.js/React 기반 웹앱의 핵심 기능을 Google Sheets + Apps Script로 구현하는 계획서입니다.
**2단계 워크플로우(지문 검토 후 문항 생성)** 기능이 포함되어 있습니다.

---

## Part 1: 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Google Sheets 워크북                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ 데이터 시트   │  │ 생성 요청    │  │ 결과 저장    │  │ 대시보드    │ │
│  │ (15개)       │  │ 시트        │  │ 시트        │  │ 시트       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         Apps Script 백엔드                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ LLMClient    │  │ Prompt       │  │ Item         │  │ Passage     │ │
│  │ .gs         │  │ Builder.gs   │  │ Generator.gs │  │ Generator.gs│ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Prompt       │  │ Item         │  │ UI           │  │ Menu        │ │
│  │ Validator.gs │  │ Validator.gs │  │ Service.gs   │  │ Handler.gs  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Google Sheets 구조 (총 20개 시트)

### 시트 목록

| 번호 | 시트명 | 용도 | 신규 |
|------|--------|------|------|
| 1 | Prompts_Master | 프롬프트 메타데이터 | |
| 2 | Prompts_Content | 프롬프트 본문 | |
| 3 | Prompts_Versions | 버전 히스토리 | |
| 4 | Thinking_Types | 문항별 사고 유형 | |
| 5 | Keyword_Categories | 오답/변별력 키워드 | |
| 6 | Word_Count_Ranges | 지문 길이 기준 | |
| 7 | Forbidden_Patterns | 금지 패턴 | |
| 8 | Prompt_Validation_Rules | 프롬프트 검증 규칙 | |
| 9 | Item_Validation_Rules | 문항 검증 규칙 | |
| 10 | LLM_Evaluation_Criteria | LLM 평가 기준 | |
| 11 | Verdict_Rules | 판정 규칙 | |
| 12 | Regeneration_Triggers | 재생성 트리거 | |
| 13 | Distractor_Error_Types | 오답 오류 유형 | |
| 14 | Config | 시스템 설정 | |
| 15 | Metrics | 성능 메트릭스 | |
| 16 | **Item_Requests** | 문항 생성 요청 | **NEW** |
| 17 | **Item_Results** | 생성된 문항 결과 | **NEW** |
| 18 | **Passage_Queue** | 지문 생성 대기열 | **NEW** |
| 19 | **Library** | 승인된 문항 라이브러리 | **NEW** |
| 20 | **Dashboard** | 대시보드/통계 | **NEW** |

---

### Sheet 16: Item_Requests (문항 생성 요청)

```
request_id	status	item_no	passage	passage_source	level	topic	extra	created_at	updated_at
REQ_001	PENDING	29		AUTO	중	환경보호		2026-01-28	2026-01-28
REQ_002	PASSAGE_READY	22	[생성된 지문]	LLM	중상	기술발전		2026-01-28	2026-01-28
REQ_003	RUNNING	31	[지문]	MANUAL	상			2026-01-28	2026-01-28
REQ_004	OK	18	[지문]	LLM	하	교육		2026-01-28	2026-01-28
```

**상태(Status) 종류:**
| 상태 | 설명 |
|------|------|
| PENDING | 요청 생성됨, 처리 대기 |
| GENERATING_PASSAGE | 지문 생성 중 (Step 1) |
| PASSAGE_READY | 지문 생성 완료, 검토 대기 |
| RUNNING | 문항 생성 중 (Step 2) |
| OK | 완료 (검증 통과) |
| FAIL | 실패 (검증 실패) |

---

### Sheet 17: Item_Results (생성된 문항 결과)

```
result_id	request_id	item_no	passage	question	option_1	option_2	option_3	option_4	option_5	answer	explanation	validation_status	score	created_at
RES_001	REQ_004	18	[지문]	다음 글의 목적으로...	①...	②...	③...	④...	⑤...	3	[해설]	PASS	85	2026-01-28
```

---

### Sheet 18: Passage_Queue (지문 생성 대기열 - 2단계 워크플로우용)

```
queue_id	request_id	item_no	status	passage	level	topic	generated_at	reviewed	review_note
PQ_001	REQ_002	22	READY	[생성된 지문]	중상	기술발전	2026-01-28	FALSE
PQ_002	REQ_005	31	PENDING		상	심리학		FALSE
```

---

## Part 3: Apps Script 구현 계획

### 파일 구조

```
/
├── Code.gs              # 메인 진입점, 메뉴 등록
├── Config.gs            # 설정 관리
├── LLMClient.gs         # LLM API 호출
├── PromptBuilder.gs     # 프롬프트 구성
├── PromptValidator.gs   # 프롬프트 검증
├── PassageGenerator.gs  # 지문 생성 (NEW - 2단계 워크플로우)
├── ItemGenerator.gs     # 문항 생성
├── ItemValidator.gs     # 문항 검증
├── RequestManager.gs    # 요청 관리 (NEW)
├── UIService.gs         # 사이드바/다이얼로그 UI
├── MenuHandler.gs       # 메뉴 액션 핸들러
└── Utils.gs             # 유틸리티 함수
```

---

### 3.1 Code.gs (메인 진입점)

```javascript
/**
 * 스프레드시트 열 때 메뉴 추가
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📝 KSAT 문항 생성')
    .addItem('새 문항 생성', 'showGenerateDialog')
    .addSeparator()
    .addSubMenu(ui.createMenu('2단계 워크플로우')
      .addItem('Step 1: 지문만 생성', 'showPassageGenerateDialog')
      .addItem('Step 2: 지문 검토 & 문항 생성', 'showPassageReviewDialog'))
    .addSeparator()
    .addItem('대기 요청 일괄 처리', 'processPendingRequests')
    .addItem('지문 검토 대기열', 'showPassageQueueDialog')
    .addSeparator()
    .addSubMenu(ui.createMenu('프롬프트 관리')
      .addItem('프롬프트 목록', 'showPromptList')
      .addItem('프롬프트 검증', 'showPromptValidation'))
    .addSeparator()
    .addItem('설정', 'showConfigDialog')
    .addItem('대시보드', 'showDashboard')
    .addToUi();
}
```

---

### 3.2 PassageGenerator.gs (지문 생성 - 2단계 워크플로우 핵심)

```javascript
/**
 * 지문만 생성 (2단계 워크플로우 Step 1)
 * @param {string} requestId - 요청 ID
 * @returns {Object} 생성 결과
 */
function generatePassageOnly(requestId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const requestSheet = ss.getSheetByName('Item_Requests');
  const passageQueue = ss.getSheetByName('Passage_Queue');

  // 1. 요청 조회
  const request = getRequestById(requestId);
  if (!request) {
    throw new Error('요청을 찾을 수 없습니다: ' + requestId);
  }

  // 2. 이미 지문이 있는 경우
  if (request.passage && request.passage.trim() !== '') {
    return {
      success: true,
      message: '이미 지문이 존재합니다.',
      passage: request.passage,
      status: 'PASSAGE_READY'
    };
  }

  // 3. 상태 업데이트: GENERATING_PASSAGE
  updateRequestStatus(requestId, 'GENERATING_PASSAGE');

  try {
    // 4. PASSAGE_MASTER + P{itemNo} 프롬프트 로드
    const passageMaster = getPromptByKey('PASSAGE_MASTER');
    const pPrompt = getPromptByKey('P' + request.item_no);

    if (!passageMaster) {
      throw new Error('PASSAGE_MASTER 프롬프트를 찾을 수 없습니다');
    }

    // 5. 프롬프트 구성
    const systemPrompt = passageMaster.prompt_text;
    let userPrompt = pPrompt ? pPrompt.prompt_text : getDefaultPassagePrompt(request.item_no);

    if (request.level) {
      userPrompt += '\n\n[난이도]: ' + request.level;
    }
    if (request.topic) {
      userPrompt += '\n\n[주제]: ' + request.topic;
    }

    userPrompt += '\n\n위 지침에 따라 KSAT 스타일의 영어 지문만 생성하세요. 문항, 선택지, 정답은 포함하지 마세요.';

    // 6. LLM 호출
    const passage = callLLM(systemPrompt, userPrompt);

    // 7. 요청에 지문 저장
    updateRequestPassage(requestId, passage.trim(), 'LLM');

    // 8. 상태 업데이트: PASSAGE_READY
    updateRequestStatus(requestId, 'PASSAGE_READY');

    // 9. 지문 대기열에 추가
    addToPassageQueue(requestId, request.item_no, passage.trim(), request.level, request.topic);

    return {
      success: true,
      message: '지문이 생성되었습니다. 검토 후 문항 생성을 진행하세요.',
      passage: passage.trim(),
      status: 'PASSAGE_READY'
    };

  } catch (error) {
    // 실패 시 상태 복구
    updateRequestStatus(requestId, 'PENDING');
    throw error;
  }
}

/**
 * 지문 수정 (검토 후)
 */
function updatePassage(requestId, newPassage) {
  if (!newPassage || newPassage.trim() === '') {
    throw new Error('지문은 필수입니다.');
  }

  updateRequestPassage(requestId, newPassage.trim(), 'MANUAL_EDIT');
  updateRequestStatus(requestId, 'PASSAGE_READY');

  // 지문 대기열 업데이트
  updatePassageQueueItem(requestId, newPassage.trim());

  return {
    success: true,
    message: '지문이 수정되었습니다.',
    passage: newPassage.trim()
  };
}

/**
 * 지문 확정 후 문항 생성 (Step 2)
 */
function confirmPassageAndGenerateItem(requestId) {
  const request = getRequestById(requestId);

  if (!request.passage || request.passage.trim() === '') {
    throw new Error('지문이 없습니다. 먼저 지문을 생성하세요.');
  }

  // 지문 대기열에서 검토 완료 표시
  markPassageReviewed(requestId);

  // 문항 생성 실행
  return generateItem(request.item_no, {
    passage: request.passage,
    level: request.level,
    topic: request.topic,
    requestId: requestId
  });
}

/**
 * 기본 지문 생성 프롬프트 (P시리즈가 없을 때)
 */
function getDefaultPassagePrompt(itemNo) {
  const isLC = itemNo >= 1 && itemNo <= 17;

  if (isLC) {
    return `한국 수능 영어 듣기 ${itemNo}번 스타일의 듣기 스크립트를 영어로 작성하세요.
W:와 M: 형식으로 화자를 구분하고, 3~4턴 정도의 자연스러운 대화를 구성하세요.`;
  } else {
    return `한국 수능 영어 독해 ${itemNo}번 스타일의 영어 지문을 작성하세요.
적절한 길이(120~180단어)로 하나의 주제에 대해 논리적으로 전개하세요.`;
  }
}

/**
 * 지문 대기열에 추가
 */
function addToPassageQueue(requestId, itemNo, passage, level, topic) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Passage_Queue');

  const queueId = 'PQ_' + Utilities.getUuid().substring(0, 8);
  const now = new Date().toISOString();

  sheet.appendRow([
    queueId,
    requestId,
    itemNo,
    'READY',
    passage,
    level || '',
    topic || '',
    now,
    false,
    ''
  ]);
}
```

---

### 3.3 ItemGenerator.gs (문항 생성)

```javascript
/**
 * 문항 생성 (1단계 또는 2단계 Step 2)
 */
function generateItem(itemNo, options) {
  const requestId = options.requestId || createNewRequest(itemNo, options);

  // 1. 상태 업데이트: RUNNING
  updateRequestStatus(requestId, 'RUNNING');

  try {
    // 2. 지문이 없으면 자동 생성
    let passage = options.passage || '';
    if (!passage || passage.trim() === '') {
      const passageResult = generatePassageOnly(requestId);
      passage = passageResult.passage;
    }

    // 3. 프롬프트 로드
    const masterPrompt = getPromptByKey('MASTER_PROMPT');
    const itemPrompt = getItemPrompt(itemNo);

    if (!masterPrompt) {
      throw new Error('MASTER_PROMPT를 찾을 수 없습니다');
    }

    // 4. 프롬프트 번들 구성
    const systemPrompt = masterPrompt.prompt_text + '\n\n' + itemPrompt;
    let userPrompt = '## 제공된 지문\n' + passage + '\n\n';

    if (options.level) {
      userPrompt += '## 목표 난이도: ' + options.level + '\n\n';
    }

    userPrompt += '위 지문을 사용하여 문항을 생성해주세요. JSON 형식으로만 출력하세요.';

    // 5. LLM 호출
    const response = callLLM(systemPrompt, userPrompt);

    // 6. JSON 파싱
    const itemObj = parseItemJSON(response);

    // 7. 문항 검증
    const validation = validateItemFormat(itemObj, itemNo);

    // 8. 결과 저장
    saveItemResult(requestId, itemNo, itemObj, validation);

    // 9. 상태 업데이트
    const finalStatus = validation.pass ? 'OK' : 'FAIL';
    updateRequestStatus(requestId, finalStatus);

    return {
      success: true,
      requestId: requestId,
      item: itemObj,
      validation: validation,
      status: finalStatus
    };

  } catch (error) {
    updateRequestStatus(requestId, 'FAIL');
    throw error;
  }
}

/**
 * 문항 프롬프트 로드 (LC/RC 형식)
 */
function getItemPrompt(itemNo) {
  // LC01~LC17 또는 RC18~RC45 형식으로 시도
  const prefix = itemNo <= 17 ? 'LC' : 'RC';
  const key = prefix + String(itemNo).padStart(2, '0');

  let prompt = getPromptByKey(key);
  if (prompt) return prompt.prompt_text;

  // 숫자만 있는 키로 시도
  prompt = getPromptByKey(String(itemNo));
  if (prompt) return prompt.prompt_text;

  throw new Error('프롬프트를 찾을 수 없습니다: ' + itemNo);
}
```

---

### 3.4 RequestManager.gs (요청 관리)

```javascript
/**
 * 새 요청 생성
 */
function createNewRequest(itemNo, options) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Item_Requests');

  const requestId = 'REQ_' + Utilities.getUuid().substring(0, 8);
  const now = new Date().toISOString();

  sheet.appendRow([
    requestId,
    'PENDING',
    itemNo,
    options.passage || '',
    options.passageSource || 'AUTO',
    options.level || '중',
    options.topic || '',
    options.extra || '',
    now,
    now
  ]);

  return requestId;
}

/**
 * 요청 조회
 */
function getRequestById(requestId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Item_Requests');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === requestId) {
      const request = {};
      headers.forEach((h, idx) => request[h] = data[i][idx]);
      request._rowIndex = i + 1;
      return request;
    }
  }
  return null;
}

/**
 * 요청 상태 업데이트
 */
function updateRequestStatus(requestId, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Item_Requests');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === requestId) {
      sheet.getRange(i + 1, 2).setValue(status);  // status 컬럼
      sheet.getRange(i + 1, 10).setValue(new Date().toISOString());  // updated_at
      return;
    }
  }
}

/**
 * 요청 지문 업데이트
 */
function updateRequestPassage(requestId, passage, source) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Item_Requests');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === requestId) {
      sheet.getRange(i + 1, 4).setValue(passage);  // passage 컬럼
      sheet.getRange(i + 1, 5).setValue(source);   // passage_source 컬럼
      sheet.getRange(i + 1, 10).setValue(new Date().toISOString());
      return;
    }
  }
}

/**
 * PENDING 요청 일괄 처리
 */
function processPendingRequests() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Item_Requests');
  const data = sheet.getDataRange().getValues();

  let processed = 0;
  let okCount = 0;
  let failCount = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === 'PENDING') {
      const requestId = data[i][0];
      const itemNo = data[i][2];

      try {
        const result = generateItem(itemNo, {
          passage: data[i][3],
          level: data[i][5],
          topic: data[i][6],
          requestId: requestId
        });

        if (result.status === 'OK') okCount++;
        else failCount++;

      } catch (e) {
        failCount++;
        Logger.log('처리 실패: ' + requestId + ' - ' + e.message);
      }

      processed++;
    }
  }

  SpreadsheetApp.getUi().alert(
    '일괄 처리 완료',
    `처리: ${processed}건\n성공: ${okCount}건\n실패: ${failCount}건`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
```

---

### 3.5 UIService.gs (UI 서비스)

```javascript
/**
 * 2단계 워크플로우: 지문 생성 다이얼로그
 */
function showPassageGenerateDialog() {
  const html = HtmlService.createHtmlOutputFromFile('PassageGenerateDialog')
    .setWidth(500)
    .setHeight(400)
    .setTitle('Step 1: 지문 생성');
  SpreadsheetApp.getUi().showModalDialog(html, 'Step 1: 지문 생성');
}

/**
 * 2단계 워크플로우: 지문 검토 다이얼로그
 */
function showPassageReviewDialog() {
  const html = HtmlService.createHtmlOutputFromFile('PassageReviewDialog')
    .setWidth(700)
    .setHeight(600)
    .setTitle('Step 2: 지문 검토 & 문항 생성');
  SpreadsheetApp.getUi().showModalDialog(html, 'Step 2: 지문 검토 & 문항 생성');
}

/**
 * 지문 검토 대기열 가져오기
 */
function getPassageQueue() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Passage_Queue');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const queue = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === 'READY' && !data[i][8]) {  // status=READY, reviewed=false
      const item = {};
      headers.forEach((h, idx) => item[h] = data[i][idx]);
      queue.push(item);
    }
  }
  return queue;
}

/**
 * 문항 생성 다이얼로그
 */
function showGenerateDialog() {
  const html = HtmlService.createHtmlOutputFromFile('GenerateDialog')
    .setWidth(600)
    .setHeight(500)
    .setTitle('문항 생성');
  SpreadsheetApp.getUi().showModalDialog(html, '문항 생성');
}
```

---

## Part 4: HTML 템플릿

### PassageGenerateDialog.html

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 4px; font-weight: bold; }
    select, input, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    button { padding: 10px 20px; margin-right: 8px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-secondary { background: #e2e8f0; color: #333; }
    .result { margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; }
    .loading { text-align: center; padding: 20px; }
  </style>
</head>
<body>
  <h3>Step 1: 지문 생성</h3>

  <div class="form-group">
    <label>문항 번호</label>
    <select id="itemNo">
      <optgroup label="듣기 (LC)">
        <option value="1">LC01 - 목적</option>
        <option value="2">LC02 - 의견</option>
        <!-- ... -->
      </optgroup>
      <optgroup label="독해 (RC)">
        <option value="18">RC18 - 글의 목적</option>
        <option value="22" selected>RC22 - 요지</option>
        <option value="29">RC29 - 어법</option>
        <!-- ... -->
      </optgroup>
    </select>
  </div>

  <div class="form-group">
    <label>난이도</label>
    <select id="level">
      <option value="하">하</option>
      <option value="중하">중하</option>
      <option value="중" selected>중</option>
      <option value="중상">중상</option>
      <option value="상">상</option>
    </select>
  </div>

  <div class="form-group">
    <label>주제 (선택)</label>
    <input type="text" id="topic" placeholder="예: 환경보호, 기술발전, 심리학 등">
  </div>

  <div>
    <button class="btn-primary" onclick="generatePassage()">📝 지문 생성</button>
    <button class="btn-secondary" onclick="google.script.host.close()">취소</button>
  </div>

  <div id="loading" class="loading" style="display:none;">
    <p>지문을 생성하고 있습니다...</p>
  </div>

  <div id="result" class="result" style="display:none;">
    <h4>생성된 지문</h4>
    <pre id="passageText" style="white-space: pre-wrap;"></pre>
    <p><strong>요청 ID:</strong> <span id="requestId"></span></p>
    <button class="btn-primary" onclick="goToReview()">검토 & 문항 생성으로 이동</button>
  </div>

  <script>
    function generatePassage() {
      const itemNo = document.getElementById('itemNo').value;
      const level = document.getElementById('level').value;
      const topic = document.getElementById('topic').value;

      document.getElementById('loading').style.display = 'block';
      document.getElementById('result').style.display = 'none';

      google.script.run
        .withSuccessHandler(onSuccess)
        .withFailureHandler(onError)
        .generatePassageFromUI(parseInt(itemNo), level, topic);
    }

    function onSuccess(result) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('result').style.display = 'block';
      document.getElementById('passageText').textContent = result.passage;
      document.getElementById('requestId').textContent = result.requestId;
    }

    function onError(error) {
      document.getElementById('loading').style.display = 'none';
      alert('오류: ' + error.message);
    }

    function goToReview() {
      google.script.host.close();
      google.script.run.showPassageReviewDialog();
    }
  </script>
</body>
</html>
```

---

### PassageReviewDialog.html

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .queue-item { border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 12px; border-radius: 8px; }
    .queue-item.selected { border-color: #667eea; background: rgba(102, 126, 234, 0.1); }
    .passage-box { background: #f8fafc; padding: 16px; border-radius: 8px; margin: 12px 0; }
    textarea { width: 100%; min-height: 200px; padding: 12px; border: 1px solid #ccc; border-radius: 4px; }
    button { padding: 10px 20px; margin-right: 8px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-secondary { background: #e2e8f0; color: #333; }
    .step-indicator { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white; }
    .step { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .step.active { background: white; color: #667eea; }
    .step.inactive { background: rgba(255,255,255,0.3); }
  </style>
</head>
<body>
  <div class="step-indicator">
    <div class="step active">1</div>
    <span>지문 생성 완료</span>
    <div style="flex: 1; height: 2px; background: rgba(255,255,255,0.5);"></div>
    <div class="step inactive">2</div>
    <span style="opacity: 0.7;">문항 생성</span>
  </div>

  <h3>지문 검토 대기열</h3>

  <div id="queueList"></div>

  <div id="reviewSection" style="display: none;">
    <h4>지문 검토 및 수정</h4>
    <textarea id="passageEdit"></textarea>
    <div style="margin-top: 8px; font-size: 0.85em; color: #666;">
      <span id="wordCount">0</span>단어
    </div>
    <div style="margin-top: 16px;">
      <button class="btn-primary" onclick="confirmAndGenerate()">✅ 지문 확정 & 문항 생성</button>
      <button class="btn-secondary" onclick="savePassage()">💾 저장</button>
      <button class="btn-secondary" onclick="regeneratePassage()">🔄 재생성</button>
    </div>
  </div>

  <script>
    let selectedRequestId = null;

    function loadQueue() {
      google.script.run
        .withSuccessHandler(renderQueue)
        .getPassageQueue();
    }

    function renderQueue(queue) {
      const container = document.getElementById('queueList');
      if (queue.length === 0) {
        container.innerHTML = '<p>검토 대기 중인 지문이 없습니다.</p>';
        return;
      }

      container.innerHTML = queue.map(item => `
        <div class="queue-item" onclick="selectItem('${item.request_id}', '${escapeHtml(item.passage)}')">
          <strong>${item.item_no}번</strong> | 난이도: ${item.level} | 주제: ${item.topic || '없음'}
          <div class="passage-box">${item.passage.substring(0, 150)}...</div>
        </div>
      `).join('');
    }

    function selectItem(requestId, passage) {
      selectedRequestId = requestId;
      document.getElementById('passageEdit').value = passage;
      document.getElementById('reviewSection').style.display = 'block';
      updateWordCount();

      // 선택 표시
      document.querySelectorAll('.queue-item').forEach(el => el.classList.remove('selected'));
      event.currentTarget.classList.add('selected');
    }

    function updateWordCount() {
      const text = document.getElementById('passageEdit').value;
      const count = text.trim().split(/\s+/).filter(w => w.length > 0).length;
      document.getElementById('wordCount').textContent = count;
    }

    function confirmAndGenerate() {
      if (!selectedRequestId) return;

      const passage = document.getElementById('passageEdit').value;

      google.script.run
        .withSuccessHandler(onGenerateSuccess)
        .withFailureHandler(onError)
        .confirmPassageAndGenerateItem(selectedRequestId);
    }

    function onGenerateSuccess(result) {
      alert('문항이 성공적으로 생성되었습니다!');
      google.script.host.close();
    }

    function onError(error) {
      alert('오류: ' + error.message);
    }

    function escapeHtml(text) {
      return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
    }

    document.getElementById('passageEdit').addEventListener('input', updateWordCount);
    loadQueue();
  </script>
</body>
</html>
```

---

## Part 5: 워크플로우 다이어그램

### 1단계 방식 (기존)

```
┌────────────────────────────────────────────────────────────────┐
│                    1단계 방식 (바로 생성)                        │
└────────────────────────────────────────────────────────────────┘

    [생성 버튼]
         │
         ▼
    ┌─────────────────────────────────────────────────────┐
    │  지문 없음?  ──Yes──▶  자동 지문 생성               │
    │      │                       │                      │
    │     No                       │                      │
    │      │                       │                      │
    │      └───────────────────────┘                      │
    │                  │                                  │
    │                  ▼                                  │
    │          문항 생성 (LLM 호출)                        │
    │                  │                                  │
    │                  ▼                                  │
    │              문항 검증                               │
    │                  │                                  │
    │           ┌──────┴──────┐                           │
    │           ▼             ▼                           │
    │          OK           FAIL                          │
    └─────────────────────────────────────────────────────┘
```

### 2단계 방식 (신규)

```
┌────────────────────────────────────────────────────────────────┐
│                2단계 방식 (지문 검토 후 생성)                     │
└────────────────────────────────────────────────────────────────┘

    [Step 1: 지문 생성]
         │
         ▼
    ┌─────────────────────────────────────────────────────┐
    │  PASSAGE_MASTER + P{itemNo} 프롬프트                 │
    │                  │                                  │
    │                  ▼                                  │
    │          LLM 호출 (지문만)                           │
    │                  │                                  │
    │                  ▼                                  │
    │          상태: PASSAGE_READY                         │
    │          지문 대기열에 추가                           │
    └─────────────────────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────────────────┐
    │              지문 검토 화면                           │
    │  ┌───────────────────────────────────────────────┐  │
    │  │          생성된 지문 표시                       │  │
    │  │    [수정]     [재생성]     [확정]              │  │
    │  └───────────────────────────────────────────────┘  │
    └─────────────────────────────────────────────────────┘
         │
         ▼ [지문 확정 & 문항 생성]
    ┌─────────────────────────────────────────────────────┐
    │  MASTER_PROMPT + LC/RC{itemNo} + 확정된 지문         │
    │                  │                                  │
    │                  ▼                                  │
    │          LLM 호출 (문항 생성)                        │
    │                  │                                  │
    │                  ▼                                  │
    │              문항 검증                               │
    │                  │                                  │
    │           ┌──────┴──────┐                           │
    │           ▼             ▼                           │
    │          OK           FAIL                          │
    └─────────────────────────────────────────────────────┘
```

---

## Part 6: 구현 일정 (제안)

| 단계 | 작업 | 예상 소요 |
|------|------|----------|
| **Phase 1** | 기본 시트 구조 생성 | 1일 |
| **Phase 2** | 데이터 마이그레이션 (프롬프트, 규칙 등) | 1일 |
| **Phase 3** | LLMClient, PromptBuilder 구현 | 1일 |
| **Phase 4** | PassageGenerator 구현 (2단계 Step 1) | 1일 |
| **Phase 5** | ItemGenerator, ItemValidator 구현 | 2일 |
| **Phase 6** | RequestManager 구현 | 1일 |
| **Phase 7** | UI 다이얼로그 구현 | 2일 |
| **Phase 8** | 통합 테스트 및 디버깅 | 2일 |
| **총계** | | **약 11일** |

---

## Part 7: 주요 차이점 요약 (Node.js 앱 vs Google Sheets 앱)

| 기능 | Node.js 웹앱 | Google Sheets 앱 |
|------|-------------|-----------------|
| **데이터 저장** | SQLite DB | Google Sheets |
| **백엔드** | Express.js | Apps Script |
| **프론트엔드** | React | HTML 다이얼로그 |
| **API 호출** | axios | UrlFetchApp |
| **비동기 처리** | async/await | 동기식 (Sheets 한계) |
| **동시성** | 병렬 처리 가능 | 순차 처리 |
| **UI** | 풀 웹 인터페이스 | 메뉴 + 다이얼로그 |
| **배포** | 서버 필요 | Google 계정만 |
| **비용** | 서버 비용 | 무료 (API 할당량 내) |

---

## Part 8: 제한사항 및 고려사항

### Apps Script 제한사항

1. **실행 시간**: 스크립트 실행 최대 6분
2. **API 할당량**: 하루 20,000회 UrlFetch 호출
3. **데이터 크기**: 시트당 최대 1000만 셀
4. **동시성**: 동시 실행 30개 제한

### 해결 방안

1. **실행 시간**: 대용량 작업은 트리거로 분할
2. **API 할당량**: 캐싱 및 배치 처리
3. **데이터 크기**: 오래된 데이터 아카이브
4. **동시성**: 사용자별 순차 처리

---

*작성일: 2026-01-28*
*버전: 2.0 (2단계 워크플로우 포함)*
