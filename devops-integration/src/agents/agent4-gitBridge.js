// ==========================================
// AGENT 4: Git Bridge
// ==========================================
// Job: take a finished code fix (from Agent 3 / Member 2) and actually
// ship it as a real GitHub Pull Request, fully automated.
//
// Steps:
//   1. Clone the broken repo into a fresh temp folder
//   2. Create a new branch off the base branch (e.g. "main")
//   3. Write the fixed code into the target file
//   4. Commit the change
//   5. Push the branch to GitHub
//   6. Open a Pull Request via the GitHub REST API
//   7. Clean up the temp folder
//
// Auth: uses a GitHub Personal Access Token (GITHUB_TOKEN in .env) with
// "repo" scope. The token is embedded into the clone/push URL so git
// doesn't need an interactive login prompt.
//
// IMPORTANT: when generating the token at github.com/settings/tokens,
// make sure the "repo" checkbox is actually checked before generating -
// a token with no scopes will silently fail on push (403) while clone
// and read operations still work fine.

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const simpleGit = require('simple-git');

const GITHUB_API = 'https://api.github.com';

function parseOwnerRepo(repoUrl) {
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(\.git)?\/?$/);
  if (!match) {
    throw new Error(`Could not parse owner/repo from URL: ${repoUrl}`);
  }
  return { owner: match[1], repo: match[2] };
}

function buildAuthenticatedUrl(repoUrl, token) {
  return repoUrl.replace('https://', `https://${token}@`);
}

async function openPullRequest({ owner, repo, token, head, base, title, body }) {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ title, body, head, base }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `GitHub API error (${response.status}): ${data.message || 'Unknown error'}`
    );
  }

  return data;
}

async function createPullRequest({ repoUrl, filePath, fixedCode, explanation, baseBranch }) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is not set in .env. Generate one at github.com/settings/tokens with "repo" scope.');
  }

  const base = baseBranch || 'main';
  const { owner, repo } = parseOwnerRepo(repoUrl);
  const branchName = `fix/auto-patch-${Date.now()}`;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-bridge-'));
  const authenticatedUrl = buildAuthenticatedUrl(repoUrl, token);
  const git = simpleGit();

  try {
    console.log(`[Agent 4] Cloning ${owner}/${repo} into ${tempDir}...`);
    await git.clone(authenticatedUrl, tempDir, ['--depth', '1', '--branch', base]);

    const repoGit = simpleGit(tempDir);

    console.log(`[Agent 4] Creating branch "${branchName}"...`);
    await repoGit.checkoutLocalBranch(branchName);

    const targetPath = path.join(tempDir, filePath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    console.log(`[Agent 4] Writing fix to ${filePath}...`);
    await fs.writeFile(targetPath, fixedCode, 'utf8');

    await repoGit.add(filePath);
    await repoGit.commit(`fix: automated patch for ${filePath}\n\n${explanation}`);

    console.log(`[Agent 4] Pushing branch "${branchName}" to GitHub...`);
    await repoGit.push('origin', branchName, ['--set-upstream']);

    console.log('[Agent 4] Opening Pull Request...');
    const pr = await openPullRequest({
      owner,
      repo,
      token,
      head: branchName,
      base,
      title: `🤖 Automated fix: ${filePath}`,
      body: `## Automated Patch\n\n**File:** \`${filePath}\`\n\n**Explanation:**\n${explanation}\n\n---\n*This PR was opened automatically by the AI incident triage pipeline. Please review before merging.*`,
    });

    console.log(`[Agent 4] PR opened: ${pr.html_url}`);

    return {
      prUrl: pr.html_url,
      prNumber: pr.number,
      branchName,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch((err) => {
      console.warn(`[Agent 4] Warning: failed to clean up temp dir ${tempDir}:`, err.message);
    });
  }
}

module.exports = { createPullRequest };