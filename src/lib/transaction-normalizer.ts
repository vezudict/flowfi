import { fixTransactionCategory } from '@/lib/category-backfill'
import type { Transaction } from '@/lib/transactions'

/**
 * Single source of truth for client-side transaction normalization.
 * Applies soft category repair (other → detected) from description keywords.
 * Does not persist; call after any fetch or API response before storing in state.
 */
export function normalizeTransaction(tx: Transaction): Transaction {
  const fixed = fixTransactionCategory(tx)

  if (process.env.NODE_ENV === 'development' && fixed !== tx.category) {
    console.log('CATEGORY FLOW', { raw: tx.category, fixed, description: tx.description })
  }

  return fixed === tx.category ? tx : { ...tx, category: fixed }
}
