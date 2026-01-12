@echo off
echo ========================================
echo   CSAT Item Generator - Full Start
echo   (Server + Client)
echo ========================================
echo.

cd /d "%~dp0"

:: Start server in background
start "CSAT Server" cmd /k "node server/index.js"

:: Wait for server to start
timeout /t 3 /nobreak >nul

:: Start client
echo Starting React client...
cd client
start "CSAT Client" cmd /k "npm start"

echo.
echo ========================================
echo   Both server and client are starting!
echo ========================================
echo   Server: http://localhost:3001
echo   Client: http://localhost:3000
echo ========================================
echo.
echo Press any key to exit this window...
pause >nul
