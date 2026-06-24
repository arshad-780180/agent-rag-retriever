import React from 'react'
import { AlertCircle, CheckCircle, Circle, Loader } from 'lucide-react'
import { AGENTS } from '../hooks/usePipeline'

const StatusIcon = ({ status }) => {
  if (status === 'done') return <CheckCircle size={16} className="text-brand-green" />
  if (status === 'error') return <AlertCircle size={16} className="text-brand-red" />
  if (status === 'active') return <Loader size={16} className="text-brand-accent animate-spin" />
  return <Circle size={16} className="text-brand-muted" />
}

const nodeClass = (status) => `pipeline-node ${status}`

export default function PipelineVisualizer({ agentStates, pipelineStatus }) {
  return (
    <div className="card p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-brand-text">
          Pipeline
        </h2>
        <PipelineStatusBadge status={pipelineStatus} />
      </div>

      <div className="relative hidden items-start justify-between sm:flex">
        <div className="absolute left-0 right-0 top-5 z-0 h-px bg-brand-border" />
        <div
          className="absolute left-0 top-5 z-0 h-px bg-brand-accent transition-all duration-700"
          style={{ width: progressWidth(agentStates) }}
        />

        {AGENTS.map((agent) => {
          const state = agentStates[agent.id] || { status: 'idle' }
          return (
            <div key={agent.id} className="pipeline-step relative z-10 flex-1">
              <div className={nodeClass(state.status)}>
                <span>{agent.icon}</span>
              </div>
              <span className="mt-1 text-center text-xs leading-tight text-brand-muted">
                {agent.label}
              </span>
              {state.duration && (
                <span className="font-mono text-xs text-brand-accent">
                  {(state.duration / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {AGENTS.map((agent, index) => {
          const state = agentStates[agent.id] || { status: 'idle' }
          return (
            <div key={agent.id} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className={`${nodeClass(state.status)} !h-8 !w-8`}>
                  <span>{agent.icon}</span>
                </div>
                {index < AGENTS.length - 1 && (
                  <div className="mt-1 h-4 w-px bg-brand-border" />
                )}
              </div>
              <div className="flex flex-1 items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-brand-text">{agent.label}</div>
                  <div className="text-xs text-brand-muted">{agent.member}</div>
                </div>
                <div className="flex items-center gap-2">
                  {state.duration && (
                    <span className="font-mono text-xs text-brand-accent">
                      {(state.duration / 1000).toFixed(1)}s
                    </span>
                  )}
                  <StatusIcon status={state.status} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 hidden grid-cols-5 gap-2 sm:grid">
        {AGENTS.map((agent) => {
          const state = agentStates[agent.id] || { status: 'idle' }
          return (
            <div
              key={agent.id}
              className={`rounded-lg border p-2 text-center transition-all ${
                state.status === 'active'
                  ? 'border-brand-accent/50 bg-brand-accent/5'
                  : state.status === 'done'
                    ? 'border-brand-green/30 bg-brand-green/5'
                    : state.status === 'error'
                      ? 'border-brand-red/30 bg-brand-red/5'
                      : 'border-brand-border bg-brand-surface'
              }`}
            >
              <div className="text-xs text-brand-muted">{agent.member}</div>
              <div className="mt-1 flex justify-center">
                <StatusIcon status={state.status} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function progressWidth(agentStates) {
  const states = Object.values(agentStates)
  const doneCount = states.filter((state) => state.status === 'done').length
  const activeIndex = AGENTS.findIndex((agent) => agentStates[agent.id]?.status === 'active')
  const completed = activeIndex >= 0 ? activeIndex + 0.5 : doneCount

  if (completed <= 0) return '0%'
  return `${Math.min((completed / AGENTS.length) * 100, 100)}%`
}

function PipelineStatusBadge({ status }) {
  const map = {
    idle: { label: 'Idle', className: 'text-brand-muted border-brand-border' },
    running: {
      label: 'Running',
      className: 'text-brand-accent border-brand-accent/40 animate-pulse',
    },
    waiting: { label: 'Waiting', className: 'text-brand-amber border-brand-amber/40' },
    done: { label: 'Complete', className: 'text-brand-green border-brand-green/40' },
    error: { label: 'Failed', className: 'text-brand-red border-brand-red/40' },
  }
  const current = map[status] || map.idle

  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-xs ${current.className}`}>
      {current.label}
    </span>
  )
}
