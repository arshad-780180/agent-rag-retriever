import React, { useEffect, useRef, useState } from 'react'
import { Download, Terminal } from 'lucide-react'

const LEVEL_STYLES = {
  info: 'text-brand-muted',
  success: 'text-brand-green',
  error: 'text-brand-red',
  warn: 'text-brand-amber',
}

const LEVEL_PREFIX = {
  info: 'INFO ',
  success: 'OK   ',
  error: 'ERR  ',
  warn: 'WARN ',
}

const AGENT_COLORS = {
  log_parser: 'text-cyan-400',
  rag: 'text-fuchsia-300',
  code_repair: 'text-yellow-300',
  git_bridge: 'text-sky-300',
  auditor: 'text-emerald-300',
}

export default function LogStream({ logs }) {
  const bottomRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, autoScroll])

  const filtered = filter === 'all' ? logs : logs.filter((entry) => entry.level === filter)

  const downloadLogs = () => {
    const text = logs
      .map((entry) => {
        const prefix = LEVEL_PREFIX[entry.level] || 'LOG  '
        const agent = entry.agent ? `[${entry.agent}] ` : ''
        return `[${entry.ts}] ${prefix} ${agent}${entry.msg}`
      })
      .join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `incident-${Date.now()}.log`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card flex h-[340px] flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-brand-accent" />
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-text">
            Log Stream
          </span>
          <span className="ml-1 font-mono text-xs text-brand-muted">({logs.length} lines)</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'error', 'warn', 'info', 'success'].map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded px-2 py-0.5 font-mono text-xs transition-colors ${
                filter === value
                  ? 'bg-brand-accent/20 text-brand-accent'
                  : 'text-brand-muted hover:text-brand-text'
              }`}
            >
              {value}
            </button>
          ))}
          <div className="h-4 w-px shrink-0 bg-brand-border" />
          <button
            onClick={() => setAutoScroll((current) => !current)}
            className={`font-mono text-xs transition-colors ${
              autoScroll ? 'text-brand-accent' : 'text-brand-muted hover:text-brand-text'
            }`}
            title="Toggle auto-scroll"
          >
            auto
          </button>
          <button
            onClick={downloadLogs}
            className="text-brand-muted transition-colors hover:text-brand-text"
            title="Download logs"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      <div className="log-stream flex-1 space-y-0.5 overflow-y-auto p-3 font-mono text-xs">
        {filtered.length === 0 && (
          <div className="py-4 text-center italic text-brand-muted opacity-50">
            Waiting for pipeline events...
          </div>
        )}
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="flex gap-2 rounded px-1 leading-5 animate-fade-in hover:bg-brand-surface/50"
          >
            <span className="shrink-0 text-brand-muted opacity-60">
              {entry.ts.slice(11, 19)}
            </span>
            <span className={`shrink-0 font-semibold ${LEVEL_STYLES[entry.level] || 'text-brand-muted'}`}>
              {LEVEL_PREFIX[entry.level] || 'LOG  '}
            </span>
            {entry.agent && (
              <span className={`shrink-0 ${AGENT_COLORS[entry.agent] || 'text-brand-muted'}`}>
                [{entry.agent}]
              </span>
            )}
            <span className="break-all text-brand-text">{entry.msg}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
