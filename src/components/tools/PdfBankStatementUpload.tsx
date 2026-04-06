'use client'

import { Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { authedFetch, readAuthedJson } from '@/lib/authed-api'

const MAX_BYTES = 5 * 1024 * 1024
const PDF_MIME = 'application/pdf'

export function PdfBankStatementUpload() {
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  const reset = useCallback(() => {
    setError(null)
    setSuccess(false)
    setExtractedText(null)
    setFileName(null)
  }, [])

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

    const body = new FormData()
    body.set('file', file, file.name)

    const res = await authedFetch('/api/parse-pdf', {
      method: 'POST',
      body,
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
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] to-transparent dark:from-violet-400/[0.03]" />
      <div className="relative">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Bank statement (PDF)
        </h2>
        <p className="mt-1 text-xs text-zinc-500/85 dark:text-zinc-400/85">
          Upload a PDF to extract raw text (preview). Max 5 MB. Fully parsed import coming next.
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
            Text extracted successfully.
          </p>
        ) : null}

        {extractedText !== null ? (
          <div className="result-panel mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Extracted text (debug)
            </p>
            <pre className="mt-2 max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-200/80 bg-white p-3 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
              {extractedText || '(empty)'}
            </pre>
          </div>
        ) : null}
      </div>
    </section>
  )
}
