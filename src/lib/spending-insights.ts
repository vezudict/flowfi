import { categoryForAnalytics } from '@/lib/category-suggestion'
import { DEFAULT_CURRENCY, type SupportedCurrencyCode } from '@/lib/currencies'
import { formatCurrency } from '@/lib/format-currency'
import {
  isExpenseForMetrics,
  isIncomeForMetrics,
} from '@/lib/transaction-flow'
import { normalizeAmount } from '@/lib/transaction-analytics'
import type { Transaction } from '@/lib/transactions'

export type SpendingInsight = {
  id: string
  text: string
}

function localDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isInCalendarMonth(iso: string, ref: Date) {
  const t = new Date(iso)
  return t.getFullYear() === ref.getFullYear() && t.getMonth() === ref.getMonth()
}

function categoryTotalsForMonth(transactions: Transaction[], ref: Date): Map<string, number> {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  const map = new Map<string, number>()
  for (const tx of transactions) {
    const t = new Date(tx.created_at)
    if (t.getFullYear() !== y || t.getMonth() !== m) continue
    const cat = categoryForAnalytics(tx.category)
    if (cat.toLowerCase() === 'income') continue
    map.set(cat, (map.get(cat) ?? 0) + Math.abs(normalizeAmount(tx.amount)))
  }
  return map
}

function totalForMonth(transactions: Transaction[], ref: Date): number {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  return transactions.reduce((sum, tx) => {
    const t = new Date(tx.created_at)
    if (t.getFullYear() === y && t.getMonth() === m) {
      return sum + Math.abs(normalizeAmount(tx.amount))
    }
    return sum
  }, 0)
}

function topCategoryThisMonth(
  byCategory: Map<string, number>,
): { category: string; amount: number } | null {
  let best: { category: string; amount: number } | null = null
  for (const [category, amount] of byCategory) {
    if (!best || amount > best.amount) best = { category, amount }
  }
  return best && best.amount > 0 ? best : null
}

function medianPositive(values: number[]): number {
  const nums = values.filter((v) => v > 0).sort((a, b) => a - b)
  if (nums.length === 0) return 0
  const mid = Math.floor(nums.length / 2)
  return nums.length % 2 ? nums[mid]! : (nums[mid - 1]! + nums[mid]!) / 2
}

type MoneyFmt = (value: number, maxFrac?: 0 | 2) => string

function overallMomInsight(
  current: number,
  previous: number,
  fmt: MoneyFmt,
): SpendingInsight | null {
  if (current === 0 && previous === 0) {
    return {
      id: 'overall-mom',
      text: 'No spending logged yet for this month or last month—add entries to track trends.',
    }
  }
  if (previous === 0 && current > 0) {
    return {
      id: 'overall-mom',
      text: `You spent ${fmt(current)} this month. Last month had no recorded spending to compare against.`,
    }
  }
  if (previous > 0 && current === 0) {
    return {
      id: 'overall-mom',
      text: `You spent nothing so far this month compared to ${fmt(previous)} last month.`,
    }
  }
  const change = ((current - previous) / previous) * 100
  const rounded = Math.round(change)
  if (rounded === 0) {
    return {
      id: 'overall-mom',
      text: `Overall spending is about the same as last month (${fmt(current)} vs ${fmt(previous)}).`,
    }
  }
  if (rounded > 0) {
    return {
      id: 'overall-mom',
      text: `You spent ${rounded}% more overall this month than last month.`,
    }
  }
  return {
    id: 'overall-mom',
    text: `You spent ${Math.abs(rounded)}% less overall this month than last month.`,
  }
}

function topCategoryInsight(top: { category: string; amount: number } | null, fmt: MoneyFmt): SpendingInsight | null {
  if (!top) {
    return {
      id: 'top-category',
      text: 'Your highest expense category will appear here once you log spending this month.',
    }
  }
  return {
    id: 'top-category',
    text: `Your highest expense category is ${top.category}, with about ${fmt(top.amount)} so far this month.`,
  }
}

/** Month-over-month change for the category that leads spending this month. */
function topCategoryMomInsight(
  top: { category: string; amount: number } | null,
  currentByCat: Map<string, number>,
  prevByCat: Map<string, number>,
  fmt: MoneyFmt,
): SpendingInsight | null {
  if (!top) return null
  const prev = prevByCat.get(top.category) ?? 0
  const curr = currentByCat.get(top.category) ?? 0
  if (curr <= 0) return null
  if (prev <= 0) {
    return {
      id: 'category-mom',
      text: `${top.category} is a standout this month (${fmt(curr)}); you had little or no ${top.category} spending last month.`,
    }
  }
  const change = ((curr - prev) / prev) * 100
  const rounded = Math.round(change)
  if (rounded === 0) {
    return {
      id: 'category-mom',
      text: `Spending on ${top.category} is about the same as last month.`,
    }
  }
  if (rounded > 0) {
    return {
      id: 'category-mom',
      text: `You spent ${rounded}% more on ${top.category} this month compared to last month.`,
    }
  }
  return {
    id: 'category-mom',
    text: `You spent ${Math.abs(rounded)}% less on ${top.category} this month compared to last month.`,
  }
}

function dailySpikeInsight(
  transactions: Transaction[],
  ref: Date,
  monthTotal: number,
  fmt: MoneyFmt,
): SpendingInsight | null {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  const dayTotals = new Map<string, number>()
  for (const tx of transactions) {
    const t = new Date(tx.created_at)
    if (t.getFullYear() !== y || t.getMonth() !== m) continue
    const key = localDateKey(t)
    dayTotals.set(key, (dayTotals.get(key) ?? 0) + Math.abs(normalizeAmount(tx.amount)))
  }
  const amounts = [...dayTotals.values()]
  const med = medianPositive(amounts)
  if (amounts.filter((a) => a > 0).length < 3 || med <= 0 || monthTotal <= 0) return null
  let max = 0
  let maxKey: string | null = null
  for (const [k, v] of dayTotals) {
    if (v > max) {
      max = v
      maxKey = k
    }
  }
  if (!maxKey || max < med * 2) return null
  if (max < monthTotal * 0.14) return null
  const label = new Date(`${maxKey}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  return {
    id: 'spike-daily',
    text: `Unusual spike on ${label}: about ${fmt(max)} in one day (${Math.round((max / monthTotal) * 100)}% of this month’s total so far).`,
  }
}

/**
 * Category other than `skipCategory` where spending roughly doubled vs last month
 * (avoids duplicating the top-category MoM line).
 */
function categorySpikeInsight(
  currentByCat: Map<string, number>,
  prevByCat: Map<string, number>,
  skipCategory: string | null,
  fmt: MoneyFmt,
): SpendingInsight | null {
  let best: { cat: string; ratio: number; curr: number; prev: number } | null = null
  for (const [cat, curr] of currentByCat) {
    if (skipCategory && cat === skipCategory) continue
    if (curr <= 0) continue
    const prev = prevByCat.get(cat) ?? 0
    if (prev < 100) continue
    const ratio = curr / prev
    if (ratio < 1.85) continue
    if (!best || ratio > best.ratio) best = { cat, ratio, curr, prev }
  }
  if (!best) return null
  const times =
    best.ratio >= 10 ? String(Math.round(best.ratio)) : best.ratio.toFixed(1)
  return {
    id: 'spike-category',
    text: `Spending on ${best.cat} jumped sharply versus last month—about ${times}× last month (${fmt(best.curr)} vs ${fmt(best.prev)}).`,
  }
}

function averageDailyInsight(currentMonthTotal: number, ref: Date, fmt: MoneyFmt): SpendingInsight | null {
  if (currentMonthTotal <= 0) {
    return {
      id: 'avg-daily',
      text: 'Average daily spending will appear once you add expense transactions this month.',
    }
  }
  const daysElapsed = Math.max(1, ref.getDate())
  const avg = currentMonthTotal / daysElapsed
  return {
    id: 'avg-daily',
    text: `Your average daily spending so far this month is ${fmt(avg, 0)}.`,
  }
}

function totalIncomeForMonth(transactions: Transaction[], ref: Date): number {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  return transactions.reduce((sum, tx) => {
    if (!isIncomeForMetrics(tx)) return sum
    const t = new Date(tx.created_at)
    if (t.getFullYear() === y && t.getMonth() === m) {
      return sum + Math.abs(normalizeAmount(tx.amount))
    }
    return sum
  }, 0)
}

function totalExpenseForMonth(transactions: Transaction[], ref: Date): number {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  return transactions.reduce((sum, tx) => {
    if (!isExpenseForMetrics(tx)) return sum
    const t = new Date(tx.created_at)
    if (t.getFullYear() === y && t.getMonth() === m) {
      return sum + Math.abs(normalizeAmount(tx.amount))
    }
    return sum
  }, 0)
}

function incomeCategoryTotalsForMonth(transactions: Transaction[], ref: Date): Map<string, number> {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  const map = new Map<string, number>()
  for (const tx of transactions) {
    if (!isIncomeForMetrics(tx)) continue
    const t = new Date(tx.created_at)
    if (t.getFullYear() !== y || t.getMonth() !== m) continue
    const cat = categoryForAnalytics(tx.category)
    map.set(cat, (map.get(cat) ?? 0) + Math.abs(normalizeAmount(tx.amount)))
  }
  return map
}

export function buildSavingsInsights(
  transactions: Transaction[],
  ref: Date = new Date(),
  currency: SupportedCurrencyCode = DEFAULT_CURRENCY,
): SpendingInsight[] {
  if (transactions.length === 0) return []

  const fmt: MoneyFmt = (value, maxFrac) =>
    maxFrac !== undefined
      ? formatCurrency(value, currency, { maximumFractionDigits: maxFrac })
      : formatCurrency(value, currency)

  const income = totalIncomeForMonth(transactions, ref)
  const expenses = totalExpenseForMonth(transactions, ref)

  if (income <= 0 && expenses <= 0) return []

  if (income <= 0) {
    return [
      {
        id: 'savings-no-income',
        text: `You spent about ${fmt(expenses)} this month in debits. Add credits for salary or deposits to track income and savings.`,
      },
    ]
  }

  const net = income - expenses
  if (net >= 0) {
    return [
      {
        id: 'savings-net',
        text: `You saved ${fmt(net)} this month.`,
      },
    ]
  }
  return [
    {
      id: 'savings-net',
      text: `You spent ${fmt(-net)} more than you earned this month.`,
    },
  ]
}

export function buildIncomeInsights(
  transactions: Transaction[],
  ref: Date = new Date(),
  currency: SupportedCurrencyCode = DEFAULT_CURRENCY,
): SpendingInsight[] {
  if (transactions.length === 0) return []

  const fmt: MoneyFmt = (value, maxFrac) =>
    maxFrac !== undefined
      ? formatCurrency(value, currency, { maximumFractionDigits: maxFrac })
      : formatCurrency(value, currency)

  const currentRef = ref

  const incomeCurrent = totalIncomeForMonth(transactions, currentRef)
  const byCat = incomeCategoryTotalsForMonth(transactions, currentRef)

  let top: { category: string; amount: number } | null = null
  for (const [category, amount] of byCat) {
    if (!top || amount > top.amount) top = { category, amount }
  }

  const insights: SpendingInsight[] = []

  if (incomeCurrent <= 0) {
    insights.push({
      id: 'income-none',
      text: 'No credit (income) transactions this month. Record inflows as Credit when adding or importing to track income.',
    })
    return insights
  }

  const incomeTxThisMonth = transactions.filter(
    (t) => isIncomeForMetrics(t) && isInCalendarMonth(t.created_at, currentRef),
  )

  const depositPhrase =
    incomeTxThisMonth.length > 0
      ? ` (${incomeTxThisMonth.length} ${incomeTxThisMonth.length === 1 ? 'deposit' : 'deposits'})`
      : ''
  insights.push({
    id: 'income-total',
    text: `Total income this month is about ${fmt(incomeCurrent)}${depositPhrase}.`,
  })

  if (top && top.amount > 0) {
    insights.push({
      id: 'income-top-source',
      text: `Your largest income category is ${top.category} (~${fmt(top.amount)} this month).`,
    })
  }

  const nDeposits = incomeTxThisMonth.length
  if (nDeposits >= 1) {
    insights.push({
      id: 'income-frequency',
      text:
        nDeposits === 1
          ? 'One income deposit this month.'
          : `${nDeposits} income deposits this month — cadence may matter if you rely on regular paydays.`,
    })
  }

  const amounts = incomeTxThisMonth
    .map((t) => Math.abs(normalizeAmount(t.amount)))
    .filter((a) => a > 0)
  if (amounts.length >= 3) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance = amounts.reduce((s, x) => s + (x - mean) ** 2, 0) / amounts.length
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0
    if (cv < 0.2) {
      insights.push({
        id: 'income-consistency',
        text: 'Income deposits this month have been fairly steady in size.',
      })
    } else if (cv > 0.5) {
      insights.push({
        id: 'income-consistency',
        text: 'Income deposit sizes varied a lot this month—worth a quick review if you rely on predictable pay.',
      })
    }
  }

  return insights
}

/** Debit-only spending insights (totals, top category, averages, spikes). */
export function buildExpenseInsights(
  transactions: Transaction[],
  ref: Date = new Date(),
  currency: SupportedCurrencyCode = DEFAULT_CURRENCY,
): SpendingInsight[] {
  if (transactions.length === 0) {
    return []
  }

  const expenseTx = transactions.filter((t) => isExpenseForMetrics(t))
  if (expenseTx.length === 0) {
    return [
      {
        id: 'expenses-none',
        text: 'No debit (expense) transactions in your ledger yet. Add purchases as Debit or import statement debits for spending insights.',
      },
    ]
  }

  const currentRef = ref
  const prevRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 1)

  const currentByCat = categoryTotalsForMonth(expenseTx, currentRef)
  const prevByCat = categoryTotalsForMonth(expenseTx, prevRef)
  const currentTotal = totalForMonth(expenseTx, currentRef)
  const previousTotal = totalForMonth(expenseTx, prevRef)
  const top = topCategoryThisMonth(currentByCat)

  const fmt: MoneyFmt = (value, maxFrac) =>
    maxFrac !== undefined
      ? formatCurrency(value, currency, { maximumFractionDigits: maxFrac })
      : formatCurrency(value, currency)
  const insights: SpendingInsight[] = []

  if (currentTotal > 0) {
    insights.push({
      id: 'expense-total-debits',
      text: `Total spending this month (debits only): about ${fmt(currentTotal)}.`,
    })
  }

  const o = overallMomInsight(currentTotal, previousTotal, fmt)
  if (o) insights.push(o)

  const tc = topCategoryInsight(top, fmt)
  if (tc) insights.push(tc)

  const cm = topCategoryMomInsight(top, currentByCat, prevByCat, fmt)
  if (cm) insights.push(cm)

  const daily = dailySpikeInsight(expenseTx, currentRef, currentTotal, fmt)
  if (daily) {
    insights.push(daily)
  } else {
    const categorySpike = categorySpikeInsight(
      currentByCat,
      prevByCat,
      top?.category ?? null,
      fmt,
    )
    if (categorySpike) insights.push(categorySpike)
  }

  const avg = averageDailyInsight(currentTotal, currentRef, fmt)
  if (avg) insights.push(avg)

  return insights
}

/** @deprecated Use `buildExpenseInsights` */
export const buildSpendingInsights = buildExpenseInsights
