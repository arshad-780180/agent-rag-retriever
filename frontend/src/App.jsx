import React, { useState } from 'react'
import Header from './components/Header'
import IncidentHistory from './components/IncidentHistory'
import LogStream from './components/LogStream'
import ParsedErrorCard from './components/ParsedErrorCard'
import PatchDiffViewer from './components/PatchDiffViewer'
import PipelineVisualizer from './components/PipelineVisualizer'
import StatsBar from './components/StatsBar'
import TriggerPanel from './components/TriggerPanel'
import { usePipeline } from './hooks/usePipeline'

export default function App() {
  const {
    pipelineStatus,
    sseConnected,
    agentStates,
    logs,
    parsedError,
    patch,
    prUrl,
    incidents,
  } = usePipeline()

  const [tab, setTab] = useState('live')

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg font-sans">
      <Header pipelineStatus={pipelineStatus} sseConnected={sseConnected} />

      <main className="mx-auto w-full max-w-screen-2xl flex-1 space-y-4 px-4 py-5 sm:px-6">
        <StatsBar
          incidents={incidents}
          pipelineStatus={pipelineStatus}
          agentStates={agentStates}
        />

        <div className="flex gap-2 border-b border-brand-border">
          {['live', 'history'].map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`border-b-2 px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                tab === value
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-brand-muted hover:text-brand-text'
              }`}
            >
              {value === 'live' ? 'Live Pipeline' : 'Incident History'}
            </button>
          ))}
        </div>

        {tab === 'live' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <TriggerPanel pipelineStatus={pipelineStatus} />
              </div>
              <div className="lg:col-span-2">
                <PipelineVisualizer
                  agentStates={agentStates}
                  pipelineStatus={pipelineStatus}
                />
              </div>
            </div>

            <LogStream logs={logs} />

            <div className="grid grid-cols-1 gap-4">
              <ParsedErrorCard parsedError={parsedError} />
            </div>

            <PatchDiffViewer patch={patch} prUrl={prUrl} />
          </div>
        )}

        {tab === 'history' && (
          <div className="animate-fade-in">
            <IncidentHistory incidents={incidents} />
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between border-t border-brand-border px-6 py-3 font-mono text-xs text-brand-muted">
        <span>DevOps Autonomous Incident Triage Pipeline - B.Tech CSE Project</span>
        <span className="hidden sm:inline">
          Member 4 - Frontend &amp; UX - React + Vite + Tailwind + SSE
        </span>
      </footer>
    </div>
  )
}
