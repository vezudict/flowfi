import type { Transaction } from '@/lib/transactions'

export type TransactionFilterState = {
  /** Trimmed category string, or empty = all categories */
  category: string
  /** ISO `yyyy-mm-dd` or empty */
  dateFrom: string
  /** ISO `yyyy-mm-dd` or empty */
  dateTo: string
  /** Case-insensitive substring on description */
  search: string
}

export const emptyTransactionFilters: TransactionFilterState = {
  category: '',
  dateFrom: '',
  dateTo: '',
  search: '',
}

function startOfLocalDayFromIsoDate(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return new Date(y, mo - 1, d, 0, 0, 0, 0)
}

function endOfLocalDayFromIsoDate(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return new Date(y, mo - 1, d, 23, 59, 59, 999)
}

/** Unique non-empty categories from the list, sorted for stable UI. */
export function uniqueCategoriesFromTransactions(transactions: Transaction[]): string[] {
  const set = new Set<string>()
  for (const tx of transactions) {
    const c = tx.category.trim()
    if (c) set.add(c)
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilterState,
): Transaction[] {
  const catFilter = filters.category.trim()
  const q = filters.search.trim().toLowerCase()
  const from = filters.dateFrom.trim()
    ? startOfLocalDayFromIsoDate(filters.dateFrom)
    : null
  const to = filters.dateTo.trim() ? endOfLocalDayFromIsoDate(filters.dateTo) : null

  if (from && to && from.getTime() > to.getTime()) {
    return []
  }

  return transactions.filter((tx) => {
    if (catFilter && tx.category.trim() !== catFilter) return false

    const t = new Date(tx.created_at).getTime()
    if (from && t < from.getTime()) return false
    if (to && t > to.getTime()) return false

    if (q) {
      const desc = (tx.description ?? '').toLowerCase()
      if (!desc.includes(q)) return false
    }

    return true
  })
}

export function countActiveFilters(filters: TransactionFilterState): number {
  let n = 0
  if (filters.category.trim()) n += 1
  if (filters.dateFrom.trim()) n += 1
  if (filters.dateTo.trim()) n += 1
  if (filters.search.trim()) n += 1
  return n
}
