/**
 * ITEM_REQUEST 데이터 시드 스크립트
 * Google Sheets에서 가져온 데이터를 데이터베이스에 삽입
 */

const { initDatabase, getDb, closeDatabase } = require('../db/database');

const itemRequests = [
  // R-시리즈 (Reading Comprehension 문항 요청)
  { request_id: 'R-0001', status: 'PENDING', item_no: 1, passage: '(AUTO)', level: '하', extra: 'LC 1번: 그림 선택 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: '학교생활' },
  { request_id: 'R-0002', status: 'PENDING', item_no: 2, passage: '(AUTO)', level: '하', extra: 'LC 2번: 적절한 응답 고르기 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0003', status: 'PENDING', item_no: 3, passage: '(AUTO)', level: '하', extra: 'LC 3번: 내용 일치/불일치 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0004', status: 'PENDING', item_no: 4, passage: '(AUTO)', level: '하', extra: 'LC 4번: 세부 정보 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0005', status: 'PENDING', item_no: 5, passage: '(AUTO)', level: '하', extra: 'LC 5번: 목적/의도 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0006', status: 'PENDING', item_no: 6, passage: '(AUTO)', level: '하', extra: 'LC 6번: 요지 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0007', status: 'PENDING', item_no: 7, passage: '(AUTO)', level: '하', extra: 'LC 7번: 주제/요지 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0008', status: 'PENDING', item_no: 8, passage: '(AUTO)', level: '중', extra: 'LC 8번: 세부 정보 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0009', status: 'PENDING', item_no: 9, passage: '(AUTO)', level: '중', extra: 'LC 9번: 목적/요지 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0010', status: 'PENDING', item_no: 10, passage: '(AUTO)', level: '중', extra: 'LC 10번: 요점 파악/내용 일치 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0011', status: 'PENDING', item_no: 11, passage: '(AUTO)', level: '중', extra: 'LC 11번: 세부 정보(시간·장소) 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0012', status: 'PENDING', item_no: 12, passage: '(AUTO)', level: '중', extra: 'LC 12번: 태도/의견 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0013', status: 'PENDING', item_no: 13, passage: '(AUTO)', level: '중상', extra: 'LC 13번: 주제+세부 정보 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0014', status: 'PENDING', item_no: 14, passage: '(AUTO)', level: '중상', extra: 'LC 14번: 요지/세부 정보 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0015', status: 'PENDING', item_no: 15, passage: '(AUTO)', level: '중상', extra: 'LC 15번: 요지·목적 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0016', status: 'PENDING', item_no: 16, passage: '(AUTO)', level: '중상', extra: 'LC 세트(16–17)용 공통 지문 역할. 개별 문항은 SET_ID 기준으로 다른 발문 생성.', chart_id: null, set_id: 'LC16_17_1', passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0017', status: 'PENDING', item_no: 17, passage: '(AUTO)', level: '상', extra: 'LC 세트(16–17) 두 번째 문항. 추론/세부 정보 중심.', chart_id: null, set_id: 'LC16_17_1', passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0018', status: 'PENDING', item_no: 18, passage: '(AUTO)', level: '하', extra: 'RC18: 간단한 세부 정보/내용 일치 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0019', status: 'PENDING', item_no: 19, passage: '(AUTO)', level: '하', extra: 'RC19: 내용 일치/불일치 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0020', status: 'PENDING', item_no: 20, passage: '(AUTO)', level: '하', extra: 'RC20: 세부 정보 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0021', status: 'PENDING', item_no: 21, passage: '(AUTO)', level: '중', extra: 'RC21: 주제/요지 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0022', status: 'PENDING', item_no: 22, passage: '(AUTO)', level: '중', extra: 'RC22: 의견·태도 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0023', status: 'FAIL', item_no: 23, passage: '(AUTO)', level: '중', extra: 'RC23: 세부 정보 및 조건 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0024', status: 'FAIL', item_no: 24, passage: '(AUTO)', level: '중', extra: 'RC24: 흐름 이해·내용 일치 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0025', status: 'PENDING', item_no: 25, passage: '(AUTO)', level: '중상', extra: 'RC25: 도표/그래프 정보와 진술 5개 일치 여부 판단.', chart_id: 'CH025_01', set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0026', status: 'FAIL', item_no: 26, passage: '(AUTO)', level: '중상', extra: 'RC26: 글의 요지/주제 파악 또는 제목 고르기 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0027', status: 'PENDING', item_no: 27, passage: '(AUTO)', level: '중상', extra: 'RC27: 목적/요지 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0028', status: 'PENDING', item_no: 28, passage: '(AUTO)', level: '중상', extra: 'RC28: 흐름/순서 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0029', status: 'FAIL', item_no: 29, passage: '(AUTO)', level: '중', extra: 'RC29: 어법/문법 문항. 밑줄 5개, 하나만 틀리도록 설계.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0030', status: 'PENDING', item_no: 30, passage: '(AUTO)', level: '중상', extra: 'RC30: 문장 삽입/문단 구성 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0031', status: 'PENDING', item_no: 31, passage: '(AUTO)', level: '중상', extra: 'RC31: 단문 빈칸 1개. 어휘/구문 기반 추론.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0032', status: 'FAIL', item_no: 32, passage: '(AUTO)', level: '상', extra: 'RC32: 단문 빈칸 1개. 추상도 높은 어휘/표현.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0033', status: 'FAIL', item_no: 33, passage: `The proliferation of automated systems in high-stakes environments, from aviation to medicine, is driven by a compelling logic: to reduce the potential for human error. By delegating routine and computationally intensive tasks to machines, the human operator is ostensibly freed from the cognitive burden of moment-to-moment execution. This shift is intended to elevate the human's role to that of a strategic overseer, one who monitors the system's performance and intervenes only when necessary. The assumption is that this reduced workload allows for greater situational awareness and better decision-making during critical junctures.

However, a subtle yet profound paradox emerges from this reconfiguration of human-machine interaction. Continuous, hands-on engagement with a process fosters an intimate familiarity with its dynamic intricacies—the subtle cues, rhythms, and feedback loops that are often too complex to be fully captured by formal models. When an operator is distanced from this direct involvement, their deep, intuitive understanding of the system begins to atrophy. The very disengagement intended to enhance oversight ironically diminishes the operator's capacity to make informed, timely interventions when the system falters. The human becomes a passive observer of a process they no longer intimately know.

This degradation of expertise poses a significant risk. While automated systems perform reliably under expected conditions, they are often brittle in the face of novelty or unforeseen circumstances. It is precisely in these moments that human ingenuity and adaptive problem-solving are most crucial. Yet, if the human supervisor has been relegated to simply watching screens displaying normal parameters for extended periods, they may lack the practiced skill and rich mental model needed to diagnose an anomaly or improvise a solution under pressure. The ultimate safety net—the skilled human operator—is thus weakened by the very system it was designed to support.`, level: '상', extra: 'RC33: 장문 빈칸 1개. 지문 재배열/요약 금지 규칙 적용.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0034', status: 'OK', item_no: 34, passage: `The externalization of memory functions to digital devices was initially hailed as a definitive liberation of human cognitive capacity. Proponents of this shift argued that by offloading the mundane burden of data retention to silicon chips, the human mind would finally be emancipated to engage in higher-order creative and analytical thinking. However, this optimistic assumption overlooks the fundamental biological reality of how the brain operates. Neural circuitry functions much like a muscular system; it operates strictly on a use-it-or-lose-it basis. The neural pathways dedicated to memory consolidation—the very process of transforming fleeting information into stable knowledge—begin to atrophy when they are not actively engaged. By continuously delegating the labor of remembering to external drives, we do not merely free up cognitive space; we actively dismantle the internal scaffolding required for deep understanding. True expertise is not merely the ability to access facts but the result of the strenuous internal synthesis of those facts. Therefore, in our exclusive reliance on digital archives to store our knowledge, we paradoxically [BLANK].`, level: '중상', extra: 'RC34: 문장 배열/순서 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'PASSAGE_SOURCE=LLM', topic: 'AUTO' },
  { request_id: 'R-0035', status: 'PENDING', item_no: 35, passage: '(AUTO)', level: '중상', extra: 'RC35: 문장 삽입 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0036', status: 'PENDING', item_no: 36, passage: '(AUTO)', level: '상', extra: 'RC36: 글의 요약 문장 고르기 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0037', status: 'PENDING', item_no: 37, passage: '(AUTO)', level: '상', extra: 'RC37: 문장 순서 배열 고난도 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0038', status: 'PENDING', item_no: 38, passage: '(AUTO)', level: '상', extra: 'RC38: 주장/관점 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0039', status: 'PENDING', item_no: 39, passage: '(AUTO)', level: '상', extra: 'RC39: 글 마무리 문장 고르기 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0040', status: 'PENDING', item_no: 40, passage: '(AUTO)', level: '상', extra: 'RC40: 추론/원인 파악 유형 예시.', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0041', status: 'OK', item_no: 41, passage: '(AUTO)', level: '중', extra: '세트1(41–42): 공통 지문. 41번은 주제/요지 또는 세부 정보 중심.', chart_id: null, set_id: 'S41_42_1', passage_source: 'PASSAGE_SOURCE=LLM', topic: 'AUTO' },
  { request_id: 'R-0042', status: 'OK', item_no: 42, passage: '(AUTO)', level: '중상', extra: '세트1(41–42): 42번은 함의/추론 또는 제목/목적 중심.', chart_id: null, set_id: 'S41_42_1', passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0043', status: 'PENDING', item_no: 43, passage: '(AUTO)', level: '상', extra: '세트2(43–45): 43번은 내용 일치/불일치 중심.', chart_id: null, set_id: 'S43_45_1', passage_source: 'PASSAGE_SOURCE=LLM', topic: 'AUTO' },
  { request_id: 'R-0044', status: 'PENDING', item_no: 44, passage: '(AUTO)', level: '상', extra: '세트2(43–45): 44번은 문단 구조/흐름 파악 중심.', chart_id: null, set_id: 'S43_45_1', passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'R-0045', status: 'PENDING', item_no: 45, passage: '(AUTO)', level: '상', extra: '세트2(43–45): 45번은 요약/핵심 내용 파악 중심.', chart_id: null, set_id: 'S43_45_1', passage_source: 'LLM', topic: 'AUTO' },

  // P-시리즈 (Prompt 기반 문항 요청)
  { request_id: 'P-0001', status: 'PENDING', item_no: 1, passage: '', level: '중', extra: '목적: 여자가 하는 말의 목적', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0002', status: 'PENDING', item_no: 2, passage: '', level: '중', extra: '의견: 남자의 의견 파악', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0003', status: 'PENDING', item_no: 3, passage: '', level: '중', extra: '요지: 여자의 핵심 요지', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0004', status: 'PENDING', item_no: 4, passage: '', level: '중', extra: '그림 일치: 그림과 대화 비교', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0005', status: 'PENDING', item_no: 5, passage: '', level: '중', extra: '할 일: 대화 후 행동 추론', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0006', status: 'PENDING', item_no: 6, passage: '', level: '중', extra: '금액: 지불 금액 계산', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0007', status: 'PENDING', item_no: 7, passage: '', level: '중', extra: '이유: 참석 불가 이유', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0008', status: 'PENDING', item_no: 8, passage: '', level: '중', extra: '언급X: 언급되지 않은 정보', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0009', status: 'PENDING', item_no: 9, passage: '', level: '중', extra: '실용문 일치X: 불일치 정보 찾기', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0010', status: 'PENDING', item_no: 10, passage: '', level: '중', extra: '표 사용: 표 기반 선택', chart_id: 'LC10_CHART', set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0011', status: 'PENDING', item_no: 11, passage: '', level: '중', extra: '대화 응답: 적절한 응답', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0012', status: 'PENDING', item_no: 12, passage: '', level: '중', extra: '대화 응답: 적절한 응답', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0013', status: 'PENDING', item_no: 13, passage: '', level: '중', extra: '대화 응답: 적절한 응답', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0014', status: 'PENDING', item_no: 14, passage: '', level: '중', extra: '대화 응답: 적절한 응답 (3점)', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0015', status: 'PENDING', item_no: 15, passage: '', level: '중', extra: '상황 반응: 상황에 맞는 발화', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0016', status: 'PENDING', item_no: 16, passage: '', level: '중상', extra: '두 번 듣기-주제: 세트 주제 파악', chart_id: null, set_id: 'LC16_17_1', passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0017', status: 'PENDING', item_no: 17, passage: '', level: '중상', extra: '두 번 듣기-언급X: 세트 언급X 요소 파악', chart_id: null, set_id: 'LC16_17_1', passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0018', status: 'PENDING', item_no: 18, passage: '', level: '중상', extra: '목적: 안내문의 목적', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0019', status: 'PENDING', item_no: 19, passage: '', level: '중상', extra: '심경 변화: 감정 변화 파악', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0020', status: 'PENDING', item_no: 20, passage: '', level: '중상', extra: '주장: 필자의 주장', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0021', status: 'PENDING', item_no: 21, passage: '', level: '중상', extra: '어휘 의미: 비유적 의미 파악', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0022', status: 'PENDING', item_no: 22, passage: '', level: '중상', extra: '요지: 글의 요지 파악', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0023', status: 'PENDING', item_no: 23, passage: '', level: '중상', extra: '주제: 글의 주제', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0024', status: 'PENDING', item_no: 24, passage: '', level: '중상', extra: '제목: 제목 선택', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0025', status: 'PENDING', item_no: 25, passage: '', level: '중상', extra: '도표해석: 도표와 설명 일치', chart_id: 'RC25_CHART', set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0026', status: 'PENDING', item_no: 26, passage: '', level: '중상', extra: '사실 일치: 사실 여부 판단', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0027', status: 'PENDING', item_no: 27, passage: '', level: '중상', extra: '실용문 일치: 안내문 사실 여부', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0028', status: 'PENDING', item_no: 28, passage: '', level: '중상', extra: '실용문 일치: 안내문 사실 여부', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0029', status: 'PENDING', item_no: 29, passage: '', level: '상', extra: '어법: 문법 오류 찾기', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0030', status: 'PENDING', item_no: 30, passage: '', level: '상', extra: '어휘/논리: 부적절한 단어', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0031', status: 'PENDING', item_no: 31, passage: '', level: '상', extra: '단일 빈칸: 단일 빈칸 추론', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0032', status: 'PENDING', item_no: 32, passage: '', level: '상', extra: '단일 빈칸: 교육·사고력', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0033', status: 'PENDING', item_no: 33, passage: '', level: '상', extra: '장문 빈칸: 장문 빈칸 추론', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0034', status: 'PENDING', item_no: 34, passage: '', level: '중상', extra: '단일 빈칸: 규칙·역할', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0035', status: 'PENDING', item_no: 35, passage: '', level: '중상', extra: '문장 삭제: 문장 제거', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0036', status: 'PENDING', item_no: 36, passage: '', level: '중상', extra: '문장 배열: 문장 순서', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0037', status: 'PENDING', item_no: 37, passage: '', level: '중상', extra: '문장 배열: 문장 순서', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0038', status: 'PENDING', item_no: 38, passage: '', level: '중상', extra: '문장 삽입: 문장 위치', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0039', status: 'PENDING', item_no: 39, passage: '', level: '중상', extra: '문장 삽입: 문장 위치', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0040', status: 'PENDING', item_no: 40, passage: '', level: '상', extra: '요약: 요약문 완성', chart_id: null, set_id: null, passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0041', status: 'OK', item_no: 41, passage: '', level: '중상', extra: '세트-제목/내용: 중심 내용', chart_id: null, set_id: 'S41_42_1', passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0042', status: 'OK', item_no: 42, passage: '', level: '중상', extra: '세트-어휘/표현: 어휘 적절성', chart_id: null, set_id: 'S41_42_1', passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0043', status: 'PENDING', item_no: 43, passage: '', level: '상', extra: '세트-순서: 사건 순서', chart_id: null, set_id: 'S43_45_1', passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0044', status: 'PENDING', item_no: 44, passage: '', level: '상', extra: '세트-지시어: 지시 대상', chart_id: null, set_id: 'S43_45_1', passage_source: 'LLM', topic: 'AUTO' },
  { request_id: 'P-0045', status: 'PENDING', item_no: 45, passage: '', level: '상', extra: '세트-내용 일치: 사실 여부', chart_id: null, set_id: 'S43_45_1', passage_source: 'LLM', topic: 'AUTO' },
];

async function seedItemRequests() {
  try {
    await initDatabase();
    const db = getDb();

    console.log('ITEM_REQUEST 데이터 삽입 시작...');

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO item_requests
      (request_id, status, item_no, passage, level, extra, chart_id, set_id, passage_source, topic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let insertedCount = 0;
    for (const req of itemRequests) {
      insertStmt.run(
        req.request_id,
        req.status,
        req.item_no,
        req.passage,
        req.level,
        req.extra,
        req.chart_id,
        req.set_id,
        req.passage_source,
        req.topic
      );
      insertedCount++;
    }

    console.log(`✅ ${insertedCount}개의 ITEM_REQUEST 데이터 삽입 완료`);

    // 통계 출력
    const stats = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM item_requests
      GROUP BY status
    `).all();

    console.log('\n📊 상태별 통계:');
    stats.forEach(s => console.log(`  - ${s.status}: ${s.count}개`));

    closeDatabase();
    console.log('\n데이터베이스 연결 종료');

  } catch (error) {
    console.error('시드 오류:', error);
    process.exit(1);
  }
}

seedItemRequests();
