'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { SupportedCurrencyCode } from '@/lib/currencies'
import { formatCurrency } from '@/lib/format-currency'
import { sanitizeUnsignedDecimalInput } from '@/lib/numeric-input'

const inputClass =
  'w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 ease-in-out focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30'

type MonthlyBudgetCardProps = {
  monthLabel: string
  spentThisMonth: number
  monthlyBudget: number | null
  currency: SupportedCurrencyCode
  onSaveBudget: (amount: number | null) => Promise<{ error: string | null }>
}

function budgetBarColorClass(pct: number): string {
  if (pct < 70) return 'bg-emerald-500 dark:bg-emerald-500'
  if (pct <= 90) return 'bg-amber-500 dark:bg-amber-400'
  return 'bg-red-500 dark:bg-red-500'
}

export function MonthlyBudgetCard({
  monthLabel,
  spentThisMonth,
  monthlyBudget,
  currency,
  onSaveBudget,
}: MonthlyBudgetCardProps) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(
      monthlyBudget !== null && monthlyBudget > 0
        ? String(monthlyBudget)
        : '',
    )
  }, [monthlyBudget])

  const cap = monthlyBudget !== null && monthlyBudget > 0 ? monthlyBudget : null
  const pctUsed = cap ? Math.min(999, (spentThisMonth / cap) * 100) : 0
  const barWidth = cap ? Math.min(100, pctUsed) : 0
  const remaining = cap !== null ? cap - spentThisMonth : null

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)
    const t = draft.trim()
    if (t === '') {
      setSaving(true)
      const { error } = await onSaveBudget(null)
      setSaving(false)
      if (error) setSaveError(error)
      return
    }
    const n = Number.parseFloat(t)
    if (!Number.isFinite(n) || n < 0) {
      setSaveError('Enter a valid non-negative amount.')
      return
    }
    setSaving(true)
    const { error } = await onSaveBudget(n)
    setSaving(false)
    if (error) setSaveError(error)
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white/80 p-4 backdrop-blur-sm transition-all duration-200 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Monthly budget
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Compared to spending in {monthLabel}. Resets each calendar month.
            </p>
          </div>
        </div>

        {cap !== null ? (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <p className="text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-500 dark:text-zinc-400">Spent </span>
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(spentThisMonth, currency)}
                </span>
              </p>
              <p className="text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-500 dark:text-zinc-400">Budget </span>
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(cap, currency)}
                </span>
              </p>
              <p className="text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-500 dark:text-zinc-400">Remaining </span>
                <span
                  className={`font-semibold tabular-nums ${
                    remaining !== null && remaining < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-zinc-900 dark:text-zinc-50'
                  }`}
                >
                  {remaining !== null ? formatCurrency(remaining, currency) : '—'}
                </span>
              </p>
              <p className="text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-500 dark:text-zinc-400">Used </span>
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {cap ? `${Math.round(pctUsed)}%` : '—'}
                </span>
              </p>
            </div>

            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200/90 dark:bg-zinc-800"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(100, pctUsed))}
              aria-label="Budget used this month"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${budgetBarColorClass(pctUsed)}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Set a monthly cap to track how much of your budget you have used this month.
          </p>
        )}

        <form onSubmit={handleSave} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label htmlFor="monthly-budget-input" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Monthly budget amount
            </label>
            <input
              id="monthly-budget-input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(sanitizeUnsignedDecimalInput(e.target.value))}
              className={`${inputClass} tabular-nums`}
              placeholder="e.g. 2000"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Save budget'
            )}
          </button>
        </form>
        {saveError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {saveError}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          Clear the field and save to remove your budget.
        </p>
      </div>
    </section>
  )
}
