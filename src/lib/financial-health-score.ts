import {
  computeAnalytics,
  normalizeAmount,
  type AnalyticsBundle,
} from '@/lib/transaction-analytics'
import { isExpenseForMetrics } from '@/lib/transaction-flow'
import type { Transaction } from '@/lib/transactions'

export type FinancialHealthScoreResult = {
  score: number
  label: string
  explanation: string
}

export type FinancialHealthInsufficientResult = {
  score: null
  label: string
  explanation: string
}

export type FinancialHealthResult =
  | FinancialHealthScoreResult
  | FinancialHealthInsufficientResult

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function isInCurrentMonth(iso: string, ref: Date) {
  const t = new Date(iso)
  return (
    t.getFullYear() === ref.getFullYear() && t.getMonth() === ref.getMonth()
  )
}

/** Debit / expense rows used in spending comparisons (excludes credits and mis-tagged income on debits). */
function expenseTotalForMonth(transactions: Transaction[], ref: Date): number {
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

function daysInMonth(ref: Date) {
  return new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
}

function labelForScore(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  if (score >= 20) return 'Needs attention'
  return 'At risk'
}

/** Coefficient of variation of daily spend (including zero-spend days) in the analytics window. */
function spendingConsistencyPoints(daily: AnalyticsBundle['dailyInCurrentMonth']): {
  points: number
  summary: string
} {
  const amounts = daily.map((d) => d.amount)
  const n = amounts.length
  if (n === 0) {
    return { points: 0, summary: 'Not enough days in this period to measure consistency.' }
  }

  const mean = amounts.reduce((a, b) => a + b, 0) / n
  if (mean < 1e-9) {
    return {
      points: 50,
      summary:
        'Daily spending is perfectly steady so far (no day-to-day variation yet this month).',
    }
  }

  const variance =
    amounts.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(n, 1)
  const stdev = Math.sqrt(variance)
  const cv = stdev / mean
  const t = clamp01(1 - cv / 1.35)
  const points = Math.round(50 * t)
  if (t >= 0.85) {
    return {
      points,
      summary:
        'Your day-to-day spending is very stable—few spikes compared to your average.',
    }
  }
  if (t >= 0.5) {
    return {
      points,
      summary:
        'Spending from day to day is moderately consistent, with some variation.',
    }
  }
  return {
    points,
    summary:
      'Spending jumps around a lot day to day; steadier habits usually make budgets easier to hit.',
  }
}

/**
 * Combines a budget-based savings proxy (50 pts) with daily spending consistency (50 pts).
 * Savings: share of monthly budget left unspent (clamped); without a budget, compares this month’s
 * projected total to last month’s spend.
 */
export function computeFinancialHealthScore(
  transactions: Transaction[],
  options: {
    monthlyBudget: number | null
    referenceDate?: Date
  },
): FinancialHealthResult {
  const ref = options.referenceDate ?? new Date()
  const txThisMonth = transactions.filter((tx) =>
    isInCurrentMonth(tx.created_at, ref),
  )

  if (txThisMonth.length === 0) {
    return {
      score: null,
      label: 'Not enough data',
      explanation:
        'Add at least one transaction in the current month to calculate your Financial Health Score. We use your activity to estimate savings discipline and spending consistency.',
    }
  }

  const analytics = computeAnalytics(transactions, ref)
  const spent = analytics.currentMonthTotal
  const budget = options.monthlyBudget
  let savingsPoints = 0
  let savingsSummary: string

  if (budget !== null && budget > 0) {
    const headroom = 1 - spent / budget
    savingsPoints = Math.round(50 * clamp01(headroom))
    if (headroom >= 0.15) {
      savingsSummary = `You’re keeping spending well under your monthly budget (${Math.round(headroom * 100)}% of the plan still unused).`
    } else if (headroom >= 0) {
      savingsSummary =
        'You’re at or slightly under budget—there is still a bit of cushion against the monthly cap.'
    } else {
      savingsSummary =
        'You’ve exceeded your monthly budget, which drags down the savings part of this score.'
    }
  } else {
    const prevRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 15)
    const lastTotal = expenseTotalForMonth(transactions, prevRef)
    const dim = daysInMonth(ref)
    const day = Math.max(1, ref.getDate())
    const projected = spent * (dim / day)

    if (lastTotal > 0) {
      const ratio = projected / lastTotal
      savingsPoints = Math.round(50 * clamp01(2 - ratio))
      if (ratio <= 0.95) {
        savingsSummary =
          'Your pace this month is below last month’s total—on track to spend less if it continues.'
      } else if (ratio <= 1.1) {
        savingsSummary =
          'Your pace is close to last month; set a monthly budget for a clearer savings signal.'
      } else {
        savingsSummary =
          'At the current pace you’re trending above last month’s spending; a budget makes this easier to manage.'
      }
    } else {
      savingsPoints = 25
      savingsSummary =
        'No prior month to compare against; set a monthly budget so we can score how much of your plan you keep.'
    }
  }

  const { points: consistencyPoints, summary: consistencySummary } =
    spendingConsistencyPoints(analytics.dailyInCurrentMonth)

  const raw = savingsPoints + consistencyPoints
  const score = Math.max(0, Math.min(100, raw))
  const label = labelForScore(score)
  const explanation = `${savingsSummary} ${consistencySummary}`

  return { score, label, explanation }
}
