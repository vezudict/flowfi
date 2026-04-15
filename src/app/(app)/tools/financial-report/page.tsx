import { FinancialReportClient } from '@/components/tools/FinancialReportClient'

export default function FinancialReportPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Financial Report
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-zinc-500/85 dark:text-zinc-400/85">
          Generate a complete monthly financial summary using AI — spending analysis, income trends, risks, and actionable recommendations.
        </p>
      </header>
      <FinancialReportClient />
    </div>
  )
}
