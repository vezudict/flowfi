/**
 * Regex-first PDF statement parser — does not rely on spaces.
 * Splits on date anchors; last numeric token in each block is treated as running balance (ignored).
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

const CREDIT_KEYWORDS = /\b(credit|salary|deposit)\b/i

type NumTok = { raw: string; signed: number; index: number }

function findAllNumericTokens(s: string): NumTok[] {
  const re = /[-+]?\d[\d,]*(?:\.\d+)?/g
  const out: NumTok[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    const raw = m[0]
    const signed = Number.parseFloat(raw.replace(/,/g, ''))
    if (Number.isFinite(signed)) {
      out.push({ raw, signed, index: m.index })
    }
  }
  return out
}

function inferType(descOrLine: string): 'credit' | 'debit' {
  return CREDIT_KEYWORDS.test(descOrLine) ? 'credit' : 'debit'
}

function normalizeDateForOutput(raw: string): string {
  const m = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/i)
  if (!m) return raw.trim()
  const day = m[1].padStart(2, '0')
  const mon = m[2].slice(0, 1).toUpperCase() + m[2].slice(1, 3).toLowerCase()
  return `${day}-${mon}-${m[3]}`
}

/** Strip all amounts; tidy stray hyphens from patterns like "Credit-". */
function cleanDescription(full: string): string {
  return full
    .replace(/[-+]?\d[\d,]*(?:\.\d+)?/g, ' ')
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

    const allNums = findAllNumericTokens(afterDate)
    if (allNums.length === 0) continue

    const type = inferType(afterDate)
    let amount: number | null = null
    let balanceIgnored: string | null = null
    let candidateRaws: string[]

    if (allNums.length === 1) {
      // No running balance on this fragment — sole token is the transaction amount.
      candidateRaws = [allNums[0].raw]
      amount = Math.abs(allNums[0].signed)
      console.log('[parseTransactionsFromText]', {
        date,
        extractedNumbers: allNums.map((t) => t.raw),
        balanceIgnored: null,
        candidateRaws,
        chosenAmount: amount,
        type,
        note: 'single token (no balance column)',
      })
    } else {
      const balance = allNums[allNums.length - 1]
      balanceIgnored = balance.raw
      const candidates = allNums.slice(0, -1)
      candidateRaws = candidates.map((t) => t.raw)
      amount = pickTransactionAmount(candidates, type)

      console.log('[parseTransactionsFromText]', {
        date,
        extractedNumbers: allNums.map((t) => t.raw),
        balanceIgnored,
        candidateRaws,
        chosenAmount: amount,
        type,
      })
    }

    if (amount === null || amount <= 0) continue

    const description = cleanDescription(afterDate)
    if (!description) continue
    if (SKIP_SUBSTRING.test(description)) continue
    if (HEADER_LIKE.test(description)) continue

    out.push({ date, description, amount, type })
  }

  console.log('[parseTransactionsFromText] result', out)
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
