import { ImportTransactionsClient } from '@/components/tools/ImportTransactionsClient'
import { ToolPageNav } from '@/components/tools/ToolPageNav'

export default function ImportTransactionsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <ToolPageNav />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Import transactions
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-zinc-600/85 dark:text-zinc-400/85">
        Upload a CSV with columns for date, description, and amount. Review the
        preview, then import valid rows into your account (category set to{' '}
        <span className="font-mono text-zinc-800 dark:text-zinc-200">
          Imported
        </span>
        ).
      </p>
      <ImportTransactionsClient />
    </div>
  )
}
