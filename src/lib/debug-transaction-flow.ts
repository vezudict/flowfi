/**
 * Opt-in tracing for debit/credit data flow (dashboard analytics + insights).
 * Run dev server with: NEXT_PUBLIC_DEBUG_FLOWFI_TX=1 npm run dev
 */
import type { Transaction } from '@/lib/transactions'
import { isExpenseForMetrics, transactionEntryType } from '@/lib/transaction-flow'

export function debugTransactionFlowEnabled(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_DEBUG_FLOWFI_TX === '1'
  )
}

function briefTx(t: Transaction) {
  return {
    amount: t.amount,
    category: t.category,
    transaction_type: t.transaction_type,
    resolved: transactionEntryType(t),
  }
}

/** Step 2–3: full list vs raw type filters vs metrics filters. */
export function logAnalyticsComputeDebug(
  label: string,
  transactions: Transaction[],
  inMonthExpenseMetrics: Transaction[],
  inMonthIncomeMetrics: Transaction[],
): void {
  if (!debugTransactionFlowEnabled()) return

  console.log(`[FlowFi TX DEBUG] ${label} ALL TX`, transactions.map(briefTx))
  console.log(
    '[FlowFi TX DEBUG] EXPENSE TX (raw transaction_type === "debit")',
    transactions.filter((t) => t.transaction_type === 'debit').map(briefTx),
  )
  console.log(
    '[FlowFi TX DEBUG] INCOME TX (raw transaction_type === "credit")',
    transactions.filter((t) => t.transaction_type === 'credit').map(briefTx),
  )
  console.log(
    '[FlowFi TX DEBUG] EXPENSE METRICS (isExpenseForMetrics)',
    inMonthExpenseMetrics.map(briefTx),
  )
  console.log(
    '[FlowFi TX DEBUG] INCOME METRICS (isIncomeForMetrics)',
    inMonthIncomeMetrics.map(briefTx),
  )

  const creditsInExpense = inMonthExpenseMetrics.filter(
    (t) => transactionEntryType(t) === 'credit',
  )
  if (creditsInExpense.length > 0) {
    console.warn(
      '[FlowFi TX DEBUG] BUG CHECK: credit rows in spending bucket',
      creditsInExpense.map(briefTx),
    )
  }
}

/** Step 3: category aggregation inputs for spending pie / top category. */
export function logCategorySpendingInputDebug(inMonthExpenseMetrics: Transaction[]): void {
  if (!debugTransactionFlowEnabled()) return
  console.log(
    '[FlowFi TX DEBUG] CATEGORY INPUT (spending only)',
    inMonthExpenseMetrics.map(briefTx),
  )
  const anyCredit = inMonthExpenseMetrics.filter(
    (t) => transactionEntryType(t) === 'credit',
  )
  const incomeLabel = inMonthExpenseMetrics.filter(
    (t) => t.category.trim().toLowerCase() === 'income',
  )
  if (anyCredit.length > 0) {
    console.warn('[FlowFi TX DEBUG] TOP CATEGORY BUG? credits in input', anyCredit.map(briefTx))
  }
  if (incomeLabel.length > 0) {
    console.warn('[FlowFi TX DEBUG] TOP CATEGORY BUG? category "income" in input', incomeLabel.map(briefTx))
  }
}

/**
 * Step 4: insights receive the full ledger; expense insight math uses
 * `isExpenseForMetrics` only — credits should not appear in that subset.
 */
export function logInsightsInputDebug(
  label: string,
  transactions: Transaction[],
): void {
  if (!debugTransactionFlowEnabled()) return
  console.log(
    `[FlowFi TX DEBUG] ${label} INSIGHTS INPUT (full ledger)`,
    transactions.map(briefTx),
  )
  const expenseOnly = transactions.filter(isExpenseForMetrics)
  console.log(
    `[FlowFi TX DEBUG] ${label} rows used for EXPENSE math`,
    expenseOnly.map(briefTx),
  )
  const creditsInExpenseBucket = expenseOnly.filter(
    (t) => transactionEntryType(t) === 'credit',
  )
  if (creditsInExpenseBucket.length > 0) {
    console.warn(
      '[FlowFi TX DEBUG] BUG: credit rows in expense insight bucket',
      creditsInExpenseBucket.map(briefTx),
    )
  }
}
