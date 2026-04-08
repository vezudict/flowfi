import { getCategoryLabel } from '@/lib/category-display'
import { isExpenseForMetrics } from '@/lib/transaction-flow'
import type { SupportedCurrencyCode } from '@/lib/currencies'
import { formatCurrency } from '@/lib/format-currency'
import { normalizeAmount } from '@/lib/transaction-analytics'
import type { SpendingInsight } from '@/lib/spending-insights'
import type { Transaction } from '@/lib/transactions'

const MIN_CLUSTER_SIZE = 2
const MIN_SPAN_MS = 7 * 24 * 60 * 60 * 1000
const AMOUNT_REL_TOLERANCE = 0.04
const AMOUNT_ABS_TOLERANCE = 0.5
const MAX_RECURRING_INSIGHTS = 4

export function normalizeTransactionDescription(d: string | null): string {
  return (d ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function absAmount(tx: Transaction): number {
  return Math.abs(normalizeAmount(tx.amount))
}

function amountsSimilar(a: number, b: number): boolean {
  if (a < 1e-9 && b < 1e-9) return true
  const hi = Math.max(a, b)
  if (hi < 1e-9) return true
  return (
    Math.abs(a - b) <= AMOUNT_ABS_TOLERANCE ||
    Math.abs(a - b) / hi <= AMOUNT_REL_TOLERANCE
  )
}

/**
 * Whether two rows are likely the same recurring charge.
 * Same category and description; amounts within tolerance.
 * Empty description only clusters when amounts match to the cent (avoids bloating “Groceries”).
 */
export function transactionsLookRecurring(a: Transaction, b: Transaction): boolean {
  if (a.category.trim() !== b.category.trim()) return false
  const da = normalizeTransactionDescription(a.description)
  const db = normalizeTransactionDescription(b.description)
  if (da !== db) return false
  if (da.length === 0) {
    return Math.round(absAmount(a) * 100) === Math.round(absAmount(b) * 100)
  }
  return amountsSimilar(absAmount(a), absAmount(b))
}

function clusterSpanMs(cluster: Transaction[]): number {
  const ts = cluster.map((t) => new Date(t.created_at).getTime())
  return Math.max(...ts) - Math.min(...ts)
}

/** Greedy clusters: each new row joins first cluster whose representative matches. */
function buildRecurringClusters(transactions: Transaction[]): Transaction[][] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const clusters: Transaction[][] = []

  for (const tx of sorted) {
    let placed = false
    for (const cluster of clusters) {
      const rep = cluster[0]!
      if (!transactionsLookRecurring(rep, tx)) continue
      const repAmt = absAmount(rep)
      const ok = cluster.every((m) => amountsSimilar(absAmount(m), absAmount(tx)))
      if (!ok) continue
      if (!amountsSimilar(repAmt, absAmount(tx))) continue
      cluster.push(tx)
      placed = true
      break
    }
    if (!placed) clusters.push([tx])
  }

  return clusters.filter(
    (c) => c.length >= MIN_CLUSTER_SIZE && clusterSpanMs(c) >= MIN_SPAN_MS,
  )
}

export function getRecurringTransactionIds(transactions: Transaction[]): Set<string> {
  const expenses = transactions.filter((t) => isExpenseForMetrics(t))
  const clusters = buildRecurringClusters(expenses)
  const ids = new Set<string>()
  for (const c of clusters) {
    for (const tx of c) ids.add(tx.id)
  }
  return ids
}

export function buildRecurringInsights(
  transactions: Transaction[],
  currency: SupportedCurrencyCode,
): SpendingInsight[] {
  const expenses = transactions.filter((t) => isExpenseForMetrics(t))
  const clusters = buildRecurringClusters(expenses)
  if (clusters.length === 0) return []

  const sortedClusters = [...clusters].sort((a, b) => b.length - a.length)
  const pick = sortedClusters.slice(0, MAX_RECURRING_INSIGHTS)
  const insights: SpendingInsight[] = []

  for (const cluster of pick) {
    const first = cluster[0]!
    const avg = cluster.reduce((s, t) => s + absAmount(t), 0) / cluster.length
    const desc = normalizeTransactionDescription(first.description)
    const hint =
      desc.length === 0
        ? 'same amount'
        : desc.length > 42
          ? `${desc.slice(0, 39)}…`
          : desc
    insights.push({
      id: `recurring-${first.id}`,
      text: `Recurring pattern: ${cluster.length}× ${getCategoryLabel(first.category)} · ~${formatCurrency(avg, currency)} (${hint}).`,
    })
  }

  return insights
}
