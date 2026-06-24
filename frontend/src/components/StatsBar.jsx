import React from 'react'
import { CheckCircle, Clock, ShieldCheck, TrendingUp } from 'lucide-react'

export default function StatsBar({ incidents, agentStates }) {
  const resolved = incidents.filter((incident) => incident.status === 'resolved').length
  const confidences = incidents
    .map((incident) => incident.confidence)
    .filter((value) => Number.isFinite(value))
  const avgConfidence = confidences.length
    ? Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length)
    : null
  const approved = incidents.filter((incident) => incident.confidence >= 80).length
  const completeAgents = Object.values(agentStates).filter((state) => state.status === 'done').length

  const stats = [
    {
      label: 'Incidents Resolved',
      value: resolved,
      icon: <CheckCircle size={16} className="text-brand-green" />,
      color: 'text-brand-green',
    },
    {
      label: 'Avg Confidence',
      value: avgConfidence == null ? '-' : `${avgConfidence}%`,
      icon: <TrendingUp size={16} className="text-brand-accent" />,
      color: 'text-brand-accent',
    },
    {
      label: 'Auto-Approved',
      value: approved,
      icon: <ShieldCheck size={16} className="text-brand-amber" />,
      color: 'text-brand-amber',
    },
    {
      label: 'Agents Complete',
      value: `${completeAgents} / 5`,
      icon: <Clock size={16} className="text-brand-muted" />,
      color: 'text-brand-text',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg border border-brand-border bg-brand-surface p-2">
            {stat.icon}
          </div>
          <div className="min-w-0">
            <div className={`font-mono text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs leading-tight text-brand-muted">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
