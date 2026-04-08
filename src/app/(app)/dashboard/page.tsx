'use client'

import type { PointerEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, Pencil, Receipt, Search, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart'
import { SpendingBarChart } from '@/components/dashboard/SpendingBarChart'
import { FinancialHealthCard } from '@/components/dashboard/FinancialHealthCard'
import { FinancialInsights } from '@/components/dashboard/FinancialInsights'
import { MonthlyBudgetCard } from '@/components/dashboard/MonthlyBudgetCard'
import { NetSavingsCard } from '@/components/dashboard/NetSavingsCard'
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
import { type SupportedCurrencyCode } from '@/lib/currencies'
import { formatCurrency } from '@/lib/format-currency'
import { computeFinancialHealthScore } from '@/lib/financial-health-score'
import {
  buildRecurringInsights,
  getRecurringTransactionIds,
} from '@/lib/recurring-transactions'
import {
  buildExpenseInsights,
  buildIncomeInsights,
  buildSavingsInsights,
} from '@/lib/spending-insights'
import { computeAnalytics, normalizeAmount } from '@/lib/transaction-analytics'
import { transactionEntryType } from '@/lib/transaction-flow'
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

const premiumEase = [0.23, 1, 0.32, 1] as const

type SelectableTransactionRowProps = {
  tx: Transaction
  isSelected: boolean
  isRecurring: boolean
  currency: SupportedCurrencyCode
  deleteSubmitting: boolean
  pendingDeleteId: string | undefined
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

function SelectableTransactionRow({
  tx,
  isSelected,
  isRecurring,
  currency,
  deleteSubmitting,
  pendingDeleteId,
  onToggle,
  onEdit,
  onDelete,
}: SelectableTransactionRowProps) {
  const [holdFilledIndicator, setHoldFilledIndicator] = useState(isSelected)
  const [ripple, setRipple] = useState<{
    x: number
    y: number
    id: number
  } | null>(null)

  useEffect(() => {
    if (isSelected) setHoldFilledIndicator(true)
  }, [isSelected])

  /** Keeps row + dot styled until the check exit animation finishes */
  const showSelectedChrome = isSelected || holdFilledIndicator

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    setRipple({
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      id: performance.now(),
    })
  }

  return (
    <li className="list-none px-0.5">
      <motion.div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${tx.category}`}
        onClick={onToggle}
        onPointerDown={handlePointerDown}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        animate={{ scale: showSelectedChrome ? 1.004 : 1 }}
        whileHover={{
          scale: showSelectedChrome ? 1.006 : 1.009,
          transition: { type: 'spring', stiffness: 520, damping: 32 },
        }}
        whileTap={{ scale: 0.988 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.88 }}
        className={`group relative flex cursor-pointer gap-3 overflow-hidden rounded-xl border py-3 pl-3 pr-3 outline-none transition-[border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-indigo-500/35 sm:gap-4 sm:pl-3.5 ${
          showSelectedChrome
            ? 'border-indigo-300/70 bg-indigo-50/70 shadow-[0_0_0_1px_rgba(99,102,241,0.12)] dark:border-indigo-500/35 dark:bg-indigo-950/35 dark:shadow-[0_0_24px_-8px_rgba(129,140,248,0.35)]'
            : 'border-transparent bg-white/40 hover:border-zinc-200/80 hover:bg-zinc-50/90 hover:shadow-sm dark:bg-zinc-950/20 dark:hover:border-zinc-700/60 dark:hover:bg-zinc-900/45'
        } `}
      >
        {ripple ? (
          <motion.span
            key={ripple.id}
            aria-hidden
            className="pointer-events-none absolute rounded-full bg-indigo-400/35 dark:bg-indigo-400/25"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 14,
              height: 14,
              marginLeft: -7,
              marginTop: -7,
            }}
            initial={{ scale: 0.15, opacity: 0.42 }}
            animate={{ scale: 6.5, opacity: 0 }}
            transition={{ duration: 0.62, ease: premiumEase }}
            onAnimationComplete={() => setRipple(null)}
          />
        ) : null}

        <motion.span
          className={`relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            showSelectedChrome
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm dark:border-indigo-500 dark:bg-indigo-500'
              : 'border-zinc-300 bg-white group-hover:border-indigo-400/65 group-hover:shadow-[0_0_0_3px_rgba(99,102,241,0.08)] dark:border-zinc-600 dark:bg-zinc-900 dark:group-hover:border-indigo-500/55 dark:group-hover:shadow-[0_0_0_3px_rgba(129,140,248,0.12)]'
          }`}
          animate={
            isSelected
              ? { scale: [1, 1.12, 1] }
              : { scale: 1 }
          }
          transition={
            isSelected
              ? { duration: 0.38, times: [0, 0.38, 1], ease: premiumEase }
              : { duration: 0.22, ease: premiumEase }
          }
          aria-hidden
        >
          <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full">
            {!showSelectedChrome ? (
              <Check
                className="pointer-events-none absolute h-3 w-3 stroke-[2.8] text-indigo-600/85 opacity-0 scale-[0.72] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:opacity-[0.34] group-hover:scale-95 dark:text-indigo-400/80"
                aria-hidden
              />
            ) : null}
            <AnimatePresence
              initial={false}
              onExitComplete={() => {
                if (!isSelected) setHoldFilledIndicator(false)
              }}
            >
              {isSelected ? (
                <motion.span
                  key="check-on"
                  initial={{ scale: 0.12, opacity: 0, rotate: -32 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.62, opacity: 0, rotate: 10 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                  className="flex items-center justify-center"
                >
                  <Check className="h-3 w-3 stroke-[2.8] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]" />
                </motion.span>
              ) : null}
            </AnimatePresence>
          </span>
        </motion.span>

        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
              <span>{tx.category}</span>
              <span
                className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  transactionEntryType(tx) === 'credit'
                    ? 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'bg-zinc-500/12 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400'
                }`}
              >
                {transactionEntryType(tx) === 'credit' ? 'Credit' : 'Debit'}
              </span>
              {isRecurring ? (
                <span className="inline-flex items-center rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                  Recurring
                </span>
              ) : null}
            </p>
            {tx.description ? (
              <p className="mt-0.5 text-sm text-zinc-500/85 transition-colors duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-zinc-600/90 dark:text-zinc-400/85 dark:group-hover:text-zinc-300/90">
                {tx.description}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-zinc-400/90 transition-colors duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-zinc-500 dark:text-zinc-500/90 dark:group-hover:text-zinc-400">
              {new Date(tx.created_at).toLocaleString()}
            </p>
          </div>
          <div
            className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold tabular-nums text-zinc-900 transition-colors duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-zinc-950 dark:text-zinc-100 dark:group-hover:text-white">
              {formatCurrency(Math.abs(normalizeAmount(tx.amount)), currency)}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-2 text-zinc-500 transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-zinc-100/90 hover:text-indigo-600 active:scale-[0.97] dark:hover:bg-zinc-800/80 dark:hover:text-indigo-400"
                aria-label={`Edit transaction ${tx.category}`}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleteSubmitting && pendingDeleteId === tx.id}
                className="rounded-lg p-2 text-zinc-500 transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-red-50 hover:text-red-600 disabled:opacity-50 active:scale-[0.97] dark:hover:bg-red-950/40 dark:hover:text-red-400"
                aria-label={`Delete transaction ${tx.category}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </li>
  )
}

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 ease-in-out focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30'

function DashboardLoadingSkeleton() {
  return (
    <div className="mx-auto min-h-full w-full max-w-6xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="space-y-2">
        <div className="h-10 w-52 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/80" />
      </div>
      <div className="grid min-h-[116px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
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
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null)
  const [bulkDeleteSubmitting, setBulkDeleteSubmitting] = useState(false)
  const [txFilters, setTxFilters] = useState<TransactionFilterState>(emptyTransactionFilters)

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [entryType, setEntryType] = useState<'debit' | 'credit'>('debit')
  const [chartMode, setChartMode] = useState<'spending' | 'income'>('spending')
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

  const expenseInsights = useMemo(
    () => buildExpenseInsights(transactions, new Date(), currency),
    [transactions, currency],
  )

  const savingsInsights = useMemo(
    () => buildSavingsInsights(transactions, new Date(), currency),
    [transactions, currency],
  )

  const incomeInsights = useMemo(
    () => buildIncomeInsights(transactions, new Date(), currency),
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

  const incomeComparisonHint = useMemo(() => {
    const curr = analytics.currentMonthIncomeTotal
    const prev = analytics.previousMonthIncomeTotal
    if (curr === 0 && prev === 0) return 'Credits only · add deposits'
    if (prev === 0) return curr > 0 ? 'No baseline last month' : 'No income last month'
    const diff = curr - prev
    if (diff === 0) return 'Same total as last month'
    if (diff > 0) return `Up ${formatCurrency(diff, currency)} vs prior month`
    return `Down ${formatCurrency(-diff, currency)} vs prior month`
  }, [analytics.currentMonthIncomeTotal, analytics.previousMonthIncomeTotal, currency])

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

  const allVisibleSelected = useMemo(() => {
    if (filteredTransactions.length === 0) return false
    return filteredTransactions.every((t) => selectedIds.includes(t.id))
  }, [filteredTransactions, selectedIds])

  useEffect(() => {
    const allowed = new Set(filteredTransactions.map((t) => t.id))
    setSelectedIds((prev) => {
      const next = prev.filter((id) => allowed.has(id))
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev
      return next
    })
  }, [filteredTransactions])

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
    setSelectedIds((prev) => prev.filter((id) => id !== tx.id))
    if (editingTransaction?.id === tx.id) setEditingTransaction(null)
  }

  function closeDeleteModal() {
    if (deleteSubmitting) return
    setPendingDelete(null)
  }

  function toggleTransactionSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function toggleSelectAllVisible() {
    const ids = filteredTransactions.map((t) => t.id)
    if (ids.length === 0) return
    setSelectedIds((prev) => {
      const allOn = ids.every((id) => prev.includes(id))
      if (allOn) return prev.filter((id) => !ids.includes(id))
      const set = new Set(prev)
      ids.forEach((id) => set.add(id))
      return Array.from(set)
    })
  }

  function clearSelection() {
    setSelectedIds([])
  }

  function openBulkDeleteModal() {
    if (selectedIds.length === 0) return
    setBulkDeleteIds([...selectedIds])
  }

  function closeBulkDeleteModal() {
    if (bulkDeleteSubmitting) return
    setBulkDeleteIds(null)
  }

  async function confirmBulkDelete() {
    if (!bulkDeleteIds?.length || !user) return
    setBulkDeleteSubmitting(true)
    const res = await authedFetch('/api/transactions/bulk', {
      method: 'DELETE',
      json: { ids: bulkDeleteIds },
    })
    const result = await readAuthedJson<{ count: number }>(res)
    setBulkDeleteSubmitting(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    const n = result.data.count
    toast.success(`Deleted ${n} transaction${n === 1 ? '' : 's'}`)
    const removed = new Set(bulkDeleteIds)
    setTransactions((prev) => prev.filter((t) => !removed.has(t.id)))
    setSelectedIds([])
    setBulkDeleteIds(null)
    if (editingTransaction && removed.has(editingTransaction.id)) setEditingTransaction(null)
    router.refresh()
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
        transactionType: entryType,
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
    setEntryType('debit')
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
        <div className="grid min-h-[116px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[116px] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Spending · this month"
            value={formatCurrency(analytics.currentMonthTotal, currency)}
            hint={`${monthLabel} · debits only`}
           />
          <SummaryCard
            title="Income · this month"
            value={formatCurrency(analytics.currentMonthIncomeTotal, currency)}
            hint={incomeComparisonHint}
          />
          <NetSavingsCard
            amount={analytics.netSavingsThisMonth}
            monthLabel={monthLabel}
            currency={currency}
          />
          <SummaryCard
            title="Top spending category · this month"
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
        <FinancialInsights
          savingsInsights={savingsInsights}
          expenseInsights={expenseInsights}
          incomeInsights={incomeInsights}
          recurringInsights={recurringInsights}
        />
      )}

      {listLoading ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="h-[320px] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-[320px] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {chartMode === 'spending'
                ? 'Debits by category and per day (income excluded).'
                : 'Credits by category and per day.'}
            </p>
            <div className="flex rounded-lg border border-zinc-200 bg-zinc-50/80 p-0.5 dark:border-zinc-700 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={() => setChartMode('spending')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                  chartMode === 'spending'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Spending
              </button>
              <button
                type="button"
                onClick={() => setChartMode('income')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                  chartMode === 'income'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Income
              </button>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryPieChart
              title={chartMode === 'spending' ? 'Spending by category' : 'Income by category'}
              data={
                chartMode === 'spending'
                  ? analytics.pieByCategory
                  : analytics.incomePieByCategory
              }
              currency={currency}
              emptyHeading={chartMode === 'income' ? 'No income this month' : undefined}
              emptyDescription={
                chartMode === 'income'
                  ? 'Credit transactions dated this month will appear here.'
                  : undefined
              }
            />
            <SpendingBarChart
              title={
                chartMode === 'spending'
                  ? 'Spending over time · this month'
                  : 'Income over time · this month'
              }
              data={
                chartMode === 'spending'
                  ? analytics.dailyInCurrentMonth
                  : analytics.incomeDailyInCurrentMonth
              }
              currency={currency}
              variant={chartMode === 'spending' ? 'spending' : 'income'}
              emptyTitle={chartMode === 'income' ? 'No daily income yet' : undefined}
              emptyDescription={
                chartMode === 'income'
                  ? 'Credits with dates in this month fill this chart.'
                  : undefined
              }
            />
          </div>
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
            <div className="space-y-2">
              <span className="block text-xs font-medium text-zinc-600/90 dark:text-zinc-400/90">
                Entry type
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEntryType('debit')}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                    entryType === 'debit'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-100'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  Debit (expense)
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('credit')}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                    entryType === 'credit'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  Credit (income)
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Debits count toward spending; credits count toward income summaries.
              </p>
            </div>
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
              <div className="sticky top-0 z-[1] flex items-center justify-end border-b border-zinc-200/90 bg-white/90 px-2 py-2.5 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
                <motion.button
                  type="button"
                  onClick={toggleSelectAllVisible}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 32 }}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300"
                >
                  {allVisibleSelected ? 'Clear selection' : 'Select all'}
                </motion.button>
              </div>
              <ul className="space-y-1.5 pb-1 pt-2">
                {filteredTransactions.map((tx) => (
                  <SelectableTransactionRow
                    key={tx.id}
                    tx={tx}
                    isSelected={selectedIds.includes(tx.id)}
                    isRecurring={recurringTransactionIds.has(tx.id)}
                    currency={currency}
                    deleteSubmitting={deleteSubmitting}
                    pendingDeleteId={pendingDelete?.id}
                    onToggle={() => toggleTransactionSelected(tx.id)}
                    onEdit={() => setEditingTransaction(tx)}
                    onDelete={() => setPendingDelete(tx)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 ? (
          <motion.div
            key="bulk-bar"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-none fixed inset-x-0 top-14 z-[90] flex justify-center px-4 pt-3"
          >
            <div className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white/75 px-4 py-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.22)] backdrop-blur-xl dark:border-zinc-700/80 dark:bg-zinc-950/75 dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.65)]">
              <p className="text-sm font-medium tracking-tight text-zinc-800 dark:text-zinc-100">
                <span className="tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                  {selectedIds.length}
                </span>{' '}
                <span className="text-zinc-500 dark:text-zinc-400">selected</span>
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={bulkDeleteSubmitting}
                  className="rounded-lg border border-zinc-200/90 bg-white/60 px-3 py-2 text-xs font-medium text-zinc-600 transition-all duration-200 ease-out hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={openBulkDeleteModal}
                  disabled={bulkDeleteSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600/95 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] dark:bg-rose-600/90 dark:hover:bg-rose-500/95"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <TransactionEditModal
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSaved={handleTransactionSaved}
      />

      <Modal
        open={!!bulkDeleteIds?.length}
        onClose={closeBulkDeleteModal}
        title="Delete transactions?"
        description={
          bulkDeleteIds?.length
            ? `Delete ${bulkDeleteIds.length} transaction${bulkDeleteIds.length === 1 ? '' : 's'}? This cannot be undone.`
            : undefined
        }
        titleId="bulk-delete-tx-title"
        footer={
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={bulkDeleteSubmitting}
              onClick={closeBulkDeleteModal}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-all duration-150 hover:bg-zinc-50 disabled:opacity-50 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bulkDeleteSubmitting}
              onClick={() => void confirmBulkDelete()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] dark:bg-red-600 dark:hover:bg-red-500"
            >
              {bulkDeleteSubmitting ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : null}
              Delete
            </button>
          </div>
        }
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
