/** io.gs
 * ITEM_REQUEST / ITEM_JSON / ITEM_OUTPUT / ITEM_SET / CHART_DB I/O
 */

/**
 * ITEM_REQUEST 시트에서 한 행 읽어오기
 * @param {number} row - 2 이상
 *
 * ITEM_REQUEST 컬럼 구성 (A~L = 1~12):
 * 0: REQUEST_ID
 * 1: STATUS
 * 2: ITEM_NO
 * 3: PASSAGE
 * 4: LEVEL
 * 5: EXTRA
 * 6: CREATED_AT
 * 7: UPDATED_AT
 * 8: CHART_ID
 * 9: SET_ID
 * 10: PASSAGE_SOURCE
 * 11: TOPIC
 */
function readRequestRow(row) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.ITEM_REQUEST);
  // ← 10에서 12로 늘렸습니다 (K, L까지 포함)
  const values = sheet.getRange(row, 1, 1, 12).getValues()[0];

  return {
    requestId: values[0],
    status: values[1],
    itemNo: Number(values[2]),
    passage: values[3],
    level: values[4],
    extra: values[5],
    createdAt: values[6],
    updatedAt: values[7],
    chartId: values[8],
    setId: values[9],
    passageSource: values[10],  // K: PASSAGE_SOURCE
    topic: values[11]           // L: TOPIC
  };
}

/**
 * ITEM_JSON / ITEM_OUTPUT 시트에 결과 쓰기
 */
function writeItemResults(requestId, result) {
  const ss = SpreadsheetApp.getActive();
  const sheetJson = ss.getSheetByName(SHEET.ITEM_JSON);
  const sheetOut = ss.getSheetByName(SHEET.ITEM_OUTPUT);

  // ITEM_JSON 기록
  if (sheetJson) {
    sheetJson.appendRow([
      requestId,
      result.rawJson || "",
      result.normalized ? JSON.stringify(result.normalized) : "",
      result.validationResult || "",
      result.validationLog || "",
      result.repairLog || "",
      result.difficultyEst || "",
      result.distractorScore || "",
      result.finalJson ? JSON.stringify(result.finalJson) : ""
    ]);
  }

  // ITEM_OUTPUT 기록 (finalJson 기준)
  if (sheetOut && result.finalJson) {
    const fj = result.finalJson;
    sheetOut.appendRow([
      requestId,
      fj.itemNo || "",                         // 없으면 비워둠
      fj.question || "",
      fj.options ? fj.options[0] : "",
      fj.options ? fj.options[1] : "",
      fj.options ? fj.options[2] : "",
      fj.options ? fj.options[3] : "",
      fj.options ? fj.options[4] : "",
      fj.answer || "",
      fj.explanation || "",
      fj.logic_proof ? JSON.stringify(fj.logic_proof) : "",
      result.difficultyEst || "",
      fj.distractor_meta ? JSON.stringify(fj.distractor_meta) : ""
    ]);
  }
}

/**
 * ITEM_SET 시트에서 세트 정보 읽기
 * 0: SET_ID, 1: SET_NAME, 2: COMMON_PASSAGE, 3: PROFILE
 */
function readSetInfo(setId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.ITEM_SET);
  if (!sheet) {
    return {
      setId: setId,
      setName: "",
      passage: "",
      profile: "",
      profileMap: {}
    };
  }

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(setId)) {
      const rawProfile = values[i][3] || "";
      const profileMap = parseSetProfile(rawProfile); // itemSetProfileUtils.gs에 정의된 함수

      return {
        setId: values[i][0],
        setName: values[i][1],
        passage: values[i][2],
        profile: rawProfile,
        profileMap: profileMap
      };
    }
  }

  // 못 찾았을 때 기본값
  return {
    setId: setId,
    setName: "",
    passage: "",
    profile: "",
    profileMap: {}
  };
}

/**
 * ITEM_REQUEST 시트에서 특정 SET_ID를 가진 행들 읽기
 */
function readRequestsForSet(setId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.ITEM_REQUEST);
  const values = sheet.getDataRange().getValues();
  const reqs = [];

  for (let i = 1; i < values.length; i++) {
    const rowSetId = values[i][9]; // J: SET_ID
    if (String(rowSetId) === String(setId)) {
      reqs.push({
        requestId: values[i][0],
        status: values[i][1],
        itemNo: Number(values[i][2]),
        passage: values[i][3],
        level: values[i][4],
        extra: values[i][5],
        createdAt: values[i][6],
        updatedAt: values[i][7],
        chartId: values[i][8],
        setId: values[i][9],
        passageSource: values[i][10], // K
        topic: values[i][11]          // L
      });
    }
  }
  return reqs;
}
