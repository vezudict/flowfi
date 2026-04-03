import Papa from 'papaparse'
import { resolveTransactionCategory } from '@/lib/category-suggestion'

export type PreviewRow = {
  /** 1-based data row index in CSV (excluding header) */
  rowNumber: number
  dateRaw: string
  descriptionRaw: string
  amountRaw: string
  /** Present when CSV has a `category` column */
  categoryRaw: string
  createdAtIso: string | null
  amount: number | null
  description: string | null
  /** Category that will be stored (CSV if valid, else keywords, else Other) */
  resolvedCategory: string
  errors: string[]
  isValid: boolean
}

export type CsvTransactionsPreview = {
  headersFound: string[]
  rows: PreviewRow[]
}

export type ParseTransactionCsvSuccess = {
  ok: true
  preview: CsvTransactionsPreview
}

export type ParseTransactionCsvFailure = {
  ok: false
  error: string
}

export type ParseTransactionCsvResult =
  | ParseTransactionCsvSuccess
  | ParseTransactionCsvFailure

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, ' ')
}

function resolveColumnKey(
  fields: string[] | undefined,
  wanted: string,
): string | null {
  if (!fields?.length) return null
  const target = normalizeHeader(wanted)
  for (const f of fields) {
    if (normalizeHeader(f) === target) return f
  }
  return null
}

function parseAmount(raw: string): { value: number | null; error?: string } {
  const t = raw.trim()
  if (t === '') return { value: null, error: 'Amount is empty' }
  const cleaned = t.replace(/[$,\s]/g, '')
  const isParenNegative = /^\(.*\)$/.test(cleaned)
  const inner = cleaned.replace(/^\(|\)$/g, '')
  const n = Number.parseFloat(inner)
  if (!Number.isFinite(n)) {
    return { value: null, error: 'Amount is not a valid number' }
  }
  const signed = isParenNegative ? -Math.abs(n) : n
  return { value: signed }
}

function parseDateRaw(raw: string): { iso: string | null; error?: string } {
  const t = raw.trim()
  if (t === '') return { iso: null, error: 'Date is empty' }
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) {
    return { iso: null, error: 'Date is not recognized' }
  }
  return { iso: d.toISOString() }
}

function buildRow(
  rowNumber: number,
  row: Record<string, unknown>,
  dateKey: string,
  descKey: string,
  amountKey: string,
  categoryKey: string | null,
): PreviewRow {
  const dateRaw = String(row[dateKey] ?? '').trim()
  const descriptionRaw = String(row[descKey] ?? '')
  const amountRaw = String(row[amountKey] ?? '').trim()
  const categoryRaw = categoryKey ? String(row[categoryKey] ?? '').trim() : ''

  const errors: string[] = []
  const { iso: createdAtIso, error: dateErr } = parseDateRaw(dateRaw)
  if (dateErr) errors.push(dateErr)

  const { value: amount, error: amtErr } = parseAmount(amountRaw)
  if (amtErr) errors.push(amtErr)

  const description = descriptionRaw.trim()
  const descriptionOut = description.length ? description : null

  const resolvedCategory = resolveTransactionCategory({
    description: descriptionOut,
    csvCategory: categoryRaw.length ? categoryRaw : null,
  })

  return {
    rowNumber,
    dateRaw,
    descriptionRaw,
    amountRaw,
    categoryRaw,
    createdAtIso,
    amount,
    description: descriptionOut,
    resolvedCategory,
    errors,
    isValid: errors.length === 0,
  }
}

export function parseTransactionCsvText(csvText: string): ParseTransactionCsvResult {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors?.length) {
    const msg = parsed.errors.map((e) => e.message).join('; ')
    return { ok: false, error: msg || 'Could not parse CSV.' }
  }

  const fields = parsed.meta.fields?.filter(
    (f): f is string => typeof f === 'string' && f.length > 0,
  )

  const dateKey = resolveColumnKey(fields, 'date')
  const descKey = resolveColumnKey(fields, 'description')
  const amountKey = resolveColumnKey(fields, 'amount')
  const categoryKey = resolveColumnKey(fields, 'category')

  const missing: string[] = []
  if (!dateKey) missing.push('date')
  if (!descKey) missing.push('description')
  if (!amountKey) missing.push('amount')

  if (missing.length) {
    const found = fields?.length ? fields.join(', ') : '(none)'
    return {
      ok: false,
      error: `Missing required column(s): ${missing.join(', ')}. Found headers: ${found}. Expected: date, description, amount.`,
    }
  }

  const data = parsed.data.filter((r) => r && Object.keys(r).length > 0)
  const rows: PreviewRow[] = data.map((row, i) =>
    buildRow(i + 1, row, dateKey!, descKey!, amountKey!, categoryKey),
  )

  return {
    ok: true,
    preview: {
      headersFound: fields ?? [],
      rows,
    },
  }
}

export function parseTransactionCsvFile(file: File): Promise<ParseTransactionCsvResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () =>
      resolve({ ok: false, error: 'Could not read the file.' })
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      if (!text.trim()) {
        resolve({ ok: false, error: 'File is empty.' })
        return
      }
      resolve(parseTransactionCsvText(text))
    }
    reader.readAsText(file)
  })
}
