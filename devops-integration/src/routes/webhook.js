// ==========================================
// GitHub Webhook Listener
// ==========================================
// This is the "front door". GitHub calls this endpoint whenever an event
// we've subscribed to happens (e.g. a push, or a workflow_run failure).
//
// Flow:
//  1. GitHub POSTs here with the event payload + a signature header.
//  2. We verify the signature (proves it's really GitHub).
//  3. We check it's an event type we care about.
//  4. We pull out the useful bits (repo URL, commit SHA, log/error text)
//     and hand them to Agent 1 (the log parser) to extract structured info.
//  5. We log the result. Wiring this into Member 5's orchestrator.js
//     is the next step once that contract is agreed with the team.

const express = require('express');
const router = express.Router();
const { verifyGitHubSignature } = require('../utils/verifySignature');
const { parseLog } = require('../agents/agent1-logParser');
const { runTriagePipeline } = require('../orchestrator');
const path = require('path');

// We need the RAW body (not JSON-parsed) to verify GitHub's signature,
// so we use express.raw() here instead of express.json().
router.use(express.raw({ type: 'application/json', limit: '5mb' }));

router.post('/github', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  const isValid = verifyGitHubSignature(req.body, signature, secret);

  if (!isValid) {
    console.warn('[Webhook] Rejected request: invalid or missing signature.');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // req.body is a raw Buffer at this point (because of express.raw above),
  // so we parse it into JSON ourselves now that it's verified.
  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }

  console.log(`[Webhook] Received verified GitHub event: "${event}"`);

  // Respond to GitHub immediately - GitHub expects a fast 2xx response
  // and will retry/flag the webhook as failing if we're slow or hang.
  res.status(202).json({ received: true, event });

  // Handle the event asynchronously after responding.
  handleGitHubEvent(event, payload).catch((err) => {
    console.error('[Webhook] Error handling event:', err);
  });
});

const { Octokit } = require('octokit');

/**
 * Routes the verified GitHub event to the right handling logic.
 * For now we focus on 'workflow_run' (CI failures) and a generic
 * manual 'repository_dispatch' event we can trigger ourselves for testing.
 */
async function handleGitHubEvent(event, payload) {
  // Example: a GitHub Actions workflow finished (we care if it failed)
  if (event === 'workflow_run') {
    const conclusion = payload.workflow_run?.conclusion;
    if (conclusion !== 'failure') {
      console.log(`[Webhook] Workflow concluded with "${conclusion}", ignoring.`);
      return;
    }
    console.log('[Webhook] Detected a FAILED workflow run. Extracting details...');
    
    try {
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      
      const { data: jobsData } = await octokit.rest.actions.listJobsForWorkflowRun({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        run_id: payload.workflow_run.id
      });
      
      const failedJob = jobsData.jobs.find(j => j.conclusion === 'failure');
      if (!failedJob) {
        console.warn('[Webhook] Could not find a specific failed job for this run.');
        return;
      }
      
      const { data: logData } = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        job_id: failedJob.id
      });
      
      console.log(`[Webhook] Fetched logs for job ${failedJob.name}. Size: ${logData.length} bytes.`);
      
      const incidentId = `INC-${Date.now().toString().slice(-6)}`;
      
      runTriagePipeline({
        incidentId,
        rawLog: logData, // Pass the raw job log! Agent 1 will parse it!
        source: 'github-actions',
        repoPath: path.resolve(__dirname, '../../..'),
        repoUrl: payload.repository.clone_url || 'https://github.com/arshad-780180/agent-rag-retriever.git'
      });
    } catch (error) {
      console.error('[Webhook] Failed to fetch job logs from GitHub:', error.message);
    }
    return;
  }

  // Manual/test trigger: lets us simulate "a bug happened" without
  // needing a real failing CI run, by sending a custom payload.
  if (event === 'repository_dispatch' || payload.simulated) {
    const rawLog = payload.client_payload?.errorLog || payload.errorLog;
    if (!rawLog) {
      console.warn('[Webhook] No errorLog found in simulated payload.');
      return;
    }
    
    const incidentId = `INC-${Date.now().toString().slice(-6)}`;
    
    // Pass off to orchestrator
    runTriagePipeline({
      incidentId,
      rawLog,
      source: 'webhook',
      repoPath: path.resolve(__dirname, '../../..'),
      repoUrl: 'https://github.com/arshad-780180/agent-rag-retriever.git'
    });
    return;
  }

  console.log(`[Webhook] Event "${event}" received but no handler is wired up for it yet.`);
}

module.exports = router;
