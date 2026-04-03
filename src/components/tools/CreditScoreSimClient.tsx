'use client'

import { useMemo, useState } from 'react'
import {
  computeSimulatedScore,
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_MIN,
  MAX_CREDIT_AGE_YEARS,
  type CreditSimResult,
} from '@/lib/credit-score-sim'
import { sanitizeUnsignedDecimalInput } from '@/lib/numeric-input'

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
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 ease-in-out focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30'

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
        className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
        <div className="relative">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Factors
        </h2>
        <p className="mt-1 text-xs text-zinc-500/85 dark:text-zinc-400/85">
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
              type="text"
              inputMode="decimal"
              autoComplete="off"
              required
              value={payment}
              onChange={(e) => setPayment(sanitizeUnsignedDecimalInput(e.target.value))}
              className={`${fieldClass} tabular-nums`}
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
              type="text"
              inputMode="decimal"
              autoComplete="off"
              required
              value={utilization}
              onChange={(e) => setUtilization(sanitizeUnsignedDecimalInput(e.target.value))}
              className={`${fieldClass} tabular-nums`}
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
              type="text"
              inputMode="decimal"
              autoComplete="off"
              required
              value={ageYears}
              onChange={(e) => setAgeYears(sanitizeUnsignedDecimalInput(e.target.value))}
              className={`${fieldClass} tabular-nums`}
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
              className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-150 ease-in-out ${
                creditMix ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'
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
          className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-indigo-700 hover:shadow active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Simulate score
        </button>
        </div>
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
