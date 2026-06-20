// ==========================================
// Webhook Signature Verification
// ==========================================
// GitHub signs every webhook payload using your webhook secret (HMAC SHA-256).
// We MUST verify this so random people on the internet can't send fake
// "a bug happened!" requests to our server and trigger fake PRs.
//
// How it works:
// 1. In your GitHub repo settings -> Webhooks, you set a "Secret" string.
// 2. GitHub uses that secret to sign the request body and sends the
//    signature in the 'x-hub-signature-256' header.
// 3. We re-compute the same signature on our end using the same secret,
//    and compare. If they match, we know it's really GitHub.

const crypto = require('crypto');

/**
 * Verifies a GitHub webhook signature.
 * @param {Buffer} rawBody - the raw (unparsed) request body bytes
 * @param {string} signatureHeader - value of 'x-hub-signature-256' header
 * @param {string} secret - your webhook secret (from .env)
 * @returns {boolean}
 */
function verifyGitHubSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  const expectedSignature =
    'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // timingSafeEqual prevents timing attacks, and requires equal-length buffers
  const sigBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

module.exports = { verifyGitHubSignature };
