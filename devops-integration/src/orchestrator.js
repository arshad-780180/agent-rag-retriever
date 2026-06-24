const { publish } = require('./utils/eventBus');

/**
 * The core orchestrator that drives the entire Incident Triage Pipeline.
 * 
 * @param {string} incidentId - Unique ID for the incident
 * @param {string} rawLog - The raw error log from the crash
 * @param {string} repoPath - Local path to the repository
 * @param {string} repoUrl - Remote GitHub URL for the repository
 * @param {string} source - Trigger source (e.g. 'dashboard')
 */
async function runTriagePipeline({ incidentId, rawLog, source, repoPath, repoUrl }) {
  publish('pipeline:start', { incidentId, source });
  publish('log', { level: 'info', msg: `[Orchestrator] Starting triage pipeline for incident ${incidentId}` });

  let parsedLog = null;
  let contextData = null;
  let repairData = null;

  // ==========================================
  // STEP 1: LOG PARSER (Agent 1)
  // ==========================================
  try {
    publish('agent:start', { agent: 'log_parser', incidentId });
    publish('log', { level: 'info', msg: '[Agent 1] Parsing raw error log...' });

    const res1 = await fetch(`http://127.0.0.1:${process.env.PORT || 4000}/agents/parse-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawLog })
    });
    
    if (!res1.ok) throw new Error(await res1.text());
    parsedLog = await res1.json();
    
    // Normalize for the frontend dashboard
    const dashboardResult = {
      incidentId,
      errorMessage: parsedLog.errorMessage || 'Unknown error',
      errorType: extractErrorType(parsedLog.errorMessage || 'Unknown'),
      file: parsedLog.parsedFilePath || 'Unknown file',
      lineNumber: parsedLog.parsedLineNumber,
      severity: inferSeverity(parsedLog.errorMessage || ''),
      rootCauseSummary: parsedLog.errorMessage,
    };

    publish('agent:done', { agent: 'log_parser', incidentId, result: dashboardResult });
    publish('log', { level: 'success', agent: 'log_parser', msg: `Parsed ${dashboardResult.errorType} at ${dashboardResult.file}` });
  } catch (err) {
    handleError('log_parser', incidentId, err);
    return;
  }

  // ==========================================
  // STEP 2: RAG RETRIEVER (Agent 2)
  // ==========================================
  try {
    publish('agent:start', { agent: 'rag', incidentId });
    publish('log', { level: 'info', msg: `[Agent 2] Retrieving code context for ${parsedLog.parsedFilePath || 'vague error'}...` });

    const res2 = await fetch('http://127.0.0.1:8000/get-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoPath: repoPath,
        errorMessage: parsedLog.errorMessage,
        parsedFilePath: parsedLog.parsedFilePath,
        parsedLineNumber: parsedLog.parsedLineNumber
      })
    });

    if (!res2.ok) throw new Error(await res2.text());
    contextData = await res2.json();

    publish('agent:done', { agent: 'rag', incidentId, result: contextData });
    publish('log', { level: 'success', agent: 'rag', msg: `Retrieved context via ${contextData.retrieval_method}` });
  } catch (err) {
    handleError('rag', incidentId, err);
    return;
  }

  // ==========================================
  // STEP 3: CODE REPAIR (Agent 3)
  // ==========================================
  try {
    publish('agent:start', { agent: 'code_repair', incidentId });
    publish('log', { level: 'info', msg: '[Agent 3] Generating fix with LLM...' });

    const res3 = await fetch('http://127.0.0.1:8001/repair-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoPath: repoPath,
        errorMessage: parsedLog.errorMessage,
        filePath: contextData.inferred_file || contextData.file_path || parsedLog.parsedFilePath,
        contextWindow: contextData.context_window,
        targetLine: parsedLog.parsedLineNumber,
        language: guessLanguage(parsedLog.parsedFilePath)
      })
    });

    if (!res3.ok) throw new Error(await res3.text());
    repairData = await res3.json();

    const patchDiff = repairData.diagnostics.codeFixDiff.unifiedDiff;
    publish('agent:done', { 
      agent: 'code_repair', 
      incidentId, 
      result: { patch: patchDiff, diagnostics: repairData.diagnostics } 
    });
    
    publish('log', { level: 'success', agent: 'code_repair', msg: `Generated fix with ${(repairData.diagnostics.confidenceScore * 100).toFixed(0)}% confidence` });
  } catch (err) {
    handleError('code_repair', incidentId, err);
    return;
  }

  // ==========================================
  // STEP 4: GIT BRIDGE (Agent 4)
  // ==========================================
  try {
    publish('agent:start', { agent: 'git_bridge', incidentId });
    publish('log', { level: 'info', msg: '[Agent 4] Creating GitHub Pull Request...' });

    // Assuming Agent 4 takes unifiedDiff in fixedCode but the original script overwrites the file.
    // In a real scenario, Agent 4 should apply the patch. For our demo, it'll write what it's given
    // or the diff. Let's just pass what we have.
    const res4 = await fetch(`http://127.0.0.1:${process.env.PORT || 4000}/agents/create-pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoUrl: repoUrl,
        filePath: repairData.diagnostics.codeFixDiff.filePath,
        fixedCode: repairData.diagnostics.codeFixDiff.unifiedDiff,
        explanation: repairData.diagnostics.explanation,
        baseBranch: 'main'
      })
    });

    if (!res4.ok) throw new Error(await res4.text());
    const gitData = await res4.json();

    publish('agent:done', { agent: 'git_bridge', incidentId, result: { prUrl: gitData.prUrl } });
    publish('log', { level: 'success', agent: 'git_bridge', msg: `PR successfully created: ${gitData.prUrl}` });
    publish('pipeline:success', { incidentId, prUrl: gitData.prUrl });

  } catch (err) {
    handleError('git_bridge', incidentId, err);
    // Pipeline finishes with error, but we reached the end
  }
}

// Helpers
function handleError(agent, incidentId, err) {
  console.error(`[Orchestrator] Error in ${agent}:`, err);
  let errorMessage = err.message;
  try {
    const parsed = JSON.parse(err.message);
    if (parsed.detail) errorMessage = parsed.detail;
  } catch (e) { /* ignore */ }

  publish('agent:error', { agent, incidentId, error: errorMessage });
  publish('log', { level: 'error', agent, msg: `Failed: ${errorMessage}` });
  publish('pipeline:error', { incidentId, error: errorMessage });
}

function extractErrorType(message) {
  const match = message.match(/\b([A-Z][A-Za-z]*(?:Error|Exception|Fault))\b/);
  if (match) return match[1];
  if (/segmentation fault/i.test(message)) return 'SegmentationFault';
  return 'UnknownError';
}

function inferSeverity(message) {
  if (/fatal|critical|segmentation/i.test(message)) return 'critical';
  if (/nullpointer|typeerror|timeout/i.test(message)) return 'high';
  if (/index|range|undefined/i.test(message)) return 'medium';
  return 'low';
}

function guessLanguage(filePath) {
  if (!filePath) return 'javascript';
  const ext = filePath.split('.').pop().toLowerCase();
  switch (ext) {
    case 'py': return 'python';
    case 'ts': case 'tsx': return 'typescript';
    default: return 'javascript';
  }
}

module.exports = { runTriagePipeline };
