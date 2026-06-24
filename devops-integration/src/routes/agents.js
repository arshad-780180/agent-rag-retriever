// ==========================================
// Agent Routes (called by Member 5's orchestrator.js)
// ==========================================

const express = require('express');
const router = express.Router();
const { parseLog } = require('../agents/agent1-logParser');
const { createPullRequest } = require('../agents/agent4-gitBridge');
const { runTriagePipeline } = require('../orchestrator');
const path = require('path');
const fs = require('fs');
const simpleGit = require('simple-git');

// ------------------------------------------
// AGENT 1: POST /agents/parse-log
// ------------------------------------------
router.post('/parse-log', (req, res) => {
  const { rawLog } = req.body;

  if (!rawLog) {
    return res.status(400).json({ error: 'Missing "rawLog" field in request body.' });
  }

  const result = parseLog(rawLog);
  res.json(result);
});

// ------------------------------------------
// DASHBOARD: POST /agents/trigger-git-push
// ------------------------------------------
router.post('/trigger-git-push', async (req, res) => {
  const { targetFile } = req.body;

  if (!targetFile || typeof targetFile !== 'string') {
    return res.status(400).json({ error: 'Missing "targetFile" field in request body.' });
  }

  const repoPath = path.resolve(__dirname, '../../..');
  const git = simpleGit(repoPath);

  try {
    // 1. Write the target to ci_target.txt
    const targetFilePath = path.join(repoPath, 'ci_target.txt');
    fs.writeFileSync(targetFilePath, targetFile);

    // 2. Touch the file to ensure a diff
    const absoluteTargetFile = path.join(repoPath, targetFile);
    if (fs.existsSync(absoluteTargetFile)) {
      fs.appendFileSync(absoluteTargetFile, `\n// Triggering CI failure ${Date.now()}\n`);
    } else {
      return res.status(404).json({ error: `Target file not found: ${targetFile}` });
    }

    // 3. Commit and push
    await git.add(['ci_target.txt', targetFile]);
    await git.commit(`Automated CI trigger for ${targetFile}`);
    await git.push('origin', 'main');

    res.status(202).json({ queued: true, message: `Pushed broken code for ${targetFile}` });
  } catch (error) {
    console.error('Error triggering git push:', error);
    res.status(500).json({ error: 'Failed to push commit', details: error.message });
  }
});

// ------------------------------------------
// AGENT 4: POST /agents/create-pr
// ------------------------------------------
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
