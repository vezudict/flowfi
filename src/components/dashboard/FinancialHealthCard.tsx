import { Activity } from 'lucide-react'
import type { FinancialHealthResult } from '@/lib/financial-health-score'

type FinancialHealthCardProps = {
  result: FinancialHealthResult
}

export function FinancialHealthCard({ result }: FinancialHealthCardProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white/80 p-4 backdrop-blur-sm transition-all duration-200 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Financial Health Score
          </h2>
          <p className="mt-1 max-w-xl text-xs text-zinc-500 dark:text-zinc-400">
            A 0–100 snapshot based on your budget usage and spending consistency.
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

      <div className="mt-4 flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3.5 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-300">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Activity className="h-4 w-4" aria-hidden />
        </div>
        <p>{result.explanation}</p>
      </div>
    </section>
  )
}
