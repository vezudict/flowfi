'use client'

import { useMemo, useState } from 'react'
import {
  computeSimulatedScore,
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_MIN,
  MAX_CREDIT_AGE_YEARS,
  type CreditSimResult,
} from '@/lib/credit-score-sim'
import { authedFetch, readAuthedJson } from '@/lib/authed-api'

const ratingTheme: Record<
  CreditSimResult['rating'],
  { card: string; badge: string; text: string; bar: string }
> = {
  excellent: {
    card: 'ring-emerald-500/40 bg-emerald-950/80',
    badge: 'bg-emerald-500 text-white',
    text: 'text-emerald-100',
    bar: 'bg-emerald-500',
  },
  good: {
    card: 'ring-blue-500/40 bg-slate-900',
    badge: 'bg-blue-500 text-white',
    text: 'text-blue-100',
    bar: 'bg-blue-500',
  },
  average: {
    card: 'ring-amber-500/40 bg-slate-900',
    badge: 'bg-amber-500 text-amber-950',
    text: 'text-amber-100',
    bar: 'bg-amber-500',
  },
  poor: {
    card: 'ring-red-500/40 bg-slate-900',
    badge: 'bg-red-600 text-white',
    text: 'text-red-100',
    bar: 'bg-red-500',
  },
}

function SliderField({
  id,
  label,
  sublabel,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: {
  id: string
  label: string
  sublabel?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  formatValue?: (v: number) => string
}) {
  const display = formatValue ? formatValue(value) : String(value)
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {label}
        </label>
        <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {display}
        </span>
      </div>
      {sublabel && <p className="text-xs text-zinc-500 dark:text-zinc-500">{sublabel}</p>}
      <div className="relative flex items-center">
        <div className="relative h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="absolute left-0 h-full rounded-full bg-indigo-500 transition-all duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}

export function CreditScoreSimClient() {
  const [payment, setPayment] = useState(95)
  const [utilization, setUtilization] = useState(25)
  const [ageYears, setAgeYears] = useState(5)
  const [creditMix, setCreditMix] = useState(true)
  const [inquiries, setInquiries] = useState(0)

  const [aiInsights, setAiInsights] = useState<string[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const result = useMemo(
    () =>
      computeSimulatedScore({
        paymentHistoryPercent: payment,
        utilizationPercent: utilization,
        creditAgeYears: ageYears,
        creditMix,
        hardInquiries: inquiries,
      }),
    [payment, utilization, ageYears, creditMix, inquiries],
  )

  const theme = ratingTheme[result.rating]
  const scorePct = ((result.score - CREDIT_SCORE_MIN) / (CREDIT_SCORE_MAX - CREDIT_SCORE_MIN)) * 100

  async function explainWithAI() {
    setAiInsights(null)
    setAiError(null)
    setAiLoading(true)
    try {
      const res = await authedFetch('/api/credit-score-explain', {
        method: 'POST',
        json: { score: result.score, result },
      })
      const parsed = await readAuthedJson<{ insights: string[] }>(res)
      if (!parsed.ok) {
        setAiError(parsed.message)
      } else {
        setAiInsights(parsed.data.insights)
      }
    } catch {
      setAiError('Failed to reach AI. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Inputs */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
        <div className="relative space-y-6">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Factors</h2>
            <p className="mt-0.5 text-xs text-zinc-500/85 dark:text-zinc-400/85">
              Adjust sliders — score updates in real time. Educational model only, not a bureau output.
            </p>
          </div>

          <div className="space-y-5">
            <SliderField
              id="cs-payment"
              label="Payment history"
              sublabel="% of payments made on time"
              value={payment}
              min={0}
              max={100}
              step={1}
              onChange={setPayment}
              formatValue={(v) => `${v}%`}
            />
            <SliderField
              id="cs-util"
              label="Credit utilization"
              sublabel="% of total credit limit in use"
              value={utilization}
              min={0}
              max={100}
              step={1}
              onChange={setUtilization}
              formatValue={(v) => `${v}%`}
            />
            <SliderField
              id="cs-age"
              label="Credit age"
              sublabel="Average age of credit accounts"
              value={ageYears}
              min={0}
              max={MAX_CREDIT_AGE_YEARS}
              step={0.5}
              onChange={setAgeYears}
              formatValue={(v) => `${v} yr${v !== 1 ? 's' : ''}`}
            />
            <SliderField
              id="cs-inquiries"
              label="Hard inquiries (last 12 months)"
              value={inquiries}
              min={0}
              max={10}
              step={1}
              onChange={setInquiries}
              formatValue={(v) => String(v)}
            />
          </div>

          {/* Credit mix toggle */}
          <div className="flex items-center gap-3">
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
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Credit mix</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                More than one type of credit (e.g. card + loan)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Score Card */}
      <div className={`result-panel rounded-2xl border border-transparent p-6 text-white shadow-sm ring-1 ${theme.card}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${theme.badge}`}>
              {result.ratingLabel}
            </span>
            <span className="text-xs text-slate-400">
              {CREDIT_SCORE_MIN}–{CREDIT_SCORE_MAX} range
            </span>
          </div>
          <span
            className={`text-sm font-semibold tabular-nums ${
              result.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {result.delta >= 0 ? '+' : ''}{result.delta} vs. baseline
          </span>
        </div>

        <p className="mt-4 text-6xl font-bold tabular-nums tracking-tight">{result.score}</p>

        {/* Score bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-300 ${theme.bar}`}
            style={{ width: `${scorePct}%` }}
          />
        </div>

        {/* Factor breakdown */}
        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Factor breakdown
          </h3>
          <div className="mt-3 space-y-2">
            {result.factors.map((f) => (
              <div key={f.label} className="rounded-lg bg-white/5 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-200">{f.label}</span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      f.impact >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {f.impact >= 0 ? '+' : ''}{f.impact}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{f.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        <div className="mt-5 border-t border-white/10 pt-5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Quick wins
          </h3>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-300">
            {result.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        {/* AI Explain */}
        <div className="mt-5 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={explainWithAI}
            disabled={aiLoading}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
          >
            {aiLoading ? 'Analyzing…' : 'Explain score with AI'}
          </button>

          {aiError && (
            <p className="mt-3 text-sm text-red-400">{aiError}</p>
          )}

          {aiInsights && aiInsights.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">AI insights</h3>
              {aiInsights.map((insight, i) => (
                <div key={i} className="rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-3 py-2.5 text-sm text-indigo-200">
                  {insight}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
