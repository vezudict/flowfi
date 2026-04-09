import { ImportTransactionsClient } from '@/components/tools/ImportTransactionsClient'

export default function ImportTransactionsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Import transactions
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-zinc-600/85 dark:text-zinc-400/85">
        Upload a bank statement CSV or PDF. CSV requires{' '}
        <span className="font-mono text-zinc-800 dark:text-zinc-200">date</span>,{' '}
        <span className="font-mono text-zinc-800 dark:text-zinc-200">description</span>, and{' '}
        <span className="font-mono text-zinc-800 dark:text-zinc-200">amount</span> columns — categories
        are inferred or read from an optional{' '}
        <span className="font-mono text-zinc-800 dark:text-zinc-200">category</span> column. PDF
        statements are parsed by AI and presented as an editable preview before import.
      </p>
      <ImportTransactionsClient />
    </div>
  )
}
