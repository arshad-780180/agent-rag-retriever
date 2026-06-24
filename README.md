# DevOps Autonomous Incident Triage Pipeline

Welcome to the **DevOps Autonomous Incident Triage Pipeline**, built by our 5-member B.Tech CSE project team. This system automatically ingests error logs, extracts relevant code context using a Vector DB (RAG), generates LLM-powered code repairs, and automatically opens a GitHub Pull Request with the fix.

## Architecture & Team Contributions

Our pipeline consists of 4 isolated AI Agents, managed by a central Node.js orchestrator:

- **Agent 1: Log Parser (Member 3)**
  - Regex-based parser that extracts the file, line number, and error type from raw logs.
  - Implemented in Node.js (`devops-integration/src/agents/agent1-logParser.js`).

- **Agent 2: RAG Retriever (Member 1)**
  - Context engine that provides a 60-line code window around the error.
  - Uses ChromaDB for semantic search and local fallback for exact line numbers.
  - Implemented in Python FastAPI (`retriever.py`, `app.py`) running on `127.0.0.1:8000`.

- **Agent 3: Code Repair (Member 2)**
  - LLM-powered repair agent (Gemini) that generates minimal code patches and outputs strictly validated JSON diagnostics.
  - Implemented in Python FastAPI (`agent3_code_repair.py`) running on `127.0.0.1:8001`.

- **Agent 4: Git Bridge (Member 3)**
  - Fully automated GitHub integration that clones the repo, applies the patch, commits, pushes, and opens a Pull Request.
  - Implemented in Node.js (`devops-integration/src/agents/agent4-gitBridge.js`).

- **Frontend Dashboard (Member 4)**
  - React + Vite dashboard displaying the pipeline's real-time execution, incident history, and side-by-side patch diffs.
  - Implemented in React (`frontend/`) and connected via Server-Sent Events (SSE).

- **Core Orchestrator & QA Suite (Member 5)**
  - Ties the 4 Agents together, manages the execution state, and publishes to the SSE event bus.
  - Implemented in Node.js (`devops-integration/src/orchestrator.js`).
  - Dummy bug scripts and test runner available in `qa_dummy_bugs/` and `run_qa_tests.js`.

---

## 🚀 Setup & Execution Guide

To run the full pipeline, you need to start 4 separate processes.

### 1. Start Agent 2 (RAG Retriever)
This service indexes your codebase into ChromaDB and retrieves context.
\`\`\`bash
# Requirements: pip install fastapi uvicorn chromadb langchain_text_splitters pydantic
python app.py
\`\`\`
*Runs on http://127.0.0.1:8000*

### 2. Start Agent 3 (Code Repair)
This service uses Gemini to generate code patches.
**Note:** You must have `GEMINI_API_KEY` set in your environment variables.
\`\`\`bash
# Requirements: pip install fastapi uvicorn google-generativeai pydantic python-dotenv
python agent3_code_repair.py
\`\`\`
*Runs on http://127.0.0.1:8001*

### 3. Start the Orchestrator & Git Bridge Server
This is the core Node.js backend.
**Note:** To test the Git Bridge (Agent 4), you must create a `.env` file in `devops-integration/` containing:
\`\`\`
GITHUB_TOKEN=your_github_personal_access_token_with_repo_scope
\`\`\`
\`\`\`bash
cd devops-integration
npm install
npm run dev
\`\`\`
*Runs on http://localhost:4000*

### 4. Start the React Frontend Dashboard
This provides the real-time visual UI.
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
*Runs on http://localhost:5173*

---

## 🐞 Testing the Pipeline (QA Suite)

Once all 4 servers are running, you can test the entire autonomous pipeline by running the QA test suite.

This script sequentially submits three mocked incident logs (an infinite recursion bug, a Python out-of-bounds error, and a TypeScript undefined property error) into the pipeline.

\`\`\`bash
node run_qa_tests.js
\`\`\`

You can watch the frontend dashboard process each incident live, showing the parsed log, the retrieved context, the LLM diagnostics, and the final Pull Request URL!
