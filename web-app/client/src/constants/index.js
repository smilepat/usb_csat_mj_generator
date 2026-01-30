/**
 * client/src/constants/index.js
 * 클라이언트 측 상수 정의 - 일관된 용어 및 상태 관리
 */

// ========================================
// 요청 상태 정의 (Request Status)
// ========================================
export const REQUEST_STATUS = {
  PENDING: 'PENDING',
  GENERATING_PASSAGE: 'GENERATING_PASSAGE',
  PASSAGE_READY: 'PASSAGE_READY',
  RUNNING: 'RUNNING',
  OK: 'OK',
  FAIL: 'FAIL'
};

// 상태별 표시 정보 (한글 레이블, CSS 클래스, 설명)
export const STATUS_DISPLAY = {
  [REQUEST_STATUS.PENDING]: {
    label: '입력 완료',
    class: 'badge-pending',
    description: '문항 생성 요청이 등록되어 대기 중입니다.',
    color: '#fbbc04'
  },
  [REQUEST_STATUS.GENERATING_PASSAGE]: {
    label: '지문 생성 중',
    class: 'badge-running',
    description: '2단계 워크플로우: 지문을 생성하고 있습니다.',
    color: '#9c27b0'
  },
  [REQUEST_STATUS.PASSAGE_READY]: {
    label: '지문 검토 대기',
    class: 'badge-passage-ready',
    description: '2단계 워크플로우: 지문 생성 완료, 검토 후 문항 생성 가능',
    color: '#2196f3'
  },
  [REQUEST_STATUS.RUNNING]: {
    label: '문항 생성 중',
    class: 'badge-running',
    description: 'LLM이 문항을 생성하고 있습니다.',
    color: '#ff9800'
  },
  [REQUEST_STATUS.OK]: {
    label: '생성 완료',
    class: 'badge-ok',
    description: '문항 생성 및 검증이 완료되었습니다.',
    color: '#4caf50'
  },
  [REQUEST_STATUS.FAIL]: {
    label: '생성 실패',
    class: 'badge-fail',
    description: '문항 생성 또는 검증에 실패했습니다.',
    color: '#f44336'
  }
};

// ========================================
// 워크플로우 모드 정의
// ========================================
export const WORKFLOW_MODE = {
  ONE_STEP: 'one-step',      // 1단계: 바로 생성
  TWO_STEP: 'two-step'       // 2단계: 지문 생성 → 검토 → 문항 생성
};

export const WORKFLOW_DISPLAY = {
  [WORKFLOW_MODE.ONE_STEP]: {
    label: '1단계 (바로 생성)',
    description: '지문과 문항을 한 번에 생성합니다. 기존 지문이 있거나 빠른 생성이 필요할 때 사용합니다.',
    recommended: '기존 지문 입력 시'
  },
  [WORKFLOW_MODE.TWO_STEP]: {
    label: '2단계 (지문 검토 후 생성)',
    description: '지문을 먼저 생성하고 검토/수정한 후 문항을 생성합니다. 고품질 문항 제작에 권장됩니다.',
    recommended: '지문 자동 생성 시'
  }
};

// ========================================
// 문항 유형 정의
// ========================================
export const ITEM_TYPE = {
  LC: 'LC',    // Listening Comprehension (듣기)
  RC: 'RC'     // Reading Comprehension (독해)
};

export const ITEM_NUMBER_RANGES = {
  LC: { min: 1, max: 17 },
  RC: { min: 18, max: 45 }
};

// 세트 문항 패턴
export const SET_PATTERNS = ['16-17', '41-42', '43-45'];

// ========================================
// 프롬프트 유형 정의
// ========================================
export const PROMPT_TYPE = {
  INDIVIDUAL: 'individual',  // 개별 프롬프트 (RC18-RC40)
  SET: 'set',                // 세트 프롬프트 (RC41_42, RC43_45)
  PASSAGE: 'passage',        // 지문 생성 프롬프트 (P_RC18 등)
  MASTER: 'master'           // 마스터 프롬프트
};

// RC41-RC45는 세트 프롬프트 사용 권장
export const SET_PROMPT_RECOMMENDATION = {
  41: 'RC41_42',
  42: 'RC41_42',
  43: 'RC43_45',
  44: 'RC43_45',
  45: 'RC43_45'
};

// ========================================
// 검증 결과 정의
// ========================================
export const VALIDATION_RESULT = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  REVIEW: 'REVIEW'
};

export const VALIDATION_DISPLAY = {
  [VALIDATION_RESULT.PASS]: {
    label: '통과',
    class: 'badge-ok',
    color: '#4caf50'
  },
  [VALIDATION_RESULT.FAIL]: {
    label: '실패',
    class: 'badge-fail',
    color: '#f44336'
  },
  [VALIDATION_RESULT.REVIEW]: {
    label: '검토 필요',
    class: 'badge-warning',
    color: '#ff9800'
  }
};

// ========================================
// 난이도 정의
// ========================================
export const DIFFICULTY_LEVELS = ['상', '중상', '중', '중하', '하'];

export const DIFFICULTY_DISPLAY = {
  '상': { label: '상 (어려움)', color: '#d32f2f' },
  '중상': { label: '중상', color: '#f57c00' },
  '중': { label: '중 (보통)', color: '#1976d2' },
  '중하': { label: '중하', color: '#388e3c' },
  '하': { label: '하 (쉬움)', color: '#7cb342' }
};

// ========================================
// 등급 정의
// ========================================
export const GRADE_THRESHOLDS = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
  F: 0
};

export const GRADE_DISPLAY = {
  A: { label: 'A등급', color: '#10b981', description: '우수 (90점 이상)' },
  B: { label: 'B등급', color: '#3b82f6', description: '양호 (80-89점)' },
  C: { label: 'C등급', color: '#f59e0b', description: '보통 (70-79점)' },
  D: { label: 'D등급', color: '#ef4444', description: '미흡 (60-69점)' },
  F: { label: 'F등급', color: '#6b7280', description: '재작성 필요 (60점 미만)' }
};

// ========================================
// 데이터 필드명 매핑 (일관성 유지)
// ========================================
export const FIELD_NAMES = {
  // 지문 관련
  passage: {
    display: '지문',
    alternativeNames: ['passage', 'stimulus', 'text'],
    lcDisplay: '듣기 스크립트',
    lcAlternativeNames: ['lc_script', 'script', 'listening_script']
  },
  // 지문 출처
  passageSource: {
    display: '지문 출처',
    values: {
      user_input: '사용자 입력',
      ai_generated: 'AI 생성',
      set_shared: '세트 공유'
    }
  }
};

// ========================================
// UI 버튼 레이블 정의
// ========================================
export const BUTTON_LABELS = {
  // 문항 생성 관련
  createRequest: '요청 등록',
  generateItem: '문항 생성 실행',
  generatePassage: '지문 생성 (Step 1)',
  confirmAndGenerate: '지문 확정 & 문항 생성 (Step 2)',
  regeneratePassage: '지문 재생성',
  saveOnly: '저장만 하기',
  previewPrompt: '프롬프트 미리보기',

  // 일반
  save: '저장',
  cancel: '취소',
  delete: '삭제',
  edit: '수정',
  close: '닫기',
  confirm: '확인',
  retry: '재시도'
};

// ========================================
// 헬퍼 함수
// ========================================

/**
 * 문항 번호로 문항 유형 (LC/RC) 반환
 */
export const getItemType = (itemNo) => {
  const num = parseInt(itemNo, 10);
  if (num >= ITEM_NUMBER_RANGES.LC.min && num <= ITEM_NUMBER_RANGES.LC.max) {
    return ITEM_TYPE.LC;
  }
  return ITEM_TYPE.RC;
};

/**
 * 상태에 따른 표시 정보 반환
 */
export const getStatusDisplay = (status) => {
  return STATUS_DISPLAY[status] || {
    label: status,
    class: 'badge-pending',
    description: '알 수 없는 상태',
    color: '#9e9e9e'
  };
};

/**
 * 세트 프롬프트 사용 권장 여부 확인
 */
export const shouldUseSetPrompt = (itemNo) => {
  const num = parseInt(itemNo, 10);
  return num >= 41 && num <= 45;
};

/**
 * 권장 세트 프롬프트 키 반환
 */
export const getRecommendedSetPrompt = (itemNo) => {
  const num = parseInt(itemNo, 10);
  return SET_PROMPT_RECOMMENDATION[num] || null;
};

/**
 * 점수로 등급 계산
 */
export const calculateGrade = (score) => {
  if (score >= GRADE_THRESHOLDS.A) return 'A';
  if (score >= GRADE_THRESHOLDS.B) return 'B';
  if (score >= GRADE_THRESHOLDS.C) return 'C';
  if (score >= GRADE_THRESHOLDS.D) return 'D';
  return 'F';
};
