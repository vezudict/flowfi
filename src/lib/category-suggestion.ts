/**
 * Keyword → category rules for auto-detecting transaction categories from description.
 * First matching rule wins; add new entries to extend behavior.
 */
export type CategoryKeywordRule = {
  keywords: readonly string[]
  category: string
}

export const CATEGORY_KEYWORD_RULES: readonly CategoryKeywordRule[] = [
  { keywords: ['swiggy', 'zomato'], category: 'Food' },
  { keywords: ['uber', 'ola'], category: 'Transport' },
  { keywords: ['amazon', 'flipkart'], category: 'Shopping' },
  { keywords: ['electricity', 'bill'], category: 'Bills' },
] as const

export function suggestCategoryFromDescription(description: string): string | null {
  const text = description.trim().toLowerCase()
  if (!text) return null

  for (const rule of CATEGORY_KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) return rule.category
    }
  }
  return null
}
