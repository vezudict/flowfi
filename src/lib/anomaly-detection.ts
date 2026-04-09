/**
 * Deterministic anomaly detection for financial transactions.
 * Runs client-side on the full transaction list + analytics bundle.
 * Results are surfaced in the UI and injected into the AI context.
 */

import { formatCurrency } from '@/lib/format-currency'
import { isExpenseForMetrics } from '@/lib/transaction-flow'
import type { AnalyticsBundle } from '@/lib/transaction-analytics'
import type { Transaction } from '@/lib/transactions'
import type { SupportedCurrencyCode } from '@/lib/currencies'

export type Anomaly = {
  type: 'spike' | 'category' | 'income' | 'large'
  message: string
  severity: 'high' | 'medium'
}

/**
 * Detect unusual financial patterns from the current month's data.
 * Returns up to 3 anomalies, sorted high-severity first.
 */
export function detectAnomalies(
  transactions: Transaction[],
  analytics: AnalyticsBundle,
  currency: SupportedCurrencyCode | string,
): Anomaly[] {
  const anomalies: Anomaly[] = []

  const fmt = (n: number) => formatCurrency(n, currency as SupportedCurrencyCode)

  // ── 1. Spending spike ──────────────────────────────────────────────────────
  // Flag the worst day where spending > 2× the average spending day
  const spendingDays = analytics.dailyInCurrentMonth.filter((d) => d.amount > 0)
  const avgDailySpend =
    spendingDays.length > 0
      ? analytics.currentMonthTotal / spendingDays.length
      : 0

  if (avgDailySpend > 0) {
    const spike = analytics.dailyInCurrentMonth
      .filter((d) => d.amount > avgDailySpend * 2)
      .sort((a, b) => b.amount - a.amount)[0]

    if (spike) {
      const multiple = Math.round(spike.amount / avgDailySpend)
      anomalies.push({
        type: 'spike',
        message: `Spending spiked to ${fmt(spike.amount)} on ${spike.label} — ${multiple}× your daily average of ${fmt(Math.round(avgDailySpend))}.`,
        severity: multiple >= 4 ? 'high' : 'medium',
      })
    }
  }

  // ── 2. Dominant category ───────────────────────────────────────────────────
  // Flag if one category exceeds 40% of total spending
  if (analytics.currentMonthTotal > 0 && analytics.pieByCategory.length > 0) {
    const top = analytics.pieByCategory[0]
    const ratio = top.value / analytics.currentMonthTotal
    if (ratio > 0.4) {
      const pct = Math.round(ratio * 100)
      anomalies.push({
        type: 'category',
        message: `${top.name} accounts for ${pct}% of spending (${fmt(Math.round(top.value))} of ${fmt(Math.round(analytics.currentMonthTotal))}).`,
        severity: pct >= 60 ? 'high' : 'medium',
      })
    }
  }

  // ── 3. Income drop ────────────────────────────────────────────────────────
  // Flag if current income is >30% below the previous month
  const { currentMonthIncomeTotal, previousMonthIncomeTotal } = analytics
  if (previousMonthIncomeTotal > 0 && currentMonthIncomeTotal > 0) {
    const drop = (previousMonthIncomeTotal - currentMonthIncomeTotal) / previousMonthIncomeTotal
    if (drop > 0.3) {
      const pct = Math.round(drop * 100)
      anomalies.push({
        type: 'income',
        message: `Income fell ${pct}% vs last month — ${fmt(Math.round(previousMonthIncomeTotal))} → ${fmt(Math.round(currentMonthIncomeTotal))}.`,
        severity: pct >= 50 ? 'high' : 'medium',
      })
    }
  }

  // ── 4. Large single transaction ────────────────────────────────────────────
  // Flag any expense that alone exceeds 30% of monthly spending
  if (analytics.currentMonthTotal > 0) {
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth()

    const currentMonthExpenses = transactions.filter((tx) => {
      const d = new Date(tx.created_at)
      return (
        d.getFullYear() === thisYear &&
        d.getMonth() === thisMonth &&
        isExpenseForMetrics(tx)
      )
    })

    const largest = currentMonthExpenses.sort((a, b) => b.amount - a.amount)[0]
    if (largest) {
      const ratio = largest.amount / analytics.currentMonthTotal
      if (ratio > 0.3) {
        const pct = Math.round(ratio * 100)
        const label = largest.description ?? 'A single transaction'
        anomalies.push({
          type: 'large',
          message: `"${label}" (${fmt(largest.amount)}) is ${pct}% of monthly spending on its own.`,
          severity: pct >= 50 ? 'high' : 'medium',
        })
      }
    }
  }

  // Sort high-severity first, cap at 3
  return anomalies
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1))
    .slice(0, 3)
}
