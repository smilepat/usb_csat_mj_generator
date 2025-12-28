// passageGenerator.gs

function readPassageMasterPrompt() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.PROMPT_DB);
  if (!sh) throw new Error("PROMPT_DB 시트를 찾을 수 없습니다.");

  const values = sh.getDataRange().getValues();
  for (let i = 0; i < values.length; i++) {
    const key = String(values[i][0] || "").trim();
    if (key.toUpperCase() === "PASSAGE_MASTER") {
      const text = values[i][3];
      if (!text) throw new Error("PASSAGE_MASTER 행의 D열이 비어 있습니다.");
      return String(text);
    }
  }
  throw new Error("PROMPT_DB에 PASSAGE_MASTER 행이 없습니다.");
}
function readPassageItemPrompt(req) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.PROMPT_DB);
  if (!sh) throw new Error("PROMPT_DB 시트를 찾을 수 없습니다.");

  const values = sh.getDataRange().getValues();

  // 1) 세트 문항인 경우
  let key = "";
  if (req.setId && req.itemNo >= 41 && req.itemNo <= 45) {
    key = "P41_45"; // 세트 41–45 공통 지문용
  } else if (req.itemNo === 29) {
    key = "P29";
  } else if (req.itemNo === 31) {
    key = "P31";
  } else if (req.itemNo === 33) {
    key = "P33";
  } else {
    // 기본값: ITEM_NO와 같은 P프리픽스
    key = "P" + String(req.itemNo);
  }

  for (let i = 0; i < values.length; i++) {
    const a = String(values[i][0] || "").trim();
    if (a === key) {
      const text = values[i][3];
      if (!text) throw new Error("PROMPT_DB에서 " + key + " 행의 D열이 비어 있습니다.");
      return String(text);
    }
  }

  throw new Error("PROMPT_DB에서 지문용 프롬프트 키=" + key + " 행을 찾을 수 없습니다.");
}
/**
 * 필요할 때만 LLM으로 PASSAGE 생성 후
 * - ITEM_REQUEST 시트 PASSAGE 셀에 반영
 * - req.passage 에도 채워서 반환
 */
function generatePassageIfNeeded(req) {
  // 1) 조건: 이미 사람이 PASSAGE를 넣었으면 스킵
  if (req.passage && String(req.passage).trim() !== "" &&
      String(req.passage).trim() !== "(AUTO)") {
    return req; // 그대로 사용
  }

  // 2) PASSAGE_SOURCE 확인 (없으면 기본 LLM 허용)
  const source = (req.passageSource || "").toUpperCase();
  if (source === "MANUAL") {
    // 사람이 넣기로 했는데 PASSAGE가 비었으면 오류로 처리
    throw new Error("PASSAGE_SOURCE=MANUAL인데 PASSAGE가 비어 있습니다.");
  }

  // 3) 프롬프트 구성
  const master = readPassageMasterPrompt();
  const itemPrompt = readPassageItemPrompt(req);

  let context = "";

  if (req.level) {
    context += "[난이도 의도]\n" + req.level + "\n\n";
  }

  if (req.topic) {
    context += "[주제 / 상황]\n" + req.topic + "\n\n";
  }

  if (req.setId) {
    context += "[세트 정보]\nSET_ID=" + req.setId + ", ITEM_NO=" + req.itemNo + "\n\n";
  }

  const userPrompt =
    "아래 지침에 따라 KSAT 스타일의 영어 지문만 생성하시오.\n" +
    "질문이나 선택지는 절대 쓰지 말고, 본문 지문만 출력하시오.\n\n" +
    "----------------------------------------\n" +
    "[지문 생성 공통 지침]\n" + itemPrompt + "\n\n" +
    "----------------------------------------\n" +
    "[추가 정보]\n" + context;

  const config = getConfig();
  const raw = callLLM(master, userPrompt, config); // 기존 llmClient 재사용

  // 4) 단순 후처리: 앞뒤 공백 제거
  const passage = String(raw).trim();

  if (!passage) {
    throw new Error("LLM이 빈 지문을 반환했습니다.");
  }

  // 5) 시트에 PASSAGE 저장 + SOURCE=LLM 표시
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.ITEM_REQUEST);
  const row = findRequestRowById(req.requestId);
  if (sh && row) {
    sh.getRange(row, 4).setValue(passage);     // D: PASSAGE
    sh.getRange(row, 11).setValue("LLM");      // K: PASSAGE_SOURCE
  }

  // 6) req 객체에도 반영
  req.passage = passage;
  req.passageSource = "LLM";

  return req;
}
