import React from 'react'
import { AlertTriangle, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react'

export default function AuditPanel({ auditResult }) {
  if (!auditResult) {
    return (
      <div className="card flex min-h-[160px] flex-col items-center justify-center gap-3 p-5 text-brand-muted">
        <ShieldCheck size={28} className="opacity-30" />
        <span className="text-sm">Auditor agent pending...</span>
      </div>
    )
  }

  const { confidenceScore, risks = [], recommendation, explanation } = auditResult
  const isApproved = recommendation === 'approved'
  const isReview = recommendation === 'review'
  const Icon = isApproved ? ShieldCheck : isReview ? ShieldAlert : ShieldX

  const scoreColor =
    confidenceScore >= 80
      ? 'text-brand-green'
      : confidenceScore >= 50
        ? 'text-brand-amber'
        : 'text-brand-red'

  return (
    <div className="card p-5 animate-slide-up">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon
            size={18}
            className={
              isApproved ? 'text-brand-green' : isReview ? 'text-brand-amber' : 'text-brand-red'
            }
          />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-text">
            Audit Result
          </h3>
        </div>

        <span
          className={`rounded-full border px-3 py-1 font-mono text-xs font-semibold uppercase ${
            isApproved
              ? 'border-brand-green/40 bg-brand-green/10 text-brand-green'
              : isReview
                ? 'border-brand-amber/40 bg-brand-amber/10 text-brand-amber'
                : 'border-brand-red/40 bg-brand-red/10 text-brand-red'
          }`}
        >
          {recommendation}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <ConfidenceRing score={confidenceScore} />
        <div>
          <div className={`font-mono text-2xl font-bold ${scoreColor}`}>
            {confidenceScore}%
          </div>
          <div className="text-xs text-brand-muted">confidence score</div>
        </div>
      </div>

      {explanation && (
        <p className="mb-3 rounded-lg border border-brand-border bg-brand-surface p-3 text-sm leading-relaxed text-brand-text">
          {explanation}
        </p>
      )}

      {risks.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-brand-amber" />
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-amber">
              Risks
            </span>
          </div>
          <ul className="space-y-1">
            {risks.map((risk) => (
              <li key={risk} className="flex gap-2 text-xs text-brand-text">
                <span className="mt-0.5 shrink-0 text-brand-amber">!</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ConfidenceRing({ score }) {
  const radius = 24
  const center = 28
  const circumference = 2 * Math.PI * radius
  const fill = circumference * (score / 100)
  const color = score >= 80 ? '#42e88b' : score >= 50 ? '#f6b94f' : '#ff5d73'

  return (
    <svg width="56" height="56" className="shrink-0" aria-hidden="true">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#26333f" strokeWidth="4" />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${fill} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  )
}
