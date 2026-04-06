/**
 * Regex-first PDF statement parser — does not rely on spaces.
 * Splits on date anchors, then takes the last numeric token as amount.
 */

export type Transaction = {
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
}

/** Date token: DD-MMM-YYYY (day may be 1–2 digits). */
const DATE_REGEX = /\d{1,2}-[A-Za-z]{3}-\d{4}/g
const DATE_AT_BLOCK_START = /^(\d{1,2}-[A-Za-z]{3}-\d{4})/

const SKIP_SUBSTRING = /opening balance|closing balance/i
const HEADER_LIKE =
  /^(date|description|amount|balance|particulars|transaction|sl\.?\s*no|withdrawal|deposit)\b/i

/** Last numeric token in a segment (commas allowed; optional leading + / -). */
function findLastNumericToken(s: string): {
  raw: string
  signed: number
  index: number
} | null {
  const re = /[-+]?\d[\d,]*(?:\.\d+)?/g
  let m: RegExpExecArray | null
  let last: RegExpExecArray | null = null
  while ((m = re.exec(s)) !== null) last = m
  if (!last) return null
  const raw = last[0]
  const signed = Number.parseFloat(raw.replace(/,/g, ''))
  if (!Number.isFinite(signed)) return null
  return { raw, signed, index: last.index }
}

function normalizeDateForOutput(raw: string): string {
  const m = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/i)
  if (!m) return raw.trim()
  const day = m[1].padStart(2, '0')
  const mon = m[2].slice(0, 1).toUpperCase() + m[2].slice(1, 3).toLowerCase()
  return `${day}-${mon}-${m[3]}`
}

function cleanDescription(beforeAmount: string): string {
  return beforeAmount
    .replace(/[-+]?\d[\d,]*(?:\.\d+)?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseTransactionsFromText(text: string): Transaction[] {
  const normalized = text.replace(/\r\n/g, '\n')
  const matches = [...normalized.matchAll(DATE_REGEX)]

  if (matches.length === 0) {
    console.log('[parseTransactionsFromText]', [])
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

    const lastNum = findLastNumericToken(afterDate)
    if (!lastNum || lastNum.signed === 0) continue

    const descRaw = afterDate.slice(0, lastNum.index).trim()
    const description = cleanDescription(descRaw)

    if (!description) continue
    if (SKIP_SUBSTRING.test(description)) continue
    if (HEADER_LIKE.test(description)) continue

    const amount = Math.abs(lastNum.signed)
    const type: 'credit' | 'debit' = lastNum.signed < 0 ? 'debit' : 'credit'

    out.push({ date, description, amount, type })
  }

  console.log('[parseTransactionsFromText]', out)
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
