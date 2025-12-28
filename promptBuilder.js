/**
 * promptBuilder.gs (스크린샷 기반 완성본)
 *
 * PROMPT_DB 실제 구조
 * A: MASTER_PROMPT 또는 ITEM_NO(숫자)
 * B: (사용 안함)
 * C: TITLE
 * D: ITEM_PROMPT_TEXT (MASTER/ITEM 프롬프트 본문)
 * E: ACTIVE_FLAG (Y/N)
 */

/**
 * MASTER_PROMPT 읽기
 */
function readMasterPrompt() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.PROMPT_DB);
  if (!sheet) throw new Error("PROMPT_DB 시트를 찾을 수 없습니다.");

  const values = sheet.getDataRange().getValues();

  for (let i = 0; i < values.length; i++) {
    const key = String(values[i][0] || "").trim();

    // MASTER_PROMPT는 A열이 "MASTER_PROMPT"
    if (key.toUpperCase() === "MASTER_PROMPT") {
      const text = values[i][3];   // D열 = PROMPT_TEXT
      if (!text) throw new Error("MASTER_PROMPT 행을 찾았지만 D열이 비어 있습니다.");
      return String(text);
    }
  }

  throw new Error("PROMPT_DB에서 MASTER_PROMPT 행을 찾을 수 없습니다.");
}


/**
 * ITEM_PROMPT 읽기
 * - A열에 ITEM_NO (예: 16, 17, 29 등)
 * - D열이 PROMPT_TEXT
 * - E열이 ACTIVE_FLAG (N이면 비활성)
 */
function readItemPrompt(itemNo) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET.PROMPT_DB);
  if (!sheet) throw new Error("PROMPT_DB 시트를 찾을 수 없습니다.");

  const values = sheet.getDataRange().getValues();
  const target = String(itemNo);

  let fallback = "";

  for (let i = 0; i < values.length; i++) {
    const key = String(values[i][0] || "").trim();      // A열
    const text = values[i][3];                           // D열 = PROMPT_TEXT
    const active = String(values[i][4] || "Y").trim();   // E열 = ACTIVE_FLAG

    if (key === target) {
      if (active.toUpperCase() === "N") {
        if (!fallback && text) fallback = String(text);
        continue;
      }
      if (!text) throw new Error("ITEM_NO=" + target + " 행을 찾았지만 프롬프트 본문(D열)이 비어 있음");
      return String(text);
    }
  }

  if (fallback) return fallback;

  throw new Error("PROMPT_DB에서 ITEM_NO=" + target + " 을 찾을 수 없습니다.");
}


/**
 * LLM용 system/user 프롬프트 구성
 */
function buildPromptBundle(req) {
  // 1) SET_PROFILE 기반 levelInfo 계산 (기존 그대로)
  let levelInfo = req.level || "";
  if (req.setId) {
    try {
      const setInfo = readSetInfo(req.setId);
      if (setInfo && setInfo.profileMap) {
        const expected = getExpectedLevelFromProfile(setInfo.profileMap, req.itemNo);
        if (expected) levelInfo = expected + " (SET_PROFILE)";
      }
    } catch (e) {
      logError("SET PROFILE 처리 실패", req.requestId, e);
    }
  }

  // 2) MASTER & ITEM PROMPT 로드
  const master = readMasterPrompt();
  const itemPrompt = readItemPrompt(req.itemNo);

  // 3) CONTEXT 구성
  let context = "";

  // ✅ (A) PASSAGE가 이미 주어졌을 때: 기존처럼 "지문 고정 모드"
  if (req.passage) {
    context += "[지문(PASSAGE_GIVEN)]\n" + req.passage + "\n\n";
  } else {
    // ✅ (B) PASSAGE가 비어 있을 때: LLM이 지문까지 생성하도록 지시
    context += "[지문 생성 지시]\n";
    context += "- 수능 영어 " + req.itemNo + "번 유형에 적합한 지문을 직접 작성하시오.\n";
    context += "- 지문은 한국 수능 수준의 어휘·문장 난이도를 유지하되, ";
    context += "학습자가 이해 가능하도록 자연스럽게 구성하시오.\n";

    // 난이도 정보가 있으면 반영
    if (levelInfo) {
      context += "- 난이도: " + levelInfo + " 수준에 맞게 문장 구조와 어휘 난도를 조절하시오.\n";
    } else {
      context += "- 난이도: 중간 수준(일반 고3 수험생 기준)으로 설정하시오.\n";
    }

    // EXTRA에 주제·스타일 지정이 들어있을 수 있음
    if (req.extra) {
      context += "- 추가 조건/스타일: " + req.extra + "\n";
    }

    // 유형별 길이 힌트(원하시면 더 세밀하게 조정 가능)
    context += "- 지문 길이는 해당 유형의 실제 수능 기출 평균 길이에 근접하게 작성하시오.\n";
    context += "- 세트 문항(41–42, 43–45, 16–17)의 경우, ";
    context += "세 문항 이상을 자연스럽게 파생할 수 있는 완성된 하나의 지문을 작성하시오.\n\n";
  }

  // 도표 데이터
  if (req.chartId) {
    try {
      const chartData = getChartData(req.chartId);
      context += "[도표 데이터(JSON)]\n" + JSON.stringify(chartData) + "\n\n";
    } catch (e) {
      logError("도표 로드 실패", req.requestId, e);
    }
  }

  if (levelInfo) {
    context += "[난이도 의도]\n" + levelInfo + "\n\n";
  }

  if (req.extra) {
    context += "[추가 메모]\n" + req.extra + "\n\n";
  }

  if (req.setId) {
    context += "[세트 정보]\nSET_ID=" + req.setId + ", ITEM_NO=" + req.itemNo + "\n\n";
  }

  // 4) userPrompt 구성
  const userPrompt =
    "아래 정보를 바탕으로 한국 수능 영어 문항을 1개 생성하시오.\n" +
    "1) PASSAGE_GIVEN 블록이 있는 경우: 해당 지문을 절대 수정·삭제·요약하지 말고 그대로 사용하시오.\n" +
    "2) 지문 생성 지시만 있고 PASSAGE_GIVEN이 없는 경우: 먼저 지문을 직접 작성한 뒤, 그 지문을 기반으로 문항을 생성하시오.\n" +
    "3) 출력은 MASTER_PROMPT에서 정의한 JSON 스키마를 따르는 단일 JSON 객체 1개만 출력하고, 그 외 텍스트는 출력하지 마시오.\n\n" +
    "----------------------------------------\n" +
    "[ITEM별 지침]\n" + itemPrompt + "\n\n" +
    "----------------------------------------\n" +
    "[문항 생성에 사용할 추가 정보]\n" +
    context +
    "----------------------------------------\n" +
    "위의 지침과 정보를 모두 반영하여 MASTER 스키마에 맞는 단일 문항(JSON 객체 1개)을 생성하시오.";

  return {
    system: master,
    user: userPrompt
  };
}

