'use client'

import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { authedFetch, readAuthedJson } from '@/lib/authed-api'
import { resolvePdfImportCategory } from '@/lib/category-suggestion'
import { sanitizeUnsignedDecimalInput } from '@/lib/numeric-input'
import {
  formatTodayPdfStatementDate,
  parsePdfStatementDateToIso,
  parseTransactionsFromText,
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

export function PdfBankStatementUpload() {
  const { user } = useAuth()
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<PdfPreviewRow[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const router = useRouter()

  const reset = useCallback(() => {
    setError(null)
    setSuccess(false)
    setExtractedText(null)
    setFileName(null)
    setPreviewRows([])
    setImportError(null)
  }, [])

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
      setError('File is too large. Maximum size is 5 MB.')
      return
    }

    const mimeOk = file.type === PDF_MIME
    const extOk = file.name.toLowerCase().endsWith('.pdf')
    if (!mimeOk && !(file.type === '' && extOk)) {
      setError('Invalid file. Please choose a PDF (application/pdf).')
      return
    }

    setBusy(true)
    setFileName(file.name)

    const formData = new FormData()
    formData.append('file', file)

    const res = await authedFetch('/api/parse-pdf', {
      method: 'POST',
      body: formData,
    })

    const parsed = await readAuthedJson<{ text: string }>(res)
    setBusy(false)

    if (!parsed.ok) {
      setFileName(null)
      setError(parsed.message)
      return
    }

    setExtractedText(parsed.data.text)
    setSuccess(true)

    const parsedTx = parseTransactionsFromText(parsed.data.text)
    setPreviewRows(
      parsedTx.map((row) =>
        newRow({
          date: row.date,
          description: row.description,
          amount: String(row.amount),
          type: row.type,
        }),
      ),
    )
  }

  async function onConfirmImport() {
    if (!user || previewRows.length === 0) return
    setImportError(null)

    const validRows = previewRows.filter((r) => rowErrors(r).length === 0)
    if (validRows.length === 0) {
      setImportError('No valid rows to import. Fix or remove invalid rows.')
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
      setImportError(importResult.message)
      return
    }

    const n = importResult.data.count
    const skipped = previewRows.length - validRows.length
    const skipMsg =
      skipped > 0 ? ` (${skipped} row${skipped === 1 ? '' : 's'} skipped as invalid)` : ''
    toast.success(`Imported ${n} transaction${n === 1 ? '' : 's'}${skipMsg}.`)

    setPreviewRows([])
    setExtractedText(null)
    setFileName(null)
    setSuccess(false)
    router.refresh()
  }

  const hasNoValidRows =
    previewRows.length > 0 && previewRows.every((r) => rowErrors(r).length > 0)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] to-transparent dark:from-violet-400/[0.03]" />
      <div className="relative">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Bank statement (PDF)
        </h2>
        <p className="mt-1 text-xs text-zinc-500/85 dark:text-zinc-400/85">
          Upload PDF → text extraction → parse rows → review in the table → confirm to save to your
          account. Max 5 MB.
        </p>

        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-12 transition-all duration-150 ease-in-out hover:border-violet-400/50 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-violet-500/40">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Extracting text…
              </>
            ) : (
              'Choose PDF file'
            )}
          </span>
          <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            application/pdf · max 5 MB
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={busy}
            onChange={onFileChange}
          />
        </label>

        {fileName ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Selected:{' '}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{fileName}</span>
          </p>
        ) : null}

        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {success ? (
          <p
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
            role="status"
          >
            Text extracted. Review and edit rows below, then import.
          </p>
        ) : null}

        {extractedText !== null ? (
          <div className="result-panel mt-6 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Preview ({previewRows.length})
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Edit inline. Categories are auto-detected from description (e.g. Swiggy → food,
                  Uber → transport, salary → income). Invalid rows are skipped on import.
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
                  disabled={
                    !user || importBusy || previewRows.length === 0 || hasNoValidRows
                  }
                  onClick={() => void onConfirmImport()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {importBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      Importing…
                    </>
                  ) : (
                    'Confirm & Import'
                  )}
                </button>
              </div>
            </div>

            {importError ? (
              <p
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
                role="alert"
              >
                {importError}
              </p>
            ) : null}

            {previewRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                No rows yet. Use <span className="font-medium text-zinc-700 dark:text-zinc-300">Add row</span>{' '}
                to enter transactions manually.
              </p>
            ) : null}

            {previewRows.length > 0 ? (
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

            <details className="rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
              <summary className="cursor-pointer select-none px-3 py-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                View extracted text (debug)
              </summary>
              <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap break-words border-t border-zinc-200/80 p-3 font-mono text-xs text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
                {extractedText || '(empty)'}
              </pre>
            </details>
          </div>
        ) : null}
      </div>
    </section>
  )
}
