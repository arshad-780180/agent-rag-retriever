import React, { useState } from 'react'
import { Play, Zap } from 'lucide-react'
import { triggerIncident } from '../utils/api'

const MOCK_LOGS = [
  {
    label: 'Infinite Recursion - auth_bug.js',
    targetFile: 'qa_dummy_bugs/auth_bug.js',
  },
  {
    label: 'IndexError - data_processor.py',
    targetFile: 'qa_dummy_bugs/data_processor.py',
  },
  {
    label: 'TypeError - api_handler.ts',
    targetFile: 'qa_dummy_bugs/api_handler.ts',
  }
]

export default function TriggerPanel({ pipelineStatus }) {
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isRunning = pipelineStatus === 'running'

  const fire = async () => {
    if (isRunning) return
    setLoading(true)
    setError(null)

    try {
      const targetFile = MOCK_LOGS[selected].targetFile
      await triggerIncident({ targetFile, source: 'dashboard' })
    } catch (err) {
      setError(err.message || 'Failed to trigger incident')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Zap size={14} className="text-brand-accent" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-text">
          Trigger Incident
        </h2>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          {MOCK_LOGS.map((mock, index) => (
            <button
              key={mock.label}
              onClick={() => setSelected(index)}
              className={`w-full rounded border px-3 py-2 text-left text-xs transition-colors ${
                selected === index
                  ? 'border-brand-accent/60 bg-brand-accent/5 text-brand-text'
                  : 'border-brand-border text-brand-muted hover:border-brand-border/80 hover:text-brand-text'
              }`}
            >
              <span className={selected === index ? 'mr-2 text-brand-accent' : 'mr-2'}>&gt;</span>
              {mock.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded border border-brand-red/30 bg-brand-red/10 px-3 py-2 text-xs text-brand-red">
            {error}
          </p>
        )}

        <button
          onClick={fire}
          disabled={isRunning || loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-accent py-2.5 text-sm font-semibold text-brand-bg transition-all hover:bg-brand-accentdim disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play size={14} />
          {isRunning ? 'Pipeline running...' : loading ? 'Triggering...' : 'Fire Pipeline'}
        </button>
      </div>
    </div>
  )
}
