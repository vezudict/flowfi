'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart'
import { SpendingBarChart } from '@/components/dashboard/SpendingBarChart'
import { FinancialInsights } from '@/components/dashboard/FinancialInsights'
import { SummaryCard } from '@/components/dashboard/SummaryCard'
import { useAuth } from '@/contexts/auth-context'
import { formatAmountPlain, formatCurrency } from '@/lib/format-currency'
import { buildSpendingInsights } from '@/lib/spending-insights'
import { computeAnalytics, normalizeAmount } from '@/lib/transaction-analytics'
import {
  fetchTransactionsForUser,
  insertTransaction,
  type Transaction,
} from '@/lib/transactions'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const analytics = useMemo(
    () => computeAnalytics(transactions),
    [transactions],
  )

  const insightLines = useMemo(
    () => buildSpendingInsights(transactions),
    [transactions],
  )

  const loadTransactions = useCallback(async () => {
    if (!user) return
    setListLoading(true)
    setListError(null)
    const { data, error: qError } = await fetchTransactionsForUser(user.id)
    setListLoading(false)
    if (qError) {
      console.error('[dashboard] fetch transactions:', qError)
      setListError(qError.message)
      return
    }
    setTransactions((data as Transaction[] | null) ?? [])
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    void loadTransactions()
  }, [user, loadTransactions])

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
    await loadTransactions()
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    )
  }

  const monthLabel = new Date().toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl flex-1 px-4 py-10">
      <header className="text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Signed in as{' '}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {user.email}
          </span>
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            analytics.topCategory
              ? analytics.topCategory.category
              : '—'
          }
          hint={
            analytics.topCategory
              ? formatCurrency(analytics.topCategory.amount)
              : 'No data yet'
          }
        />
      </section>

      <div className="mt-8">
        <FinancialInsights lines={insightLines} />
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <CategoryPieChart
          title="By category"
          data={analytics.pieByCategory}
        />
        <SpendingBarChart
          title="Over time · this month"
          data={analytics.dailyInCurrentMonth}
        />
      </section>

      <div className="mt-10 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Add transaction
          </h2>
        </div>

        <div className="px-6 py-6">
          {error ? (
            <div
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="tx-amount"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Amount
                </label>
                <input
                  id="tx-amount"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors duration-150 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="txCategory"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Category
                </label>
                <input
                  id="txCategory"
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors duration-150 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                  placeholder="Groceries"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label
                  htmlFor="tx-description"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Description
                </label>
                <textarea
                  id="tx-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors duration-150 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                  placeholder="Optional note"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? 'Adding…' : 'Add transaction'}
            </button>
          </form>
        </div>

        <div className="border-t border-zinc-100 px-6 py-6 dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Recent activity
          </h2>
          {listLoading ? (
            <p className="text-sm text-zinc-500">Loading transactions…</p>
          ) : listError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {listError}
            </p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-zinc-500">No transactions yet.</p>
          ) : (
            <ul className="max-h-[420px] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {tx.category}
                    </p>
                    {tx.description ? (
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {tx.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100 sm:text-right">
                    {formatAmountPlain(normalizeAmount(tx.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
