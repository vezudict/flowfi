'use client'

import { useMemo, useState } from 'react'
import {
  computeSimulatedScore,
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_MIN,
  MAX_CREDIT_AGE_YEARS,
  type CreditSimResult,
} from '@/lib/credit-score-sim'

function parsePercent(value: string): number | null {
  const t = value.trim()
  if (t === '') return null
  const n = Number.parseFloat(t)
  if (!Number.isFinite(n) || n < 0 || n > 100) return null
  return n
}

function parseAge(value: string): number | null {
  const t = value.trim()
  if (t === '') return null
  const n = Number.parseFloat(t)
  if (!Number.isFinite(n) || n < 0 || n > MAX_CREDIT_AGE_YEARS) return null
  return n
}

const ratingTheme: Record<
  CreditSimResult['rating'],
  { card: string; badge: string; text: string }
> = {
  excellent: {
    card: 'ring-emerald-500/40 bg-emerald-950/80',
    badge: 'bg-emerald-500 text-white',
    text: 'text-emerald-100',
  },
  good: {
    card: 'ring-blue-500/40 bg-slate-900',
    badge: 'bg-blue-500 text-white',
    text: 'text-blue-100',
  },
  average: {
    card: 'ring-amber-500/40 bg-slate-900',
    badge: 'bg-amber-500 text-amber-950',
    text: 'text-amber-100',
  },
  poor: {
    card: 'ring-red-500/40 bg-slate-900',
    badge: 'bg-red-600 text-white',
    text: 'text-red-100',
  },
}

export function CreditScoreSimClient() {
  const [payment, setPayment] = useState('95')
  const [utilization, setUtilization] = useState('25')
  const [ageYears, setAgeYears] = useState('5')
  const [creditMix, setCreditMix] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreditSimResult | null>(null)

  const fieldClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors duration-150 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20'

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const p = parsePercent(payment)
    const u = parsePercent(utilization)
    const a = parseAge(ageYears)
    if (p === null || u === null || a === null) {
      setError(
        `Use 0–100% for payment history and utilization, and 0–${MAX_CREDIT_AGE_YEARS} years for credit age.`,
      )
      setResult(null)
      return
    }
    setResult(
      computeSimulatedScore({
        paymentHistoryPercent: p,
        utilizationPercent: u,
        creditAgeYears: a,
        creditMix,
      }),
    )
  }

  const theme = useMemo(
    () => (result ? ratingTheme[result.rating] : null),
    [result],
  )

  return (
    <div className="mt-8 space-y-8">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Factors
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Approximate inputs for a classroom-style score— not FICO, Vantage, or
          any real bureau output.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-1">
            <label
              htmlFor="cs-payment"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Payment history (0–100%)
            </label>
            <input
              id="cs-payment"
              type="number"
              min={0}
              max={100}
              step="any"
              required
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              className={fieldClass}
              placeholder="e.g. 95"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <label
              htmlFor="cs-util"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Credit utilization (0–100%)
            </label>
            <input
              id="cs-util"
              type="number"
              min={0}
              max={100}
              step="any"
              required
              value={utilization}
              onChange={(e) => setUtilization(e.target.value)}
              className={fieldClass}
              placeholder="e.g. 25"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="cs-age"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Credit age (years, max {MAX_CREDIT_AGE_YEARS})
            </label>
            <input
              id="cs-age"
              type="number"
              min={0}
              max={MAX_CREDIT_AGE_YEARS}
              step="any"
              required
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
              className={fieldClass}
              placeholder="e.g. 5"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="button"
              role="switch"
              aria-checked={creditMix}
              aria-label="Credit mix"
              onClick={() => setCreditMix((v) => !v)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
                creditMix ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                  creditMix ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Credit mix
              </span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Toggle on if you have more than one type of credit (e.g. card +
                loan).
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-6 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-[0.97] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Simulate score
        </button>
      </form>

      <div aria-live="polite">
        {result && theme ? (
          <div
            className={`result-panel rounded-2xl border border-transparent p-6 text-white shadow-sm ring-1 ${theme.card}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${theme.badge}`}
              >
                {result.ratingLabel}
              </span>
              <span className="text-xs text-slate-400">
                Simulated range {CREDIT_SCORE_MIN}–{CREDIT_SCORE_MAX}
              </span>
            </div>
            <p className="mt-4 text-5xl font-bold tabular-nums tracking-tight">
              {result.score}
            </p>
            <p className={`mt-2 text-sm font-medium ${theme.text}`}>
              {result.ratingLabel} (educational demo only)
            </p>
            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Ideas to explore
              </h3>
              <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-300">
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
