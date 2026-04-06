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

/** Normalize description before keyword matching (trim + lowercase). */
export function normalizeDescriptionForCategory(description: string): string {
  return description.trim().toLowerCase()
}

export function suggestCategoryFromDescription(description: string): string | null {
  const text = normalizeDescriptionForCategory(description)
  if (!text) return null

  for (const rule of CATEGORY_KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) return rule.category
    }
  }
  return null
}

/**
 * Category labels excluded from analytics and insights (historical junk like legacy import tags).
 * Treated as Other in aggregations so they do not skew top category or charts.
 */
export const EXCLUDED_ANALYTICS_CATEGORY_LABELS = new Set(['imported'])

/** Map raw stored category to the label used in charts and insights. */
export function categoryForAnalytics(raw: string): string {
  const t = raw.trim().replace(/\s+/g, ' ')
  if (!t) return 'Other'
  if (EXCLUDED_ANALYTICS_CATEGORY_LABELS.has(t.toLowerCase())) return 'Other'
  return t
}

/** Whether a CSV-provided category cell is safe to use as-is. */
export function isPlausibleImportedCategoryLabel(raw: string): boolean {
  const t = raw.trim().replace(/\s+/g, ' ')
  if (t.length === 0 || t.length > 64) return false
  if (!/[a-z0-9]/i.test(t)) return false
  if (EXCLUDED_ANALYTICS_CATEGORY_LABELS.has(t.toLowerCase())) return false
  return true
}

/**
 * Single resolver for persisted category: optional CSV column, then keyword rules on description, else Other.
 */
export function resolveTransactionCategory(input: {
  description: string | null
  csvCategory?: string | null
}): string {
  const csv = input.csvCategory?.trim() ?? ''
  if (csv && isPlausibleImportedCategoryLabel(csv)) {
    return csv.replace(/\s+/g, ' ').trim()
  }
  const fromDesc = suggestCategoryFromDescription(input.description ?? '')
  if (fromDesc) return fromDesc
  return 'Other'
}

/**
 * Simpler labels for PDF / bank-statement imports (lowercase).
 * swiggy|zomato → food, uber → transport, salary → income; credits default to income, else other.
 */
export function resolvePdfImportCategory(input: {
  description: string
  type: 'credit' | 'debit'
}): string {
  const t = normalizeDescriptionForCategory(input.description)
  if (t.includes('salary')) return 'income'
  if (t.includes('swiggy') || t.includes('zomato')) return 'food'
  if (t.includes('uber')) return 'transport'
  if (input.type === 'credit') return 'income'
  return 'other'
}
