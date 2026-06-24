import React, { useState } from 'react'
import { Play, Zap } from 'lucide-react'
import { triggerIncident } from '../utils/api'

export default function TriggerPanel({ pipelineStatus }) {
  const [loadingDifficulty, setLoadingDifficulty] = useState(null)
  const [error, setError] = useState(null)

  const isRunning = pipelineStatus === 'running'

  const fire = async (difficulty) => {
    if (isRunning) return
    setLoadingDifficulty(difficulty)
    setError(null)

    try {
      await triggerIncident({ difficulty, source: 'dashboard' })
    } catch (err) {
      setError(err.message || `Failed to trigger ${difficulty} incident`)
    } finally {
      setLoadingDifficulty(null)
    }
  }

  const difficulties = [
    { id: 'easy', label: 'Easy Bug', color: 'bg-green-600 hover:bg-green-700' },
    { id: 'medium', label: 'Medium Bug', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { id: 'hard', label: 'Hard Bug', color: 'bg-red-600 hover:bg-red-700' }
  ]

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Zap size={14} className="text-brand-accent" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-text">
          Trigger Incident
        </h2>
      </div>

      <div className="space-y-4">
        {error && (
          <p className="rounded border border-brand-red/30 bg-brand-red/10 px-3 py-2 text-xs text-brand-red">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {difficulties.map(({ id, label, color }) => {
            const isLoading = loadingDifficulty === id
            return (
              <button
                key={id}
                onClick={() => fire(id)}
                disabled={isRunning || loadingDifficulty !== null}
                className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${color}`}
              >
                <Play size={14} />
                {isRunning ? 'Pipeline running...' : isLoading ? 'Triggering...' : `Fire Pipeline (${label})`}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
