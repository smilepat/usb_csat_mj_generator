@echo off
echo ============================================
echo  수능 문항 생성-검증 시스템 시작
echo  KSAT Item Generator & Validator
echo ============================================
echo.

cd web-app

echo [1/2] 서버 시작 중 (자동 재시작 활성화)...
start "CSAT-Server" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] 클라이언트 시작 중 (http://localhost:3000)...
cd client
start "CSAT-Client" cmd /k "npm start"

echo.
echo ============================================
echo  시스템이 시작되었습니다!
echo  프론트엔드: http://localhost:3000
echo  백엔드 API: http://localhost:3001
echo.
echo  백엔드는 nodemon으로 실행됩니다.
echo  코드 변경 시 자동으로 재시작됩니다.
echo ============================================
echo.
echo 종료하려면 각 창을 닫거나 stop.bat을 실행하세요.
pause
