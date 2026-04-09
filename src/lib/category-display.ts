import { normalizeCategoryLabel } from '@/lib/category-suggestion'

export const CATEGORY_DISPLAY = {
  food: 'Food & Dining',
  transport: 'Transport',
  entertainment: 'Entertainment',
  subscriptions: 'Subscriptions',
  utilities: 'Utilities',
  shopping: 'Shopping',
  transfer: 'Transfer',
  income: 'Income',
  other: 'Misc',
} as const

export const CATEGORY_STYLES = {
  food: 'text-orange-400',
  transport: 'text-blue-400',
  entertainment: 'text-violet-400',
  subscriptions: 'text-purple-400',
  utilities: 'text-yellow-400',
  shopping: 'text-pink-400',
  transfer: 'text-cyan-400',
  income: 'text-green-400',
  other: 'text-zinc-400',
} as const

/** Human-readable label for UI; keys normalized (trim, lowercase). */
export function getCategoryLabel(category: string): string {
  const key = normalizeCategoryLabel(category)
  if (key in CATEGORY_DISPLAY) {
    return CATEGORY_DISPLAY[key as keyof typeof CATEGORY_DISPLAY]
  }
  return 'Misc'
}

/** Tailwind text color class for category emphasis; unknown → zinc. */
export function getCategoryStyleClass(category: string): string {
  const key = normalizeCategoryLabel(category)
  if (key in CATEGORY_STYLES) {
    return CATEGORY_STYLES[key as keyof typeof CATEGORY_STYLES]
  }
  return CATEGORY_STYLES.other
}
