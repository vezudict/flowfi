'use client'

import { AlertCircle, AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { ParsedTransaction } from '@/app/api/parse-file/route'
import { useAuth } from '@/contexts/auth-context'
import { useCurrency } from '@/contexts/currency-context'
import { PUBLIC_ERROR_GENERIC } from '@/lib/api-public-error'
import { authedFetch, readAuthedJson } from '@/lib/authed-api'
import { resolvePdfImportCategory } from '@/lib/category-suggestion'
import { parseTransactionCsvFile } from '@/lib/csv-transactions'
import { formatCurrency } from '@/lib/format-currency'
import { sanitizeUnsignedDecimalInput } from '@/lib/numeric-input'
import {
  formatTodayPdfStatementDate,
  parsePdfStatementDateToIso,
} from '@/lib/parse-transactions-from-text'

// ─── Shared input style ────────────────────────────────────────────────────────

const inputClass =
  'w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none transition-colors duration-150 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20'

// ─── PDF preview row type ──────────────────────────────────────────────────────

type PdfPreviewRow = {
  id: string
  date: string
  description: string
  amount: string
  type: 'credit' | 'debit'
  confidence?: number
}

function newPdfRow(
  partial?: Partial<Pick<PdfPreviewRow, 'date' | 'description' | 'amount' | 'type'>>,
): PdfPreviewRow {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `row-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return {
    id,
    date: partial?.date ?? formatTodayPdfStatementDate(),
    description: partial?.description ?? '',
    amount: partial?.amount ?? '',
    type: partial?.type ?? 'debit',
  }
}

function pdfRowErrors(row: PdfPreviewRow): string[] {
  const err: string[] = []
  if (!row.date.trim()) err.push('Date required')
  else if (!parsePdfStatementDateToIso(row.date)) err.push('Use DD-MMM-YYYY or YYYY-MM-DD')
  if (!row.description.trim()) err.push('Description required')
  const amt = Number.parseFloat(row.amount.replace(/,/g, ''))
  if (!Number.isFinite(amt) || amt <= 0) err.push('Invalid amount')
  return err
}

function parsedToPdfRow(tx: ParsedTransaction): PdfPreviewRow {
  return {
    ...newPdfRow({
      date: tx.date,
      description: tx.description,
      amount: String(tx.amount),
      type: tx.type,
    }),
    confidence: tx.confidence,
  }
}

function friendlyPdfError(message: string): string {
  const m = message.trim()
  if (!m) return PUBLIC_ERROR_GENERIC
  const lower = m.toLowerCase()
  if (lower.includes('must be signed') || lower.includes('signed in')) return m
  if (lower.includes('no file')) return 'No file uploaded. Choose a PDF and try again.'
  if (lower.includes("couldn't read") || lower.includes('could not read')) return m
  if (lower.includes('could not parse')) return m
  if (lower.includes('too many') || lower.includes('429')) return 'Too many requests. Wait a moment and try again.'
  if (m.length > 120 || /\[object \w+\]/.test(m)) return PUBLIC_ERROR_GENERIC
  return m
}

// ─── Parsed transaction normalizer ────────────────────────────────────────────

const NOISE_DESC_RE = /\b(balance|total|opening|closing)\b/i

type NormalizeResult = {
  transactions: ParsedTransaction[]
  droppedCount: number
  dedupedCount: number
}

function normalizeParsedTransactions(raw: ParsedTransaction[]): NormalizeResult {
  // Merge consecutive rows where description is too short (< 5 chars) into the previous row
  const merged: ParsedTransaction[] = []
  for (const tx of raw) {
    const desc = String(tx.description ?? '').trim()
    if (desc.length > 0 && desc.length < 5 && merged.length > 0) {
      merged[merged.length - 1] = {
        ...merged[merged.length - 1],
        description: String(merged[merged.length - 1].description ?? '').trim() + ' ' + desc,
      }
    } else {
      merged.push({ ...tx })
    }
  }

  const valid: ParsedTransaction[] = []
  let droppedCount = 0

  for (const tx of merged) {
    // Drop if date is missing or unparseable
    const rawDate = String(tx.date ?? '').trim()
    if (!rawDate) { droppedCount++; continue }
    const date = parsePdfStatementDateToIso(rawDate)
    if (!date) { droppedCount++; continue }

    // Normalize amount — drop if missing or zero
    const rawAmount = Number(tx.amount)
    if (!Number.isFinite(rawAmount)) { droppedCount++; continue }
    const amount = Math.abs(rawAmount)
    if (amount <= 0) { droppedCount++; continue }

    // Infer type from sign: negative raw amount → credit, positive → debit
    const type: 'debit' | 'credit' =
      rawAmount < 0 ? 'credit' : tx.type === 'credit' ? 'credit' : 'debit'

    // Drop noise rows (balance summaries, totals, opening/closing)
    const rawDesc = String(tx.description ?? '').trim()
    if (rawDesc && NOISE_DESC_RE.test(rawDesc)) { droppedCount++; continue }

    // Empty description → placeholder (don't drop)
    const description = rawDesc || 'Unknown transaction'

    // Normalize casing: ALL_CAPS only → Title Case (leave mixed-case alone)
    const hasLowercase = /[a-z]/.test(description)
    const normalizedDesc = hasLowercase
      ? description
      : description.replace(/\b[A-Za-z]+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

    valid.push({ date, description: normalizedDesc, amount, type, confidence: tx.confidence })
  }

  // Deduplicate by date + amount (2 dp) + description (case-insensitive)
  const seen = new Set<string>()
  const deduped: ParsedTransaction[] = []
  let dedupedCount = 0

  for (const tx of valid) {
    const key = `${tx.date}|${tx.amount.toFixed(2)}|${tx.description.toLowerCase()}`
    if (seen.has(key)) {
      dedupedCount++
      continue
    }
    seen.add(key)
    deduped.push(tx)
  }

  // Sort by date descending
  deduped.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  if (process.env.NODE_ENV !== 'production') {
    console.log('CLEANED TRANSACTIONS', deduped.length)
    console.log('REMOVED COUNT', droppedCount + dedupedCount)
  }

  return { transactions: deduped, droppedCount, dedupedCount }
}

function buildNormalizeWarning(droppedCount: number, dedupedCount: number): string | null {
  const total = droppedCount + dedupedCount
  if (total === 0) return null
  return `${total} invalid or duplicate ${total === 1 ? 'entry was' : 'entries were'} removed automatically.`
}

// ─── Main component ────────────────────────────────────────────────────────────

type Mode = 'csv' | 'pdf' | null

export function ImportTransactionsClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { currency } = useCurrency()

  // Shared
  const [mode, setMode] = useState<Mode>(null)
  const [parseSource, setParseSource] = useState<'csv' | 'ai' | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  // Preview state (unified — used by both CSV and PDF paths)
  const [pdfRows, setPdfRows] = useState<PdfPreviewRow[]>([])
  const [pdfImportBusy, setPdfImportBusy] = useState(false)
  const [pdfImportError, setPdfImportError] = useState<string | null>(null)
  const [normalizeWarning, setNormalizeWarning] = useState<string | null>(null)
  const [showUncertainOnly, setShowUncertainOnly] = useState(false)

  const reset = useCallback(() => {
    setMode(null)
    setParseSource(null)
    setFileName(null)
    setParseError(null)
    setPdfRows([])
    setPdfImportError(null)
    setNormalizeWarning(null)
    setShowUncertainOnly(false)
  }, [])

  // ─── File change handler ─────────────────────────────────────────────────────

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    reset()
    e.target.value = ''
    if (!file) return

    const name = file.name.toLowerCase()
    const isCsv = name.endsWith('.csv') || file.type === 'text/csv'
    const isPdf =
      name.endsWith('.pdf') || file.type === 'application/pdf' || (file.type === '' && name.endsWith('.pdf'))

    if (!isCsv && !isPdf) {
      setParseError('Please choose a CSV or PDF file.')
      return
    }

    setBusy(true)
    setFileName(file.name)

    if (isCsv) {
      const result = await parseTransactionCsvFile(file)
      setBusy(false)
      if (!result.ok) {
        setParseError(result.error)
        setFileName(null)
        return
      }
      if (result.preview.rows.length === 0) {
        setParseError('No data rows found after the header.')
        setFileName(null)
        return
      }
      const raw = result.preview.rows.map((r) => ({
        date: r.createdAtIso ?? r.dateRaw,
        description: r.description ?? r.descriptionRaw,
        amount: r.amount ?? 0,
        type: (r.transactionType ?? 'debit') as 'debit' | 'credit',
      }))
      const { transactions, droppedCount, dedupedCount } = normalizeParsedTransactions(raw)
      setNormalizeWarning(buildNormalizeWarning(droppedCount, dedupedCount))
      setParseSource('csv')
      setMode('pdf')
      setPdfRows(transactions.map(parsedToPdfRow))
      return
    }

    // PDF path — call AI parser
    if (file.size > 5 * 1024 * 1024) {
      setBusy(false)
      setParseError('That file is too large. Maximum size is 5 MB.')
      setFileName(null)
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    const res = await authedFetch('/api/parse-file', {
      method: 'POST',
      body: formData,
    })
    const parsed = await readAuthedJson<{ transactions: ParsedTransaction[] }>(res)
    setBusy(false)

    if (!parsed.ok) {
      setParseError(friendlyPdfError(parsed.message))
      setFileName(null)
      return
    }

    const { transactions, droppedCount, dedupedCount } = normalizeParsedTransactions(
      parsed.data.transactions,
    )
    setNormalizeWarning(buildNormalizeWarning(droppedCount, dedupedCount))
    setParseSource('ai')
    setMode('pdf')
    setPdfRows(transactions.map(parsedToPdfRow))
  }

  // ─── PDF row editing ─────────────────────────────────────────────────────────

  function updatePdfRow(
    id: string,
    patch: Partial<Pick<PdfPreviewRow, 'date' | 'description' | 'amount' | 'type'>>,
  ) {
    setPdfImportError(null)
    setPdfRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function deletePdfRow(id: string) {
    setPdfImportError(null)
    setPdfRows((prev) => prev.filter((r) => r.id !== id))
  }

  function addPdfRow() {
    setPdfImportError(null)
    setPdfRows((prev) => [...prev, newPdfRow()])
  }

  const pdfImportStats = useMemo(() => {
    const valid = pdfRows.filter((r) => pdfRowErrors(r).length === 0)
    let debitTotal = 0
    let creditTotal = 0
    for (const r of valid) {
      const amt = Number.parseFloat(r.amount.replace(/,/g, ''))
      if (Number.isFinite(amt)) {
        if (r.type === 'debit') debitTotal += amt
        else creditTotal += amt
      }
    }
    return { validCount: valid.length, debitTotal, creditTotal }
  }, [pdfRows])

  const uncertainCount = useMemo(
    () => pdfRows.filter((r) => (r.confidence ?? 1) < 0.75).length,
    [pdfRows],
  )

  const displayRows = useMemo(() => {
    if (!showUncertainOnly) return pdfRows
    return [...pdfRows]
      .filter((r) => (r.confidence ?? 1) < 0.75)
      .sort((a, b) => (a.confidence ?? 1) - (b.confidence ?? 1))
  }, [pdfRows, showUncertainOnly])

  const pdfHasNoValidRows = pdfRows.length > 0 && pdfRows.every((r) => pdfRowErrors(r).length > 0)

  // ─── PDF import ──────────────────────────────────────────────────────────────

  async function onPdfImport() {
    if (!user || pdfRows.length === 0) return
    setPdfImportError(null)

    const validRows = pdfRows.filter((r) => pdfRowErrors(r).length === 0)
    if (validRows.length === 0) {
      setPdfImportError('Fix the highlighted rows or add valid transactions before importing.')
      return
    }

    const toInsert = validRows.map((r) => {
      const amount = Number.parseFloat(r.amount.replace(/,/g, ''))
      const desc = r.description.trim()
      const createdAt = parsePdfStatementDateToIso(r.date.trim())!
      const category = resolvePdfImportCategory({ description: desc, type: r.type })
      return {
        amount,
        category,
        description: desc.length ? desc : null,
        createdAt,
        transaction_type: r.type,
      }
    })

    setPdfImportBusy(true)
    const res = await authedFetch('/api/transactions/import', {
      method: 'POST',
      json: { rows: toInsert },
    })
    const importResult = await readAuthedJson<{ count: number }>(res)
    setPdfImportBusy(false)

    if (!importResult.ok) {
      const m = importResult.message.trim()
      setPdfImportError(m.length > 160 ? PUBLIC_ERROR_GENERIC : m)
      return
    }

    const n = importResult.data.count
    const skipped = pdfRows.length - validRows.length

    toast.success(`Imported ${n} transaction${n === 1 ? '' : 's'}`, {
      description:
        skipped > 0
          ? `${skipped} row${skipped === 1 ? '' : 's'} skipped because of validation issues.`
          : undefined,
      duration: 9000,
      action: {
        label: 'View in dashboard',
        onClick: () => router.push('/dashboard'),
      },
    })

    reset()
    router.refresh()
  }

  // ─── Auth guards ─────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="mt-8 space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-32 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <p>Sign in to import transactions into your account.</p>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Sign in
        </button>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mt-8 space-y-8">
      {/* Upload area */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
        <div className="relative">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Upload statement
          </h2>
          <p className="mt-1 text-xs text-zinc-500/85 dark:text-zinc-400/85">
            <strong className="font-medium text-zinc-700 dark:text-zinc-300">CSV:</strong> header row
            must include{' '}
            <span className="font-mono text-zinc-700 dark:text-zinc-300">date</span>,{' '}
            <span className="font-mono text-zinc-700 dark:text-zinc-300">description</span>, and{' '}
            <span className="font-mono text-zinc-700 dark:text-zinc-300">amount</span>. Negative
            amounts import as credits.{' '}
            <strong className="font-medium text-zinc-700 dark:text-zinc-300">PDF:</strong> bank
            statement — AI extracts and structures transactions for review.
          </p>

          <label
            className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              busy
                ? 'border-indigo-300/70 bg-indigo-50/60 dark:border-indigo-500/35 dark:bg-indigo-950/25'
                : 'border-zinc-300 bg-zinc-50/80 hover:border-indigo-400/50 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-indigo-500/40'
            }`}
          >
            {busy ? (
              <span className="flex flex-col items-center gap-3 text-center">
                <Loader2
                  className="h-8 w-8 shrink-0 animate-spin text-indigo-600 dark:text-indigo-400"
                  aria-hidden
                />
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {mode === null && fileName?.toLowerCase().endsWith('.pdf')
                    ? 'Analysing with AI…'
                    : 'Reading file…'}
                </span>
                <span className="max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                  {fileName?.toLowerCase().endsWith('.pdf')
                    ? 'Extracting and structuring your transactions.'
                    : 'Parsing rows and inferring categories.'}
                </span>
              </span>
            ) : (
              <>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  Upload statement (CSV or PDF)
                </span>
                <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  .csv or .pdf · max 5 MB
                </span>
              </>
            )}
            <input
              type="file"
              accept=".csv,.pdf,text/csv,application/pdf"
              className="sr-only"
              disabled={busy}
              onChange={onFileChange}
            />
          </label>

          {fileName && !busy ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Selected:{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{fileName}</span>
            </p>
          ) : null}

          {parseError ? (
            <p
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
              role="alert"
            >
              {parseError}
            </p>
          ) : null}

          {normalizeWarning ? (
            <p
              className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
              role="status"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {normalizeWarning}
            </p>
          ) : null}

        </div>
      </section>

      {/* Unified preview — editable rows for CSV and AI-parsed PDF */}
      {mode === 'pdf' ? (
        <section className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] to-transparent dark:from-violet-400/[0.03]" />
          <div className="result-panel relative space-y-4">
            {pdfRows.length === 0 ? (
              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/90 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  No transactions detected
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                  {parseSource === 'ai'
                    ? "Try another file or add transactions manually. Some bank PDFs use formats the AI doesn't recognize yet."
                    : 'No rows were found in the file. Check your CSV has a header row and data below it.'}
                </p>
                <button
                  type="button"
                  onClick={addPdfRow}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Add manually
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      Preview
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {parseSource === 'ai'
                        ? 'AI-extracted — edit any cell before importing. Invalid rows are skipped.'
                        : 'Review and edit before importing. Invalid rows are skipped.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {parseSource === 'ai' && uncertainCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setShowUncertainOnly((v) => !v)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-150 ${
                          showUncertainOnly
                            ? 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-950'
                            : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                        {showUncertainOnly ? 'Show all' : `Uncertain (${uncertainCount})`}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={addPdfRow}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 transition-colors duration-150 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Add row
                    </button>
                    <button
                      type="button"
                      disabled={!user || pdfImportBusy || pdfRows.length === 0 || pdfHasNoValidRows}
                      onClick={() => void onPdfImport()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {pdfImportBusy ? (
                        <>
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          Importing…
                        </>
                      ) : (
                        'Confirm import'
                      )}
                    </button>
                  </div>
                </div>

                {/* Import summary */}
                <div className="rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Import summary
                  </p>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">Transactions</dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {pdfImportStats.validCount}
                        {pdfRows.length !== pdfImportStats.validCount ? (
                          <span className="font-normal text-zinc-400"> / {pdfRows.length} rows</span>
                        ) : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">Total debit</dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(pdfImportStats.debitTotal, currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">Total credit</dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(pdfImportStats.creditTotal, currency)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                    Totals include only rows that pass validation.
                  </p>
                </div>

                {/* Editable table */}
                <div className="max-h-[min(420px,55vh)] overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="sticky top-0 z-[1] border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Date
                        </th>
                        <th className="min-w-[200px] px-3 py-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Description
                        </th>
                        <th className="w-[120px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Amount
                        </th>
                        <th className="w-[100px] whitespace-nowrap px-3 py-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Type
                        </th>
                        <th className="w-14 px-2 py-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          <span className="sr-only">Delete</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                      {displayRows.map((row, idx) => {
                        const errs = pdfRowErrors(row)
                        const invalid = errs.length > 0
                        const conf = row.confidence ?? 1
                        const isLowConf = parseSource === 'ai' && !invalid && conf < 0.5
                        const isMedConf = parseSource === 'ai' && !invalid && conf >= 0.5 && conf < 0.75
                        const confTooltip =
                          isLowConf
                            ? 'Low confidence — please verify this transaction'
                            : isMedConf
                              ? 'Moderate confidence — please verify this transaction'
                              : undefined
                        return (
                          <tr
                            key={row.id}
                            className={
                              invalid
                                ? 'bg-red-50/50 dark:bg-red-950/20'
                                : isLowConf
                                  ? 'bg-red-50/40 dark:bg-red-950/15'
                                  : isMedConf
                                    ? 'bg-amber-50/40 dark:bg-amber-950/15'
                                    : 'bg-white dark:bg-zinc-950'
                            }
                            title={invalid ? errs.join(' · ') : confTooltip}
                          >
                            <td className="px-3 py-2 align-middle">
                              <input
                                className={inputClass}
                                aria-label={`Date row ${idx + 1}`}
                                value={row.date}
                                onChange={(e) => updatePdfRow(row.id, { date: e.target.value })}
                                placeholder="YYYY-MM-DD"
                              />
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <div className="flex items-center gap-1.5">
                                {(isLowConf || isMedConf) ? (
                                  <span title={confTooltip} className="shrink-0">
                                    <AlertCircle
                                      className={`h-3.5 w-3.5 ${isLowConf ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}
                                      aria-hidden
                                    />
                                  </span>
                                ) : null}
                                <input
                                  className={inputClass}
                                  aria-label={`Description row ${idx + 1}`}
                                  value={row.description}
                                  onChange={(e) =>
                                    updatePdfRow(row.id, { description: e.target.value })
                                  }
                                  placeholder="Description"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <input
                                className={`${inputClass} tabular-nums`}
                                aria-label={`Amount row ${idx + 1}`}
                                inputMode="decimal"
                                autoComplete="off"
                                value={row.amount}
                                onChange={(e) =>
                                  updatePdfRow(row.id, {
                                    amount: sanitizeUnsignedDecimalInput(e.target.value),
                                  })
                                }
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <select
                                className={inputClass}
                                aria-label={`Type row ${idx + 1}`}
                                value={row.type}
                                onChange={(e) =>
                                  updatePdfRow(row.id, {
                                    type: e.target.value as 'credit' | 'debit',
                                  })
                                }
                              >
                                <option value="debit">Debit</option>
                                <option value="credit">Credit</option>
                              </select>
                            </td>
                            <td className="px-2 py-2 align-middle">
                              <button
                                type="button"
                                onClick={() => deletePdfRow(row.id)}
                                className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                                aria-label={`Remove row ${idx + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {pdfImportError ? (
              <p
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
                role="alert"
              >
                {pdfImportError}
              </p>
            ) : null}

            {/* Review reminder — AI extraction gets a stronger caution */}
            {pdfRows.length === 0 ? null : (
              <p className="flex gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100/95">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                <span>
                  {parseSource === 'ai'
                    ? 'AI-extracted — review carefully before importing. Edit any cell or remove rows as needed.'
                    : 'Review before importing. Edit any cell or remove rows as needed.'}
                </span>
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}
