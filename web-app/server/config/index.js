/**
 * server/config/index.js
 * 환경별 설정 관리
 */

const path = require('path');

// 기본 설정
const defaults = {
  // 서버 설정
  port: 3001,
  nodeEnv: 'development',

  // 데이터베이스
  database: {
    path: path.join(__dirname, '../../data/csat.db'),
    saveDebounceMs: 1000
  },

  // 세션 설정
  session: {
    secret: 'csat-secret-key-change-in-production',
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  },

  // CORS 설정
  cors: {
    origin: 'http://localhost:3000',
    credentials: true
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1분
    max: 200
  },

  // LLM 설정
  llm: {
    provider: 'gemini',
    geminiModel: 'gemini-2.5-pro',
    openaiModel: 'gpt-4.1-mini',
    tempBase: 0.4,
    maxRetry: 3
  },

  // 로깅
  logging: {
    level: 'INFO',
    logRequests: false
  }
};

// 개발 환경 설정
const development = {
  ...defaults,
  nodeEnv: 'development',
  logging: {
    ...defaults.logging,
    level: 'INFO',
    logRequests: true
  },
  cors: {
    ...defaults.cors,
    origin: 'http://localhost:3000'
  }
};

// 테스트 환경 설정
const test = {
  ...defaults,
  nodeEnv: 'test',
  database: {
    ...defaults.database,
    path: ':memory:'
  },
  logging: {
    ...defaults.logging,
    level: 'ERROR',
    logRequests: false
  }
};

// 프로덕션 환경 설정
const production = {
  ...defaults,
  nodeEnv: 'production',
  session: {
    ...defaults.session,
    secure: true
  },
  cors: {
    ...defaults.cors,
    origin: process.env.CLIENT_URL || true
  },
  rateLimit: {
    windowMs: 60 * 1000,
    max: 100 // 프로덕션에서는 더 엄격한 제한
  },
  logging: {
    ...defaults.logging,
    level: 'WARN',
    logRequests: false
  }
};

// 환경별 설정 맵
const configs = {
  development,
  test,
  production
};

// 현재 환경 설정 가져오기
function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  const baseConfig = configs[env] || configs.development;

  // 환경 변수로 오버라이드
  return {
    ...baseConfig,
    port: parseInt(process.env.PORT) || baseConfig.port,
    session: {
      ...baseConfig.session,
      secret: process.env.SESSION_SECRET || baseConfig.session.secret
    },
    llm: {
      ...baseConfig.llm,
      provider: process.env.PROVIDER || baseConfig.llm.provider,
      geminiModel: process.env.GEMINI_MODEL || baseConfig.llm.geminiModel,
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL || baseConfig.llm.openaiModel,
      openaiApiKey: process.env.OPENAI_API_KEY,
      azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
      azureApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureDeployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      azureApiVersion: process.env.AZURE_OPENAI_API_VERSION,
      tempBase: parseFloat(process.env.TEMP_BASE) || baseConfig.llm.tempBase,
      maxRetry: parseInt(process.env.MAX_RETRY) || baseConfig.llm.maxRetry
    },
    logging: {
      ...baseConfig.logging,
      level: process.env.LOG_LEVEL || baseConfig.logging.level,
      logRequests: process.env.LOG_REQUESTS === 'true'
    },
    auth: {
      apiAccessKey: process.env.API_ACCESS_KEY,
      adminPassword: process.env.ADMIN_PASSWORD,
      skipAuth: process.env.SKIP_AUTH === 'true'
    }
  };
}

// 설정 유효성 검사
function validateConfig(config) {
  const warnings = [];
  const errors = [];

  // 프로덕션에서 필수 검사
  if (config.nodeEnv === 'production') {
    if (config.session.secret === defaults.session.secret) {
      warnings.push('프로덕션 환경에서 기본 세션 시크릿을 사용 중입니다. SESSION_SECRET을 설정하세요.');
    }

    if (!config.llm.geminiApiKey && !config.llm.openaiApiKey && !config.llm.azureApiKey) {
      errors.push('LLM API 키가 설정되지 않았습니다.');
    }
  }

  // LLM 프로바이더 검사
  const provider = config.llm.provider;
  if (provider === 'gemini' && !config.llm.geminiApiKey) {
    warnings.push('Gemini 프로바이더가 선택되었지만 GEMINI_API_KEY가 설정되지 않았습니다.');
  }
  if (provider === 'openai' && !config.llm.openaiApiKey) {
    warnings.push('OpenAI 프로바이더가 선택되었지만 OPENAI_API_KEY가 설정되지 않았습니다.');
  }
  if (provider === 'azure' && (!config.llm.azureApiKey || !config.llm.azureEndpoint)) {
    warnings.push('Azure 프로바이더가 선택되었지만 Azure 설정이 완료되지 않았습니다.');
  }

  return { warnings, errors, valid: errors.length === 0 };
}

// 싱글톤 config 인스턴스
let configInstance = null;

function config() {
  if (!configInstance) {
    configInstance = getConfig();
  }
  return configInstance;
}

// 설정 리로드 (테스트용)
function reloadConfig() {
  configInstance = getConfig();
  return configInstance;
}

module.exports = {
  config,
  getConfig,
  reloadConfig,
  validateConfig,
  defaults
};
