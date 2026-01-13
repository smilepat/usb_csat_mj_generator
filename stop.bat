@echo off
echo ============================================
echo  수능 문항 생성-검증 시스템 종료
echo ============================================
echo.

echo 포트 3001(서버) 프로세스 종료 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    taskkill /F /PID %%a 2>nul
)

echo 포트 3000(클라이언트) 프로세스 종료 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo ============================================
echo  시스템이 종료되었습니다.
echo ============================================
pause
