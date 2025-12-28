/**
 * server/services/llmClient.js
 * LLM API 클라이언트 (Gemini / OpenAI 지원)
 */

const https = require('https');
const http = require('http');

/**
 * LLM 호출 공통 함수
 * @param {string} systemText - 시스템 프롬프트
 * @param {string} userText - 사용자 프롬프트
 * @param {Object} config - 설정 객체
 * @returns {Promise<string>} LLM 응답 텍스트
 */
async function callLLM(systemText, userText, config) {
  const provider = (config.PROVIDER || 'gemini').toLowerCase();

  if (provider === 'gemini') {
    return await callGemini(systemText, userText, config);
  } else if (provider === 'openai') {
    return await callOpenAI(systemText, userText, config);
  } else {
    throw new Error(`지원하지 않는 PROVIDER: ${provider}. 'gemini' 또는 'openai'를 사용하세요.`);
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
  const temperature = parseFloat(config.TEMP_BASE || '0.4');

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
      temperature: temperature
    }
  };

  const response = await httpRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

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
  const temperature = parseFloat(config.TEMP_BASE || '0.4');

  const url = 'https://api.openai.com/v1/chat/completions';

  const payload = {
    model: model,
    temperature: temperature,
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
  });

  if (!response.choices || !response.choices[0]?.message?.content) {
    throw new Error('OpenAI 응답 형식이 예상과 다릅니다: ' + JSON.stringify(response).slice(0, 300));
  }

  return response.choices[0].message.content;
}

/**
 * HTTP 요청 유틸리티
 */
function httpRequest(url, options) {
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
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('요청 시간 초과'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

module.exports = {
  callLLM,
  callGemini,
  callOpenAI
};
