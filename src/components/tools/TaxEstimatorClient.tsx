'use client'

import { useMemo, useState } from 'react'
import { sanitizeUnsignedDecimalInput } from '@/lib/numeric-input'
import { estimateIncomeTax, MAX_80C, MAX_STANDARD_DEDUCTION } from '@/lib/tax-estimator'
import { formatRupee } from '@/lib/format-currency'
import { authedFetch, readAuthedJson } from '@/lib/authed-api'

function parseIncome(value: string): number | null {
  const t = value.trim()
  if (t === '') return null
  const n = Number.parseFloat(t)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

const fieldClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 ease-in-out focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30'

const labelClass = 'block text-xs font-medium text-zinc-600 dark:text-zinc-400'

export function TaxEstimatorClient() {
  const [incomeRaw, setIncomeRaw] = useState('')
  const [c80cRaw, setC80cRaw] = useState('')
  const [hraRaw, setHraRaw] = useState('')
  const [useStandardDeduction, setUseStandardDeduction] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [aiInsights, setAiInsights] = useState<string[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const income = parseIncome(incomeRaw)
    if (income === null) {
      setError('Enter a valid annual income (zero or a positive number).')
      setSubmitted(false)
      return
    }
    setSubmitted(true)
    setAiInsights(null)
  }

  const parsedIncome = parseIncome(incomeRaw)
  const parsed80c = parseIncome(c80cRaw)
  const parsedHra = parseIncome(hraRaw)

  const result = useMemo(() => {
    if (!submitted || parsedIncome === null) return null
    return estimateIncomeTax(parsedIncome, {
      section80C: parsed80c ?? 0,
      hra: parsedHra ?? 0,
      standardDeduction: useStandardDeduction ? MAX_STANDARD_DEDUCTION : 0,
    })
  }, [submitted, parsedIncome, parsed80c, parsedHra, useStandardDeduction])

  async function optimizeWithAI() {
    if (!result) return
    setAiInsights(null)
    setAiError(null)
    setAiLoading(true)
    try {
      const res = await authedFetch('/api/tax-optimize', {
        method: 'POST',
        json: { estimate: result },
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

  // Score bar for slab visualization
  function slabPct(taxableAmount: number, grossIncome: number) {
    if (grossIncome <= 0) return 0
    return Math.min((taxableAmount / grossIncome) * 100, 100)
  }

  const slabColors = ['bg-emerald-500', 'bg-amber-400', 'bg-orange-500', 'bg-red-500']

  return (
    <div className="mt-8 space-y-6">
      {/* Income + Deductions form */}
      <form
        onSubmit={onSubmit}
        className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
        <div className="relative space-y-6">
          {/* Income */}
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Income</h2>
            <p className="mt-0.5 text-xs text-zinc-500/85 dark:text-zinc-400/85">
              Annual taxable income in ₹ — simplified progressive slabs. Not official tax advice.
            </p>
            <div className="mt-4 space-y-1.5">
              <label htmlFor="tax-income" className={labelClass}>Annual income (₹)</label>
              <input
                id="tax-income"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                value={incomeRaw}
                onChange={(e) => { setIncomeRaw(sanitizeUnsignedDecimalInput(e.target.value)); setSubmitted(false) }}
                className={`${fieldClass} tabular-nums`}
                placeholder="e.g. 800000"
              />
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Deductions</h3>
            <p className="mt-0.5 text-xs text-zinc-500/85 dark:text-zinc-400/85">
              Add deductions to reduce your taxable income.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="tax-80c" className={labelClass}>
                  Section 80C (max ₹{(MAX_80C / 1000).toFixed(0)}K)
                </label>
                <input
                  id="tax-80c"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={c80cRaw}
                  onChange={(e) => { setC80cRaw(sanitizeUnsignedDecimalInput(e.target.value)); setSubmitted(false) }}
                  className={`${fieldClass} tabular-nums`}
                  placeholder="e.g. 150000"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-500">PPF, ELSS, LIC, EPF, ULIP</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tax-hra" className={labelClass}>HRA exemption (₹)</label>
                <input
                  id="tax-hra"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={hraRaw}
                  onChange={(e) => { setHraRaw(sanitizeUnsignedDecimalInput(e.target.value)); setSubmitted(false) }}
                  className={`${fieldClass} tabular-nums`}
                  placeholder="e.g. 120000"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-500">For salaried employees who pay rent</p>
              </div>
            </div>

            {/* Standard deduction toggle */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={useStandardDeduction}
                onClick={() => { setUseStandardDeduction((v) => !v); setSubmitted(false) }}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-150 ${
                  useStandardDeduction ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                    useStandardDeduction ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Standard deduction
                </span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Flat ₹{(MAX_STANDARD_DEDUCTION / 1000).toFixed(0)}K for salaried individuals (section 16)
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-indigo-700 hover:shadow active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Estimate tax
          </button>
        </div>
      </form>

      {/* Results */}
      <div aria-live="polite">
        {result && (
          <div className="result-panel rounded-2xl border border-transparent bg-slate-900 p-6 text-white shadow-sm ring-1 ring-slate-700 dark:bg-slate-950 space-y-6">
            {/* Header */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Estimated tax</p>
              <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">
                {formatRupee(result.estimatedTax, 0)}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Effective rate</span>
                  <span className="ml-2 font-semibold tabular-nums">
                    {result.effectiveTaxRatePercent.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Taxable income</span>
                  <span className="ml-2 font-semibold tabular-nums">{formatRupee(result.taxableIncome, 0)}</span>
                </div>
                {result.totalDeductions > 0 && (
                  <div>
                    <span className="text-emerald-400">Deductions</span>
                    <span className="ml-2 font-semibold tabular-nums text-emerald-300">
                      −{formatRupee(result.totalDeductions, 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Slab visualization */}
            {result.breakdown.length > 0 && (
              <div className="border-t border-slate-700 pt-5">
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-3">
                  Tax slab breakdown
                </h3>
                <div className="space-y-3">
                  {result.breakdown.map((row, i) => (
                    <div key={row.range}>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="text-slate-300">{row.range}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 text-xs tabular-nums">{row.ratePercent}%</span>
                          <span className={`font-medium tabular-nums ${row.tax > 0 ? 'text-white' : 'text-slate-500'}`}>
                            {row.tax > 0 ? formatRupee(row.tax, 0) : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${slabColors[i] ?? 'bg-slate-500'}`}
                          style={{ width: `${slabPct(row.taxableAmount, result.grossIncome)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="border-t border-slate-700 pt-5">
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-3">
                  Savings opportunities
                </h3>
                <ul className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="flex gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200"
                    >
                      <span className="mt-0.5 shrink-0">💡</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Optimize */}
            <div className="border-t border-slate-700 pt-5">
              <button
                type="button"
                onClick={optimizeWithAI}
                disabled={aiLoading}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
              >
                {aiLoading ? 'Optimizing…' : 'Optimize tax with AI'}
              </button>

              {aiError && <p className="mt-3 text-sm text-red-400">{aiError}</p>}

              {aiInsights && aiInsights.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">AI optimization insights</h3>
                  {aiInsights.map((insight, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-3 py-2.5 text-sm text-indigo-200"
                    >
                      {insight}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
