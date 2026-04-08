/**
 * Keyword → category rules for auto-detecting transaction categories from description.
 * First matching rule wins; add new entries to extend behavior.
 */
export type CategoryKeywordRule = {
  keywords: readonly string[]
  category: string
}

/**
 * Order matters: first matching keyword wins (put specific phrases before generic "bill").
 */
export const CATEGORY_KEYWORD_RULES: readonly CategoryKeywordRule[] = [
  { keywords: ['netflix'], category: 'Subscriptions' },
  { keywords: ['spotify', 'hotstar', 'amazon prime', 'prime video'], category: 'Subscriptions' },
  { keywords: ['swiggy', 'zomato'], category: 'Food' },
  { keywords: ['uber', 'ola'], category: 'Transport' },
  { keywords: ['electricity', 'electric bill', 'power bill', 'discom', 'bescom'], category: 'Utilities' },
  { keywords: ['amazon', 'flipkart'], category: 'Shopping' },
  { keywords: ['internet', 'broadband', 'fiber', 'wifi'], category: 'Bills' },
  { keywords: ['bill', 'recharge'], category: 'Bills' },
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

/**
 * Money-in labels for **category text hints** (imports/heuristics). Debit/credit comes from
 * `transaction_type` on each row.
 */
const INCOME_CATEGORY_LABELS = new Set(
  [
    'income',
    'salary',
    'freelance',
    'payroll',
    'wages',
    'paycheck',
    'bonus',
    'interest',
    'dividend',
    'refund',
    'reimbursement',
  ].map((s) => s.toLowerCase()),
)

export function isIncomeCategoryLabel(raw: string): boolean {
  const n = categoryForAnalytics(raw).trim().toLowerCase()
  if (!n) return false
  return INCOME_CATEGORY_LABELS.has(n)
}

/** Whether a CSV-provided category cell is safe to use as-is. */
export function isPlausibleImportedCategoryLabel(raw: string): boolean {
  const t = raw.trim().replace(/\s+/g, ' ')
  if (t.length === 0 || t.length > 64) return false
  if (!/[a-z0-9]/i.test(t)) return false
  if (EXCLUDED_ANALYTICS_CATEGORY_LABELS.has(t.toLowerCase())) return false
  return true
}

/** CSV or manual labels that should retry keyword classification when description exists. */
export function isOtherLikeCategoryLabel(label: string): boolean {
  return label.trim().toLowerCase() === 'other'
}

/**
 * Single resolver for persisted category: optional CSV column, then keyword rules on description, else Other.
 * If the CSV category is "Other" and a description exists, keywords are applied to reduce generic Other.
 */
export function resolveTransactionCategory(input: {
  description: string | null
  csvCategory?: string | null
}): string {
  const desc = (input.description ?? '').trim()
  const csv = input.csvCategory?.trim() ?? ''

  if (csv && isPlausibleImportedCategoryLabel(csv)) {
    const normalized = csv.replace(/\s+/g, ' ').trim()
    if (!isOtherLikeCategoryLabel(normalized)) {
      return normalized
    }
    if (desc) {
      const fromDesc = suggestCategoryFromDescription(desc)
      if (fromDesc) return fromDesc
    }
    return normalized
  }

  const fromDesc = suggestCategoryFromDescription(desc)
  if (fromDesc) return fromDesc
  return 'Other'
}

/**
 * Simpler labels for PDF / bank-statement imports (lowercase).
 * Order: specific merchants/utilities before generic credit → income.
 */
export function resolvePdfImportCategory(input: {
  description: string
  type: 'credit' | 'debit'
}): string {
  const t = normalizeDescriptionForCategory(input.description)
  if (t.includes('netflix') || t.includes('spotify') || t.includes('hotstar')) return 'subscriptions'
  if (t.includes('swiggy') || t.includes('zomato')) return 'food'
  if (t.includes('uber')) return 'transport'
  if (t.includes('electricity') || t.includes('electric bill') || t.includes('power bill')) return 'utilities'
  if (t.includes('salary')) return 'income'
  if (input.type === 'credit') return 'income'
  return 'other'
}
