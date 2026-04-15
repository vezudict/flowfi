'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Check, Loader2, Pencil, Receipt, Search, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
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
import {
  isOtherLikeCategoryLabel,
  suggestCategoryFromDescription,
} from '@/lib/category-suggestion'
import { getCategoryLabel, getCategoryStyleClass } from '@/lib/category-display'
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
import type { AIInsight } from '@/lib/ai-insights'
import { detectAnomalies, type Anomaly } from '@/lib/anomaly-detection'
import { transactionEntryType } from '@/lib/transaction-flow'
import {
  countActiveFilters,
  emptyTransactionFilters,
  filterTransactions,
  uniqueCategoriesFromTransactions,
  type TransactionFilterState,
} from '@/lib/transaction-filters'
import { normalizeTransaction } from '@/lib/transaction-normalizer'
import {
  deleteTransaction,
  fetchTransactionsForUser,
  type Transaction,
} from '@/lib/transactions'
import { toast } from 'sonner'

// Lazy-load heavy chart components to reduce initial bundle
const CategoryPieChart = dynamic(
  () => import('@/components/dashboard/CategoryPieChart').then((m) => ({ default: m.CategoryPieChart })),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" /> },
)
const SpendingBarChart = dynamic(
  () => import('@/components/dashboard/SpendingBarChart').then((m) => ({ default: m.SpendingBarChart })),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" /> },
)

type SelectableTransactionRowProps = {
  tx: Transaction
  isSelected: boolean
  isRecurring: boolean
  currency: SupportedCurrencyCode
  deleteSubmitting: boolean
  pendingDeleteId: string | undefined
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

/** Stripe/Linear-style pill: subtle tint, hairline border, status dot. */
function TransactionEntryTypeBadge({ variant }: { variant: 'credit' | 'debit' }) {
  const isCredit = variant === 'credit'
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${
        isCredit
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'border-red-500/20 bg-red-500/10 text-red-400 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400'
      }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${isCredit ? 'bg-emerald-400' : 'bg-red-400'}`}
        aria-hidden
      />
      {isCredit ? 'Credit' : 'Debit'}
    </span>
  )
}

const SelectableTransactionRow = memo(function SelectableTransactionRow({
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

  useEffect(() => {
    if (isSelected) setHoldFilledIndicator(true)
  }, [isSelected])

  const showSelectedChrome = isSelected || holdFilledIndicator
  const isCredit = transactionEntryType(tx) === 'credit'
  const descTrim = tx.description?.trim() ?? ''
  const categoryLabel = getCategoryLabel(tx.category)
  const categoryColorClass = getCategoryStyleClass(tx.category)
  const titleLine = descTrim || categoryLabel
  const dateStr = new Date(tx.created_at).toLocaleString()

  return (
    <li className="list-none">
      <div
        className={`group flex items-center gap-3 rounded-lg border px-4 py-4 outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out focus-within:ring-2 focus-within:ring-indigo-500/30 ${
          showSelectedChrome
            ? 'border-indigo-400/40 bg-indigo-500/[0.06] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)] dark:border-indigo-500/35 dark:bg-indigo-500/10'
            : 'border-zinc-200/40 bg-transparent transition-colors duration-150 hover:bg-zinc-100/60 dark:border-white/5 dark:hover:bg-zinc-800/40'
        }`}
      >
        <button
          type="button"
          aria-pressed={isSelected}
          aria-label={`${isSelected ? 'Deselect' : 'Select'} ${categoryLabel}`}
          onClick={() => onToggle(tx.id)}
          className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
            showSelectedChrome
              ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
              : 'border-zinc-300 bg-white group-hover:border-indigo-400/70 dark:border-zinc-600 dark:bg-zinc-900 dark:group-hover:border-indigo-500/60'
          }`}
        >
          {!showSelectedChrome ? (
            <Check
              className="pointer-events-none absolute h-3 w-3 stroke-[2.8] text-indigo-600/70 opacity-0 transition-opacity duration-150 group-hover:opacity-35 dark:text-indigo-400/80"
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
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 32 }}
                className="flex items-center justify-center"
              >
                <Check className="h-3 w-3 stroke-[2.8] text-white" />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1 pr-2 leading-relaxed">
          <p
            className={`truncate text-base font-semibold leading-snug ${
              descTrim ? 'text-zinc-900 dark:text-zinc-50' : categoryColorClass
            }`}
          >
            {titleLine}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            <span className={categoryColorClass}>{categoryLabel}</span>
            {' · '}
            {dateStr}
            {isRecurring ? ' · Recurring' : ''}
          </p>
        </div>

        <div className="flex min-w-[120px] shrink-0 items-center justify-end gap-2">
          <div className="flex items-center gap-2 justify-end">
            <p
              className={`text-right text-sm font-medium tabular-nums leading-none ${
                isCredit ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(Math.abs(normalizeAmount(tx.amount)), currency)}
            </p>
            <TransactionEntryTypeBadge variant={isCredit ? 'credit' : 'debit'} />
          </div>
          <div
            className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onEdit(tx.id)}
              className="rounded-lg p-2 text-zinc-500 transition-colors duration-150 hover:bg-zinc-100/90 hover:text-indigo-600 active:scale-95 dark:hover:bg-zinc-800/80 dark:hover:text-indigo-400"
              aria-label={`Edit transaction ${categoryLabel}`}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onDelete(tx.id)}
              disabled={deleteSubmitting && pendingDeleteId === tx.id}
              className="rounded-lg p-2 text-zinc-500 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 active:scale-95 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              aria-label={`Delete transaction ${categoryLabel}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
})

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 ease-in-out focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.10)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-blue-400 dark:focus:ring-blue-400/25 dark:focus:shadow-[0_0_0_3px_rgba(96,165,250,0.08)]'

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
            className="h-[116px] animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[320px] animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-[320px] animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-[420px] animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading, session } = useAuth()
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
  const [searchInput, setSearchInput] = useState('')

  // Debounce search input 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setTxFilters((f) => ({ ...f, search: searchInput }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [entryType, setEntryType] = useState<'debit' | 'credit'>('debit')
  const [chartMode, setChartMode] = useState<'spending' | 'income'>('spending')
  const [submitting, setSubmitting] = useState(false)
  const [aiInsights, setAiInsights] = useState<AIInsight[] | null>(null)
  const [aiAnomalies, setAiAnomalies] = useState<Anomaly[] | null>(null)
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiLastUpdated, setAiLastUpdated] = useState<Date | null>(null)
  const [autoCategoryOn, setAutoCategoryOn] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const categorySyncedFromSuggestion = useRef<string | null>(null)
  const categorySetByAI = useRef<string | null>(null)
  // Simple in-memory cache: description → category (last 5)
  const aiCategoryCache = useRef<Map<string, string>>(new Map())
  // Track last description sent to AI to prevent redundant calls
  const lastAIDesc = useRef<string | null>(null)

  const suggestedCategory = useMemo(
    () => suggestCategoryFromDescription(description),
    [description],
  )

  // Rule-based suggestion (only when AI toggle is OFF)
  useEffect(() => {
    if (autoCategoryOn) return
    const suggestion = suggestedCategory
    setCategory((prev) => {
      const prevTrim = prev.trim()
      if (suggestion) {
        if (
          !prevTrim ||
          prevTrim === categorySyncedFromSuggestion.current ||
          isOtherLikeCategoryLabel(prevTrim)
        ) {
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
  }, [suggestedCategory, autoCategoryOn])

  // AI-based category detection (debounced 600ms, only when toggle is ON)
  useEffect(() => {
    if (!autoCategoryOn) return
    const desc = description.trim()
    if (desc.length < 4) return
    // Skip if description hasn't changed since last successful AI call
    if (desc === lastAIDesc.current) return

    let spinnerTimer: ReturnType<typeof setTimeout> | null = null
    const timer = setTimeout(async () => {
      // Check cache first — no AI call needed
      const cached = aiCategoryCache.current.get(desc)
      if (cached) {
        if (process.env.NODE_ENV === 'development') console.log('[categorize] AI CACHE HIT', desc, '→', cached)
        setCategory((prev) => {
          const prevTrim = prev.trim()
          if (!prevTrim || prevTrim === categorySetByAI.current || isOtherLikeCategoryLabel(prevTrim)) {
            categorySetByAI.current = cached
            return cached
          }
          return prev
        })
        return
      }

      // Show spinner only after 300ms to avoid flash on fast responses
      spinnerTimer = setTimeout(() => setCategoryLoading(true), 300)

      if (process.env.NODE_ENV === 'development') console.log('[categorize] AI CALL TRIGGERED', desc)
      lastAIDesc.current = desc

      try {
        const res = await authedFetch('/api/categorize', {
          method: 'POST',
          json: { description: desc },
        })
        const data = await readAuthedJson<{ category: string }>(res)
        if (data.ok && data.data.category) {
          const cat = data.data.category
          // Update cache (keep only last 5)
          if (aiCategoryCache.current.size >= 5) {
            const firstKey = aiCategoryCache.current.keys().next().value
            if (firstKey !== undefined) aiCategoryCache.current.delete(firstKey)
          }
          aiCategoryCache.current.set(desc, cat)
          setCategory((prev) => {
            const prevTrim = prev.trim()
            if (!prevTrim || prevTrim === categorySetByAI.current || isOtherLikeCategoryLabel(prevTrim)) {
              categorySetByAI.current = cat
              return cat
            }
            return prev
          })
        }
      } catch {
        // Silently fall back — do not disrupt the form
      } finally {
        if (spinnerTimer) clearTimeout(spinnerTimer)
        setCategoryLoading(false)
      }
    }, 600)
    return () => {
      clearTimeout(timer)
      if (spinnerTimer) clearTimeout(spinnerTimer)
    }
  }, [description, autoCategoryOn])

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && transactions.length > 0) {
      console.log('ANALYTICS INPUT SAMPLE', transactions.slice(0, 3).map((t) => ({
        description: t.description,
        category: t.category,
        transaction_type: t.transaction_type,
      })))
    }
  }, [transactions])

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

  const fetchAIInsights = async () => {
    console.log('🟡 BUTTON CLICKED → fetching AI insights')

    if (!transactions || transactions.length === 0) {
      console.log('❌ No transactions, skipping AI')
      return
    }

    setAiInsightsLoading(true)

    try {
      const analyticsSnapshot = computeAnalytics(transactions)
      const anomalies = detectAnomalies(transactions, analyticsSnapshot, currency)

      console.log('📦 Sending analytics:', analyticsSnapshot)
      console.log('🔍 Detected anomalies:', anomalies)

      const res = await authedFetch('/api/ai-insights', {
        method: 'POST',
        json: { analytics: analyticsSnapshot, currency, anomalies },
      })

      console.log('📡 API response status:', res.status)

      const data: unknown = await res.json()

      console.log('🧠 AI RESPONSE:', data)

      if (
        res.ok &&
        data &&
        typeof data === 'object' &&
        'insights' in data &&
        Array.isArray((data as { insights: unknown }).insights)
      ) {
        setAiInsights((data as { insights: AIInsight[] }).insights)
        setAiAnomalies(anomalies)
        setAiLastUpdated(new Date())
      }
    } catch (err) {
      console.error('🔥 AI ERROR:', err)
    } finally {
      setAiInsightsLoading(false)
    }
  }

  const handleToggleAI = async () => {
    const next = !aiEnabled
    setAiEnabled(next)
    if (next && !aiInsights) {
      await fetchAIInsights()
    } else if (!next) {
      setAiAnomalies(null)
    }
  }

  function handleTransactionSaved(updated: Transaction) {
    const normalized = normalizeTransaction(updated)
    setTransactions((prev) => prev.map((t) => (t.id === normalized.id ? normalized : t)))
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

  const toggleTransactionSelected = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [])

  const requestEditTransaction = useCallback(
    (id: string) => {
      const t = filteredTransactions.find((x) => x.id === id)
      if (t) setEditingTransaction(t)
    },
    [filteredTransactions],
  )

  const requestDeleteTransaction = useCallback(
    (id: string) => {
      const t = filteredTransactions.find((x) => x.id === id)
      if (t) setPendingDelete(t)
    },
    [filteredTransactions],
  )

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
    const postBody = {
      amount: parsed,
      category: cat,
      description: desc.length ? desc : null,
      transactionType: entryType,
    }
    if (process.env.NEXT_PUBLIC_DEBUG_FLOWFI_TX === '1') {
      console.log('[FlowFi TX DEBUG] POST /api/transactions body', postBody)
    }
    const res = await authedFetch('/api/transactions', {
      method: 'POST',
      json: postBody,
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
    categorySetByAI.current = null
    lastAIDesc.current = null
    await loadDashboard()
  }

  if (authLoading || !user) {
    return <DashboardLoadingSkeleton />
  }

  function humanizeTime(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 10) return 'just now'
    if (seconds < 60) return `${seconds}s ago`
    const mins = Math.floor(seconds / 60)
    if (mins === 1) return '1 min ago'
    if (mins < 60) return `${mins} mins ago`
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
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
              className="h-[116px] animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : (
        <section className="animate-fade-in grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              analytics.topCategory
                ? getCategoryLabel(analytics.topCategory.category)
                : '—'
            }
            valueClassName={
              analytics.topCategory
                ? getCategoryStyleClass(analytics.topCategory.category)
                : undefined
            }
            hint={
              analytics.topCategory
                ? formatCurrency(analytics.topCategory.amount, currency)
                : 'No data yet'
            }
            subdued
          />
        </section>
      )}

      {listLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
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
        <div className="h-44 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      ) : (
        <FinancialHealthCard result={financialHealth} />
      )}

      {listLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      ) : (
        <div className="space-y-3">
          {/* AI Insights control row */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">AI Insights</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {aiEnabled
                    ? 'Personalized analysis powered by AI'
                    : 'Enable to generate personalized financial analysis'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { void handleToggleAI() }}
                aria-label={aiEnabled ? 'Disable AI insights' : 'Enable AI insights'}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-400 ${
                  aiEnabled
                    ? 'bg-emerald-500'
                    : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    aiEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {aiEnabled && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { void fetchAIInsights() }}
                  disabled={aiInsightsLoading}
                  className="rounded-md bg-zinc-800 px-3 py-1 text-xs text-zinc-100 transition-[colors,transform,opacity] duration-150 hover:bg-zinc-700 active:scale-95 disabled:opacity-60 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  {aiInsightsLoading ? 'Refreshing…' : 'Regenerate'}
                </button>
                {aiLastUpdated && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Updated {humanizeTime(aiLastUpdated)}
                  </span>
                )}
              </div>
            )}
          </div>

          <FinancialInsights
            savingsInsights={savingsInsights}
            expenseInsights={expenseInsights}
            incomeInsights={incomeInsights}
            recurringInsights={recurringInsights}
            aiInsights={aiEnabled ? aiInsights : null}
            aiAnomalies={aiEnabled ? aiAnomalies : null}
            aiLoading={aiEnabled ? aiInsightsLoading : false}
            aiEnabled={aiEnabled}
          />
        </div>
      )}

      {listLoading ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="h-[320px] animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-[320px] animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
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
              formatSegmentLabel={getCategoryLabel}
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
        className="scroll-mt-24 rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-sm transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900/60"
      >
        <div className="border-b border-zinc-100 px-4 py-4 sm:px-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Add transaction
          </h2>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
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
                <div className="relative">
                  <input
                    id="txCategory"
                    type="text"
                    required
                    value={category}
                    onChange={(e) => {
                      // User manually edited — detach from AI/rule tracking
                      categorySyncedFromSuggestion.current = null
                      categorySetByAI.current = null
                      setCategory(e.target.value)
                    }}
                    className={`${inputClass} ${categoryLoading ? 'pr-8' : ''}`}
                    placeholder="Groceries"
                  />
                  {categoryLoading && (
                    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" aria-hidden />
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="tx-description"
                    className="block text-xs font-medium text-zinc-600/90 dark:text-zinc-400/90"
                  >
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={() => setAutoCategoryOn((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-colors duration-150 ${
                      autoCategoryOn
                        ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60'
                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                    }`}
                    aria-pressed={autoCategoryOn}
                  >
                    <Bot className="h-3 w-3" aria-hidden />
                    Auto-detect category
                  </button>
                </div>
                <textarea
                  id="tx-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputClass} resize-none`}
                  placeholder="e.g. Swiggy lunch, Uber ride"
                />
                {!autoCategoryOn && suggestedCategory ? (
                  <p className="text-xs text-zinc-500/90 dark:text-zinc-400/85">
                    Suggested:{' '}
                    <span
                      className={`font-medium ${getCategoryStyleClass(suggestedCategory)}`}
                    >
                      {getCategoryLabel(suggestedCategory)}
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-in-out hover:scale-[0.98] hover:bg-indigo-700 hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-indigo-500 dark:hover:bg-indigo-400"
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

        <div className="border-t border-zinc-200 px-4 py-5 sm:px-6 dark:border-zinc-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
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
            <div className="mt-4 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40 sm:p-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search description…"
                  className={`${inputClass} pl-9`}
                  aria-label="Search transactions"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-0.5">
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
                        {getCategoryLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-0.5">
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
                <div className="space-y-0.5">
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
                      onClick={() => { setTxFilters(emptyTransactionFilters); setSearchInput('') }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-all duration-150 ease-in-out hover:bg-zinc-50 active:scale-95 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto"
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
              <ul className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex items-center justify-between gap-4 py-4">
                    <div className="min-h-[56px] flex-1 space-y-2">
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
              Something went wrong loading transactions. Please refresh.
            </p>
          ) : transactions.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 px-6 py-12 text-center dark:border-zinc-700">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                <Receipt className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                No transactions yet
              </p>
              <p className="mt-2 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
                Import a statement or add your first transaction.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="#add-transaction"
                  className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  Add transaction
                </Link>
                <Link
                  href="/tools/import-transactions"
                  className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all duration-150 hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Import statement
                </Link>
              </div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 px-6 py-10 text-center dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                No matches
              </p>
              <p className="mt-2 max-w-sm text-center text-sm text-zinc-500 dark:text-zinc-400">
                Nothing in your ledger matches these filters. Try widening the date range or
                clearing search.
              </p>
              <button
                type="button"
                onClick={() => { setTxFilters(emptyTransactionFilters); setSearchInput('') }}
                className="mt-4 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-all duration-150 hover:bg-zinc-50 active:scale-95 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="recent-activity-scroll mt-4 max-h-[min(420px,55vh)] overflow-y-auto scroll-smooth pr-3 [-webkit-overflow-scrolling:touch]">
              <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-zinc-200/90 bg-white/90 px-2 py-2.5 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Bulk select
                </span>
                <motion.button
                  type="button"
                  onClick={toggleSelectAllVisible}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 32 }}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300"
                >
                  {allVisibleSelected ? 'Clear selection' : 'Select all'}
                </motion.button>
              </div>
              <ul className="space-y-2 pb-1 pt-2">
                {filteredTransactions.map((tx) => (
                  <SelectableTransactionRow
                    key={tx.id}
                    tx={tx}
                    isSelected={selectedIds.includes(tx.id)}
                    isRecurring={recurringTransactionIds.has(tx.id)}
                    currency={currency}
                    deleteSubmitting={deleteSubmitting}
                    pendingDeleteId={pendingDelete?.id}
                    onToggle={toggleTransactionSelected}
                    onEdit={requestEditTransaction}
                    onDelete={requestDeleteTransaction}
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
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600/95 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 dark:bg-rose-600/90 dark:hover:bg-rose-500/95"
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
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-all duration-150 hover:bg-zinc-50 disabled:opacity-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bulkDeleteSubmitting}
              onClick={() => void confirmBulkDelete()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 dark:bg-red-600 dark:hover:bg-red-500"
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
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-all duration-150 hover:bg-zinc-50 disabled:opacity-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteSubmitting}
              onClick={() => void confirmPendingDelete()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 dark:bg-red-600 dark:hover:bg-red-500"
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
