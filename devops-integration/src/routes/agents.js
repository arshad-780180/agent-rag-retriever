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
