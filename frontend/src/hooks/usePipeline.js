import { useCallback, useEffect, useRef, useState } from 'react'
import { useSSE } from './useSSE'

export const AGENTS = [
  { id: 'log_parser', label: 'Log Parser', icon: 'LP', member: 'Member 3' },
  { id: 'rag', label: 'RAG Retriever', icon: 'RAG', member: 'Member 1' },
  { id: 'code_repair', label: 'Code Repair', icon: 'CR', member: 'Member 2' },
  { id: 'git_bridge', label: 'Git Bridge', icon: 'GB', member: 'Member 3' },
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
  const parsedErrorRef = useRef(null)
  const auditResultRef = useRef(null)
  const prUrlRef = useRef(null)

  useEffect(() => {
    parsedErrorRef.current = parsedError
  }, [parsedError])

  useEffect(() => {
    auditResultRef.current = auditResult
  }, [auditResult])

  useEffect(() => {
    prUrlRef.current = prUrl
  }, [prUrl])

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
        setActiveIncident({ id: data.incidentId, ts: new Date().toISOString(), source: data.source })
        addLog({ level: 'info', msg: `Pipeline started for incident ${data.incidentId}` })
        break

      case 'agent:start':
        startTimesRef.current[data.agent] = Date.now()
        setAgentStates((previous) => ({
          ...previous,
          [data.agent]: { status: 'active', startedAt: Date.now(), duration: null },
        }))
        addLog({
          level: 'info',
          msg: `${AGENT_LABELS[data.agent] || data.agent} started`,
          agent: data.agent,
        })
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
        if (data.agent === 'git_bridge' && data.result?.prUrl) setPrUrl(data.result.prUrl)
        break
      }

      case 'agent:error':
        setAgentStates((previous) => ({
          ...previous,
          [data.agent]: { status: 'error', startedAt: previous[data.agent]?.startedAt, duration: null },
        }))
        addLog({
          level: 'error',
          msg: `${AGENT_LABELS[data.agent] || data.agent} failed: ${data.error}`,
          agent: data.agent,
        })
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

      case 'pipeline:waiting':
        setPipelineStatus('waiting')
        if (data.parsedError) setParsedError(normalizeParsedError(data.parsedError))
        addLog({
          level: 'warn',
          msg: data.reason === 'orchestrator_not_connected'
            ? 'Waiting for the real orchestrator to continue the remaining agents.'
            : 'Pipeline is waiting for the next backend event.',
        })
        break

      case 'pipeline:done': {
        const parsed = normalizeParsedError(data.parsedError || parsedErrorRef.current)
        const audit = data.auditResult || auditResultRef.current
        const resolvedPrUrl = data.prUrl || prUrlRef.current

        setPipelineStatus('done')
        setPrUrl(resolvedPrUrl)
        setActiveIncident(null)
        addLog({ level: 'success', msg: `Pipeline complete. PR: ${resolvedPrUrl || 'N/A'}` })

        if (resolvedPrUrl || data.status === 'resolved') {
          setIncidents((previous) => [
            {
              id: data.incidentId || Date.now(),
              ts: new Date().toISOString(),
              errorType: parsed?.errorType || 'UnknownError',
              severity: parsed?.severity || 'medium',
              file: parsed?.file || 'Unknown file',
              prUrl: resolvedPrUrl,
              status: 'resolved',
            },
            ...previous,
          ])
        }
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
  }, [addLog])

  const sseConnected = useSSE(
    import.meta.env.VITE_SSE_URL || '/events',
    handleSSE,
    import.meta.env.VITE_ENABLE_SSE !== 'false',
  )

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

function normalizeParsedError(result) {
  if (!result) return null
  return {
    incidentId: result.incidentId,
    errorMessage: result.errorMessage,
    errorType: result.errorType || errorTypeFromMessage(result.errorMessage),
    file: result.file || result.parsedFilePath || 'Unknown file',
    lineNumber: result.lineNumber || result.parsedLineNumber,
    severity: result.severity || inferSeverity(result.errorMessage || result.errorType || ''),
    rootCauseSummary: result.rootCauseSummary || result.errorMessage,
  }
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
