'use client'

import { useRef, useState } from 'react'
import { authedFetch, readAuthedJson } from '@/lib/authed-api'
import type { DecisionResult } from '@/app/api/decision-engine/route'

// ---------------------------------------------------------------------------
// Verdict config
// ---------------------------------------------------------------------------

const VERDICT_CONFIG = {
  yes: {
    label: 'Yes',
    ring: 'ring-emerald-500/30',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badge: 'bg-emerald-600 text-white dark:bg-emerald-500',
    dot: 'bg-emerald-500',
    heading: 'text-emerald-900 dark:text-emerald-100',
  },
  no: {
    label: 'No',
    ring: 'ring-red-500/35',
    bg: 'bg-red-50 dark:bg-red-950/35',
    badge: 'bg-red-600 text-white dark:bg-red-500',
    dot: 'bg-red-500',
    heading: 'text-red-900 dark:text-red-100',
  },
  depends: {
    label: 'Depends',
    ring: 'ring-amber-400/50',
    bg: 'bg-amber-50 dark:bg-amber-950/35',
    badge: 'bg-amber-500 text-amber-950 dark:bg-amber-400 dark:text-amber-950',
    dot: 'bg-amber-500',
    heading: 'text-amber-950 dark:text-amber-100',
  },
} satisfies Record<DecisionResult['verdict'], object>

const CONFIDENCE_LABEL: Record<DecisionResult['confidence'], string> = {
  low: 'Low confidence',
  medium: 'Medium confidence',
  high: 'High confidence',
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className ?? ''}`}
    />
  )
}

function ResultSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="mt-4 h-5 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </div>
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <Skeleton className="mb-3 h-4 w-20" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Result panel
// ---------------------------------------------------------------------------

function ResultPanel({ result }: { result: DecisionResult }) {
  const cfg = VERDICT_CONFIG[result.verdict]

  return (
    <div className="result-panel space-y-4">
      {/* Verdict card */}
      <div
        className={`rounded-2xl border border-transparent p-6 shadow-sm ring-1 ${cfg.ring} ${cfg.bg}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide ${cfg.badge}`}
            >
              {cfg.label}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {CONFIDENCE_LABEL[result.confidence]}
            </span>
          </div>
          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} aria-hidden />
        </div>
        <p className={`mt-4 text-base font-semibold leading-snug ${cfg.heading}`}>
          {result.summary}
        </p>
      </div>

      {/* Reasons */}
      {result.reasons.length > 0 && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Reasons
          </h3>
          <ul className="space-y-2.5">
            {result.reasons.map((reason, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600" aria-hidden />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Suggestions
          </h3>
          <ul className="space-y-2.5">
            {result.suggestions.map((suggestion, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                <span className="mt-1 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden>→</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.fallback && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          Not enough financial data yet. Add more transactions to get a personalized AI analysis.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main client
// ---------------------------------------------------------------------------

export function DecisionEngineClient() {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<DecisionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSubmit = question.trim().length > 5 && !loading

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canSubmit) return

    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const res = await authedFetch('/api/decision-engine', {
        method: 'POST',
        json: { question: question.trim() },
      })
      const parsed = await readAuthedJson<DecisionResult>(res)
      if (!parsed.ok) {
        setError(parsed.message)
      } else {
        setResult(parsed.data)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-6">
      {/* Input card */}
      <form
        onSubmit={handleSubmit}
        className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/80 p-5 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-zinc-900/[0.02] to-transparent dark:from-zinc-100/[0.02]" />
        <div className="relative space-y-4">
          <textarea
            ref={textareaRef}
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Should I buy a ₹80,000 phone right now?"
            className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition-colors duration-150 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-700/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Press <kbd className="rounded border border-zinc-200 px-1 py-0.5 font-mono text-[10px] dark:border-zinc-700">Enter</kbd> to analyze &middot; <kbd className="rounded border border-zinc-200 px-1 py-0.5 font-mono text-[10px] dark:border-zinc-700">Shift+Enter</kbd> for newline
            </p>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? 'Analyzing…' : 'Analyze Decision'}
            </button>
          </div>
        </div>
      </form>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {/* Loading skeleton */}
      {loading && <ResultSkeleton />}

      {/* Results */}
      {!loading && result && <ResultPanel result={result} />}
    </div>
  )
}
