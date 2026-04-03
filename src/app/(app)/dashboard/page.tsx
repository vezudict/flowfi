'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Pencil, Receipt, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart'
import { SpendingBarChart } from '@/components/dashboard/SpendingBarChart'
import { FinancialInsights } from '@/components/dashboard/FinancialInsights'
import { MonthlyBudgetCard } from '@/components/dashboard/MonthlyBudgetCard'
import { SummaryCard } from '@/components/dashboard/SummaryCard'
import { TransactionEditModal } from '@/components/dashboard/TransactionEditModal'
import { useAuth } from '@/contexts/auth-context'
import { fetchProfileBudget, updateMonthlyBudget } from '@/lib/profile-budget'
import { suggestCategoryFromDescription } from '@/lib/category-suggestion'
import { sanitizeUnsignedDecimalInput } from '@/lib/numeric-input'
import { formatAmountPlain, formatCurrency } from '@/lib/format-currency'
import { buildSpendingInsights } from '@/lib/spending-insights'
import { computeAnalytics, normalizeAmount } from '@/lib/transaction-analytics'
import {
  deleteTransaction,
  fetchTransactionsForUser,
  insertTransaction,
  type Transaction,
} from '@/lib/transactions'

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 ease-in-out focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30'

function DashboardLoadingSkeleton() {
  return (
    <div className="mx-auto min-h-full w-full max-w-6xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="space-y-2">
        <div className="h-10 w-52 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/80" />
      </div>
      <div className="grid min-h-[116px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[116px] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-40 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[320px] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-[320px] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-[420px] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const categorySyncedFromSuggestion = useRef<string | null>(null)

  const suggestedCategory = useMemo(
    () => suggestCategoryFromDescription(description),
    [description],
  )

  useEffect(() => {
    const suggestion = suggestedCategory
    setCategory((prev) => {
      const prevTrim = prev.trim()
      if (suggestion) {
        if (!prevTrim || prevTrim === categorySyncedFromSuggestion.current) {
          categorySyncedFromSuggestion.current = suggestion
          return suggestion
        }
        return prev
      }
      if (!prevTrim || prevTrim === categorySyncedFromSuggestion.current) {
        categorySyncedFromSuggestion.current = null
        return ''
      }
      return prev
    })
  }, [suggestedCategory])

  const analytics = useMemo(
    () => computeAnalytics(transactions),
    [transactions],
  )

  const spendingInsights = useMemo(
    () => buildSpendingInsights(transactions),
    [transactions],
  )

  function coerceMonthlyBudget(raw: unknown): number | null {
    if (raw === null || raw === undefined) return null
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(n) || n < 0) return null
    return n
  }

  const loadDashboard = useCallback(async () => {
    if (!user) return
    setListLoading(true)
    setListError(null)
    const [txRes, profileRes] = await Promise.all([
      fetchTransactionsForUser(user.id),
      fetchProfileBudget(user.id),
    ])
    setListLoading(false)
    if (txRes.error) {
      console.error('[dashboard] fetch transactions:', txRes.error)
      setListError(txRes.error.message)
    } else {
      setTransactions((txRes.data as Transaction[] | null) ?? [])
    }
    if (profileRes.error) {
      console.error('[dashboard] fetch budget:', profileRes.error)
      setMonthlyBudget(null)
    } else {
      setMonthlyBudget(coerceMonthlyBudget(profileRes.data?.monthly_budget))
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    void loadDashboard()
  }, [user, loadDashboard])

  function handleTransactionSaved(updated: Transaction) {
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  async function handleDeleteTransaction(tx: Transaction) {
    if (!user) return
    if (
      !confirm(
        'Delete this transaction? This cannot be undone.',
      )
    ) {
      return
    }
    setListError(null)
    setDeletingId(tx.id)
    const { error: delError } = await deleteTransaction(tx.id, user.id)
    setDeletingId(null)
    if (delError) {
      console.error('[dashboard] delete transaction:', delError)
      setListError(delError.message)
      return
    }
    setTransactions((prev) => prev.filter((t) => t.id !== tx.id))
    if (editingTransaction?.id === tx.id) setEditingTransaction(null)
  }

  async function handleSaveMonthlyBudget(amount: number | null) {
    if (!user) return { error: 'Not signed in' }
    const { error } = await updateMonthlyBudget(user.id, amount)
    if (error) {
      return { error: error.message }
    }
    setMonthlyBudget(amount)
    return { error: null }
  }

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setListError(null)

    const parsed = Number.parseFloat(amount)
    if (!Number.isFinite(parsed)) {
      setError('Enter a valid amount.')
      return
    }

    const cat = category.trim()
    if (!cat) {
      setError('Category is required.')
      return
    }

    setSubmitting(true)
    const desc = description.trim()
    const { error: insertError } = await insertTransaction({
      userId: user.id,
      amount: parsed,
      category: cat,
      description: desc.length ? desc : null,
    })
    setSubmitting(false)

    if (insertError) {
      console.error('[dashboard] insert transaction:', insertError)
      setError(insertError.message)
      return
    }

    setAmount('')
    setCategory('')
    setDescription('')
    categorySyncedFromSuggestion.current = null
    await loadDashboard()
  }

  if (authLoading || !user) {
    return <DashboardLoadingSkeleton />
  }

  const monthLabel = new Date().toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Overview
        </h1>
        <p className="text-sm text-zinc-500/80 dark:text-zinc-400/80">
          {monthLabel}
        </p>
      </header>

      {listLoading ? (
        <div className="grid min-h-[116px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[116px] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Spending · this month"
            value={formatCurrency(analytics.currentMonthTotal)}
            hint={monthLabel}
          />
          <SummaryCard
            title="Transactions"
            value={String(analytics.transactionCount)}
            hint="All time"
          />
          <SummaryCard
            title="Top category · this month"
            value={
              analytics.topCategory ? analytics.topCategory.category : '—'
            }
            hint={
              analytics.topCategory
                ? formatCurrency(analytics.topCategory.amount)
                : 'No data yet'
            }
          />
        </section>
      )}

      {listLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      ) : (
        <MonthlyBudgetCard
          monthLabel={monthLabel}
          spentThisMonth={analytics.currentMonthTotal}
          monthlyBudget={monthlyBudget}
          onSaveBudget={handleSaveMonthlyBudget}
        />
      )}

      {listLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      ) : (
        <FinancialInsights insights={spendingInsights} />
      )}

      {listLoading ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="h-[320px] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-[320px] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          <CategoryPieChart
            title="By category"
            data={analytics.pieByCategory}
          />
          <SpendingBarChart
            title="Over time · this month"
            data={analytics.dailyInCurrentMonth}
          />
        </section>
      )}

      <div
        id="add-transaction"
        className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/70 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
        <div className="relative border-b border-zinc-100 px-4 py-4 sm:px-6 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Add transaction
          </h2>
        </div>

        <div className="relative px-4 py-5 sm:px-6 sm:py-6">
          {error ? (
            <div
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="tx-amount"
                  className="block text-xs font-medium text-zinc-600/90 dark:text-zinc-400/90"
                >
                  Amount
                </label>
                <input
                  id="tx-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  value={amount}
                  onChange={(e) => setAmount(sanitizeUnsignedDecimalInput(e.target.value))}
                  className={`${inputClass} tabular-nums`}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="txCategory"
                  className="block text-xs font-medium text-zinc-600/90 dark:text-zinc-400/90"
                >
                  Category
                </label>
                <input
                  id="txCategory"
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                  placeholder="Groceries"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label
                  htmlFor="tx-description"
                  className="block text-xs font-medium text-zinc-600/90 dark:text-zinc-400/90"
                >
                  Description
                </label>
                <textarea
                  id="tx-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputClass} resize-none`}
                  placeholder="e.g. Swiggy lunch, Uber ride"
                />
                {suggestedCategory ? (
                  <p className="text-xs text-zinc-500/90 dark:text-zinc-400/85">
                    Suggested:{' '}
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">
                      {suggestedCategory}
                    </span>
                    {category.trim() === suggestedCategory ? (
                      <span className="text-zinc-400 dark:text-zinc-500"> · applied</span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-indigo-700 hover:shadow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  Adding…
                </>
              ) : (
                'Add transaction'
              )}
            </button>
          </form>
        </div>

        <div className="relative border-t border-zinc-100 px-4 py-5 sm:px-6 dark:border-zinc-800">
          <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Recent activity
          </h2>
          {listLoading ? (
            <ul className="space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800">
              {[1, 2, 3, 4].map((i) => (
                <li key={i} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-h-[52px] flex-1 space-y-2">
                    <div className="h-4 w-28 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-3 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                  <div className="h-5 w-20 shrink-0 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                </li>
              ))}
            </ul>
          ) : listError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {listError}
            </p>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 px-6 py-12 text-center dark:border-zinc-700/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                <Receipt className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                No transactions yet
              </p>
              <p className="mt-2 max-w-xs text-sm text-zinc-500/90 dark:text-zinc-400/85">
                Your ledger stays empty until you add rows. Start with one
                purchase or import a CSV from Tools.
              </p>
              <Link
                href="#add-transaction"
                className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 ease-in-out hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Add transaction
              </Link>
            </div>
          ) : (
            <ul className="max-h-[420px] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {tx.category}
                    </p>
                    {tx.description ? (
                      <p className="mt-0.5 text-sm text-zinc-500/85 dark:text-zinc-400/85">
                        {tx.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-zinc-400/90 dark:text-zinc-500/90">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                    <p className="text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatAmountPlain(normalizeAmount(tx.amount))}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingTransaction(tx)}
                        className="rounded-lg p-2 text-zinc-500 transition-all duration-150 hover:bg-zinc-100 hover:text-indigo-600 active:scale-[0.97] dark:hover:bg-zinc-800 dark:hover:text-indigo-400"
                        aria-label={`Edit transaction ${tx.category}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTransaction(tx)}
                        disabled={deletingId === tx.id}
                        className="rounded-lg p-2 text-zinc-500 transition-all duration-150 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 active:scale-[0.97] dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        aria-label={`Delete transaction ${tx.category}`}
                      >
                        {deletingId === tx.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <TransactionEditModal
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSaved={handleTransactionSaved}
      />
    </div>
  )
}
