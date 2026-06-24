import React, { useState } from 'react'
import { Check, Copy, ExternalLink, GitMerge } from 'lucide-react'

export default function PatchDiffViewer({ patch, prUrl }) {
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState('split')

  const copy = async () => {
    await navigator.clipboard.writeText(patch?.fixed || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!patch) {
    return (
      <div className="card flex min-h-[220px] flex-col items-center justify-center gap-3 p-5 text-brand-muted">
        <GitMerge size={28} className="opacity-30" />
        <span className="text-sm">Waiting for code repair agent...</span>
      </div>
    )
  }

  const originalLines = (patch.original || '').split('\n')
  const fixedLines = (patch.fixed || '').split('\n')
  const maxLines = Math.max(originalLines.length, fixedLines.length)
  const originalPadded = pad(originalLines, maxLines)
  const fixedPadded = pad(fixedLines, maxLines)
  const changed = originalPadded.map((line, index) => line !== fixedPadded[index])

  return (
    <div className="card flex flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <GitMerge size={14} className="shrink-0 text-brand-accent" />
          <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-brand-text">
            Patch Diff
          </span>
          {patch.file && (
            <span className="truncate rounded bg-brand-accent/10 px-2 py-0.5 font-mono text-xs text-brand-accent">
              {patch.file}
              {patch.line ? `:${patch.line}` : ''}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setView(view === 'split' ? 'unified' : 'split')}
            className="font-mono text-xs text-brand-muted transition-colors hover:text-brand-text"
          >
            {view === 'split' ? 'Unified' : 'Split'}
          </button>
          <button
            onClick={copy}
            className="flex items-center gap-1 font-mono text-xs text-brand-muted transition-colors hover:text-brand-green"
          >
            {copied ? <Check size={12} className="text-brand-green" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy fix'}
          </button>
          {prUrl && (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-xs text-brand-accent hover:underline"
            >
              <ExternalLink size={11} />
              View PR
            </a>
          )}
        </div>
      </div>

      {view === 'split' ? (
        <div className="grid max-h-[360px] grid-cols-1 overflow-auto font-mono text-xs md:grid-cols-2">
          <div className="border-b border-brand-border md:border-b-0 md:border-r">
            <div className="border-b border-brand-border bg-brand-red/10 px-3 py-1.5 text-xs font-semibold text-brand-red">
              - Original
            </div>
            <LineList lines={originalPadded} changed={changed} tone="red" />
          </div>

          <div>
            <div className="border-b border-brand-border bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green">
              + Fixed
            </div>
            <LineList lines={fixedPadded} changed={changed} tone="green" />
          </div>
        </div>
      ) : (
        <div className="max-h-[360px] space-y-0 overflow-auto p-2 font-mono text-xs">
          {originalPadded.map((originalLine, index) => {
            const fixedLine = fixedPadded[index]
            if (!changed[index]) {
              return (
                <div key={index} className="flex gap-2 px-1 leading-5">
                  <span className="w-7 shrink-0 select-none text-right text-brand-muted opacity-40">
                    {index + 1}
                  </span>
                  <span className="text-brand-muted"> </span>
                  <span className="text-brand-text opacity-60">{originalLine || '\u00A0'}</span>
                </div>
              )
            }

            return (
              <React.Fragment key={index}>
                {originalLine && (
                  <div className="flex gap-2 rounded bg-red-950/50 px-1 leading-5">
                    <span className="w-7 shrink-0 select-none text-right text-brand-muted opacity-40">
                      {index + 1}
                    </span>
                    <span className="font-bold text-brand-red">-</span>
                    <span className="text-red-300">{originalLine}</span>
                  </div>
                )}
                {fixedLine && (
                  <div className="flex gap-2 rounded bg-green-950/50 px-1 leading-5">
                    <span className="w-7 shrink-0 select-none text-right text-brand-muted opacity-40">
                      {index + 1}
                    </span>
                    <span className="font-bold text-brand-green">+</span>
                    <span className="text-green-300">{fixedLine}</span>
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LineList({ lines, changed, tone }) {
  const changedBg = tone === 'red' ? 'bg-red-950/60' : 'bg-green-950/60'
  const changedText = tone === 'red' ? 'text-red-300' : 'text-green-300'

  return (
    <div className="space-y-0 p-2">
      {lines.map((line, index) => (
        <div
          key={index}
          className={`flex gap-2 rounded px-1 leading-5 ${changed[index] ? changedBg : ''}`}
        >
          <span className="w-7 shrink-0 select-none text-right text-brand-muted opacity-50">
            {index + 1}
          </span>
          <span className={changed[index] ? changedText : 'text-brand-text opacity-70'}>
            {line || '\u00A0'}
          </span>
        </div>
      ))}
    </div>
  )
}

function pad(lines, length) {
  return [...lines, ...Array(length - lines.length).fill('')]
}
