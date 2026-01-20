/**
 * server/routes/docs.js
 * API 문서 라우트
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// OpenAPI 스펙 반환
router.get('/openapi.json', (req, res) => {
  const specPath = path.join(__dirname, '../docs/openapi.json');

  try {
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

    // 동적으로 서버 URL 업데이트
    const host = req.get('host');
    const protocol = req.protocol;
    spec.servers = [
      {
        url: `${protocol}://${host}/api`,
        description: 'Current server'
      }
    ];

    res.json(spec);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SPEC_NOT_FOUND',
        message: 'OpenAPI specification not found'
      }
    });
  }
});

// Swagger UI HTML 페이지
router.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSAT API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { font-size: 2em; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout'
      });
    };
  </script>
</body>
</html>
  `;

  res.type('html').send(html);
});

module.exports = router;
