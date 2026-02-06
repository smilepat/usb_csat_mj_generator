/**
 * server/services/llmClient.js
 * LLM API 클라이언트 (Gemini / OpenAI / Azure 지원)
 * Rate Limiter 포함 - 세트 문항 병렬 생성 시 API 제한 방지
 */

const https = require('https');
const http = require('http');

// =============================================
// Rate Limiter 구현 (Token Bucket 알고리즘)
// =============================================

class RateLimiter {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 3;       // 최대 동시 요청 수
    this.minDelayMs = options.minDelayMs || 500;           // 요청 간 최소 딜레이 (ms)
    this.maxRetryDelay = options.maxRetryDelay || 30000;   // 재시도 최대 딜레이 (ms)

    this.currentRequests = 0;
    this.lastRequestTime = 0;
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Rate Limit을 적용하여 함수 실행
   * @param {Function} fn - 실행할 비동기 함수
   * @returns {Promise<any>} 함수 실행 결과
   */
  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      // 동시 요청 수 체크
      if (this.currentRequests >= this.maxConcurrent) {
        await this.sleep(100);
        continue;
      }

      // 최소 딜레이 체크
      const elapsed = Date.now() - this.lastRequestTime;
      if (elapsed < this.minDelayMs) {
        await this.sleep(this.minDelayMs - elapsed);
      }

      const { fn, resolve, reject } = this.queue.shift();
      this.currentRequests++;
      this.lastRequestTime = Date.now();

      // 비동기로 실행 (큐 처리 계속)
      fn()
        .then(result => {
          this.currentRequests--;
          resolve(result);
        })
        .catch(error => {
          this.currentRequests--;
          reject(error);
        });
    }

    this.isProcessing = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 현재 Rate Limiter 상태 조회
   */
  getStatus() {
    return {
      currentRequests: this.currentRequests,
      queueLength: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      minDelayMs: this.minDelayMs
    };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(options) {
    if (options.maxConcurrent !== undefined) {
      this.maxConcurrent = options.maxConcurrent;
    }
    if (options.minDelayMs !== undefined) {
      this.minDelayMs = options.minDelayMs;
    }
  }
}

// Provider별 Rate Limiter 인스턴스
// Gemini API는 기본적으로 분당 15 RPM (무료) ~ 60 RPM (유료) 지원
// 성능 최적화를 위해 동시 요청 수와 딜레이 조정
const rateLimiters = {
  gemini: new RateLimiter({ maxConcurrent: 5, minDelayMs: 200 }),  // 3→5, 500→200
  openai: new RateLimiter({ maxConcurrent: 8, minDelayMs: 100 }),  // 5→8, 200→100
  azure: new RateLimiter({ maxConcurrent: 8, minDelayMs: 100 })    // 5→8, 200→100
};

/**
 * Rate Limiter 상태 조회
 * @returns {Object} 각 provider별 상태
 */
function getRateLimiterStatus() {
  return {
    gemini: rateLimiters.gemini.getStatus(),
    openai: rateLimiters.openai.getStatus(),
    azure: rateLimiters.azure.getStatus()
  };
}

/**
 * Rate Limiter 설정 업데이트
 * @param {string} provider - 'gemini' | 'openai' | 'azure'
 * @param {Object} options - { maxConcurrent, minDelayMs }
 */
function updateRateLimiterConfig(provider, options) {
  if (rateLimiters[provider]) {
    rateLimiters[provider].updateConfig(options);
  }
}

/**
 * LLM 호출 공통 함수 (Rate Limiter 적용)
 * @param {string} systemText - 시스템 프롬프트
 * @param {string} userText - 사용자 프롬프트
 * @param {Object} config - 설정 객체
 * @returns {Promise<string>} LLM 응답 텍스트
 */
async function callLLM(systemText, userText, config) {
  const provider = (config.PROVIDER || 'gemini').toLowerCase();

  // Rate Limiter 적용
  const limiter = rateLimiters[provider] || rateLimiters.gemini;

  return limiter.execute(async () => {
    if (provider === 'gemini') {
      return await callGemini(systemText, userText, config);
    } else if (provider === 'openai') {
      return await callOpenAI(systemText, userText, config);
    } else if (provider === 'azure') {
      return await callAzureOpenAI(systemText, userText, config);
    } else {
      throw new Error(`지원하지 않는 PROVIDER: ${provider}. 'gemini', 'openai', 또는 'azure'를 사용하세요.`);
    }
  });
}

/**
 * Rate Limiter 없이 직접 LLM 호출 (내부용 또는 단일 요청용)
 */
async function callLLMDirect(systemText, userText, config) {
  const provider = (config.PROVIDER || 'gemini').toLowerCase();

  if (provider === 'gemini') {
    return await callGemini(systemText, userText, config);
  } else if (provider === 'openai') {
    return await callOpenAI(systemText, userText, config);
  } else if (provider === 'azure') {
    return await callAzureOpenAI(systemText, userText, config);
  } else {
    throw new Error(`지원하지 않는 PROVIDER: ${provider}. 'gemini', 'openai', 또는 'azure'를 사용하세요.`);
  }
}

/**
 * Gemini API 호출
 */
async function callGemini(systemText, userText, config) {
  const apiKey = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  const modelId = config.GEMINI_MODEL || 'gemini-2.5-pro';
  // 다양한 출력을 위해 temperature를 높임
  const baseTemp = parseFloat(config.TEMP_BASE || '0.7');
  const temperature = Math.min(1.0, Math.max(0.5, baseTemp + (Math.random() - 0.5) * 0.2));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemText }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userText }]
      }
    ],
    generationConfig: {
      temperature: temperature,
      topP: 0.95,
      topK: 40
    }
  };

  const response = await httpRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  }, config);

  if (!response.candidates || !response.candidates[0]?.content?.parts?.[0]?.text) {
    throw new Error('Gemini 응답 형식이 예상과 다릅니다: ' + JSON.stringify(response).slice(0, 300));
  }

  return response.candidates[0].content.parts[0].text;
}

/**
 * OpenAI API 호출
 */
async function callOpenAI(systemText, userText, config) {
  const apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
  }

  const model = config.OPENAI_MODEL || 'gpt-4.1-mini';
  // 다양한 출력을 위해 temperature를 높임
  const baseTemp = parseFloat(config.TEMP_BASE || '0.7');
  const temperature = Math.min(1.0, Math.max(0.5, baseTemp + (Math.random() - 0.5) * 0.2));

  const url = 'https://api.openai.com/v1/chat/completions';

  const payload = {
    model: model,
    temperature: temperature,
    top_p: 0.95,
    frequency_penalty: 0.3,
    presence_penalty: 0.2,
    messages: [
      { role: 'system', content: systemText },
      { role: 'user', content: userText }
    ]
  };

  const response = await httpRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  }, config);

  if (!response.choices || !response.choices[0]?.message?.content) {
    throw new Error('OpenAI 응답 형식이 예상과 다릅니다: ' + JSON.stringify(response).slice(0, 300));
  }

  return response.choices[0].message.content;
}

/**
 * Azure OpenAI API 호출
 */
async function callAzureOpenAI(systemText, userText, config) {
  const endpoint = config.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = config.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
  const deployment = config.AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = config.AZURE_OPENAI_API_VERSION || process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';

  if (!endpoint) {
    throw new Error('AZURE_OPENAI_ENDPOINT가 설정되지 않았습니다.');
  }
  if (!apiKey) {
    throw new Error('AZURE_OPENAI_API_KEY가 설정되지 않았습니다.');
  }
  if (!deployment) {
    throw new Error('AZURE_OPENAI_DEPLOYMENT가 설정되지 않았습니다.');
  }

  // 다양한 출력을 위해 temperature를 높임 (기본 0.4 → 0.7)
  // 너무 낮은 temperature는 동일한 출력을 반복 생성함
  const baseTemp = parseFloat(config.TEMP_BASE || '0.7');
  // 약간의 랜덤성 추가 (±0.1 범위)
  const temperature = Math.min(1.0, Math.max(0.5, baseTemp + (Math.random() - 0.5) * 0.2));

  // Azure OpenAI URL 형식: {endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api-version}
  const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  const url = `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const payload = {
    temperature: temperature,
    // top_p를 추가하여 다양성 증가
    top_p: 0.95,
    // frequency_penalty로 반복 감소
    frequency_penalty: 0.3,
    // presence_penalty로 새로운 주제 유도
    presence_penalty: 0.2,
    messages: [
      { role: 'system', content: systemText },
      { role: 'user', content: userText }
    ]
  };

  const response = await httpRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(payload)
  }, config);

  if (!response.choices || !response.choices[0]?.message?.content) {
    throw new Error('Azure OpenAI 응답 형식이 예상과 다릅니다: ' + JSON.stringify(response).slice(0, 300));
  }

  return response.choices[0].message.content;
}

/**
 * HTTP 요청 유틸리티
 * @param {string} url - 요청 URL
 * @param {Object} options - 요청 옵션
 * @param {Object} config - 설정 (타임아웃 등)
 */
function httpRequest(url, options, config = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`JSON 파싱 오류: ${e.message}`));
        }
      });
    });

    req.on('error', reject);

    // 타임아웃: config에서 설정 가능, 기본값 180초 (긴 지문 생성 대응)
    const timeoutMs = parseInt(config?.TIMEOUT_MS) || 180000;
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`요청 시간 초과 (${timeoutMs / 1000}초)`));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

module.exports = {
  callLLM,
  callLLMDirect,
  callGemini,
  callOpenAI,
  callAzureOpenAI,
  getRateLimiterStatus,
  updateRateLimiterConfig
};
