/**
 * Keyword → category buckets for imports and auto-suggest. All persisted labels are lowercase.
 * Order in CATEGORY_KEYWORDS matters: earlier buckets win on first matching keyword.
 */
export const CATEGORY_KEYWORDS = {
  food: ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'dining'],
  transport: ['uber', 'ola', 'fuel', 'petrol', 'diesel', 'bus', 'train'],
  subscriptions: ['netflix', 'spotify', 'prime', 'subscription'],
  utilities: ['electricity', 'water', 'internet', 'bill', 'wifi'],
  shopping: ['amazon', 'flipkart', 'store', 'purchase'],
  income: ['salary', 'freelance', 'income', 'payment', 'credited'],
} as const

export type KeywordCategoryKey = keyof typeof CATEGORY_KEYWORDS
export type StandardCategory = KeywordCategoryKey | 'other'

/** Trim, collapse spaces, lowercase — single source for stored category labels. */
export function normalizeCategoryLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Normalize description before keyword matching. */
export function normalizeDescriptionForCategory(description: string): string {
  return description.trim().toLowerCase()
}

/**
 * First keyword hit wins (bucket order follows CATEGORY_KEYWORDS).
 * @returns A CATEGORY_KEYWORDS key, or `other`.
 */
export function detectCategory(description: string): StandardCategory {
  const text = normalizeDescriptionForCategory(description)
  if (!text) return 'other'

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    KeywordCategoryKey,
    readonly string[],
  ][]) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('CATEGORY DETECTED:', description, '→', category)
        }
        return category
      }
    }
  }
  return 'other'
}

/** @returns Detected bucket, or null when no keyword matches (UI hint). */
export function suggestCategoryFromDescription(description: string): string | null {
  const c = detectCategory(description)
  return c === 'other' ? null : c
}

/**
 * Category labels excluded from analytics (legacy import tags). Treated as other in aggregations.
 */
export const EXCLUDED_ANALYTICS_CATEGORY_LABELS = new Set(['imported'])

/** Map raw stored category to analytics label (normalized lowercase; empty → other). */
export function categoryForAnalytics(raw: string): string {
  const t = normalizeCategoryLabel(raw)
  if (!t) return 'other'
  if (EXCLUDED_ANALYTICS_CATEGORY_LABELS.has(t)) return 'other'
  return t
}

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

export function isPlausibleImportedCategoryLabel(raw: string): boolean {
  const t = normalizeCategoryLabel(raw)
  if (t.length === 0 || t.length > 64) return false
  if (!/[a-z0-9]/i.test(t)) return false
  if (EXCLUDED_ANALYTICS_CATEGORY_LABELS.has(t)) return false
  return true
}

export function isOtherLikeCategoryLabel(label: string): boolean {
  return normalizeCategoryLabel(label) === 'other'
}

/**
 * Final stored category for API/body validation path:
 * 1. Normalize label (lowercase, trim).
 * 2. If other-like and description matches a bucket, override with detection.
 * 3. Else keep explicit bucket (including free-form labels users type).
 */
export function finalizeTransactionCategory(
  category: string,
  description: string | null,
): string {
  const normalized = normalizeCategoryLabel(category)
  if (!isOtherLikeCategoryLabel(normalized)) return normalized
  const desc = (description ?? '').trim()
  if (desc) {
    const d = detectCategory(desc)
    if (d !== 'other') return d
  }
  return 'other'
}

/**
 * CSV resolver: plausible explicit column wins unless it is other-like (then keywords); else keywords; else other.
 */
export function resolveTransactionCategory(input: {
  description: string | null
  csvCategory?: string | null
}): string {
  const desc = (input.description ?? '').trim()
  const csvRaw = input.csvCategory?.trim() ?? ''
  const normalizedCsv = csvRaw ? normalizeCategoryLabel(csvRaw) : ''

  if (normalizedCsv && isPlausibleImportedCategoryLabel(normalizedCsv)) {
    if (!isOtherLikeCategoryLabel(normalizedCsv)) return normalizedCsv
    if (desc) {
      const fromDesc = detectCategory(desc)
      if (fromDesc !== 'other') return fromDesc
    }
    return 'other'
  }

  if (desc) {
    const fromDesc = detectCategory(desc)
    if (fromDesc !== 'other') return fromDesc
  }
  return 'other'
}

/**
 * PDF / bank import: keywords first; generic credits default to income (no AI).
 */
export function resolvePdfImportCategory(input: {
  description: string
  type: 'credit' | 'debit'
}): string {
  const fromDesc = detectCategory(input.description)
  if (fromDesc !== 'other') return fromDesc
  if (input.type === 'credit') return 'income'
  return 'other'
}
