import React, { useEffect, useState } from 'react'
import { Activity, Wifi, WifiOff } from 'lucide-react'

export default function Header({ pipelineStatus, sseConnected }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const statusColor = {
    idle: 'text-brand-muted',
    running: 'text-brand-accent',
    waiting: 'text-brand-amber',
    done: 'text-brand-green',
    error: 'text-brand-red',
  }[pipelineStatus] || 'text-brand-muted'

  return (
    <header className="scanline relative border-b border-brand-border bg-brand-surface px-6 py-4">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-accent/40 bg-brand-accent/20">
            <Activity size={16} className="text-brand-accent" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-brand-text">IncidentIQ</div>
            <div className="font-mono text-xs text-brand-muted">Autonomous Triage Pipeline</div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-xs text-brand-muted">Status:</span>
            <span className={`font-mono text-xs font-semibold uppercase ${statusColor}`}>
              {pipelineStatus}
            </span>
            {pipelineStatus === 'running' && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand-accent animate-pulse-slow" />
            )}
          </div>

          <div className="hidden items-center gap-1.5 text-xs text-brand-muted sm:flex">
            {sseConnected ? (
              <Wifi size={13} className="text-brand-green" />
            ) : (
              <WifiOff size={13} className="text-brand-red" />
            )}
            <span className={sseConnected ? 'text-brand-green' : 'text-brand-red'}>
              {sseConnected ? 'SSE Live' : 'Backend Offline'}
            </span>
          </div>

          <div className="font-mono text-xs text-brand-muted">
            {time.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </header>
  )
}
