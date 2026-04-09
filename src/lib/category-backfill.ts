import { detectCategory, isOtherLikeCategoryLabel } from '@/lib/category-suggestion'
import { getCategoryFromMemory } from '@/lib/category-memory'

export type CategoryBackfillInput = {
  category: string
  description: string | null
}

/**
 * Soft category repair for client-side display. Priority order:
 *   1. User memory (localStorage corrections) — always wins
 *   2. Keyword rules — only applied when stored category is other-like
 *   3. Stored category — returned as-is
 * Does not persist to DB.
 */
export function fixTransactionCategory(tx: CategoryBackfillInput): string {
  const desc = tx.description?.trim()

  // 1. User memory overrides everything — user intent is authoritative
  if (desc) {
    const remembered = getCategoryFromMemory(desc)
    if (remembered) {
      if (process.env.NODE_ENV === 'development') {
        console.log('CATEGORY FROM MEMORY:', desc, '→', remembered)
      }
      return remembered
    }
  }

  // 2. Keyword rules — only when stored category is other-like
  if (desc && isOtherLikeCategoryLabel(tx.category)) {
    const detected = detectCategory(desc)
    if (detected !== 'other') {
      if (process.env.NODE_ENV === 'development') {
        console.log('FIXED CATEGORY:', desc, '→', detected)
      }
      return detected
    }
  }

  return tx.category
}
