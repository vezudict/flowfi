type SummaryCardProps = {
  title: string
  value: string
  hint?: string
}

export function SummaryCard({ title, value, hint }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-shadow duration-150 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
      ) : null}
    </div>
  )
}
