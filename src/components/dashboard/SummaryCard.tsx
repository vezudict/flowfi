type SummaryCardProps = {
  title: string
  value: string
  hint?: string
  /** Appended to the main value line (e.g. category accent color). */
  valueClassName?: string
}

export function SummaryCard({ title, value, hint, valueClassName }: SummaryCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/90 p-4 shadow-sm transition-all duration-150 ease-in-out hover:scale-[1.01] hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950/90 dark:hover:shadow-zinc-950/80">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] to-transparent dark:from-indigo-400/[0.05]" />
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500/80 dark:text-zinc-400/90">
          {title}
        </p>
        <p
          className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${
            valueClassName ?? 'text-zinc-900 dark:text-zinc-50'
          }`}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-zinc-400/90 dark:text-zinc-500/90">{hint}</p>
        ) : null}
      </div>
    </div>
  )
}
