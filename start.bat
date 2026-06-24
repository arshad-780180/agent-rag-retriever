@echo off
echo Starting DevOps Pipeline Services...

echo Starting Agent 2 (RAG Retriever)...
start "Agent 2 RAG" cmd /c "python app.py"

echo Starting Agent 3 (Code Repair)...
start "Agent 3 Code Repair" cmd /c "python agent3_code_repair.py"

echo Starting Orchestrator...
start "Orchestrator" cmd /c "cd devops-integration && npm run dev"

echo Starting Frontend Dashboard...
start "Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo All services are starting up in separate terminal windows!
echo Once they are ready, you can run 'node run_qa_tests.js' to simulate the errors.
echo.
pause
