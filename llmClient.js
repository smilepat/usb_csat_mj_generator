/** llmClient.gs
 * LLM API 호출 (Gemini / OpenAI 선택 가능)
 * - 기본 PROVIDER: gemini
 */

/**
 * 공통 LLM 호출 함수
 * @param {string} systemText
 * @param {string} userText
 * @param {Object} config - getConfig() 결과
 * @return {string} 모델이 반환한 텍스트 (JSON 문자열 등)
 */
function callLLM(systemText, userText, config) {
  const provider = String(config["PROVIDER"] || "gemini").toLowerCase();

  if (provider === "gemini") {
    return callGemini(systemText, userText, config);
  } else if (provider === "openai") {
    return callOpenAI(systemText, userText, config);
  } else {
    throw new Error(
      "지원하지 않는 PROVIDER=" + provider +
      " 입니다. CONFIG 시트에서 PROVIDER를 'gemini' 또는 'openai'로 설정해 주세요."
    );
  }
}

/**
 * Gemini API 호출 (기본)
 * - Endpoint: https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent
 *   (예: models/gemini-2.5-pro 등) :contentReference[oaicite:0]{index=0}
 */
function callGemini(systemText, userText, config) {
  // API Key 우선순위: GEMINI_API_KEY > LLM_API_KEY
  const apiKey = config["GEMINI_API_KEY"] || config["LLM_API_KEY"];
  if (!apiKey) {
    throw new Error("Gemini API 사용을 위해 GEMINI_API_KEY 또는 LLM_API_KEY가 Script Properties에 필요합니다.");
  }

  // CONFIG 시트에서 GEMINI_MODEL을 우선 사용, 없으면 기본값
  const modelId = config["GEMINI_MODEL"] || "gemini-2.5-pro";
  const modelPath = "models/" + modelId;
  const url =
    "https://generativelanguage.googleapis.com/v1beta/" +
    modelPath +
    ":generateContent";

  const temperature = Number(config["TEMP_BASE"] || 0.4);

  const payload = {
    // system 역할
    system_instruction: {
      parts: [{ text: systemText }]
    },
    // user 역할
    contents: [
      {
        role: "user",
        parts: [{ text: userText }]
      }
    ],
    generationConfig: {
      temperature: temperature
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-goog-api-key": apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  const body = res.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("Gemini API 호출 실패: " + code + " / " + body);
  }

  const data = JSON.parse(body);
  if (!data.candidates || !data.candidates[0] ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      !data.candidates[0].content.parts[0]) {
    throw new Error("Gemini 응답 형식이 예상과 다릅니다: " + body.slice(0, 300));
  }

  const text = data.candidates[0].content.parts[0].text || "";
  return text;
}

/**
 * OpenAI Chat Completions 호출
 * - Endpoint: https://api.openai.com/v1/chat/completions
 */
function callOpenAI(systemText, userText, config) {
  // API Key 우선순위: OPENAI_API_KEY > LLM_API_KEY
  const apiKey = config["OPENAI_API_KEY"] || config["LLM_API_KEY"];
  if (!apiKey) {
    throw new Error("OpenAI API 사용을 위해 OPENAI_API_KEY 또는 LLM_API_KEY가 Script Properties에 필요합니다.");
  }

  const model = config["OPENAI_MODEL"] || config["MODEL_NAME"] || "gpt-4.1-mini";
  const temperature = Number(config["TEMP_BASE"] || 0.4);

  const url = "https://api.openai.com/v1/chat/completions";
  const payload = {
    model: model,
    temperature: temperature,
    messages: [
      { role: "system", content: systemText },
      { role: "user", content: userText }
    ]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  const body = res.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("OpenAI API 호출 실패: " + code + " / " + body);
  }

  const data = JSON.parse(body);
  const content = data.choices[0].message.content;
  return content;
}
