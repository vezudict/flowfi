import { detectCategory, isOtherLikeCategoryLabel } from '@/lib/category-suggestion'

export type CategoryBackfillInput = {
  category: string
  description: string | null
}

/**
 * Soft category repair for rows still stored as other-like when description matches keywords.
 * Does not persist; use for client-side display after fetch.
 */
export function fixTransactionCategory(tx: CategoryBackfillInput): string {
  if (!tx.description?.trim()) return tx.category

  const detected = detectCategory(tx.description)

  if (isOtherLikeCategoryLabel(tx.category) && detected !== 'other') {
    if (process.env.NODE_ENV === 'development') {
      console.log('FIXED CATEGORY:', tx.description, '→', detected)
    }
    return detected
  }

  return tx.category
}
