import { categoryForAnalytics } from '@/lib/category-suggestion'
import { formatRupee } from '@/lib/format-currency'
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

function categoryTotalsForMonth(transactions: Transaction[], ref: Date): Map<string, number> {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  const map = new Map<string, number>()
  for (const tx of transactions) {
    const t = new Date(tx.created_at)
    if (t.getFullYear() !== y || t.getMonth() !== m) continue
    const cat = categoryForAnalytics(tx.category)
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

function overallMomInsight(
  current: number,
  previous: number,
  fmt: typeof formatRupee,
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

function topCategoryInsight(top: { category: string; amount: number } | null, fmt: typeof formatRupee): SpendingInsight | null {
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
  fmt: typeof formatRupee,
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
  fmt: typeof formatRupee,
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
  fmt: typeof formatRupee,
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

function averageDailyInsight(currentMonthTotal: number, ref: Date, fmt: typeof formatRupee): SpendingInsight | null {
  if (currentMonthTotal <= 0) {
    return {
      id: 'avg-daily',
      text: 'Average daily spending will appear once you add transactions this month.',
    }
  }
  const daysElapsed = Math.max(1, ref.getDate())
  const avg = currentMonthTotal / daysElapsed
  return {
    id: 'avg-daily',
    text: `Your average daily spending so far this month is ${fmt(avg, 0)}.`,
  }
}

export function buildSpendingInsights(
  transactions: Transaction[],
  ref: Date = new Date(),
): SpendingInsight[] {
  if (transactions.length === 0) {
    return []
  }

  const currentRef = ref
  const prevRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 1)

  const currentByCat = categoryTotalsForMonth(transactions, currentRef)
  const prevByCat = categoryTotalsForMonth(transactions, prevRef)
  const currentTotal = totalForMonth(transactions, currentRef)
  const previousTotal = totalForMonth(transactions, prevRef)
  const top = topCategoryThisMonth(currentByCat)

  const fmt = formatRupee
  const insights: SpendingInsight[] = []

  const o = overallMomInsight(currentTotal, previousTotal, fmt)
  if (o) insights.push(o)

  const tc = topCategoryInsight(top, fmt)
  if (tc) insights.push(tc)

  const cm = topCategoryMomInsight(top, currentByCat, prevByCat, fmt)
  if (cm) insights.push(cm)

  const daily = dailySpikeInsight(transactions, currentRef, currentTotal, fmt)
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
