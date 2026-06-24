@echo off
echo ==============================================
echo Installing Python Dependencies...
echo ==============================================
pip install fastapi uvicorn chromadb langchain_text_splitters pydantic google-generativeai python-dotenv

echo.
echo ==============================================
echo Installing Node.js Dependencies for Orchestrator...
echo ==============================================
cd devops-integration
call npm install
cd ..

echo.
echo ==============================================
echo Installing Node.js Dependencies for Frontend...
echo ==============================================
cd frontend
call npm install
cd ..

echo.
echo ==============================================
echo All dependencies installed successfully!
echo You can now run start.bat
echo ==============================================
pause
