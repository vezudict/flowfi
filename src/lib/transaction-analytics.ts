import { categoryForAnalytics } from '@/lib/category-suggestion'
import {
  isExpenseForMetrics,
  isIncomeForMetrics,
} from '@/lib/transaction-flow'
import type { Transaction } from '@/lib/transactions'

export function normalizeAmount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : 0
}

export type AnalyticsBundle = {
  /** Sum of debit (expense) amounts in current month (excludes credits and mis-tagged income category on debits). */
  currentMonthTotal: number
  /** Sum of credit (income) amounts in current month. */
  currentMonthIncomeTotal: number
  /** Credits only, previous calendar month (same clock as current). */
  previousMonthIncomeTotal: number
  /** income − expenses (credits − debit spending metrics) for current month. */
  netSavingsThisMonth: number
  transactionCount: number
  topCategory: { category: string; amount: number } | null
  /** Debit spending by category (never includes credits; excludes category "income"). */
  pieByCategory: { name: string; value: number }[]
  dailyInCurrentMonth: { label: string; amount: number }[]
  /** Credits grouped by category for income donut. */
  incomePieByCategory: { name: string; value: number }[]
  /** Sum of credits per day in current month. */
  incomeDailyInCurrentMonth: { label: string; amount: number }[]
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function localDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isInCurrentMonth(iso: string, ref: Date) {
  const t = new Date(iso)
  return (
    t.getFullYear() === ref.getFullYear() && t.getMonth() === ref.getMonth()
  )
}

function isInMonth(iso: string, year: number, monthIndex: number) {
  const t = new Date(iso)
  return t.getFullYear() === year && t.getMonth() === monthIndex
}

export function computeAnalytics(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): AnalyticsBundle {
  const monthStart = startOfMonth(referenceDate)
  const monthEnd = endOfDay(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0),
  )
  const rangeEnd =
    referenceDate < monthEnd ? endOfDay(referenceDate) : monthEnd

  const inMonth = transactions.filter((tx) =>
    isInCurrentMonth(tx.created_at, referenceDate),
  )

  const inMonthExpenseMetrics = inMonth.filter(isExpenseForMetrics)
  const inMonthIncomeMetrics = inMonth.filter(isIncomeForMetrics)

  const currentMonthTotal = inMonthExpenseMetrics.reduce(
    (sum, tx) => sum + Math.abs(normalizeAmount(tx.amount)),
    0,
  )

  const currentMonthIncomeTotal = inMonthIncomeMetrics.reduce(
    (sum, tx) => sum + Math.abs(normalizeAmount(tx.amount)),
    0,
  )

  const byCategory = new Map<string, number>()
  for (const tx of inMonthExpenseMetrics) {
    const cat = categoryForAnalytics(tx.category)
    if (cat.toLowerCase() === 'income') continue
    const amt = Math.abs(normalizeAmount(tx.amount))
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + amt)
  }

  const prevMonthRef = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1)
  const prevYear = prevMonthRef.getFullYear()
  const prevMonth = prevMonthRef.getMonth()
  const previousMonthIncomeTotal = transactions
    .filter((tx) => isIncomeForMetrics(tx) && isInMonth(tx.created_at, prevYear, prevMonth))
    .reduce((s, tx) => s + Math.abs(normalizeAmount(tx.amount)), 0)

  const incomeByCategory = new Map<string, number>()
  const incomeDayTotals = new Map<string, number>()
  for (const tx of inMonthIncomeMetrics) {
    const cat = categoryForAnalytics(tx.category)
    const amt = Math.abs(normalizeAmount(tx.amount))
    incomeByCategory.set(cat, (incomeByCategory.get(cat) ?? 0) + amt)
    const day = localDateKey(new Date(tx.created_at))
    incomeDayTotals.set(day, (incomeDayTotals.get(day) ?? 0) + amt)
  }

  const incomePieByCategory = [...incomeByCategory.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const incomeDailyInCurrentMonth: { label: string; amount: number }[] = []
  const incomeCursor = new Date(monthStart)
  while (incomeCursor <= rangeEnd) {
    const key = localDateKey(incomeCursor)
    incomeDailyInCurrentMonth.push({
      label: incomeCursor.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      amount: incomeDayTotals.get(key) ?? 0,
    })
    incomeCursor.setDate(incomeCursor.getDate() + 1)
  }

  let topCategory: { category: string; amount: number } | null = null
  for (const [category, amount] of byCategory) {
    if (!topCategory || amount > topCategory.amount) {
      topCategory = { category, amount }
    }
  }

  const pieByCategory = [...byCategory.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const dayTotals = new Map<string, number>()
  for (const tx of inMonthExpenseMetrics) {
    const day = localDateKey(new Date(tx.created_at))
    dayTotals.set(
      day,
      (dayTotals.get(day) ?? 0) + Math.abs(normalizeAmount(tx.amount)),
    )
  }

  const dailyInCurrentMonth: { label: string; amount: number }[] = []
  const cursor = new Date(monthStart)
  while (cursor <= rangeEnd) {
    const key = localDateKey(cursor)
    dailyInCurrentMonth.push({
      label: cursor.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      amount: dayTotals.get(key) ?? 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  const netSavingsThisMonth = currentMonthIncomeTotal - currentMonthTotal

  return {
    currentMonthTotal,
    currentMonthIncomeTotal,
    previousMonthIncomeTotal,
    netSavingsThisMonth,
    transactionCount: transactions.length,
    topCategory,
    pieByCategory,
    dailyInCurrentMonth,
    incomePieByCategory,
    incomeDailyInCurrentMonth,
  }
}
