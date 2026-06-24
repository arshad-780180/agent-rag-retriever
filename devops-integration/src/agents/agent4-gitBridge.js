--- a/devops-integration/src/agents/agent4-gitBridge.js
+++ b/devops-integration/src/agents/agent4-gitBridge.js
@@ -2,6 +2,8 @@
   return repoUrl.replace('https://', `https://${token}@`);
 }
 
+const GITHUB_API = 'https://api.github.com';
+
 async function openPullRequest({ owner, repo, token, head, base, title, body }) {
   const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
     method: 'POST',