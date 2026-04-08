import {
  categoryForAnalytics,
  isIncomeCategoryLabel,
} from '@/lib/category-suggestion'
import type { Transaction } from '@/lib/transactions'

export function normalizeAmount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : 0
}

export type AnalyticsBundle = {
  currentMonthTotal: number
  transactionCount: number
  topCategory: { category: string; amount: number } | null
  pieByCategory: { name: string; value: number }[]
  dailyInCurrentMonth: { label: string; amount: number }[]
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

/** Spending / outflows only (excludes income-category transactions). */
export function isExpenseTransaction(tx: Transaction): boolean {
  return !isIncomeCategoryLabel(tx.category)
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

  const inMonthExpenses = inMonth.filter(isExpenseTransaction)

  const currentMonthTotal = inMonthExpenses.reduce(
    (sum, tx) => sum + Math.abs(normalizeAmount(tx.amount)),
    0,
  )

  const byCategory = new Map<string, number>()
  for (const tx of inMonthExpenses) {
    const cat = categoryForAnalytics(tx.category)
    const amt = Math.abs(normalizeAmount(tx.amount))
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + amt)
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
  for (const tx of inMonthExpenses) {
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

  return {
    currentMonthTotal,
    transactionCount: transactions.length,
    topCategory,
    pieByCategory,
    dailyInCurrentMonth,
  }
}
