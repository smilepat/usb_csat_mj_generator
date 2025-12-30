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
  getOutputs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/items/outputs${query ? `?${query}` : ''}`);
  },
  previewPrompt: (data) =>
    request('/items/preview-prompt', {
      method: 'POST',
      body: data,
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

// 헬스 체크
export const healthCheck = () => request('/health');
