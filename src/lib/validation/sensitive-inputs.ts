import { isSupportedCurrency, type SupportedCurrencyCode } from '@/lib/currencies'
import type { ImportedTransactionRow } from '@/lib/transactions'

const MAX_AMOUNT = 1e14
const MAX_CATEGORY_LEN = 64
const MAX_DESCRIPTION_LEN = 2000
const MAX_IMPORT_ROWS = 500

export type ValidatedTransactionInsert = {
  amount: number
  category: string
  description: string | null
}

export function parseAndValidateTransactionBody(
  raw: unknown,
): { ok: true; data: ValidatedTransactionInsert } | { ok: false; message: string } {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, message: 'Invalid request body.' }
  }
  const o = raw as Record<string, unknown>
  const amountRaw = o.amount
  const categoryRaw = o.category
  const descriptionRaw = o.description

  const amount =
    typeof amountRaw === 'number' ? amountRaw : typeof amountRaw === 'string' ? Number(amountRaw) : NaN
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) {
    return { ok: false, message: 'Invalid amount.' }
  }

  const category =
    typeof categoryRaw === 'string' ? categoryRaw.trim().replace(/\s+/g, ' ') : ''
  if (category.length < 1 || category.length > MAX_CATEGORY_LEN) {
    return { ok: false, message: 'Category is required (max 64 characters).' }
  }

  let description: string | null = null
  if (descriptionRaw !== null && descriptionRaw !== undefined) {
    if (typeof descriptionRaw !== 'string') {
      return { ok: false, message: 'Invalid description.' }
    }
    const d = descriptionRaw.trim()
    if (d.length > MAX_DESCRIPTION_LEN) {
      return { ok: false, message: 'Description is too long.' }
    }
    description = d.length ? d : null
  }

  return { ok: true, data: { amount, category, description } }
}

export function parseAndValidateBudgetBody(
  raw: unknown,
): { ok: true; data: number | null } | { ok: false; message: string } {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, message: 'Invalid request body.' }
  }
  const o = raw as Record<string, unknown>
  if (!('monthlyBudget' in o)) {
    return { ok: false, message: 'Missing monthlyBudget.' }
  }
  const v = o.monthlyBudget
  if (v === null) return { ok: true, data: null }
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : NaN
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) {
    return { ok: false, message: 'Invalid budget amount.' }
  }
  return { ok: true, data: n }
}

export function parseAndValidateCurrencyBody(
  raw: unknown,
): { ok: true; data: SupportedCurrencyCode } | { ok: false; message: string } {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, message: 'Invalid request body.' }
  }
  const code = (raw as Record<string, unknown>).preferredCurrency
  if (typeof code !== 'string' || !isSupportedCurrency(code)) {
    return { ok: false, message: 'Invalid currency.' }
  }
  return { ok: true, data: code }
}

export type ValidatedImportRow = ImportedTransactionRow

export function parseAndValidateImportBody(
  raw: unknown,
): { ok: true; data: ValidatedImportRow[] } | { ok: false; message: string } {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, message: 'Invalid request body.' }
  }
  const rows = (raw as Record<string, unknown>).rows
  if (!Array.isArray(rows)) {
    return { ok: false, message: 'Expected rows array.' }
  }
  if (rows.length === 0) {
    return { ok: false, message: 'No rows to import.' }
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ok: false, message: `At most ${MAX_IMPORT_ROWS} rows per import.` }
  }

  const out: ValidatedImportRow[] = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (r === null || typeof r !== 'object') {
      return { ok: false, message: `Invalid row at index ${i}.` }
    }
    const row = r as Record<string, unknown>
    const amountRaw = row.amount
    const amount =
      typeof amountRaw === 'number'
        ? amountRaw
        : typeof amountRaw === 'string'
          ? Number(amountRaw)
          : NaN
    if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) {
      return { ok: false, message: `Invalid amount at row ${i + 1}.` }
    }
    const categoryRaw = row.category
    const category =
      typeof categoryRaw === 'string' ? categoryRaw.trim().replace(/\s+/g, ' ') : ''
    if (category.length < 1 || category.length > MAX_CATEGORY_LEN) {
      return { ok: false, message: `Invalid category at row ${i + 1}.` }
    }
    let description: string | null = null
    if (row.description !== null && row.description !== undefined) {
      if (typeof row.description !== 'string') {
        return { ok: false, message: `Invalid description at row ${i + 1}.` }
      }
      const d = row.description.trim()
      if (d.length > MAX_DESCRIPTION_LEN) {
        return { ok: false, message: `Description too long at row ${i + 1}.` }
      }
      description = d.length ? d : null
    }
    const createdAt = row.createdAt
    if (typeof createdAt !== 'string' || !createdAt.trim()) {
      return { ok: false, message: `Invalid date at row ${i + 1}.` }
    }
    const created = createdAt.trim()
    if (Number.isNaN(Date.parse(created))) {
      return { ok: false, message: `Invalid date at row ${i + 1}.` }
    }
    out.push({ amount, category, description, createdAt: created })
  }

  return { ok: true, data: out }
}
