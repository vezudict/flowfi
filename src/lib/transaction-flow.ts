import { categoryForAnalytics, isIncomeCategoryLabel } from '@/lib/category-suggestion'
import type { Transaction } from '@/lib/transactions'

export type EntryType = 'debit' | 'credit'

/**
 * Persisted entry type from DB, with fallback for legacy rows that predate `transaction_type`.
 */
export function transactionEntryType(tx: Transaction): EntryType {
  const t = tx.transaction_type
  if (t === 'debit' || t === 'credit') return t
  return isIncomeCategoryLabel(tx.category) ? 'credit' : 'debit'
}

export function isDebitTransaction(tx: Transaction): boolean {
  return transactionEntryType(tx) === 'debit'
}

export function isCreditTransaction(tx: Transaction): boolean {
  return transactionEntryType(tx) === 'credit'
}

/**
 * Rows that count toward spending charts, totals, and expense insights:
 * debits only, excluding category "income" (mis-tagged rows).
 */
export function isExpenseForMetrics(tx: Transaction): boolean {
  if (!isDebitTransaction(tx)) return false
  const cat = categoryForAnalytics(tx.category).trim().toLowerCase()
  if (cat === 'income') return false
  return true
}

/** Rows that count toward income totals and income insights. */
export function isIncomeForMetrics(tx: Transaction): boolean {
  return isCreditTransaction(tx)
}
