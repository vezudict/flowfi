'use client'

import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { useCurrency } from '@/contexts/currency-context'
import { PUBLIC_ERROR_GENERIC } from '@/lib/api-public-error'
import { authedFetch, readAuthedJson } from '@/lib/authed-api'
import { resolvePdfImportCategory } from '@/lib/category-suggestion'
import { formatCurrency } from '@/lib/format-currency'
import { sanitizeUnsignedDecimalInput } from '@/lib/numeric-input'
import {
  formatTodayPdfStatementDate,
  parsePdfStatementDateToIso,
  parseTransactionsFromText,
  pdfParseLooksIncomplete,
} from '@/lib/parse-transactions-from-text'

const MAX_BYTES = 5 * 1024 * 1024
const PDF_MIME = 'application/pdf'

const inputClass =
  'w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none transition-colors duration-150 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20'

type PdfPreviewRow = {
  id: string
  date: string
  description: string
  amount: string
  type: 'credit' | 'debit'
}

type ProcessingStep = 'idle' | 'upload' | 'parse'

function newRow(partial?: Partial<Pick<PdfPreviewRow, 'date' | 'description' | 'amount' | 'type'>>): PdfPreviewRow {
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

function rowErrors(row: PdfPreviewRow): string[] {
  const err: string[] = []
  if (!row.date.trim()) err.push('Date required')
  else if (!parsePdfStatementDateToIso(row.date)) err.push('Use DD-MMM-YYYY')
  if (!row.description.trim()) err.push('Description required')
  const amt = Number.parseFloat(row.amount.replace(/,/g, ''))
  if (!Number.isFinite(amt) || amt <= 0) err.push('Invalid amount')
  return err
}

function friendlyPdfError(message: string): string {
  const m = message.trim()
  if (!m) return PUBLIC_ERROR_GENERIC
  const lower = m.toLowerCase()
  if (lower.includes('must be signed') || lower.includes('signed in')) return m
  if (lower.includes('no file')) {
    return 'No file uploaded. Choose a PDF and try again.'
  }
  if (lower.includes("couldn't read") || lower.includes('could not read')) return m
  if (lower.includes('parsing failed')) {
    return "We couldn't read that PDF. Try another file or export the statement again from your bank."
  }
  if (lower.includes('invalid file') || lower.includes('application/pdf')) {
    return 'Please choose a valid PDF (max 5 MB).'
  }
  if (lower.includes('too many') || lower.includes('429')) {
    return 'Too many requests. Wait a moment and try again.'
  }
  if (m.length > 120 || /\[object \w+\]/.test(m) || /\bat\b/i.test(m) && m.includes('Error')) {
    return PUBLIC_ERROR_GENERIC
  }
  return m
}

function friendlyImportError(message: string): string {
  const m = message.trim()
  if (!m) return PUBLIC_ERROR_GENERIC
  if (m.length > 160 || /\[object \w+\]/.test(m)) return PUBLIC_ERROR_GENERIC
  return m
}

export function PdfBankStatementUpload() {
  const { user } = useAuth()
  const { currency } = useCurrency()
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<PdfPreviewRow[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [extractComplete, setExtractComplete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle')
  const [partialParseWarning, setPartialParseWarning] = useState(false)
  /** Row count from the last PDF parse (not manual edits). */
  const [lastPdfParseRowCount, setLastPdfParseRowCount] = useState<number | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const router = useRouter()

  const reset = useCallback(() => {
    setError(null)
    setExtractComplete(false)
    setExtractedText(null)
    setFileName(null)
    setPreviewRows([])
    setImportError(null)
    setProcessingStep('idle')
    setPartialParseWarning(false)
    setLastPdfParseRowCount(null)
  }, [])

  const importStats = useMemo(() => {
    const valid = previewRows.filter((r) => rowErrors(r).length === 0)
    let debitTotal = 0
    let creditTotal = 0
    for (const r of valid) {
      const amt = Number.parseFloat(r.amount.replace(/,/g, ''))
      if (!Number.isFinite(amt)) continue
      if (r.type === 'debit') debitTotal += amt
      else creditTotal += amt
    }
    return {
      validCount: valid.length,
      debitTotal,
      creditTotal,
    }
  }, [previewRows])

  function updateRow(id: string, patch: Partial<Pick<PdfPreviewRow, 'date' | 'description' | 'amount' | 'type'>>) {
    setImportError(null)
    setPreviewRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function deleteRow(id: string) {
    setImportError(null)
    setPreviewRows((prev) => prev.filter((r) => r.id !== id))
  }

  function addRow() {
    setImportError(null)
    setPreviewRows((prev) => [...prev, newRow()])
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    reset()
    e.target.value = ''

    if (!file) return

    if (file.size > MAX_BYTES) {
      setError('That file is too large. Maximum size is 5 MB.')
      return
    }

    const mimeOk = file.type === PDF_MIME
    const extOk = file.name.toLowerCase().endsWith('.pdf')
    if (!mimeOk && !(file.type === '' && extOk)) {
      setError('Please choose a PDF file.')
      return
    }

    setBusy(true)
    setProcessingStep('upload')
    setFileName(file.name)

    const formData = new FormData()
    formData.append('file', file)

    const res = await authedFetch('/api/parse-pdf', {
      method: 'POST',
      body: formData,
    })

    const parsed = await readAuthedJson<{ text: string }>(res)

    if (!parsed.ok) {
      setBusy(false)
      setProcessingStep('idle')
      setFileName(null)
      setError(friendlyPdfError(parsed.message))
      return
    }

    setProcessingStep('parse')
    await new Promise((r) => setTimeout(r, 40))

    const text = parsed.data.text
    const parsedTx = parseTransactionsFromText(text)
    const rows = parsedTx.map((row) =>
      newRow({
        date: row.date,
        description: row.description,
        amount: String(row.amount),
        type: row.type,
      }),
    )

    setExtractedText(text)
    setPreviewRows(rows)
    setLastPdfParseRowCount(parsedTx.length)
    setPartialParseWarning(pdfParseLooksIncomplete(text, rows.length))
    setExtractComplete(true)
    setBusy(false)
    setProcessingStep('idle')
  }

  async function onConfirmImport() {
    if (!user || previewRows.length === 0) return
    setImportError(null)

    const validRows = previewRows.filter((r) => rowErrors(r).length === 0)
    if (validRows.length === 0) {
      setImportError('Fix the highlighted rows or add valid transactions before importing.')
      return
    }

    const toInsert = validRows.map((r) => {
      const amount = Number.parseFloat(r.amount.replace(/,/g, ''))
      const desc = r.description.trim()
      const createdAt = parsePdfStatementDateToIso(r.date.trim())!
      const category = resolvePdfImportCategory({
        description: desc,
        type: r.type,
      })
      return {
        amount,
        category,
        description: desc.length ? desc : null,
        createdAt,
      }
    })

    setImportBusy(true)
    const res = await authedFetch('/api/transactions/import', {
      method: 'POST',
      json: { rows: toInsert },
    })
    const importResult = await readAuthedJson<{ count: number }>(res)
    setImportBusy(false)

    if (!importResult.ok) {
      setImportError(friendlyImportError(importResult.message))
      return
    }

    const n = importResult.data.count
    const skipped = previewRows.length - validRows.length

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

    setPreviewRows([])
    setExtractedText(null)
    setFileName(null)
    setExtractComplete(false)
    setPartialParseWarning(false)
    setLastPdfParseRowCount(null)
    router.refresh()
  }

  const hasNoValidRows =
    previewRows.length > 0 && previewRows.every((r) => rowErrors(r).length > 0)

  const showPreviewPanel = extractedText !== null
  const noTransactionsFromPdf =
    extractComplete && previewRows.length === 0 && lastPdfParseRowCount === 0
  const tableWasCleared =
    extractComplete &&
    previewRows.length === 0 &&
    lastPdfParseRowCount !== null &&
    lastPdfParseRowCount > 0

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] to-transparent dark:from-violet-400/[0.03]" />
      <div className="relative">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Bank statement (PDF)
        </h2>
        <p className="mt-1 text-xs text-zinc-500/85 dark:text-zinc-400/85">
          Upload a statement—we extract the text, detect transactions, and let you review before
          saving. Max 5 MB.
        </p>

        <label
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] dark:border-zinc-700 dark:bg-zinc-900/40 ${
            busy
              ? 'border-violet-300/70 bg-violet-50/60 dark:border-violet-500/35 dark:bg-violet-950/25'
              : 'border-zinc-300 bg-zinc-50/80 hover:border-violet-400/50 hover:bg-zinc-50 dark:hover:border-violet-500/40'
          }`}
        >
          {busy ? (
            <span className="flex flex-col items-center gap-3 text-center">
              <Loader2
                className="h-8 w-8 shrink-0 animate-spin text-violet-600 dark:text-violet-400"
                aria-hidden
              />
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                Processing your statement…
              </span>
              <span className="max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                {processingStep === 'upload'
                  ? 'Uploading and reading your PDF.'
                  : 'Finding transactions in the text.'}
              </span>
            </span>
          ) : (
            <>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Choose PDF file
              </span>
              <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                PDF · max 5 MB
              </span>
            </>
          )}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={busy}
            onChange={onFileChange}
          />
        </label>

        {fileName && !busy ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            File:{' '}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{fileName}</span>
          </p>
        ) : null}

        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {showPreviewPanel ? (
          <div className="result-panel mt-6 space-y-4">
            {noTransactionsFromPdf ? (
              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/90 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  No transactions detected
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                  Try another file or add transactions manually. Some bank PDFs use formats we
                  don&apos;t recognize yet.
                </p>
                <button
                  type="button"
                  onClick={addRow}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-[0.97] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Add manually
                </button>
              </div>
            ) : null}

            {partialParseWarning && !noTransactionsFromPdf && previewRows.length > 0 ? (
              <p
                className="flex gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100/95"
                role="status"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                <span>
                  Some transactions may not have been detected. Review the list carefully before
                  importing.
                </span>
              </p>
            ) : null}

            {!noTransactionsFromPdf && previewRows.length > 0 ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Preview
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      Edit any cell. Categories are inferred from descriptions. Invalid rows are
                      skipped on import.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={addRow}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 transition-colors duration-150 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Add row
                    </button>
                    <button
                      type="button"
                      disabled={!user || importBusy || previewRows.length === 0 || hasNoValidRows}
                      onClick={() => void onConfirmImport()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {importBusy ? (
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

                <div className="rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Import summary
                  </p>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">Transactions</dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {importStats.validCount}
                        {previewRows.length !== importStats.validCount ? (
                          <span className="font-normal text-zinc-400">
                            {' '}
                            / {previewRows.length} rows
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">Total debit</dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(importStats.debitTotal, currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">Total credit</dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(importStats.creditTotal, currency)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                    Totals include only rows that pass validation.
                  </p>
                </div>
              </>
            ) : null}

            {importError ? (
              <p
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
                role="alert"
              >
                {importError}
              </p>
            ) : null}

            {tableWasCleared ? (
              <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                No rows left. Use{' '}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Add row</span> to
                enter transactions, or upload another PDF.
              </p>
            ) : null}

            {!noTransactionsFromPdf && previewRows.length > 0 ? (
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
                    {previewRows.map((row, idx) => {
                      const errs = rowErrors(row)
                      const invalid = errs.length > 0
                      return (
                        <tr
                          key={row.id}
                          className={
                            invalid
                              ? 'bg-red-50/50 dark:bg-red-950/20'
                              : 'bg-white dark:bg-zinc-950'
                          }
                          title={invalid ? errs.join(' · ') : undefined}
                        >
                          <td className="px-3 py-2 align-middle">
                            <input
                              className={inputClass}
                              aria-label={`Date row ${idx + 1}`}
                              value={row.date}
                              onChange={(e) => updateRow(row.id, { date: e.target.value })}
                              placeholder="DD-MMM-YYYY"
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <input
                              className={inputClass}
                              aria-label={`Description row ${idx + 1}`}
                              value={row.description}
                              onChange={(e) =>
                                updateRow(row.id, { description: e.target.value })
                              }
                              placeholder="Description"
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <input
                              className={`${inputClass} tabular-nums`}
                              aria-label={`Amount row ${idx + 1}`}
                              inputMode="decimal"
                              autoComplete="off"
                              value={row.amount}
                              onChange={(e) =>
                                updateRow(row.id, {
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
                                updateRow(row.id, {
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
                              onClick={() => deleteRow(row.id)}
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
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
