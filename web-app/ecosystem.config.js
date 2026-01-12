/**
 * PM2 설정 파일
 * 서버를 백그라운드에서 실행하고 자동 재시작을 관리합니다.
 *
 * 사용법:
 *   npm install -g pm2          # PM2 전역 설치 (최초 1회)
 *   pm2 start ecosystem.config.js   # 서버 시작
 *   pm2 stop all                # 서버 중지
 *   pm2 restart all             # 서버 재시작
 *   pm2 logs                    # 로그 보기
 *   pm2 status                  # 상태 확인
 *   pm2 save                    # 현재 상태 저장
 *   pm2 startup                 # 시스템 시작 시 자동 실행 설정
 */

module.exports = {
  apps: [
    {
      name: 'csat-server',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
