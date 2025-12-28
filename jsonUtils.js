/** jsonUtils.gs
 * LLM 응답 텍스트 → JSON 객체
 */

function parseItemJson(rawText) {
  if (!rawText) throw new Error("LLM 응답이 비어 있습니다.");

  let text = String(rawText).trim();

  // ```json ``` 코드블록 제거
  text = text.replace(/```json/gi, "")
             .replace(/```/g, "")
             .trim();

  // 첫 { 부터 마지막 } 까지 잘라서 시도
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("JSON 형식이 아닌 응답입니다: " + text.slice(0, 100));
  }

  const jsonStr = text.substring(first, last + 1);

  try {
    const obj = JSON.parse(jsonStr);
    return obj;
  } catch (e) {
    throw new Error("JSON.parse 실패: " + e.message + " / 원본:" + jsonStr.slice(0, 150));
  }
}
