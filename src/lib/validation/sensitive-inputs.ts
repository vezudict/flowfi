import { finalizeTransactionCategory } from '@/lib/category-suggestion'
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
  /** null when the caller omitted transactionType — route must resolve before insert */
  transaction_type: 'debit' | 'credit' | null
}

function parseEntryType(raw: unknown): 'debit' | 'credit' | null {
  if (raw === undefined || raw === null) return null
  if (raw === 'debit' || raw === 'credit') return raw
  if (typeof raw === 'string' && raw.toLowerCase() === 'debit') return 'debit'
  if (typeof raw === 'string' && raw.toLowerCase() === 'credit') return 'credit'
  return null
}

/** Income-style labels are for credits only; debits must use expense categories. */
function debitUsesIncomeCategory(category: string): boolean {
  const key = category.trim().toLowerCase()
  return key === 'income' || key === 'salary' || key === 'freelance'
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

  const oRec = o as Record<string, unknown>
  const ttRaw = oRec.transactionType ?? oRec.transaction_type
  let transaction_type: 'debit' | 'credit' | null = null
  if (ttRaw !== undefined && ttRaw !== null) {
    const parsed = parseEntryType(ttRaw)
    if (parsed === null) {
      return { ok: false, message: 'transactionType must be debit or credit.' }
    }
    transaction_type = parsed
  }
  // transaction_type may be null here — route handler must resolve it before insert

  const resolvedCategory = finalizeTransactionCategory(category, description)

  if (transaction_type === 'debit' && debitUsesIncomeCategory(resolvedCategory)) {
    return {
      ok: false,
      message:
        'Expenses cannot use income categories (Income, Salary, Freelance). Use an expense category for debits, or Credit for deposits.',
    }
  }

  return {
    ok: true,
    data: { amount, category: resolvedCategory, description, transaction_type },
  }
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
    const signed =
      typeof amountRaw === 'number'
        ? amountRaw
        : typeof amountRaw === 'string'
          ? Number(amountRaw)
          : NaN
    if (!Number.isFinite(signed) || signed === 0 || Math.abs(signed) > MAX_AMOUNT) {
      return { ok: false, message: `Invalid amount at row ${i + 1}.` }
    }
    const amount = Math.abs(signed)

    const ttFromBody =
      parseEntryType(row.transactionType) ?? parseEntryType(row.transaction_type)
    const transaction_type: 'debit' | 'credit' =
      ttFromBody ?? (signed < 0 ? 'credit' : 'debit')
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
    const finalizedCategory = finalizeTransactionCategory(category, description)

    if (transaction_type === 'debit' && debitUsesIncomeCategory(finalizedCategory)) {
      return {
        ok: false,
        message: `Row ${i + 1}: debits cannot use income categories (Income, Salary, Freelance).`,
      }
    }
    const createdAt = row.createdAt
    if (typeof createdAt !== 'string' || !createdAt.trim()) {
      return { ok: false, message: `Invalid date at row ${i + 1}.` }
    }
    const created = createdAt.trim()
    if (Number.isNaN(Date.parse(created))) {
      return { ok: false, message: `Invalid date at row ${i + 1}.` }
    }
    out.push({
      amount,
      category: finalizedCategory,
      description,
      createdAt: created,
      transaction_type,
    })
  }

  return { ok: true, data: out }
}

const MAX_BULK_DELETE_IDS = 500

export function parseAndValidateBulkTransactionDelete(
  raw: unknown,
): { ok: true; ids: string[] } | { ok: false; message: string } {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, message: 'Invalid request body.' }
  }
  const idsRaw = (raw as Record<string, unknown>).ids
  if (!Array.isArray(idsRaw)) {
    return { ok: false, message: 'Expected ids array.' }
  }
  if (idsRaw.length === 0) {
    return { ok: false, message: 'No transactions selected.' }
  }
  if (idsRaw.length > MAX_BULK_DELETE_IDS) {
    return { ok: false, message: `At most ${MAX_BULK_DELETE_IDS} transactions per request.` }
  }
  const seen = new Set<string>()
  const ids: string[] = []
  for (let i = 0; i < idsRaw.length; i++) {
    const id = idsRaw[i]
    if (typeof id !== 'string' || !id.trim()) {
      return { ok: false, message: `Invalid id at index ${i}.` }
    }
    const t = id.trim()
    if (seen.has(t)) continue
    seen.add(t)
    ids.push(t)
  }
  if (ids.length === 0) {
    return { ok: false, message: 'No valid transaction ids.' }
  }
  return { ok: true, ids }
}
