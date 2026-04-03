'use client'

import { useMemo, useState } from 'react'
import {
  evaluatePurchaseDecision,
  type DecisionEvaluation,
} from '@/lib/decision-engine'
import { formatCurrency } from '@/lib/format-currency'

function parseNonNegative(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number.parseFloat(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

const verdictStyles: Record<
  DecisionEvaluation['verdict'],
  { ring: string; bg: string; badge: string; title: string }
> = {
  affordable: {
    ring: 'ring-emerald-500/30',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badge: 'bg-emerald-600 text-white dark:bg-emerald-500',
    title: 'text-emerald-900 dark:text-emerald-100',
  },
  risky: {
    ring: 'ring-amber-400/50',
    bg: 'bg-amber-50 dark:bg-amber-950/35',
    badge: 'bg-amber-500 text-amber-950 dark:bg-amber-400 dark:text-amber-950',
    title: 'text-amber-950 dark:text-amber-100',
  },
  'not-affordable': {
    ring: 'ring-red-500/35',
    bg: 'bg-red-50 dark:bg-red-950/35',
    badge: 'bg-red-600 text-white dark:bg-red-500',
    title: 'text-red-900 dark:text-red-100',
  },
  'no-disposable-income': {
    ring: 'ring-red-500/35',
    bg: 'bg-red-50 dark:bg-red-950/35',
    badge: 'bg-red-600 text-white dark:bg-red-500',
    title: 'text-red-900 dark:text-red-100',
  },
}

export function DecisionEngineClient() {
  const [purchase, setPurchase] = useState('')
  const [income, setIncome] = useState('')
  const [spending, setSpending] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DecisionEvaluation | null>(null)

  const fieldClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-100/10'

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    const purchaseAmount = parseNonNegative(purchase)
    const monthlyIncome = parseNonNegative(income)
    const monthlySpending = parseNonNegative(spending)

    if (
      purchaseAmount === null ||
      monthlyIncome === null ||
      monthlySpending === null
    ) {
      setError(
        'Enter valid numbers (zero or greater). All fields are required.',
      )
      return
    }

    setResult(
      evaluatePurchaseDecision({
        purchaseAmount,
        monthlyIncome,
        monthlySpending,
      }),
    )
  }

  const styles = useMemo(
    () => (result ? verdictStyles[result.verdict] : null),
    [result],
  )

  return (
    <div className="mt-8 space-y-8">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Your numbers
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          We compare the purchase against monthly disposable income (income minus
          typical spending).
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-1">
          <div className="space-y-1.5">
            <label
              htmlFor="de-purchase"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Purchase amount
            </label>
            <input
              id="de-purchase"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              required
              value={purchase}
              onChange={(e) => setPurchase(e.target.value)}
              className={fieldClass}
              placeholder="e.g. 1200"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="de-income"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Monthly income
            </label>
            <input
              id="de-income"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              required
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className={fieldClass}
              placeholder="e.g. 5000"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="de-spending"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Monthly spending
            </label>
            <input
              id="de-spending"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              required
              value={spending}
              onChange={(e) => setSpending(e.target.value)}
              className={fieldClass}
              placeholder="e.g. 3800"
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
          className="mt-6 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Evaluate purchase
        </button>
      </form>

      <div aria-live="polite">
        {result && styles ? (
          <div
            className={`rounded-2xl border border-transparent p-6 shadow-sm ring-1 ${styles.ring} ${styles.bg}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}
              >
                {result.label}
              </span>
              {result.purchaseShareOfDisposable !== null ? (
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Purchase is{' '}
                  {new Intl.NumberFormat(undefined, {
                    style: 'percent',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                  }).format(result.purchaseShareOfDisposable)}{' '}
                  of disposable income
                </span>
              ) : null}
            </div>
            <h3
              className={`mt-3 text-lg font-semibold tracking-tight ${styles.title}`}
            >
              Decision: {result.label}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {result.explanation}
            </p>
            <dl className="mt-5 grid gap-2 border-t border-zinc-200/80 pt-4 text-sm dark:border-zinc-700/80">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">
                  Disposable income (income − spending)
                </dt>
                <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(result.disposableIncome)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  )
}
