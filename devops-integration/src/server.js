// ==========================================
// MEMBER 3: Express Server (Entry Point)
// ==========================================
// This is the "always on" process. It starts the server, mounts our
// routes, and listens for incoming requests (from GitHub, or from
// Member 5's orchestrator.js).

require('dotenv').config();
const express = require('express');
const webhookRouter = require('./routes/webhook');
const agentsRouter = require('./routes/agents');
const eventsRouter = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 4000;

// IMPORTANT: GitHub signs the raw request body, so for the webhook route
// we need the *raw* bytes (not pre-parsed JSON) to verify the signature.
// We handle that specially inside routes/webhook.js using express.raw().
// For everything else, normal JSON parsing is fine.
app.use('/webhook', webhookRouter); // raw body parsing happens inside this router
app.use('/agents', express.json({ limit: '2mb' }), agentsRouter); // normal JSON parsing
app.use('/events', eventsRouter);

// Simple health check - useful to confirm the server is alive
// (and to give ngrok/GitHub something to ping)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'member3-devops-integration', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Server] Member 3 service running on http://localhost:${PORT}`);
  console.log(`[Server] Webhook endpoint:        POST http://localhost:${PORT}/webhook/github`);
  console.log(`[Server] Agent 1 (parse-log):     POST http://localhost:${PORT}/agents/parse-log`);
  console.log(`[Server] Dashboard SSE:           GET  http://localhost:${PORT}/events`);
  console.log(`[Server] Dashboard trigger:       POST http://localhost:${PORT}/agents/trigger-incident`);
  console.log(`[Server] Agent 4 (create-pr):     POST http://localhost:${PORT}/agents/create-pr`);
});
