// ==========================================
// AGENT 1: Regex Log Parser
// ==========================================
// Job: take a raw error log / stack trace (a messy blob of text) and pull
// out three clean facts:
//   - errorMessage   : the actual error description
//   - parsedFilePath : which file it happened in (relative path)
//   - parsedLineNumber: which line number
//
// Output shape MUST match what Member 1's Agent 2 (/get-context) expects:
//   {
//     "errorMessage": "...",
//     "parsedFilePath": "src/utils/auth.js" | null,
//     "parsedLineNumber": 45 | null
//   }
//
// If we can't confidently find a file+line, we return null for those -
// that's intentional. Member 1's service falls back to vector search
// in that case, so returning null instead of guessing wrong is the
// correct, honest behavior here.

/**
 * Stack trace patterns we try to match, ordered roughly by how common
 * they are. Each pattern must capture (filePath, lineNumber).
 */
const STACK_TRACE_PATTERNS = [
  // Node.js style:  "at functionName (src/utils/auth.js:45:13)"
  {
    name: 'node-at-line',
    regex: /at\s+(?:[\w.<>\[\]]+\s+)?\(?([\w\-./\\]+\.(?:js|jsx|ts|tsx|mjs|cjs)):(\d+):\d+\)?/,
  },
  // Python style: 'File "src/utils/auth.py", line 45, in loginUser'
  {
    name: 'python-file-line',
    regex: /File\s+"([\w\-./\\]+\.py)",\s+line\s+(\d+)/,
  },
  // Generic "path/to/file.ext:LINE" anywhere in the text
  {
    name: 'generic-path-colon-line',
    regex: /([\w\-./\\]+\.(?:js|jsx|ts|tsx|py|java|go|rb|json)):(\d+)/,
  },
];

/**
 * Tries to pull a clean one-line error message out of a raw log blob.
 * Looks for common "ErrorType: message" patterns on the first matching line.
 */
function extractErrorMessage(rawLog) {
  const lines = rawLog.split('\n').map((l) => l.trim()).filter(Boolean);

  // Look for common "SomeError: message" / "SomeException: message" patterns
  const errorLinePattern = /([A-Z][a-zA-Z]*(?:Error|Exception)):?\s*(.*)/;

  for (const line of lines) {
    const match = line.match(errorLinePattern);
    if (match) {
      const [, errorType, message] = match;
      return message ? `${errorType}: ${message}` : errorType;
    }
  }

  // Fallback: no recognizable "XError:" pattern found, just use the first
  // non-empty line, truncated so we don't pass a wall of text downstream.
  return lines[0] ? lines[0].slice(0, 300) : 'Unknown error (could not parse log)';
}

/**
 * Tries each stack trace pattern in turn and returns the first match.
 */
function extractFileAndLine(rawLog) {
  for (const { regex } of STACK_TRACE_PATTERNS) {
    const match = rawLog.match(regex);
    if (match) {
      const [, filePath, lineNumber] = match;
      return {
        parsedFilePath: normalizeFilePath(filePath),
        parsedLineNumber: parseInt(lineNumber, 10),
      };
    }
  }
  return { parsedFilePath: null, parsedLineNumber: null };
}

/**
 * Cleans up a file path: normalizes slashes and strips any leading
 * "./" or absolute-path prefix noise so it's a clean relative path,
 * since that's what Member 1's repoPath + parsedFilePath join expects.
 */
function normalizeFilePath(filePath) {
  return filePath
    .replace(/\\/g, '/')          // windows -> unix slashes
    .replace(/^\.\//, '')         // strip leading ./
    .replace(/^\/+/, '');         // strip leading absolute slash
}

/**
 * Main entry point for Agent 1.
 * @param {string} rawLog - the raw error log / stack trace text
 * @returns {{errorMessage: string, parsedFilePath: string|null, parsedLineNumber: number|null}}
 */
function parseLog(rawLog) {
  if (!rawLog || typeof rawLog !== 'string' || !rawLog.trim()) {
    return {
      errorMessage: 'Empty or invalid log provided',
      parsedFilePath: null,
      parsedLineNumber: null,
    };
  }

  const errorMessage = extractErrorMessage(rawLog);
  const { parsedFilePath, parsedLineNumber } = extractFileAndLine(rawLog);

  return { errorMessage, parsedFilePath, parsedLineNumber };
}

module.exports = { parseLog };
