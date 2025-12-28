/** Code.gs
 * 메뉴 + 엔트리 포인트 + LOG/ERROR 헬퍼
 */

// 메뉴 등록
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📝 KSAT Human-Prompt Engine")
    .addItem("선택 행 문항 생성", "runForSelectedRow")
    .addItem("전체 PENDING 처리", "runForAllPending")
    .addSeparator()
    .addItem("세트 문항 생성 (SET_ID)", "runForSetIdPrompt")
    .addToUi();
}

/**
 * 1) 선택 행 문항 생성
 */
function runForSelectedRow() {
  const ss = SpreadsheetApp.getActive();
  const activeSheet = ss.getActiveSheet();

  if (activeSheet.getName() !== SHEET.ITEM_REQUEST) {
    SpreadsheetApp.getUi().alert("ITEM_REQUEST 시트에서 실행해 주세요.");
    return;
  }

  const row = activeSheet.getActiveCell().getRow();
  if (row < 2) {
    SpreadsheetApp.getUi().alert("데이터가 있는 행(2행 이후)을 선택해 주세요.");
    return;
  }

  const req = readRequestRow(row);

  // 세트 문항이면 별도 메뉴 안내
  if (req.setId) {
    SpreadsheetApp.getUi().alert(
      "이 행은 세트 문항(SET_ID=" + req.setId + ") 입니다.\n" +
      "상단 메뉴의 '세트 문항 생성 (SET_ID)'를 사용해 주세요."
    );
    return;
  }

  const now = new Date();
  updateRequestStatusRow(row, "RUNNING", now);

  try {
    const result = generateItemPipeline(req);
    writeItemResults(req.requestId, result);

    const finalStatus = (result.validationResult === "PASS") ? "OK" : "FAIL";
    updateRequestStatusRow(row, finalStatus, new Date());

    logInfo("runForSelectedRow 완료", req.requestId, req.itemNo, result.validationLog);

    if (finalStatus === "FAIL") {
      SpreadsheetApp.getUi().alert(
        "요청 " + req.requestId + " 처리 중 검증 실패: \n" + result.validationLog
      );
    }
  } catch (e) {
    updateRequestStatusRow(row, "FAIL", new Date());
    logError("runForSelectedRow 에러", req.requestId, e);
    SpreadsheetApp.getUi().alert(
      "요청 " + req.requestId + " 처리 중 에러 발생:\n" + e.message
    );
  }
}

/**
 * 2) 전체 PENDING 행 일괄 처리
 */
function runForAllPending() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SHEET.ITEM_REQUEST);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("ITEM_REQUEST 시트에 데이터가 없습니다.");
    return;
  }

  const now = new Date();
  let okCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let row = 2; row <= lastRow; row++) {
    const req = readRequestRow(row);

    // PENDING이 아니면 건너뜀
    if (req.status !== "PENDING") {
      skipCount++;
      continue;
    }

    // 세트 문항은 개별 실행에서 제외 (SET_ID 메뉴로 처리)
    if (req.setId) {
      skipCount++;
      continue;
    }

    updateRequestStatusRow(row, "RUNNING", now);

    try {
      const result = generateItemPipeline(req);
      writeItemResults(req.requestId, result);

      const finalStatus = (result.validationResult === "PASS") ? "OK" : "FAIL";
      updateRequestStatusRow(row, finalStatus, new Date());

      if (finalStatus === "OK") okCount++;
      else failCount++;

      logInfo("runForAllPending 처리", req.requestId, req.itemNo, result.validationLog);

    } catch (e) {
      updateRequestStatusRow(row, "FAIL", new Date());
      failCount++;
      logError("runForAllPending 에러", req.requestId, e);
    }
  }

  SpreadsheetApp.getUi().alert(
    "전체 PENDING 처리 완료\n" +
    "성공: " + okCount + "건\n" +
    "실패: " + failCount + "건\n" +
    "건너뜀(세트/비PENDING): " + skipCount + "건"
  );
}

/**
 * 3) 세트 문항 생성: 메뉴에서 SET_ID를 입력받는 프롬프트
 */
function runForSetIdPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt("세트 문항 생성", "SET_ID를 입력하세요:", ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() !== ui.Button.OK) {
    return; // 취소
  }

  const setId = response.getResponseText().trim();
  if (!setId) {
    ui.alert("SET_ID가 비어 있습니다.");
    return;
  }

  runForSetId(setId);
}

/**
 * 4) 세트 문항 실제 생성 로직
 *   - SET_ID에 해당하는 ITEM_REQUEST 행들을 묶어서 처리
 *   - 공통 지문(ITEM_SET 등)을 req.passage에 주입
 *   - 세트 validator로 일괄 점검
 */
function runForSetId(setId) {
  const ss = SpreadsheetApp.getActive();

  try {
    const setInfo = readSetInfo(setId);
    const reqs = readRequestsForSet(setId);

    if (!reqs || reqs.length === 0) {
      SpreadsheetApp.getUi().alert("SET_ID=" + setId + " 에 해당하는 ITEM_REQUEST 행이 없습니다.");
      return;
    }

    // 세트 패턴 사전 안내 (validator_set와 중복이지만 UX 개선 목적)
    const itemNos = reqs.map(r => r.itemNo);
    const patternCheck = checkSetPattern(itemNos);
    if (!patternCheck.ok) {
      SpreadsheetApp.getUi().alert(
        "경고: 이 SET_ID의 문항 번호 구성에 문제가 있습니다.\n\n" +
        patternCheck.message + "\n\n" +
        "그래도 계속 진행하면 세트 검증 단계에서 FAIL 처리될 수 있습니다."
      );
    }

    const results = [];
    const now = new Date();

    reqs.forEach(req => {
      // 세트 공통 지문이 있으면 각 req에 주입
      if (setInfo.passage) {
        req.passage = setInfo.passage;
      }

      const row = findRequestRowById(req.requestId);
      if (row) updateRequestStatusRow(row, "RUNNING", now);

      const result = generateItemPipeline(req);
      results.push({ req, result });

      writeItemResults(req.requestId, result);

      const finalStatus = (result.validationResult === "PASS") ? "OK" : "FAIL";
      if (row) updateRequestStatusRow(row, finalStatus, new Date());
    });

    // 세트 단위 검증
    const setVal = validateItemSet(setId, results, setInfo);
    logInfo("세트 검증 결과", "SET:" + setId, "", setVal.log);

    SpreadsheetApp.getUi().alert(
      "SET_ID=" + setId + " 세트 문항 생성 완료\n" +
      "세트 검증 결과: " + (setVal.pass ? "PASS" : "CHECK") + "\n" +
      "로그: " + setVal.log
    );

  } catch (e) {
    logError("runForSetId 에러 (SET_ID=" + setId + ")", "SET:" + setId, e);
    SpreadsheetApp.getUi().alert(
      "SET_ID=" + setId + " 처리 중 에러 발생:\n" + e.message
    );
  }
}

/**
 * ITEM_REQUEST 상태/시간 갱신
 * @param {number} row   갱신할 행 번호
 * @param {string} status  "PENDING" / "RUNNING" / "OK" / "FAIL"
 * @param {Date=} time   기준 시각(없으면 now)
 */
function updateRequestStatusRow(row, status, time) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.ITEM_REQUEST);
  if (!sh) return;

  const now = time || new Date();

  // A=REQUEST_ID, B=STATUS, ... G=CREATED_AT, H=UPDATED_AT
  const statusRange = sh.getRange(row, 2);  // B: STATUS
  const createdRange = sh.getRange(row, 7); // G: CREATED_AT
  const updatedRange = sh.getRange(row, 8); // H: UPDATED_AT

  statusRange.setValue(status);

  // CREATED_AT: 최초 실행 시점만 기록
  if (!createdRange.getValue()) {
    createdRange.setValue(now);
  }

  // UPDATED_AT: 매번 갱신
  updatedRange.setValue(now);
}

/**
 * REQUEST_ID로 ITEM_REQUEST 행 번호 찾기
 */
function findRequestRowById(requestId) {
  if (!requestId) return null;
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.ITEM_REQUEST);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === requestId) { // A열 REQUEST_ID
      return i + 1; // 행 번호 (헤더 +1)
    }
  }
  return null;
}

/**
 * 일반 로그 기록 (LOG 시트)
 */
function logInfo(message, requestId, itemNo, detail) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.LOG);
  if (!sheet) return;

  sheet.appendRow([
    new Date(),
    "INFO",
    message,
    requestId || "",
    itemNo || "",
    detail || ""
  ]);
}

/**
 * 에러 로그 기록 (ERROR 시트)
 */
function logError(message, requestId, error) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.ERROR);
  if (!sheet) return;

  const stack = (error && error.stack) ? String(error.stack) : "";
  const msg = (error && error.message) ? String(error.message) : String(error);

  sheet.appendRow([
    new Date(),
    "ERROR",
    message + " - " + msg,
    requestId || "",
    stack
  ]);
}
