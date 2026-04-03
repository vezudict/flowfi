'use client'

import { useMemo, useState } from 'react'
import { compareRentVsBuy, type RentVsBuyResult } from '@/lib/rent-vs-buy'
import { formatCurrency } from '@/lib/format-currency'

function parsePositive(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number.parseFloat(trimmed)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function RentVsBuyClient() {
  const [monthlyRent, setMonthlyRent] = useState('')
  const [propertyPrice, setPropertyPrice] = useState('')
  const [years, setYears] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RentVsBuyResult | null>(null)

  const fieldClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 ease-in-out focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30'

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    const rent = parsePositive(monthlyRent)
    const price = parsePositive(propertyPrice)
    const y = parsePositive(years)

    if (rent === null || price === null || y === null) {
      setError(
        'Enter valid amounts greater than zero for all fields (including years staying).',
      )
      return
    }

    setResult(
      compareRentVsBuy({
        monthlyRent: rent,
        propertyPrice: price,
        yearsPlanningToStay: y,
      }),
    )
  }

  const highlight = useMemo(() => {
    if (!result) return null
    if (result.recommendation === 'rent') {
      return {
        ring: 'ring-blue-500/30',
        bg: 'bg-blue-50 dark:bg-blue-950/35',
        chip: 'bg-blue-600 text-white dark:bg-blue-500',
        heading: 'text-blue-900 dark:text-blue-100',
      }
    }
    return {
      ring: 'ring-violet-500/30',
      bg: 'bg-violet-50 dark:bg-violet-950/35',
      chip: 'bg-violet-600 text-white dark:bg-violet-500',
      heading: 'text-violet-900 dark:text-violet-100',
    }
  }, [result])

  return (
    <div className="mt-8 space-y-8">
      <form
        onSubmit={onSubmit}
        className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
        <div className="relative">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Assumptions
        </h2>
        <p className="mt-1 text-xs text-zinc-500/85 dark:text-zinc-400/85">
          Total rent is monthly rent × 12 × years. Buying uses price × 1.2 as a
          simple all-in estimate (fees, interest cushion—not a mortgage quote).
        </p>

        <div className="mt-5 grid gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="rvb-rent"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Monthly rent
            </label>
            <input
              id="rvb-rent"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              required
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              className={fieldClass}
              placeholder="e.g. 2200"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="rvb-price"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Property price
            </label>
            <input
              id="rvb-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              required
              value={propertyPrice}
              onChange={(e) => setPropertyPrice(e.target.value)}
              className={fieldClass}
              placeholder="e.g. 450000"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="rvb-years"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Years planning to stay
            </label>
            <input
              id="rvb-years"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              required
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className={fieldClass}
              placeholder="e.g. 5"
            />
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
          Compare
        </button>
        </div>
      </form>

      <div aria-live="polite">
        {result && highlight ? (
          <div
            className={`result-panel rounded-2xl border border-transparent p-6 shadow-sm ring-1 ${highlight.ring} ${highlight.bg}`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Recommendation
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-base font-semibold ${highlight.chip}`}
              >
                {result.recommendationLabel}
              </span>
            </div>
            <p
              className={`mt-4 text-lg font-semibold tracking-tight ${highlight.heading}`}
            >
              Based on this simple comparison, {result.recommendationLabel}{' '}
              looks more favorable.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {result.summary}
            </p>

            <dl className="mt-6 space-y-3 border-t border-zinc-200/80 pt-5 text-sm dark:border-zinc-700/80">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-zinc-500 dark:text-zinc-400">
                  Total rent paid
                </dt>
                <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(result.totalRentPaid)}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-zinc-500 dark:text-zinc-400">
                  Estimated buying cost (price × 1.2)
                </dt>
                <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(result.estimatedBuyingCost)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  )
}
