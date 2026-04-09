type SummaryCardProps = {
  title: string
  value: string
  hint?: string
  /** Appended to the main value line (e.g. category accent color). */
  valueClassName?: string
  /** When true, renders the value at reduced size/weight (secondary cards). */
  subdued?: boolean
}

export function SummaryCard({ title, value, hint, valueClassName, subdued }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-px hover:border-zinc-300 hover:shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <p
        className={`mt-2 tracking-tight tabular-nums ${
          subdued ? 'text-2xl font-medium' : 'text-3xl font-semibold'
        } ${valueClassName ?? 'text-zinc-900 dark:text-zinc-50'}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
      ) : null}
    </div>
  )
}
