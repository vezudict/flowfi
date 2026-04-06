/**
 * Heuristic parser for common Indian bank-statement text lines, e.g.
 * "02-Apr-2026 UPI-Swiggy Payment 250"
 */

export type Transaction = {
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
}

const LINE_WITH_DATE = /^(\d{1,2}-[A-Za-z]{3}-\d{4})\s+(.+)$/
const TRAILING_AMOUNT = /^(.*)\s+([-+]?[\d,]+(?:\.\d+)?)\s*$/

const SKIP_SUBSTRING = /opening balance|closing balance/i
const HEADER_LIKE =
  /^(date|description|amount|balance|particulars|transaction|sl\.?\s*no|withdrawal|deposit)\b/i

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function inferType(description: string, signed: number): 'credit' | 'debit' {
  if (/\bcredit\b/i.test(description) || signed > 0) return 'credit'
  return 'debit'
}

function tryParseLine(line: string): Transaction | null {
  const trimmed = normalizeSpaces(line)
  if (!trimmed) return null
  if (SKIP_SUBSTRING.test(trimmed)) return null
  if (HEADER_LIKE.test(trimmed)) return null

  const dm = trimmed.match(LINE_WITH_DATE)
  if (!dm) return null

  const date = normalizeSpaces(dm[1])
  const rest = normalizeSpaces(dm[2])
  const am = rest.match(TRAILING_AMOUNT)
  if (!am) return null

  const description = normalizeSpaces(am[1])
  if (!description) return null

  const rawAmount = am[2]
  const signed = parseFloat(rawAmount.replace(/,/g, ''))
  if (!Number.isFinite(signed) || signed === 0) return null

  const amount = Math.abs(signed)
  const type = inferType(description, signed)

  return { date, description, amount, type }
}

export function parseTransactionsFromText(text: string): Transaction[] {
  const lines = text.split(/\r?\n/)
  const out: Transaction[] = []

  for (const line of lines) {
    const row = tryParseLine(line)
    if (row) out.push(row)
  }

  return out
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

/** Parse `DD-MMM-YYYY` (e.g. `02-Apr-2026`) to ISO-8601 for API `createdAt`. */
export function parsePdfStatementDateToIso(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
  if (!m) return null
  const day = Number(m[1])
  const mi = MONTH_INDEX[m[2].toLowerCase()]
  const year = Number(m[3])
  if (mi === undefined || !Number.isFinite(day) || !Number.isFinite(year)) return null
  const d = new Date(year, mi, day, 12, 0, 0, 0)
  if (d.getFullYear() !== year || d.getMonth() !== mi || d.getDate() !== day) return null
  return d.toISOString()
}

export function formatTodayPdfStatementDate(): string {
  const d = new Date()
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}-${labels[d.getMonth()]}-${d.getFullYear()}`
}
