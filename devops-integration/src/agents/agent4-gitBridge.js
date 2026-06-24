--- a/devops-integration/src/agents/agent4-gitBridge.js
+++ b/devops-integration/src/agents/agent4-gitBridge.js
@@ -1,3 +1,4 @@
+const GITHUB_API = 'https://api.github.com';
 function buildAuthenticatedUrl(repoUrl, token) {
   return repoUrl.replace('https://', `https://${token}@`);
 }
