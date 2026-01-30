/**
 * API 클라이언트
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.');
  }

  return data;
}

// 설정 API
export const configApi = {
  getAll: () => request('/config'),
  update: (key, value, description) =>
    request(`/config/${key}`, {
      method: 'PUT',
      body: { value, description },
    }),
  batchUpdate: (configs) =>
    request('/config/batch', {
      method: 'POST',
      body: { configs },
    }),
};

// 프롬프트 API
export const promptsApi = {
  getAll: () => request('/prompts'),
  get: (key) => request(`/prompts/${key}`),
  create: (data) =>
    request('/prompts', {
      method: 'POST',
      body: data,
    }),
  update: (key, data) =>
    request(`/prompts/${key}`, {
      method: 'PUT',
      body: data,
    }),
  delete: (key) =>
    request(`/prompts/${key}`, {
      method: 'DELETE',
    }),
  evaluate: (key, promptText) =>
    request(`/prompts/${key}/evaluate`, {
      method: 'POST',
      body: { prompt_text: promptText },
    }),
  quickValidate: (key, promptText) =>
    request(`/prompts/${key}/quick-validate`, {
      method: 'POST',
      body: { prompt_text: promptText },
    }),
  improveWithFeedback: (key, promptText, feedback) =>
    request(`/prompts/${key}/improve`, {
      method: 'POST',
      body: { prompt_text: promptText, feedback },
    }),
  // 메트릭스 관련
  getMetricsSummary: () => request('/prompts/metrics/summary'),
  getMetrics: (key) => request(`/prompts/${key}/metrics`),
  calculateMetrics: (key, includeAI = false) =>
    request(`/prompts/${key}/metrics/calculate`, {
      method: 'POST',
      body: { includeAI },
    }),
  recalculateAllMetrics: (includeAI = false) =>
    request('/prompts/metrics/recalculate-all', {
      method: 'POST',
      body: { includeAI },
    }),
  updatePerformance: (key) =>
    request(`/prompts/${key}/performance/update`, {
      method: 'POST',
    }),
  // 버전 관리
  getVersions: (key) => request(`/prompts/${key}/versions`),
  restoreVersion: (key, version) =>
    request(`/prompts/${key}/versions/${version}/restore`, {
      method: 'POST',
    }),
  // 기본값 설정
  getDefaults: () => request('/prompts/defaults'),
  setDefault: (key) =>
    request(`/prompts/${key}/set-default`, {
      method: 'POST',
    }),
  unsetDefault: (key) =>
    request(`/prompts/${key}/set-default`, {
      method: 'DELETE',
    }),
  // 피드백 분석
  getFeedbackSummary: () => request('/prompts/feedback-analysis/summary'),
  getAllAlerts: () => request('/prompts/feedback-analysis/alerts'),
  getPromptFeedbackAnalysis: (key) => request(`/prompts/${key}/feedback-analysis`),
  // Export/Import
  exportPrompts: (includeInactive = false) =>
    request(`/prompts/export?includeInactive=${includeInactive}`),
  downloadPrompts: (includeInactive = false) =>
    `${API_BASE_URL}/prompts/export?format=download&includeInactive=${includeInactive}`,
  importPrompts: (prompts, overwrite = false) =>
    request('/prompts/import', {
      method: 'POST',
      body: { prompts, overwrite, backupFirst: true },
    }),
  getAvailableJsonFiles: () => request('/prompts/available-json-files'),
  loadFromFile: (filePath, overwrite = false) =>
    request('/prompts/load-from-file', {
      method: 'POST',
      body: { filePath, overwrite },
    }),
};

// 문항 요청 API
export const itemsApi = {
  getRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/items/requests${query ? `?${query}` : ''}`);
  },
  getRequest: (id) => request(`/items/requests/${id}`),
  createRequest: (data) =>
    request('/items/requests', {
      method: 'POST',
      body: data,
    }),
  deleteRequest: (id) =>
    request(`/items/requests/${id}`, {
      method: 'DELETE',
    }),
  generate: (id) =>
    request(`/items/generate/${id}`, {
      method: 'POST',
    }),
  generatePending: () =>
    request('/items/generate-pending', {
      method: 'POST',
    }),
  // 2단계 워크플로우: 지문만 생성
  generatePassage: (id) =>
    request(`/items/generate-passage/${id}`, {
      method: 'POST',
    }),
  // 2단계 워크플로우: 지문 수정
  updatePassage: (id, passage) =>
    request(`/items/requests/${id}/passage`, {
      method: 'PUT',
      body: { passage },
    }),
  getOutputs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/items/outputs${query ? `?${query}` : ''}`);
  },
  previewPrompt: (data) =>
    request('/items/preview-prompt', {
      method: 'POST',
      body: data,
    }),
  applySuggestions: (itemNo, warnings, suggestions) =>
    request('/items/apply-suggestions', {
      method: 'POST',
      body: { item_no: itemNo, warnings, suggestions },
    }),
};

// 세트 API
export const setsApi = {
  getAll: () => request('/sets'),
  get: (setId) => request(`/sets/${setId}`),
  create: (data) =>
    request('/sets', {
      method: 'POST',
      body: data,
    }),
  update: (setId, data) =>
    request(`/sets/${setId}`, {
      method: 'PUT',
      body: data,
    }),
  delete: (setId) =>
    request(`/sets/${setId}`, {
      method: 'DELETE',
    }),
  generate: (setId) =>
    request(`/sets/${setId}/generate`, {
      method: 'POST',
    }),
  addRequests: (setId, items) =>
    request(`/sets/${setId}/requests`, {
      method: 'POST',
      body: { items },
    }),
};

// 차트 API
export const chartsApi = {
  getAll: () => request('/charts'),
  get: (chartId) => request(`/charts/${chartId}`),
  create: (data) =>
    request('/charts', {
      method: 'POST',
      body: data,
    }),
  update: (chartId, data) =>
    request(`/charts/${chartId}`, {
      method: 'PUT',
      body: data,
    }),
  delete: (chartId) =>
    request(`/charts/${chartId}`, {
      method: 'DELETE',
    }),
};

// 로그 API
export const logsApi = {
  getLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/logs${query ? `?${query}` : ''}`);
  },
  getErrors: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/logs/errors${query ? `?${query}` : ''}`);
  },
  getStats: () => request('/logs/stats'),
  clear: (days = 30) =>
    request(`/logs/clear?days=${days}`, {
      method: 'DELETE',
    }),
};

// 라이브러리 API
export const libraryApi = {
  // 목록 조회
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/library${query ? `?${query}` : ''}`);
  },
  // 상세 조회
  get: (id) => request(`/library/${id}`),
  // 통계
  getStats: () => request('/library/stats'),
  // 카테고리 목록
  getCategories: () => request('/library/categories'),
  // 항목 추가
  create: (data) =>
    request('/library', {
      method: 'POST',
      body: data,
    }),
  // 생성 요청에서 문항 저장
  saveItemFromRequest: (requestId, data = {}) =>
    request(`/library/item-from-request/${requestId}`, {
      method: 'POST',
      body: data,
    }),
  // 프롬프트 저장
  savePrompt: (promptKey, data = {}) =>
    request(`/library/prompt/${promptKey}`, {
      method: 'POST',
      body: data,
    }),
  // 수정
  update: (id, data) =>
    request(`/library/${id}`, {
      method: 'PUT',
      body: data,
    }),
  // 즐겨찾기 토글
  toggleFavorite: (id, isFavorite) =>
    request(`/library/${id}/favorite`, {
      method: 'PUT',
      body: { is_favorite: isFavorite },
    }),
  // 삭제
  delete: (id) =>
    request(`/library/${id}`, {
      method: 'DELETE',
    }),
  // 내보내기
  export: (ids, format = 'json') =>
    request('/library/export', {
      method: 'POST',
      body: { ids, format },
    }),
};

// 헬스 체크
export const healthCheck = () => request('/health');
