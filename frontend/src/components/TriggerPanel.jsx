import React, { useState } from 'react'
import { Play, Zap } from 'lucide-react'
import { triggerIncident } from '../utils/api'

const MOCK_LOGS = [
  {
    label: 'NullPointerException - UserService.java',
    log: `2024-01-15 10:23:41 ERROR [UserService] java.lang.NullPointerException
  at com.app.UserService.getUserById(UserService.java:142)
  at com.app.AuthController.login(AuthController.java:87)
Caused by: Database timeout after 30s - user object null`,
  },
  {
    label: 'IndexError - data_pipeline.py',
    log: `2024-01-15 11:05:02 CRITICAL [DataPipeline] IndexError: list index out of range
  File "data_pipeline.py", line 78, in process_batch
    record = batch[idx]
Frame count: 0, expected >= 1`,
  },
  {
    label: 'TypeError - paymentService.js',
    log: `2024-01-15 09:44:17 ERROR [PaymentService] TypeError: Cannot read properties of undefined (reading 'amount')
    at processPayment (paymentService.js:203)
    at router.post (/routes/payments.js:45)
Payload missing 'amount' field`,
  },
  {
    label: 'SegmentationFault - parser.c',
    log: `2024-01-15 12:00:01 FATAL [Parser] Segmentation fault (core dumped)
  #0 parse_token (parser.c:312)
  #1 run_lexer (lexer.c:89)
Null pointer dereference on token->value`,
  },
]

export default function TriggerPanel({ pipelineStatus }) {
  const [selected, setSelected] = useState(0)
  const [customLog, setCustomLog] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isRunning = pipelineStatus === 'running'

  const fire = async () => {
    if (isRunning) return
    setLoading(true)
    setError(null)

    try {
      const logText = useCustom ? customLog : MOCK_LOGS[selected].log
      await triggerIncident({ rawLog: logText, source: 'dashboard' })
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
        <div className="flex gap-2">
          <button
            onClick={() => setUseCustom(false)}
            className={`rounded border px-3 py-1.5 text-xs transition-colors ${
              !useCustom
                ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                : 'border-brand-border text-brand-muted hover:text-brand-text'
            }`}
          >
            Preset bugs
          </button>
          <button
            onClick={() => setUseCustom(true)}
            className={`rounded border px-3 py-1.5 text-xs transition-colors ${
              useCustom
                ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                : 'border-brand-border text-brand-muted hover:text-brand-text'
            }`}
          >
            Custom log
          </button>
        </div>

        {!useCustom ? (
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
        ) : (
          <textarea
            value={customLog}
            onChange={(event) => setCustomLog(event.target.value)}
            placeholder="Paste raw log output here..."
            rows={5}
            className="w-full resize-none rounded-lg border border-brand-border bg-brand-surface p-3 font-mono text-xs text-brand-text placeholder-brand-muted focus:border-brand-accent focus:outline-none"
          />
        )}

        {error && (
          <p className="rounded border border-brand-red/30 bg-brand-red/10 px-3 py-2 text-xs text-brand-red">
            {error}
          </p>
        )}

        <button
          onClick={fire}
          disabled={isRunning || loading || (useCustom && !customLog.trim())}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-accent py-2.5 text-sm font-semibold text-brand-bg transition-all hover:bg-brand-accentdim disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play size={14} />
          {isRunning ? 'Pipeline running...' : loading ? 'Triggering...' : 'Fire Pipeline'}
        </button>
      </div>
    </div>
  )
}
