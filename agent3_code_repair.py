import json
import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ValidationError, validator


try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None


if load_dotenv:
    load_dotenv()


app = FastAPI(
    title="Agent 3: Code Repair API",
    description="LLM-powered repair agent that returns validated JSON diagnostics and code patches.",
)

DB_PATH = os.getenv("AGENT3_DB_PATH", "agent3_repairs.db")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL_NAME = os.getenv("AGENT3_MODEL", "gemini-1.5-flash")


PRINCIPAL_SRE_SYSTEM_PROMPT = """
You are Agent 3, a Principal Site Reliability Engineer and senior code repair expert.
You inspect exception logs, retrieved code context, and file metadata to identify the most likely root cause.

You must:
1. Return only valid JSON that matches the required schema.
2. Produce a minimal, safe code fix as a unified diff.
3. Include a clear technical explanation.
4. Include a numerical confidence score between 0 and 1.
5. Avoid broad refactors unless they are required to fix the failure.
6. Do not invent files, APIs, tests, packages, or repository facts.
7. If evidence is incomplete, say so in the explanation and lower the confidence score.
""".strip()


class RepairRequest(BaseModel):
    repoPath: str = Field(..., description="Path to the target repository.")
    errorMessage: str = Field(..., min_length=1, description="Raw exception, crash, build, or test failure log.")
    filePath: str = Field(..., min_length=1, description="Relative path to the file that needs repair.")
    contextWindow: str = Field(..., min_length=1, description="Relevant code context retrieved by Agent 2.")
    targetLine: Optional[int] = Field(None, ge=1, description="Line number related to the error, if known.")
    language: Optional[str] = Field(None, description="Programming language, if known.")


class CodePatch(BaseModel):
    filePath: str = Field(..., min_length=1)
    unifiedDiff: str = Field(..., min_length=1)

    @validator("unifiedDiff")
    def diff_must_look_like_unified_diff(cls, value: str) -> str:
        if "--- " not in value or "+++ " not in value or "@@" not in value:
            raise ValueError("unifiedDiff must be a unified diff containing --- , +++ , and @@ markers")
        return value


class RepairDiagnostics(BaseModel):
    rootCause: str = Field(..., min_length=1)
    explanation: str = Field(..., min_length=1)
    confidenceScore: float = Field(..., ge=0.0, le=1.0)
    codeFixDiff: CodePatch
    testsToRun: List[str] = Field(default_factory=list)

    @validator("testsToRun")
    def tests_must_be_strings(cls, value: List[str]) -> List[str]:
        if not all(isinstance(item, str) and item.strip() for item in value):
            raise ValueError("testsToRun must contain non-empty strings")
        return value


class RepairResponse(BaseModel):
    status: Literal["success", "fallback"]
    diagnostics: RepairDiagnostics
    savedRecordId: Optional[int] = None


class Agent3CodeRepair:
    def __init__(self) -> None:
        self._ensure_database()

    def repair(self, payload: RepairRequest) -> RepairResponse:
        self._validate_target_file(payload)

        try:
            raw_model_text = self._call_model(payload)
            diagnostics = self._parse_and_validate_json(raw_model_text, payload.filePath)
            status = "success"
        except Exception as exc:
            diagnostics = self._fallback_diagnostics(payload, str(exc))
            status = "fallback"

        record_id = self._save_repair(payload, diagnostics, status)
        return RepairResponse(status=status, diagnostics=diagnostics, savedRecordId=record_id)

    def _call_model(self, payload: RepairRequest) -> str:
        if genai is None:
            raise RuntimeError("google-generativeai is not installed. Install it with: pip install google-generativeai")
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is not set in the environment.")

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL_NAME,
            system_instruction=PRINCIPAL_SRE_SYSTEM_PROMPT,
        )

        prompt = self._build_prompt(payload)
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.1,
                "top_p": 0.8,
                "response_mime_type": "application/json",
            },
        )

        if not getattr(response, "text", None):
            raise RuntimeError("Model returned an empty response.")
        return response.text

    def _build_prompt(self, payload: RepairRequest) -> str:
        schema = RepairDiagnostics.schema()
        return json.dumps(
            {
                "instruction": "Analyze the failure and return JSON only.",
                "required_json_schema": schema,
                "repository_path": payload.repoPath,
                "file_path": payload.filePath,
                "target_line": payload.targetLine,
                "language": payload.language,
                "exception_or_error_log": payload.errorMessage,
                "retrieved_code_context": payload.contextWindow,
                "required_output": {
                    "rootCause": "string",
                    "explanation": "string",
                    "confidenceScore": "number between 0 and 1",
                    "codeFixDiff": {
                        "filePath": payload.filePath,
                        "unifiedDiff": "unified diff string",
                    },
                    "testsToRun": ["string"],
                },
            },
            indent=2,
        )

    def _parse_and_validate_json(self, raw_text: str, expected_file_path: str) -> RepairDiagnostics:
        try:
            parsed = json.loads(raw_text)
            diagnostics = RepairDiagnostics.parse_obj(parsed)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Model did not return valid JSON: {exc}") from exc
        except ValidationError as exc:
            raise RuntimeError(f"Model JSON failed schema validation: {exc}") from exc

        if diagnostics.codeFixDiff.filePath != expected_file_path:
            raise RuntimeError(
                f"Patch targeted '{diagnostics.codeFixDiff.filePath}' but expected '{expected_file_path}'."
            )

        return diagnostics

    def _fallback_diagnostics(self, payload: RepairRequest, error: str) -> RepairDiagnostics:
        safe_diff = (
            f"--- a/{payload.filePath}\n"
            f"+++ b/{payload.filePath}\n"
            "@@\n"
            "# No automatic patch was generated because the LLM request failed.\n"
        )
        return RepairDiagnostics(
            rootCause="Unable to determine root cause automatically.",
            explanation=(
                "Agent 3 could not complete the LLM repair request. "
                f"Fallback was used so the pipeline can continue gracefully. Error: {error}"
            ),
            confidenceScore=0.0,
            codeFixDiff=CodePatch(filePath=payload.filePath, unifiedDiff=safe_diff),
            testsToRun=[],
        )

    def _validate_target_file(self, payload: RepairRequest) -> None:
        if not os.path.isdir(payload.repoPath):
            raise HTTPException(status_code=400, detail=f"Repository path does not exist: {payload.repoPath}")

        target_path = os.path.abspath(os.path.join(payload.repoPath, payload.filePath))
        repo_root = os.path.abspath(payload.repoPath)
        if not target_path.startswith(repo_root):
            raise HTTPException(status_code=400, detail="filePath must stay inside repoPath.")
        if not os.path.isfile(target_path):
            raise HTTPException(status_code=400, detail=f"Target file does not exist: {payload.filePath}")

    def _ensure_database(self) -> None:
        with sqlite3.connect(DB_PATH) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS code_repairs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    repo_path TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    error_message TEXT NOT NULL,
                    diagnostics_json TEXT NOT NULL,
                    patch_diff TEXT NOT NULL
                )
                """
            )

    def _save_repair(self, payload: RepairRequest, diagnostics: RepairDiagnostics, status: str) -> int:
        diagnostics_json = json.dumps(diagnostics.dict(), indent=2)
        with sqlite3.connect(DB_PATH) as connection:
            cursor = connection.execute(
                """
                INSERT INTO code_repairs (
                    created_at, status, repo_path, file_path, error_message, diagnostics_json, patch_diff
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    datetime.utcnow().isoformat(),
                    status,
                    payload.repoPath,
                    payload.filePath,
                    payload.errorMessage,
                    diagnostics_json,
                    diagnostics.codeFixDiff.unifiedDiff,
                ),
            )
            return int(cursor.lastrowid)


@app.post("/repair-code", response_model=RepairResponse)
def repair_code(payload: RepairRequest) -> RepairResponse:
    return Agent3CodeRepair().repair(payload)


@app.get("/repair-history")
def repair_history(limit: int = 10) -> Dict[str, Any]:
    safe_limit = max(1, min(limit, 50))
    with sqlite3.connect(DB_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT id, created_at, status, repo_path, file_path, error_message, diagnostics_json, patch_diff
            FROM code_repairs
            ORDER BY id DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()

    return {"records": [dict(row) for row in rows]}


if __name__ == "__main__":
    print("[Agent 3] Launching Code Repair API on http://127.0.0.1:8001...")
    uvicorn.run(app, host="127.0.0.1", port=8001)
