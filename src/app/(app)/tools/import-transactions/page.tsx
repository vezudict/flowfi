import { ImportTransactionsClient } from '@/components/tools/ImportTransactionsClient'

export default function ImportTransactionsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Import transactions
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-zinc-600/85 dark:text-zinc-400/85">
        Upload a CSV with <span className="font-mono text-zinc-800 dark:text-zinc-200">date</span>,{' '}
        <span className="font-mono text-zinc-800 dark:text-zinc-200">description</span>, and{' '}
        <span className="font-mono text-zinc-800 dark:text-zinc-200">amount</span>. Categories are
        inferred from the description (e.g. Swiggy → Food), or taken from an optional{' '}
        <span className="font-mono text-zinc-800 dark:text-zinc-200">category</span> column when valid;
        otherwise they default to Other. Review the preview, then import. You can also upload a bank
        statement PDF to extract raw text (experimental).
      </p>
      <ImportTransactionsClient />
    </div>
  )
}
