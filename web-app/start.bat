@echo off
echo ========================================
echo   CSAT Item Generator - Server Start
echo ========================================
echo.

cd /d "%~dp0"

:: Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js가 설치되어 있지 않습니다.
    pause
    exit /b 1
)

:: Check if PM2 is installed
where pm2 >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] PM2가 설치되어 있지 않습니다. 일반 모드로 시작합니다.
    echo [INFO] PM2 설치: npm install -g pm2
    echo.
    echo Starting server...
    node server/index.js
) else (
    echo [INFO] PM2로 서버를 시작합니다.
    pm2 start ecosystem.config.js
    echo.
    echo [INFO] 서버가 백그라운드에서 실행 중입니다.
    echo [INFO] 상태 확인: pm2 status
    echo [INFO] 로그 보기: pm2 logs
    echo [INFO] 서버 중지: pm2 stop all
)

echo.
echo Server URL: http://localhost:3001
echo Client URL: http://localhost:3000 (별도 실행 필요)
echo.
pause
