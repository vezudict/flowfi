import { Activity } from 'lucide-react'
import type { FinancialHealthResult } from '@/lib/financial-health-score'

type FinancialHealthCardProps = {
  result: FinancialHealthResult
}

export function FinancialHealthCard({ result }: FinancialHealthCardProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white/80 px-4 py-3.5 backdrop-blur-sm transition-all duration-200 sm:px-6 sm:py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
      {/* Inline header row */}
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Activity className="h-3.5 w-3.5" aria-hidden />
        </div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Financial Health Score
        </h2>
        <div className="ml-auto flex items-baseline gap-1.5">
          {result.score === null ? (
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-400 dark:text-zinc-500">
              —
            </span>
          ) : (
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
              {result.score}
            </span>
          )}
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {result.label}
          </span>
        </div>
      </div>

      {/* Explanation */}
      <p className="mt-2.5 pl-10 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {result.explanation}
      </p>
    </section>
  )
}
