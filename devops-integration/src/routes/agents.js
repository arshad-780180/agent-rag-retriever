// ==========================================
// Agent Routes (called by Member 5's orchestrator.js)
// ==========================================
// These are the two "buttons" the orchestrator can press:
//   POST /agents/parse-log  -> runs Agent 1
//   POST /agents/create-pr  -> runs Agent 4
//
// Keeping these as plain HTTP endpoints (matching Member 1's microservice
// pattern) means our code stays independently runnable and testable,
// regardless of what language/framework orchestrator.js ends up using.

const express = require('express');
const router = express.Router();
const { parseLog } = require('../agents/agent1-logParser');
const { createPullRequest } = require('../agents/agent4-gitBridge');
const { publish } = require('../utils/eventBus');

// ------------------------------------------
// AGENT 1: POST /agents/parse-log
// ------------------------------------------
// Request body:  { "rawLog": "...the messy error log/stack trace..." }
// Response body: { "errorMessage": "...", "parsedFilePath": "...", "parsedLineNumber": 45 }
router.post('/parse-log', (req, res) => {
  const { rawLog } = req.body;

  if (!rawLog) {
    return res.status(400).json({ error: 'Missing "rawLog" field in request body.' });
  }

  const result = parseLog(rawLog);
  res.json(result);
});

// ------------------------------------------
// DASHBOARD: POST /agents/trigger-incident
// ------------------------------------------
// Request body:  { "rawLog": "...the messy error log/stack trace..." }
// This drives the frontend through the real SSE channel. This repo currently
// contains Agent 1 and Agent 4; the full orchestrator is expected to publish
// later Agent 2/3/5 events when those services are wired in.
router.post('/trigger-incident', (req, res) => {
  const { rawLog, source = 'dashboard' } = req.body;

  if (!rawLog || typeof rawLog !== 'string' || !rawLog.trim()) {
    return res.status(400).json({ error: 'Missing "rawLog" field in request body.' });
  }

  const incidentId = `INC-${Date.now().toString().slice(-6)}`;
  res.status(202).json({ queued: true, incidentId });

  runDashboardTriage({ incidentId, rawLog, source });
});

// ------------------------------------------
// AGENT 4: POST /agents/create-pr
// ------------------------------------------
// Request body:
// {
//   "repoUrl": "https://github.com/owner/repo.git",
//   "filePath": "src/utils/auth.js",
//   "originalCode": "...",      (optional, for diff context)
//   "fixedCode": "...the full new file content, or a patch...",
//   "explanation": "Fixed null check causing infinite recursion",
//   "baseBranch": "main"          (optional, defaults to "main")
// }
router.post('/create-pr', async (req, res) => {
  const { repoUrl, filePath, fixedCode, explanation, baseBranch } = req.body;

  if (!repoUrl || !filePath || !fixedCode) {
    return res.status(400).json({
      error: 'Missing required fields. Need: repoUrl, filePath, fixedCode.',
    });
  }

  try {
    const result = await createPullRequest({
      repoUrl,
      filePath,
      fixedCode,
      explanation: explanation || 'Automated fix from AI pipeline',
      baseBranch: baseBranch || 'main',
    });
    res.json(result);
  } catch (err) {
    console.error('[Agent 4] Failed to create PR:', err);
    res.status(500).json({ error: 'Failed to create pull request', details: err.message });
  }
});

module.exports = router;

function runDashboardTriage({ incidentId, rawLog, source }) {
  publish('pipeline:start', { incidentId, source });
  publish('log', { level: 'info', msg: 'Incident trigger received by Member 3 integration service.' });

  publish('agent:start', { agent: 'log_parser', incidentId });

  try {
    const parsed = parseLog(rawLog);
    const dashboardResult = normalizeParsedLog(parsed, incidentId);

    publish('agent:done', {
      agent: 'log_parser',
      incidentId,
      result: dashboardResult,
    });

    publish('log', {
      level: 'success',
      agent: 'log_parser',
      msg: `Parsed ${dashboardResult.errorType} at ${dashboardResult.file || 'unknown file'}.`,
    });

    publish('log', {
      level: 'warn',
      msg: 'Agent 2/3/5 orchestration is not wired in this repo yet. Waiting for the real orchestrator to continue.',
    });

    publish('pipeline:waiting', {
      incidentId,
      reason: 'orchestrator_not_connected',
      parsedError: dashboardResult,
    });
  } catch (err) {
    publish('agent:error', {
      agent: 'log_parser',
      incidentId,
      error: err.message,
    });
    publish('pipeline:error', {
      incidentId,
      error: err.message,
    });
  }
}

function normalizeParsedLog(parsed, incidentId) {
  const message = parsed.errorMessage || 'Unknown error';
  return {
    incidentId,
    errorMessage: message,
    errorType: extractErrorType(message),
    file: parsed.parsedFilePath || 'Unknown file',
    lineNumber: parsed.parsedLineNumber,
    severity: inferSeverity(message),
    rootCauseSummary: message,
  };
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
