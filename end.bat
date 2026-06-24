@echo off
echo Stopping DevOps Pipeline Services by freeing their ports...

echo Stopping Frontend (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1

echo Stopping Orchestrator (Port 4000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000') do taskkill /F /PID %%a >nul 2>&1

echo Stopping Agent 2 RAG (Port 5000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do taskkill /F /PID %%a >nul 2>&1

echo Stopping Agent 3 Code Repair (Port 5001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5001') do taskkill /F /PID %%a >nul 2>&1

echo.
echo Attempting to close classic cmd windows (May not close Windows Terminal tabs)...
taskkill /FI "WINDOWTITLE eq Agent 2 RAG*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Agent 3 Code Repair*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Orchestrator*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend*" /T /F >nul 2>&1

echo.
echo All services have been forcefully stopped.
echo (If you are using Windows Terminal, you may need to close the tabs manually).
echo.
pause
