/**
 * server/middleware/apiVersion.js
 * API 버전 관리 미들웨어
 */

const CURRENT_VERSION = 'v1';
const SUPPORTED_VERSIONS = ['v1'];
const DEFAULT_VERSION = 'v1';

/**
 * API 버전 추출 미들웨어
 * URL 경로 또는 헤더에서 버전 정보 추출
 */
function extractApiVersion(req, res, next) {
  // 1. URL 경로에서 버전 추출 (/api/v1/...)
  const pathMatch = req.path.match(/^\/v(\d+)\//);
  if (pathMatch) {
    req.apiVersion = `v${pathMatch[1]}`;
    // 경로에서 버전 제거
    req.url = req.url.replace(/^\/v\d+/, '');
  }
  // 2. 헤더에서 버전 추출 (X-API-Version: v1)
  else if (req.headers['x-api-version']) {
    req.apiVersion = req.headers['x-api-version'];
  }
  // 3. Accept 헤더에서 버전 추출 (application/vnd.csat.v1+json)
  else if (req.headers['accept']) {
    const acceptMatch = req.headers['accept'].match(/application\/vnd\.csat\.(v\d+)\+json/);
    if (acceptMatch) {
      req.apiVersion = acceptMatch[1];
    }
  }
  // 4. 기본 버전 사용
  else {
    req.apiVersion = DEFAULT_VERSION;
  }

  // 지원되는 버전인지 확인
  if (!SUPPORTED_VERSIONS.includes(req.apiVersion)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_API_VERSION',
        message: `지원되지 않는 API 버전입니다: ${req.apiVersion}`,
        supportedVersions: SUPPORTED_VERSIONS
      }
    });
  }

  // 응답 헤더에 버전 정보 추가
  res.setHeader('X-API-Version', req.apiVersion);

  next();
}

/**
 * 특정 버전에서만 사용 가능한 엔드포인트 제한
 */
function requireVersion(minVersion) {
  return (req, res, next) => {
    const currentNum = parseInt(req.apiVersion.replace('v', ''));
    const minNum = parseInt(minVersion.replace('v', ''));

    if (currentNum < minNum) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VERSION_TOO_LOW',
          message: `이 엔드포인트는 ${minVersion} 이상에서만 사용 가능합니다.`,
          requiredVersion: minVersion,
          currentVersion: req.apiVersion
        }
      });
    }

    next();
  };
}

/**
 * 버전별 응답 변환
 * 향후 버전간 호환성 유지를 위한 응답 변환 레이어
 */
function transformResponse(transformers) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (data) => {
      const version = req.apiVersion || DEFAULT_VERSION;
      const transformer = transformers[version];

      if (transformer && typeof transformer === 'function') {
        data = transformer(data);
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * API 정보 반환
 */
function getApiInfo() {
  return {
    currentVersion: CURRENT_VERSION,
    supportedVersions: SUPPORTED_VERSIONS,
    defaultVersion: DEFAULT_VERSION,
    deprecatedVersions: []
  };
}

module.exports = {
  CURRENT_VERSION,
  SUPPORTED_VERSIONS,
  DEFAULT_VERSION,
  extractApiVersion,
  requireVersion,
  transformResponse,
  getApiInfo
};
