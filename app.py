import os
import chromadb
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter
import uvicorn

app = FastAPI(
    title="Agent 2: RAG Retriever API",
    description="Context engine providing 60-line code windows via local fallback or Vector DB semantic search."
)

# Initialize a persistent local Vector DB storage
CHROMA_DB_DIR = "./chroma_db_storage"
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

# ==========================================
# CORE RAG & FALLBACK LOGIC
# ==========================================
class ContextEngine:
    @staticmethod
    def index_repository(repo_path: str):
        """Scans and indexes/re-indexes a specific target repository path."""
        print(f"[Agent 2] Dynamic Indexing triggered for: {repo_path}")
        
        # Reset/Clean collection for the new repo run to prevent cross-project pollution
        try:
            chroma_client.delete_collection(name="active_codebase")
        except Exception:
            pass # Collection didn't exist yet, safe to skip
            
        collection = chroma_client.create_collection(name="active_codebase")
        
        # Code-aware splitter targeting common web languages
        splitter = RecursiveCharacterTextSplitter.from_language(
            language=Language.JS, chunk_size=1200, chunk_overlap=200
        )

        chunks_indexed = 0
        for root, dirs, files in os.walk(repo_path):
            # Prune operational and hidden directories in-place so os.walk skips them
            dirs[:] = [d for d in dirs if d not in [".git", "node_modules", "chroma_db_storage", "dist", ".next", "__pycache__"]]
                
            for file in files:
                if file.endswith(('.js', '.jsx', '.ts', '.tsx', '.py', '.json')):
                    full_path = os.path.join(root, file)
                    relative_path = os.path.relpath(full_path, repo_path)
                    
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        chunks = splitter.split_text(content)
                        for idx, chunk in enumerate(chunks):
                            collection.upsert(
                                documents=[chunk],
                                metadatas=[{"file_path": relative_path}],
                                ids=[f"{relative_path}_chunk_{idx}"]
                            )
                            chunks_indexed += 1
                    except Exception as e:
                        print(f"[Agent 2 Warning] Skipping file {file}: {e}")
                        
        print(f"[Agent 2] Indexing complete! Cached {chunks_indexed} code segments.")
        return collection

    @staticmethod
    def extract_local_lines(repo_path: str, relative_file_path: str, line_number: int, window: int = 30) -> dict:
        """Safely extracts 30 lines above and below the error line from local file system."""
        full_path = os.path.join(repo_path, relative_file_path)
        
        if not os.path.exists(full_path):
            return {"status": "error", "message": f"File not found at: {full_path}"}
            
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            total_lines = len(lines)
            target_idx = line_number - 1 # Convert to 0-indexed array
            
            # Boundary protections
            start_idx = max(0, target_idx - window)
            end_idx = min(total_lines, target_idx + window + 1)
            
            sliced_code = "".join(lines[start_idx:end_idx])
            
            return {
                "status": "success",
                "retrieval_method": "local_fallback",
                "file_path": relative_file_path,
                "target_line": line_number,
                "context_window": sliced_code
            }
        except Exception as e:
            return {"status": "error", "message": f"Read error: {str(e)}"}

    @staticmethod
    def query_vector_db(query_text: str) -> dict:
        """Queries the active codebase collection using semantic similarity."""
        try:
            collection = chroma_client.get_collection(name="active_codebase")
            results = collection.query(query_texts=[query_text], n_results=1)
            
            if results['documents'] and results['documents'][0]:
                return {
                    "status": "success",
                    "retrieval_method": "vector_db",
                    "inferred_file": results['metadatas'][0][0]['file_path'],
                    "context_window": results['documents'][0][0]
                }
        except Exception:
            return {"status": "error", "message": "Vector DB index missing or uninitialized."}
            
        return {"status": "error", "message": "No relevant matching code context found."}


# ==========================================
# API DATA CONTRACTS (Pydantic Models)
# ==========================================
class ContextRequest(BaseModel):
    repoPath: str                           # Where Member 3 cloned the code
    errorMessage: str                        # The raw crash string
    parsedFilePath: Optional[str] = None     # Extracted by Member 3's regex tool
    parsedLineNumber: Optional[int] = None   # Extracted by Member 3's regex tool


# ==========================================
# API ENDPOINTS
# ==========================================
@app.post("/get-context")
def resolve_context(payload: ContextRequest):
    # Ensure the target directory exists
    if not os.path.exists(payload.repoPath):
        raise HTTPException(status_code=400, detail=f"Target repository path '{payload.repoPath}' does not exist.")

    # Strategy 1: Local Fallback Route (Fast & Precise)
    if payload.parsedFilePath and payload.parsedLineNumber:
        result = ContextEngine.extract_local_lines(
            repo_path=payload.repoPath,
            relative_file_path=payload.parsedFilePath,
            line_number=payload.parsedLineNumber
        )
        if result["status"] == "success":
            return result

    # Strategy 2: Vector DB Route (If log analysis was vague or local file path failed)
    # Step A: Re-index the codebase to make sure we're reading current, live data
    ContextEngine.index_repository(payload.repoPath)
    
    # Step B: Perform semantic search matching the error log
    result = ContextEngine.query_vector_db(payload.errorMessage)
    
    if result["status"] == "success":
        return result
        
    raise HTTPException(status_code=404, detail=result["message"])


# ==========================================
# FORCE API BOOTSTRAP (No conditions)
# ==========================================
print("[Agent 2] Launching Uvicorn Server on http://127.0.0.1:8000...")
uvicorn.run(app, host="127.0.0.1", port=8000)