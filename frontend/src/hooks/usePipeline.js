import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeToMockIncidents } from '../utils/api'
import { useSSE } from './useSSE'

export const AGENTS = [
  { id: 'log_parser', label: 'Log Parser', icon: 'LP', member: 'Member 3' },
  { id: 'rag', label: 'RAG Retriever', icon: 'RAG', member: 'Member 1' },
  { id: 'code_repair', label: 'Code Repair', icon: 'CR', member: 'Member 2' },
  { id: 'git_bridge', label: 'Git Bridge', icon: 'GB', member: 'Member 3' },
  { id: 'auditor', label: 'Auditor', icon: 'AU', member: 'Member 5' },
]

const AGENT_LABELS = Object.fromEntries(AGENTS.map((agent) => [agent.id, agent.label]))

const initialAgentState = () =>
  Object.fromEntries(
    AGENTS.map((agent) => [agent.id, { status: 'idle', startedAt: null, duration: null }]),
  )

export function usePipeline() {
  const [pipelineStatus, setPipelineStatus] = useState('idle')
  const [agentStates, setAgentStates] = useState(initialAgentState)
  const [logs, setLogs] = useState([])
  const [parsedError, setParsedError] = useState(null)
  const [patch, setPatch] = useState(null)
  const [auditResult, setAuditResult] = useState(null)
  const [prUrl, setPrUrl] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [activeIncident, setActiveIncident] = useState(null)

  const startTimesRef = useRef({})
  const timersRef = useRef([])
  const parsedErrorRef = useRef(null)
  const auditResultRef = useRef(null)

  useEffect(() => {
    parsedErrorRef.current = parsedError
  }, [parsedError])

  useEffect(() => {
    auditResultRef.current = auditResult
  }, [auditResult])

  const addLog = useCallback((entry) => {
    setLogs((previous) => [
      ...previous.slice(-499),
      { id: `${Date.now()}-${Math.random()}`, ts: new Date().toISOString(), ...entry },
    ])
  }, [])

  const handleSSE = useCallback(({ type, data }) => {
    switch (type) {
      case 'pipeline:start':
        setPipelineStatus('running')
        setAgentStates(initialAgentState())
        setPatch(null)
        setAuditResult(null)
        setPrUrl(null)
        setParsedError(null)
        setLogs([])
        setActiveIncident({ id: data.incidentId, ts: new Date().toISOString(), source: 'sse' })
        addLog({ level: 'info', msg: `Pipeline started for incident ${data.incidentId}` })
        break

      case 'agent:start':
        startTimesRef.current[data.agent] = Date.now()
        setAgentStates((previous) => ({
          ...previous,
          [data.agent]: { status: 'active', startedAt: Date.now(), duration: null },
        }))
        addLog({ level: 'info', msg: `${AGENT_LABELS[data.agent] || data.agent} started`, agent: data.agent })
        break

      case 'agent:done': {
        const duration = Date.now() - (startTimesRef.current[data.agent] || Date.now())
        setAgentStates((previous) => ({
          ...previous,
          [data.agent]: {
            status: 'done',
            startedAt: previous[data.agent]?.startedAt,
            duration: data.duration || duration,
          },
        }))
        addLog({
          level: 'success',
          msg: `${AGENT_LABELS[data.agent] || data.agent} completed in ${data.duration || duration}ms`,
          agent: data.agent,
        })

        if (data.agent === 'log_parser' && data.result) setParsedError(normalizeParsedError(data.result))
        if (data.agent === 'code_repair' && data.result) setPatch(data.result)
        if (data.agent === 'auditor' && data.result) setAuditResult(data.result)
        if (data.agent === 'git_bridge' && data.result?.prUrl) setPrUrl(data.result.prUrl)
        break
      }

      case 'agent:error':
        setAgentStates((previous) => ({
          ...previous,
          [data.agent]: { status: 'error', startedAt: previous[data.agent]?.startedAt, duration: null },
        }))
        addLog({ level: 'error', msg: `${AGENT_LABELS[data.agent] || data.agent} failed: ${data.error}`, agent: data.agent })
        break

      case 'log':
        addLog({ level: data.level || 'info', msg: data.msg, agent: data.agent })
        break

      case 'patch':
        setPatch(data)
        break

      case 'audit':
        setAuditResult(data)
        break

      case 'pipeline:done': {
        const parsed = normalizeParsedError(data.parsedError || parsedErrorRef.current)
        const audit = data.auditResult || auditResultRef.current
        const resolvedPrUrl = data.prUrl || prUrl

        setPipelineStatus('done')
        setPrUrl(resolvedPrUrl)
        setActiveIncident(null)
        addLog({ level: 'success', msg: `Pipeline complete. PR: ${resolvedPrUrl || 'N/A'}` })
        setIncidents((previous) => [
          {
            id: data.incidentId || Date.now(),
            ts: new Date().toISOString(),
            errorType: parsed?.errorType || 'UnknownError',
            severity: parsed?.severity || 'medium',
            file: parsed?.file || 'Unknown file',
            prUrl: resolvedPrUrl,
            confidence: audit?.confidenceScore,
            status: 'resolved',
          },
          ...previous,
        ])
        break
      }

      case 'pipeline:error':
        setPipelineStatus('error')
        setActiveIncident(null)
        addLog({ level: 'error', msg: `Pipeline failed: ${data.error}` })
        break

      default:
        break
    }
  }, [addLog, prUrl])

  const sseConnected = useSSE(
    import.meta.env.VITE_SSE_URL || '/events',
    handleSSE,
    import.meta.env.VITE_ENABLE_SSE !== 'false',
  )

  const runMockPipeline = useCallback((incident) => {
    clearTimers(timersRef)

    const incidentId = `INC-${Date.now().toString().slice(-6)}`
    const parsed = parseMockError(incident.log, incidentId)
    const patchResult = buildPatch(parsed)
    const audit = buildAudit(parsed)
    const mockPrUrl = 'https://github.com/arshad-780180/agent-rag-retriever/pull/demo'

    setPipelineStatus('running')
    setAgentStates(initialAgentState())
    setLogs([])
    setParsedError(null)
    setPatch(null)
    setAuditResult(null)
    setPrUrl(null)
    setActiveIncident({ id: incidentId, ts: new Date().toISOString(), source: incident.source })

    addLog({ level: 'info', msg: `Pipeline started for incident ${incidentId}` })
    addLog({ level: 'info', msg: 'Raw log accepted from dashboard trigger' })

    const startAgent = (agent) => {
      startTimesRef.current[agent] = Date.now()
      setAgentStates((previous) => ({
        ...previous,
        [agent]: { status: 'active', startedAt: Date.now(), duration: null },
      }))
      addLog({ level: 'info', msg: `${AGENT_LABELS[agent]} started`, agent })
    }

    const finishAgent = (agent, message) => {
      const duration = Date.now() - (startTimesRef.current[agent] || Date.now())
      setAgentStates((previous) => ({
        ...previous,
        [agent]: { status: 'done', startedAt: previous[agent]?.startedAt, duration },
      }))
      addLog({ level: 'success', msg: message, agent })
    }

    schedule(timersRef, 120, () => startAgent('log_parser'))
    schedule(timersRef, 720, () => {
      setParsedError(parsed)
      finishAgent('log_parser', `Parsed ${parsed.errorType} at ${parsed.file}:${parsed.lineNumber || '?'}`)
    })
    schedule(timersRef, 860, () => startAgent('rag'))
    schedule(timersRef, 1450, () => {
      finishAgent('rag', 'Retrieved matching stack context and nearby code references')
      addLog({ level: 'info', msg: `Context focused on ${parsed.file}`, agent: 'rag' })
    })
    schedule(timersRef, 1580, () => startAgent('code_repair'))
    schedule(timersRef, 2300, () => {
      setPatch(patchResult)
      finishAgent('code_repair', 'Generated guarded repair patch')
    })
    schedule(timersRef, 2440, () => startAgent('git_bridge'))
    schedule(timersRef, 2920, () => {
      setPrUrl(mockPrUrl)
      finishAgent('git_bridge', 'Prepared pull request branch and diff payload')
    })
    schedule(timersRef, 3060, () => startAgent('auditor'))
    schedule(timersRef, 3660, () => {
      setAuditResult(audit)
      finishAgent('auditor', `Audit recommendation: ${audit.recommendation}`)
    })
    schedule(timersRef, 4140, () => {
      setPipelineStatus('done')
      setActiveIncident(null)
      addLog({ level: 'success', msg: `Pipeline complete. PR: ${mockPrUrl}` })
      setIncidents((previous) => [
        {
          id: incidentId,
          ts: new Date().toISOString(),
          errorType: parsed.errorType,
          severity: parsed.severity,
          file: parsed.file,
          prUrl: mockPrUrl,
          confidence: audit.confidenceScore,
          status: 'resolved',
        },
        ...previous,
      ])
    })
  }, [addLog])

  useEffect(() => subscribeToMockIncidents(runMockPipeline), [runMockPipeline])

  useEffect(() => () => clearTimers(timersRef), [])

  return {
    pipelineStatus,
    sseConnected,
    agentStates,
    logs,
    parsedError,
    patch,
    auditResult,
    prUrl,
    incidents,
    activeIncident,
    setActiveIncident,
  }
}

function schedule(timersRef, delay, callback) {
  const timer = window.setTimeout(callback, delay)
  timersRef.current.push(timer)
}

function clearTimers(timersRef) {
  timersRef.current.forEach((timer) => window.clearTimeout(timer))
  timersRef.current = []
}

function normalizeParsedError(result) {
  if (!result) return null
  return {
    incidentId: result.incidentId,
    errorType: result.errorType || errorTypeFromMessage(result.errorMessage),
    file: result.file || result.parsedFilePath || 'Unknown file',
    lineNumber: result.lineNumber || result.parsedLineNumber,
    severity: result.severity || inferSeverity(result.errorMessage || result.errorType || ''),
    rootCauseSummary: result.rootCauseSummary || result.errorMessage,
  }
}

function parseMockError(rawLog, incidentId) {
  const parsedLocation = extractLocation(rawLog)
  const errorType = errorTypeFromMessage(rawLog)
  const severity = inferSeverity(rawLog)
  const file = parsedLocation.file || fallbackFile(errorType)

  return {
    incidentId,
    errorType,
    file,
    lineNumber: parsedLocation.lineNumber,
    severity,
    rootCauseSummary: summarizeRootCause(errorType, file),
  }
}

function extractLocation(rawLog) {
  const patterns = [
    /at\s+(?:[\w.<>\[\]]+\s+)?\(?([\w\-./\\]+\.(?:js|jsx|ts|tsx|mjs|cjs|java)):(\d+)/,
    /File\s+"([\w\-./\\]+\.py)",\s+line\s+(\d+)/,
    /#\d+\s+\w+\s+\(([\w\-./\\]+\.c):(\d+)\)/,
    /([\w\-./\\]+\.(?:js|jsx|ts|tsx|py|java|go|rb|json|c)):(\d+)/,
  ]

  for (const pattern of patterns) {
    const match = rawLog.match(pattern)
    if (match) {
      return {
        file: match[1].replace(/\\/g, '/').replace(/^\.\//, ''),
        lineNumber: Number(match[2]),
      }
    }
  }

  return { file: null, lineNumber: null }
}

function errorTypeFromMessage(message = '') {
  const typed = message.match(/\b([A-Z][A-Za-z]*(?:Error|Exception|Fault))\b/)
  if (typed) return typed[1]
  if (/segmentation fault/i.test(message)) return 'SegmentationFault'
  return 'UnknownError'
}

function inferSeverity(message = '') {
  if (/fatal|segmentation|critical/i.test(message)) return 'critical'
  if (/nullpointer|typeerror|timeout/i.test(message)) return 'high'
  if (/indexerror|range|undefined/i.test(message)) return 'medium'
  return 'low'
}

function fallbackFile(errorType) {
  if (errorType === 'IndexError') return 'data_pipeline.py'
  if (errorType === 'SegmentationFault') return 'parser.c'
  if (errorType === 'NullPointerException') return 'UserService.java'
  return 'paymentService.js'
}

function summarizeRootCause(errorType, file) {
  const summaries = {
    NullPointerException: 'A null object is dereferenced before the service validates the repository response.',
    IndexError: 'Batch processing reads an index without checking whether the batch contains that element.',
    TypeError: 'The payment payload is used before the required amount field is validated.',
    SegmentationFault: 'Native parsing code dereferences token memory before confirming the pointer is valid.',
  }

  return summaries[errorType] || `The failure points to unsafe input handling in ${file}.`
}

function buildPatch(parsed) {
  const extension = parsed.file.split('.').pop()
  const templates = {
    py: {
      original: `def process_batch(batch, idx):
    record = batch[idx]
    return transform(record)`,
      fixed: `def process_batch(batch, idx):
    if idx >= len(batch):
        raise IndexError("batch index out of range")
    record = batch[idx]
    return transform(record)`,
    },
    java: {
      original: `User user = repository.findById(id);
return user.getName();`,
      fixed: `User user = repository.findById(id);
if (user == null) {
    throw new IllegalStateException("User not found");
}
return user.getName();`,
    },
    c: {
      original: `char first = token->value[0];
return first;`,
      fixed: `if (token == NULL || token->value == NULL) {
    return '\\0';
}
char first = token->value[0];
return first;`,
    },
    js: {
      original: `const amount = payload.amount
return charge(amount)`,
      fixed: `const amount = payload?.amount
if (amount == null) {
  throw new Error('Missing payment amount')
}
return charge(amount)`,
    },
  }

  const template = templates[extension] || templates.js
  return {
    file: parsed.file,
    line: parsed.lineNumber,
    ...template,
  }
}

function buildAudit(parsed) {
  const confidenceScore = parsed.severity === 'critical' ? 82 : 88

  return {
    confidenceScore,
    recommendation: confidenceScore >= 80 ? 'approved' : 'review',
    explanation: 'The generated patch adds a narrow guard at the fault boundary without changing the wider control flow.',
    risks: [
      'Run the owning service test suite before merging.',
      'Confirm the fallback behavior matches product expectations.',
    ],
  }
}
