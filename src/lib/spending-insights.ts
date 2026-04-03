import { formatRupee } from '@/lib/format-currency'
import { normalizeAmount } from '@/lib/transaction-analytics'
import type { Transaction } from '@/lib/transactions'

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
  transactions: Transaction[],
  ref: Date,
): string | null {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  const map = new Map<string, number>()
  for (const tx of transactions) {
    const t = new Date(tx.created_at)
    if (t.getFullYear() !== y || t.getMonth() !== m) continue
    const cat = tx.category.trim() || 'Other'
    map.set(cat, (map.get(cat) ?? 0) + Math.abs(normalizeAmount(tx.amount)))
  }
  let best: { cat: string; amt: number } | null = null
  for (const [cat, amt] of map) {
    if (!best || amt > best.amt) best = { cat, amt }
  }
  return best && best.amt > 0 ? best.cat : null
}

function comparisonInsight(
  current: number,
  previous: number,
  fmt: typeof formatRupee,
): string {
  if (current === 0 && previous === 0) {
    return 'You have no recorded spending this month or last month.'
  }
  if (previous === 0 && current > 0) {
    return `You spent ${fmt(current)} this month. Last month had no recorded spending to compare against.`
  }
  if (previous > 0 && current === 0) {
    return `You spent 100% less this month compared to last month (previously ${fmt(previous)}).`
  }

  const change = ((current - previous) / previous) * 100
  const rounded = Math.round(change)
  if (rounded === 0) {
    return `Your spending is about the same as last month (${fmt(current)} vs ${fmt(previous)}).`
  }
  if (rounded > 0) {
    return `You spent ${rounded}% more this month compared to last month.`
  }
  return `You spent ${Math.abs(rounded)}% less this month compared to last month.`
}

function averageDailyInsight(currentMonthTotal: number, ref: Date, fmt: typeof formatRupee): string {
  if (currentMonthTotal <= 0) {
    return 'Your average daily spending will show here once you add transactions this month.'
  }
  const daysElapsed = Math.max(1, ref.getDate())
  const avg = currentMonthTotal / daysElapsed
  return `Your average daily spending is ${fmt(avg, 0)}.`
}

function categoryInsight(top: string | null): string {
  if (!top) {
    return 'No category stands out yet—add spending this month to see your top category.'
  }
  return `Your highest spending category is ${top}.`
}

export function buildSpendingInsights(
  transactions: Transaction[],
  ref: Date = new Date(),
): string[] {
  if (transactions.length === 0) {
    return [
      'Add transactions to unlock insights about your spending patterns.',
    ]
  }

  const currentRef = ref
  const prevRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 1)

  const currentTotal = totalForMonth(transactions, currentRef)
  const previousTotal = totalForMonth(transactions, prevRef)
  const top = topCategoryThisMonth(transactions, currentRef)

  return [
    comparisonInsight(currentTotal, previousTotal, formatRupee),
    categoryInsight(top),
    averageDailyInsight(currentTotal, currentRef, formatRupee),
  ]
}
