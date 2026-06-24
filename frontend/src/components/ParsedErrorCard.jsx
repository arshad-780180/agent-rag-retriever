import React from 'react'
import { Bug, FileCode, Hash, Zap } from 'lucide-react'

const SEVERITY_MAP = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
}

export default function ParsedErrorCard({ parsedError }) {
  if (!parsedError) {
    return (
      <div className="card flex min-h-[140px] flex-col items-center justify-center gap-3 p-5 text-brand-muted">
        <Bug size={26} className="opacity-30" />
        <span className="text-sm">Log Parser agent pending...</span>
      </div>
    )
  }

  const errorType = parsedError.errorType || errorTypeFromMessage(parsedError.errorMessage)
  const file = parsedError.file || parsedError.parsedFilePath || 'Unknown file'
  const lineNumber = parsedError.lineNumber || parsedError.parsedLineNumber
  const severity = parsedError.severity || 'medium'
  const rootCauseSummary = parsedError.rootCauseSummary || parsedError.errorMessage

  return (
    <div className="card p-5 animate-slide-up">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bug size={14} className="text-brand-accent" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-text">
            Parsed Error
          </h3>
        </div>
        <span className={SEVERITY_MAP[severity] || 'badge-medium'}>{severity}</span>
      </div>

      <div className="space-y-2.5">
        <Row icon={<Zap size={13} />} label="Error type">
          <span className="font-mono font-semibold text-brand-red">{errorType}</span>
        </Row>

        <Row icon={<FileCode size={13} />} label="Location">
          <span className="font-mono text-brand-accent">{file}</span>
          {lineNumber && (
            <span className="font-mono text-brand-muted">:{lineNumber}</span>
          )}
        </Row>

        {parsedError.incidentId && (
          <Row icon={<Hash size={13} />} label="Incident">
            <span className="font-mono text-brand-text">{parsedError.incidentId}</span>
          </Row>
        )}

        {rootCauseSummary && (
          <div className="mt-2 rounded-lg border border-brand-border bg-brand-surface p-3">
            <div className="mb-1 text-xs uppercase tracking-widest text-brand-muted">Root Cause</div>
            <p className="text-sm leading-relaxed text-brand-text">{rootCauseSummary}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ icon, label, children }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-brand-muted">{icon}</span>
      <span className="w-20 shrink-0 pt-0.5 text-xs text-brand-muted">{label}</span>
      <div className="flex flex-wrap gap-1 text-sm">{children}</div>
    </div>
  )
}

function errorTypeFromMessage(message) {
  if (!message) return 'UnknownError'
  const match = message.match(/\b([A-Z][A-Za-z]*(?:Error|Exception|Fault))\b/)
  return match?.[1] || 'UnknownError'
}
