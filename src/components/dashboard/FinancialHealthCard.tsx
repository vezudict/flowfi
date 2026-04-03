import { Activity } from 'lucide-react'
import type { FinancialHealthResult } from '@/lib/financial-health-score'

type FinancialHealthCardProps = {
  result: FinancialHealthResult
}

export function FinancialHealthCard({ result }: FinancialHealthCardProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:scale-[1.01] hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/40 dark:hover:shadow-zinc-950/80">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent dark:from-emerald-400/[0.05]" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Financial Health Score
          </h2>
          <p className="mt-1 max-w-xl text-xs text-zinc-500/80 dark:text-zinc-400/80">
            A 0–100 snapshot from your budget (or month-over-month pace) and how steady your
            daily spending is this month.
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:items-end">
          {result.score === null ? (
            <span className="text-4xl font-semibold tabular-nums tracking-tight text-zinc-400 dark:text-zinc-500">
              —
            </span>
          ) : (
            <span className="text-4xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
              {result.score}
            </span>
          )}
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            {result.label}
          </span>
        </div>
      </div>

      <div className="relative mt-4 flex gap-3 rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3.5 text-sm leading-relaxed text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-300">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Activity className="h-4 w-4" aria-hidden />
        </div>
        <p>{result.explanation}</p>
      </div>
    </section>
  )
}
