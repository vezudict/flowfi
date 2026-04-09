'use client'

import { useMemo, useState } from 'react'
import { sanitizeUnsignedDecimalInput } from '@/lib/numeric-input'
import { estimateIncomeTax } from '@/lib/tax-estimator'
import { formatRupee } from '@/lib/format-currency'

function parseIncome(value: string): number | null {
  const t = value.trim()
  if (t === '') return null
  const n = Number.parseFloat(t)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function TaxEstimatorClient() {
  const [incomeRaw, setIncomeRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submittedIncome, setSubmittedIncome] = useState<number | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const income = parseIncome(incomeRaw)
    if (income === null) {
      setError('Enter a valid annual income (zero or a positive number).')
      setSubmittedIncome(null)
      return
    }
    setSubmittedIncome(income)
  }

  const result = useMemo(() => {
    if (submittedIncome === null) return null
    return estimateIncomeTax(submittedIncome)
  }, [submittedIncome])

  const fieldClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 ease-in-out focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30'

  return (
    <div className="mt-8 space-y-8">
      <form
        onSubmit={onSubmit}
        className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
        <div className="relative">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Income
        </h2>
        <p className="mt-1 text-xs text-zinc-500/85 dark:text-zinc-400/85">
          Annual taxable income in ₹ (simplified progressive slabs: 0–2.5L, 2.5–5L,
          5–10L, 10L+). Not official tax advice.
        </p>

        <div className="mt-5 space-y-1.5">
          <label
            htmlFor="tax-income"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Annual income (₹)
          </label>
          <input
            id="tax-income"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required
            value={incomeRaw}
            onChange={(e) => setIncomeRaw(sanitizeUnsignedDecimalInput(e.target.value))}
            className={`${fieldClass} tabular-nums`}
            placeholder="e.g. 800000"
          />
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
          className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-indigo-700 hover:shadow active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Estimate tax
        </button>
        </div>
      </form>

      <div aria-live="polite">
        {result && submittedIncome !== null ? (
          <div className="result-panel rounded-2xl border border-transparent bg-slate-900 p-6 text-white shadow-sm ring-1 ring-slate-700 dark:bg-slate-950">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Estimated tax
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              {formatRupee(result.estimatedTax, 0)}
            </p>
            <dl className="mt-6 space-y-3 border-t border-slate-700 pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Effective tax rate</dt>
                <dd className="font-medium tabular-nums">
                  {new Intl.NumberFormat(undefined, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 2,
                  }).format(result.effectiveTaxRatePercent)}
                  %
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Annual income</dt>
                <dd className="font-medium tabular-nums">
                  {formatRupee(submittedIncome, 0)}
                </dd>
              </div>
            </dl>
            {submittedIncome === 0 ? (
              <p className="mt-4 text-xs text-slate-400">
                No income entered — estimated tax is zero.
              </p>
            ) : result.estimatedTax === 0 ? (
              <p className="mt-4 text-xs text-slate-400">
                Income falls in the nil slab (up to ₹2.5L under this simplified
                model).
              </p>
            ) : null}

            {result.breakdown && result.breakdown.length > 0 ? (
              <div className="mt-6 border-t border-slate-700 pt-5">
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Tax breakdown
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Amount taxed in each slab (progressive).
                </p>
                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/40">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead className="border-b border-slate-700 bg-slate-800/60">
                      <tr>
                        <th className="px-3 py-2.5 font-medium text-slate-400">
                          Range
                        </th>
                        <th className="px-3 py-2.5 font-medium text-slate-400">
                          Taxable
                        </th>
                        <th className="px-3 py-2.5 font-medium text-slate-400">
                          Rate
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-slate-400">
                          Tax
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/80">
                      {result.breakdown.map((row) => (
                        <tr key={row.range}>
                          <td className="px-3 py-2.5 text-slate-200">
                            {row.range}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-300">
                            {formatRupee(row.taxableAmount, 0)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-300">
                            {row.ratePercent}%
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-medium text-white">
                            {formatRupee(row.tax, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
