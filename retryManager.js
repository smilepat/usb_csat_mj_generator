/**
 * 하나의 ITEM_REQUEST(req)를 받아
 * - (필요 시) 지문 생성
 * - 문항 JSON 생성
 * - Normalize + Validation
 * 까지 수행하는 파이프라인
 */
function generateItemPipeline(req) {
  const config = getConfig();
  const maxRetry = Number(config["MAX_RETRY"] || 3);

  // 🔹 0단계: 필요하면 지문 먼저 생성
  // generatePassageIfNeeded가 아직 없더라도 전체가 죽지 않도록 방어
  try {
    if (typeof generatePassageIfNeeded === "function") {
      req = generatePassageIfNeeded(req);
    }
  } catch (e) {
    // 지문 생성 단계에서 실패해도 마지막 FAIL 리턴에서 한 번에 처리
    // 필요하다면 여기서 Logger.log(e) 또는 logError 사용 가능
    throw new Error("지문 생성(generatePassageIfNeeded) 중 오류: " + e.message);
  }

  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    try {
      // 1) 프롬프트 구성 (이제 req.passage 가 채워져 있음)
      const bundle = buildPromptBundle(req);
      if (!bundle || !bundle.system || !bundle.user) {
        throw new Error("buildPromptBundle 결과가 올바르지 않습니다.");
      }

      // 2) LLM 호출
      const raw = callLLM(bundle.system, bundle.user, config);

      // 2-1) raw 응답 방어
      if (!raw || String(raw).trim() === "") {
        throw new Error("LLM 응답이 비어 있습니다. (raw 없음)");
      }

      // 3) JSON 파싱
      const parsed = parseItemJson(raw);

      // 3-1) parsed 방어: 객체가 아닐 경우 바로 에러
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("parseItemJson 결과가 유효한 객체가 아닙니다.");
      }

      // 3-2) Normalize
      const normalized = normalizeItemJson(parsed);
      if (!normalized || typeof normalized !== "object") {
        throw new Error("normalizeItemJson 결과가 유효한 객체가 아닙니다.");
      }

      // (선택) itemNo가 비어 있으면 req.itemNo로 보완
      if (!normalized.itemNo && req.itemNo) {
        normalized.itemNo = req.itemNo;
      }

      // 4) 공통 Validation
      const cv = validateCommon(normalized);
      if (!cv || cv.pass === false) {
        throw new Error(cv && cv.log ? cv.log : "공통 Validation 실패");
      }

      // 5) 유형별 추가 Validation
      // RC29: 어법 (밑줄 5개 + grammar_meta)
      if (req.itemNo == 29) {
        const vg = validateGrammarItem(normalized, req);
        if (!vg || vg.pass === false) {
          throw new Error(vg && vg.log ? vg.log : "RC29 Grammar Validation 실패");
        }
      }

      // RC31~33: 빈칸 문항 (gapped_passage + 빈칸 1개 + 지문 변형 금지)
      if (req.itemNo >= 31 && req.itemNo <= 33) {
        const vgGap = validateGapItem(normalized, req);
        if (!vgGap || vgGap.pass === false) {
          throw new Error(vgGap && vgGap.log ? vgGap.log : "RC31~33 Gap Validation 실패");
        }
      }

      // RC25: 도표 문항 (CHART_ID 필요)
      if (req.itemNo == 25 && req.chartId) {
        const chartData = getChartData(req.chartId);
        const vc = validateChartItem(normalized, chartData);
        if (!vc || vc.pass === false) {
          throw new Error(vc && vc.log ? vc.log : "RC25 Chart Validation 실패");
        }
      }

      // TODO: 세트 문항(16–17, 41–42, 43–45) validator_set 연동도 여기서 추가 가능

      // 6) (필요 시) 자동 보정 tryRepair 등 추가 가능

      // 난이도/오답지 점수는 당장은 placeholder로 유지
      return {
        rawJson: raw,
        normalized: normalized,
        validationResult: "PASS",
        validationLog: "OK",
        repairLog: "",
        difficultyEst: normalized.difficultyEst || "중(추정)",
        distractorScore: normalized.distractorScore || "중간",
        finalJson: normalized
      };

    } catch (e) {
      // 마지막 시도에서도 실패하면 FAIL로 종료
      if (attempt === maxRetry) {
        return {
          rawJson: "",
          normalized: null,
          validationResult: "FAIL",
          validationLog: "실패: " + e.message,
          repairLog: "",
          finalJson: null
        };
      }

      // 재시도 전에 temperature 조정 등 넣을 수 있는 위치
      // 예: config.temperature = (config.temperature || 0.7) + 0.1;
      // Logger.log("재시도 " + (attempt + 1) + "회차: " + e.message);
    }
  }
}
