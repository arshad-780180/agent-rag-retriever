import React from 'react'
import { Clock, ExternalLink } from 'lucide-react'

const SEVERITY_MAP = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
}

export default function IncidentHistory({ incidents }) {
  return (
    <div className="card flex min-h-[180px] flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-brand-border px-4 py-3">
        <Clock size={14} className="text-brand-accent" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-text">
          Incident History
        </h2>
        <span className="ml-auto font-mono text-xs text-brand-muted">
          {incidents.length} total
        </span>
      </div>

      {incidents.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-brand-muted opacity-50">
          No incidents resolved yet
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted">
                <th className="px-4 py-2 text-left font-medium">Time</th>
                <th className="px-4 py-2 text-left font-medium">Error</th>
                <th className="px-4 py-2 text-left font-medium">File</th>
                <th className="px-4 py-2 text-left font-medium">Severity</th>
                <th className="px-4 py-2 text-left font-medium">Confidence</th>
                <th className="px-4 py-2 text-left font-medium">PR</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr
                  key={incident.id}
                  className="border-b border-brand-border/50 transition-colors animate-fade-in hover:bg-brand-surface/50"
                >
                  <td className="px-4 py-2 font-mono text-brand-muted">
                    {timeAgo(incident.ts)}
                  </td>
                  <td className="px-4 py-2 font-mono font-semibold text-brand-red">
                    {incident.errorType}
                  </td>
                  <td className="px-4 py-2 font-mono text-brand-accent">
                    {incident.file}
                  </td>
                  <td className="px-4 py-2">
                    {incident.severity && (
                      <span className={SEVERITY_MAP[incident.severity] || 'badge-medium'}>
                        {incident.severity}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono">
                    {incident.confidence != null ? (
                      <span
                        className={
                          incident.confidence >= 80
                            ? 'text-brand-green'
                            : incident.confidence >= 50
                              ? 'text-brand-amber'
                              : 'text-brand-red'
                        }
                      >
                        {incident.confidence}%
                      </span>
                    ) : (
                      <span className="text-brand-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {incident.prUrl ? (
                      <a
                        href={incident.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-brand-accent hover:underline"
                      >
                        <ExternalLink size={11} />
                        PR
                      </a>
                    ) : (
                      <span className="text-brand-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function timeAgo(isoString) {
  const diff = Math.max(Date.now() - new Date(isoString).getTime(), 0)
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}
