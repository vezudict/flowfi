'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Pencil, Receipt, Search, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart'
import { SpendingBarChart } from '@/components/dashboard/SpendingBarChart'
import { FinancialHealthCard } from '@/components/dashboard/FinancialHealthCard'
import { FinancialInsights } from '@/components/dashboard/FinancialInsights'
import { MonthlyBudgetCard } from '@/components/dashboard/MonthlyBudgetCard'
import { SummaryCard } from '@/components/dashboard/SummaryCard'
import { TransactionEditModal } from '@/components/dashboard/TransactionEditModal'
import { Modal } from '@/components/ui/Modal'
import { DatePickerInput } from '@/components/ui/date-picker'
import { useAuth } from '@/contexts/auth-context'
import { useCurrency } from '@/contexts/currency-context'
import { fetchProfileBudget } from '@/lib/profile-budget'
import { authedFetch, readAuthedJson } from '@/lib/authed-api'
import { suggestCategoryFromDescription } from '@/lib/category-suggestion'
import { sanitizeUnsignedDecimalInput } from '@/lib/numeric-input'
import { formatCurrency } from '@/lib/format-currency'
import { computeFinancialHealthScore } from '@/lib/financial-health-score'
import {
  buildRecurringInsights,
  getRecurringTransactionIds,
} from '@/lib/recurring-transactions'
import { buildSpendingInsights } from '@/lib/spending-insights'
import { computeAnalytics, normalizeAmount } from '@/lib/transaction-analytics'
import {
  countActiveFilters,
  emptyTransactionFilters,
  filterTransactions,
  uniqueCategoriesFromTransactions,
  type TransactionFilterState,
} from '@/lib/transaction-filters'
import {
  deleteTransaction,
  fetchTransactionsForUser,
  type Transaction,
} from '@/lib/transactions'
import { toast } from 'sonner'

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
  const { currency } = useCurrency()
  const [error, setError] = useState<string | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [txFilters, setTxFilters] = useState<TransactionFilterState>(emptyTransactionFilters)

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
    () => buildSpendingInsights(transactions, new Date(), currency),
    [transactions, currency],
  )

  const recurringTransactionIds = useMemo(
    () => getRecurringTransactionIds(transactions),
    [transactions],
  )

  const recurringInsights = useMemo(
    () => buildRecurringInsights(transactions, currency),
    [transactions, currency],
  )

  const allSpendingInsights = useMemo(
    () => [...recurringInsights, ...spendingInsights],
    [recurringInsights, spendingInsights],
  )

  const financialHealth = useMemo(
    () =>
      computeFinancialHealthScore(transactions, {
        monthlyBudget,
      }),
    [transactions, monthlyBudget],
  )

  const transactionCategories = useMemo(
    () => uniqueCategoriesFromTransactions(transactions),
    [transactions],
  )

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, txFilters),
    [transactions, txFilters],
  )

  const activeFilterCount = useMemo(() => countActiveFilters(txFilters), [txFilters])

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

  async function confirmPendingDelete() {
    const tx = pendingDelete
    if (!tx || !user) return
    setListError(null)
    setDeleteSubmitting(true)
    const { error: delError } = await deleteTransaction(tx.id, user.id)
    setDeleteSubmitting(false)
    setPendingDelete(null)
    if (delError) {
      console.error('[dashboard] delete transaction:', delError)
      toast.error(delError.message || 'Something went wrong')
      setListError(delError.message)
      return
    }
    toast.success('Transaction deleted')
    setTransactions((prev) => prev.filter((t) => t.id !== tx.id))
    if (editingTransaction?.id === tx.id) setEditingTransaction(null)
  }

  function closeDeleteModal() {
    if (deleteSubmitting) return
    setPendingDelete(null)
  }

  async function handleSaveMonthlyBudget(amount: number | null) {
    if (!user) return { error: 'Not signed in' }
    const res = await authedFetch('/api/profile/budget', {
      method: 'PATCH',
      json: { monthlyBudget: amount },
    })
    const result = await readAuthedJson<{ ok: boolean }>(res)
    if (!result.ok) {
      return { error: result.message }
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
    const res = await authedFetch('/api/transactions', {
      method: 'POST',
      json: {
        amount: parsed,
        category: cat,
        description: desc.length ? desc : null,
      },
    })
    const insertResult = await readAuthedJson<{ data: Transaction }>(res)
    setSubmitting(false)

    if (!insertResult.ok) {
      console.error('[dashboard] insert transaction:', insertResult.message)
      toast.error(insertResult.message)
      setError(insertResult.message)
      return
    }

    toast.success('Transaction added')
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
            value={formatCurrency(analytics.currentMonthTotal, currency)}
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
                ? formatCurrency(analytics.topCategory.amount, currency)
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
          currency={currency}
          onSaveBudget={handleSaveMonthlyBudget}
        />
      )}

      {listLoading ? (
        <div className="h-44 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      ) : (
        <FinancialHealthCard result={financialHealth} />
      )}

      {listLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      ) : (
        <FinancialInsights insights={allSpendingInsights} />
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
            currency={currency}
          />
          <SpendingBarChart
            title="Over time · this month"
            data={analytics.dailyInCurrentMonth}
            currency={currency}
          />
        </section>
      )}

      <div
        id="add-transaction"
        className="relative scroll-mt-24 rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/70 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50"
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Recent activity
            </h2>
            {!listLoading && transactions.length > 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Showing{' '}
                <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                  {filteredTransactions.length}
                </span>
                {' of '}
                <span className="tabular-nums">{transactions.length}</span>
              </p>
            ) : null}
          </div>

          {!listLoading && transactions.length > 0 ? (
            <div className="mt-4 space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/30 sm:p-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={txFilters.search}
                  onChange={(e) =>
                    setTxFilters((f) => ({ ...f, search: e.target.value }))
                  }
                  placeholder="Search description…"
                  className={`${inputClass} pl-9`}
                  aria-label="Search transactions"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label
                    htmlFor="tx-filter-category"
                    className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    Category
                  </label>
                  <select
                    id="tx-filter-category"
                    value={txFilters.category}
                    onChange={(e) =>
                      setTxFilters((f) => ({ ...f, category: e.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="">All categories</option>
                    {transactionCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="tx-filter-from"
                    className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    From date
                  </label>
                  <DatePickerInput
                    id="tx-filter-from"
                    value={txFilters.dateFrom}
                    onChange={(dateFrom) => setTxFilters((f) => ({ ...f, dateFrom }))}
                    placeholder="From…"
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="tx-filter-to"
                    className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    To date
                  </label>
                  <DatePickerInput
                    id="tx-filter-to"
                    value={txFilters.dateTo}
                    onChange={(dateTo) => setTxFilters((f) => ({ ...f, dateTo }))}
                    placeholder="To…"
                    className="tabular-nums"
                  />
                </div>
                <div className="flex items-end">
                  {activeFilterCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setTxFilters(emptyTransactionFilters)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-all duration-150 ease-in-out hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto"
                    >
                      <X className="h-4 w-4" aria-hidden />
                      Clear filters
                    </button>
                  ) : (
                    <p className="pb-2 text-xs text-zinc-400 dark:text-zinc-500">
                      Filters apply instantly to this list.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {listLoading ? (
            <div className="mt-4">
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
            </div>
          ) : listError ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
              {listError}
            </p>
          ) : transactions.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 px-6 py-12 text-center dark:border-zinc-700/80">
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
          ) : filteredTransactions.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 px-6 py-10 text-center dark:border-zinc-700/80">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                No matches
              </p>
              <p className="mt-2 max-w-sm text-center text-sm text-zinc-500/90 dark:text-zinc-400/85">
                Nothing in your ledger matches these filters. Try widening the date range or
                clearing search.
              </p>
              <button
                type="button"
                onClick={() => setTxFilters(emptyTransactionFilters)}
                className="mt-4 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-all duration-150 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="recent-activity-scroll mt-4 max-h-[min(420px,55vh)] overflow-y-auto scroll-smooth pr-3 [-webkit-overflow-scrolling:touch]">
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredTransactions.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
                        <span>{tx.category}</span>
                        {recurringTransactionIds.has(tx.id) ? (
                          <span className="inline-flex items-center rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                            Recurring
                          </span>
                        ) : null}
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
                        {formatCurrency(
                          Math.abs(normalizeAmount(tx.amount)),
                          currency,
                        )}
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
                        onClick={() => setPendingDelete(tx)}
                        disabled={deleteSubmitting && pendingDelete?.id === tx.id}
                        className="rounded-lg p-2 text-zinc-500 transition-all duration-150 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 active:scale-[0.97] dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        aria-label={`Delete transaction ${tx.category}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <TransactionEditModal
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSaved={handleTransactionSaved}
      />

      <Modal
        open={!!pendingDelete}
        onClose={closeDeleteModal}
        title="Delete transaction?"
        description="This action cannot be undone."
        titleId="delete-tx-title"
        footer={
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={deleteSubmitting}
              onClick={closeDeleteModal}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-all duration-150 hover:bg-zinc-50 disabled:opacity-50 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteSubmitting}
              onClick={() => void confirmPendingDelete()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] dark:bg-red-600 dark:hover:bg-red-500"
            >
              {deleteSubmitting ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : null}
              Delete
            </button>
          </div>
        }
      />
    </div>
  )
}
