/**
 * Regex-first PDF statement parser — does not rely on spaces.
 * Splits on date anchors; last numeric token in each block is treated as running balance (ignored).
 */

import { detectCategory } from '@/lib/category-suggestion'

export type Transaction = {
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  /** Keyword bucket from `detectCategory` (or `other`); confirm path uses `resolvePdfImportCategory`. */
  category: string
}

/** Date token: DD-MMM-YYYY (day may be 1–2 digits). */
const DATE_REGEX = /\d{1,2}-[A-Za-z]{3}-\d{4}/g
const DATE_AT_BLOCK_START = /^(\d{1,2}-[A-Za-z]{3}-\d{4})/

const SKIP_SUBSTRING = /opening balance|closing balance/i
const HEADER_LIKE =
  /^(date|description|amount|balance|particulars|transaction|sl\.?\s*no|withdrawal|deposit)\b/i

type NumTok = { raw: string; signed: number; index: number }

/**
 * Indian-number aware tokeniser. Uses `\d{1,3}(?:,\d{2,3})*` so that two
 * concatenated amounts like `50,00073,550` are split into `50,000` + `73,550`
 * instead of being swallowed as one malformed token by a greedy `[\d,]*`.
 */
function findAllNumericTokens(s: string): NumTok[] {
  const re = /\d{1,3}(?:,\d{2,3})*(?:\.\d+)?/g
  const out: NumTok[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    const raw = m[0]
    const signed = Number.parseFloat(raw.replace(/,/g, ''))
    if (Number.isFinite(signed) && signed > 0) {
      out.push({ raw, signed, index: m.index })
    }
  }
  return out
}

/**
 * Structural credit/debit detection for no-space Indian bank formats.
 *
 * SBI (and similar) PDF text concatenates columns without spaces:
 *   Debit row : <desc><debit_amt>-<balance>   → prefix before first number ends with a letter
 *   Credit row: <desc>-<credit_amt><balance>  → prefix before first number ends with "-"
 *
 * The trailing "-" is the empty debit column.  This handles edge cases like
 * "Freelance Payment" that keyword lists would miss.
 */
function inferType(afterDate: string, firstNumIndex: number): 'credit' | 'debit' {
  const prefix = afterDate.slice(0, firstNumIndex)
  return prefix.trimEnd().endsWith('-') ? 'credit' : 'debit'
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2,  apr: 3,  may: 4,  jun: 5,
  jul: 6, aug: 7, sep: 8,  oct: 9,  nov: 10, dec: 11,
}

/** Convert `DD-MMM-YYYY` → `YYYY-MM-DD`. */
function normalizeDateForOutput(raw: string): string {
  const m = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/i)
  if (!m) return raw.trim()
  const mi = MONTH_INDEX[m[2].toLowerCase()]
  if (mi === undefined) return raw.trim()
  const day = m[1].padStart(2, '0')
  const month = String(mi + 1).padStart(2, '0')
  return `${m[3]}-${month}-${day}`
}

const INCOME_KEYWORDS = /\b(salary|freelance|income)\b/i

/** Description-keyword type detection — takes priority over structural inference. */
function inferTypeFromDescription(description: string): 'credit' | null {
  return INCOME_KEYWORDS.test(description) ? 'credit' : null
}

const REDUNDANT_WORDS = /\b(upi|payment|credit|debit|ride|transfer)\b\s*/gi

/** Strip UPI prefix and generic banking words; collapse whitespace. */
function normalizeDescription(desc: string): string {
  return desc.replace(REDUNDANT_WORDS, '').replace(/\s+/g, ' ').trim()
}

/** If raw line misses keywords, retry on UPI-normalized description (same idea as CSV path). */
function detectCategoryWithFallback(rawDescription: string, normalizedDescription: string): string {
  const direct = detectCategory(rawDescription)
  if (direct !== 'other') return direct
  if (!normalizedDescription.trim()) return 'other'
  const second = detectCategory(normalizedDescription)
  return second === 'other' ? 'other' : second
}

/** Strip all amounts; tidy stray hyphens from patterns like "Credit-". */
function cleanDescription(full: string): string {
  return full
    .replace(/\d{1,3}(?:,\d{2,3})*(?:\.\d+)?/g, ' ')
    .replace(/[–—-]+\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pick transaction amount from candidates (all numeric tokens before balance). */
function pickTransactionAmount(
  candidates: NumTok[],
  type: 'credit' | 'debit',
): number | null {
  if (candidates.length === 0) return null

  if (candidates.length === 1) {
    const n = Math.abs(candidates[0].signed)
    return n > 0 ? n : null
  }

  // Rare: debit column then credit column before balance.
  const debitCol = Math.abs(candidates[0].signed)
  const creditCol = Math.abs(candidates[1].signed)

  if (type === 'credit') {
    if (creditCol > 0) return creditCol
    if (debitCol > 0) return debitCol
    return null
  }

  if (debitCol > 0) return debitCol
  if (creditCol > 0) return creditCol
  return null
}

export function parseTransactionsFromText(text: string): Transaction[] {
  const normalized = text.replace(/\r\n/g, '\n')
  const matches = [...normalized.matchAll(DATE_REGEX)]

  if (matches.length === 0) {
    return []
  }

  const out: Transaction[] = []

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0
    const end =
      i + 1 < matches.length
        ? (matches[i + 1].index ?? normalized.length)
        : normalized.length

    const block = normalized.slice(start, end).replace(/\s+/g, ' ').trim()

    if (SKIP_SUBSTRING.test(block)) continue

    const dm = block.match(DATE_AT_BLOCK_START)
    if (!dm) continue

    const date = normalizeDateForOutput(dm[1])
    const afterDate = block.slice(dm[0].length)

    const allNums = findAllNumericTokens(afterDate)
    if (allNums.length === 0) continue

    // Structural type is needed to pick the correct amount column
    const structuralType = inferType(afterDate, allNums[0].index)
    let amount: number | null = null

    if (allNums.length === 1) {
      // No running balance on this fragment — sole token is the transaction amount.
      amount = Math.abs(allNums[0].signed)
    } else {
      const candidates = allNums.slice(0, -1)
      amount = pickTransactionAmount(candidates, structuralType)
    }

    if (amount === null || amount <= 0) continue

    const rawDesc = cleanDescription(afterDate)
    if (!rawDesc) continue
    if (SKIP_SUBSTRING.test(rawDesc)) continue
    if (HEADER_LIKE.test(rawDesc)) continue

    const description = normalizeDescription(rawDesc)
    const category = detectCategoryWithFallback(rawDesc, description)

    // Description keywords take priority over structural inference
    const type = inferTypeFromDescription(description) ?? structuralType

    out.push({ date, description, amount, type, category })
  }

  return out
}

/**
 * Heuristic: many date-like anchors in the PDF text but comparatively few parsed rows
 * often means the statement layout wasn't fully understood.
 */
export function pdfParseLooksIncomplete(extractedText: string, parsedRowCount: number): boolean {
  if (parsedRowCount === 0) return false
  const normalized = extractedText.replace(/\r\n/g, '\n')
  const dateCount = [...normalized.matchAll(DATE_REGEX)].length
  if (dateCount < 6) return false
  const gap = dateCount - parsedRowCount
  return gap >= 4
}

/**
 * Parse a date string to ISO-8601 for API `createdAt`.
 * Accepts both `YYYY-MM-DD` (new parser output) and `DD-MMM-YYYY` (legacy).
 */
export function parsePdfStatementDateToIso(raw: string): string | null {
  const s = raw.trim()

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const year = Number(iso[1]), mi = Number(iso[2]) - 1, day = Number(iso[3])
    const d = new Date(year, mi, day, 12, 0, 0, 0)
    if (d.getFullYear() !== year || d.getMonth() !== mi || d.getDate() !== day) return null
    return d.toISOString()
  }

  // DD-MMM-YYYY (legacy)
  const legacy = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
  if (!legacy) return null
  const day = Number(legacy[1])
  const mi = MONTH_INDEX[legacy[2].toLowerCase()]
  const year = Number(legacy[3])
  if (mi === undefined || !Number.isFinite(day) || !Number.isFinite(year)) return null
  const d = new Date(year, mi, day, 12, 0, 0, 0)
  if (d.getFullYear() !== year || d.getMonth() !== mi || d.getDate() !== day) return null
  return d.toISOString()
}

export function formatTodayPdfStatementDate(): string {
  const d = new Date()
  const labels = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ] as const
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}-${labels[d.getMonth()]}-${d.getFullYear()}`
}
