'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import {
  IMPORT_CATEGORY,
  parseTransactionCsvFile,
  type CsvTransactionsPreview,
  type ParseTransactionCsvResult,
} from '@/lib/csv-transactions'
import { insertImportedTransactions } from '@/lib/transactions'
import { useAuth } from '@/contexts/auth-context'
import { formatAmountPlain } from '@/lib/format-currency'

export function ImportTransactionsClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<CsvTransactionsPreview | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const resetMessages = useCallback(() => {
    setParseError(null)
    setImportError(null)
    setImportSuccess(null)
  }, [])

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    resetMessages()
    setPreview(null)
    setFileName(null)
    e.target.value = ''

    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please choose a .csv file.')
      return
    }

    setBusy(true)
    const result: ParseTransactionCsvResult = await parseTransactionCsvFile(file)
    setBusy(false)

    if (!result.ok) {
      setParseError(result.error)
      return
    }

    if (result.preview.rows.length === 0) {
      setParseError('No data rows found after the header.')
      return
    }

    setFileName(file.name)
    setPreview(result.preview)
  }

  const validCount = preview?.rows.filter((r) => r.isValid).length ?? 0
  const invalidCount = preview ? preview.rows.length - validCount : 0

  async function onImport() {
    if (!user || !preview) return
    setImportError(null)
    setImportSuccess(null)

    const toInsert = preview.rows
      .filter((r) => r.isValid && r.createdAtIso && r.amount !== null)
      .map((r) => ({
        amount: r.amount as number,
        description: r.description,
        createdAt: r.createdAtIso as string,
      }))

    if (toInsert.length === 0) {
      setImportError('No valid rows to import. Fix errors in the preview first.')
      return
    }

    setBusy(true)
    const { error } = await insertImportedTransactions(
      user.id,
      IMPORT_CATEGORY,
      toInsert,
    )
    setBusy(false)

    if (error) {
      console.error('[import-transactions]', error)
      setImportError(error.message)
      return
    }

    setImportSuccess(
      `Imported ${toInsert.length} transaction${toInsert.length === 1 ? '' : 's'}.${invalidCount > 0 ? ` (${invalidCount} row${invalidCount === 1 ? '' : 's'} skipped due to errors.)` : ''}`,
    )
    setPreview(null)
    setFileName(null)
  }

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
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
        <div className="relative">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Upload CSV
        </h2>
        <p className="mt-1 text-xs text-zinc-500/85 dark:text-zinc-400/85">
          Header row must include columns named{' '}
          <span className="font-mono text-zinc-700 dark:text-zinc-300">
            date
          </span>
          ,{' '}
          <span className="font-mono text-zinc-700 dark:text-zinc-300">
            description
          </span>
          , and{' '}
          <span className="font-mono text-zinc-700 dark:text-zinc-300">
            amount
          </span>{' '}
          (extra columns are ignored).
        </p>

        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-12 transition-all duration-150 ease-in-out hover:border-indigo-400/50 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-indigo-500/40">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {busy && !preview ? 'Reading file…' : 'Choose CSV file'}
          </span>
          <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            .csv only
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={busy}
            onChange={onFileChange}
          />
        </label>

        {fileName ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Selected: <span className="font-medium text-zinc-700 dark:text-zinc-300">{fileName}</span>
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

        {importSuccess ? (
          <p
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
            role="status"
          >
            {importSuccess}
          </p>
        ) : null}

        {importError ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {importError}
          </p>
        ) : null}
        </div>
      </section>

      {preview ? (
        <section className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Preview
              </h2>
              <p className="mt-1 text-xs text-zinc-500/85 dark:text-zinc-400/85">
                {preview.rows.length} row
                {preview.rows.length === 1 ? '' : 's'} ·{' '}
                <span className="text-emerald-700 dark:text-emerald-400">
                  {validCount} valid
                </span>
                {invalidCount > 0 ? (
                  <>
                    {' '}
                    ·{' '}
                    <span className="text-red-700 dark:text-red-400">
                      {invalidCount} with errors
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              disabled={busy || validCount === 0}
              onClick={onImport}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-indigo-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  Importing…
                </>
              ) : (
                `Import ${validCount} transaction${validCount === 1 ? '' : 's'}`
              )}
            </button>
          </div>

          <div className="relative z-10 mt-4 max-h-[420px] overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">#</th>
                  <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">Date</th>
                  <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">Description</th>
                  <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">Amount</th>
                  <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {preview.rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={
                      row.isValid
                        ? 'bg-white dark:bg-zinc-950'
                        : 'bg-red-50/40 dark:bg-red-950/15'
                    }
                  >
                    <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400">
                      {row.rowNumber}
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2 text-zinc-800 dark:text-zinc-200" title={row.dateRaw}>
                      {row.dateRaw || '—'}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2 text-zinc-800 dark:text-zinc-200" title={row.descriptionRaw}>
                      {row.descriptionRaw || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                      {row.amount !== null
                        ? formatAmountPlain(row.amount)
                        : row.amountRaw || '—'}
                    </td>
                    <td className="px-3 py-2">
                      {row.isValid ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                          Valid
                        </span>
                      ) : (
                        <span
                          className="text-xs text-red-700 dark:text-red-300"
                          title={row.errors.join(' ')}
                        >
                          {row.errors.join('; ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
