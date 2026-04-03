type FinancialInsightsProps = {
  lines: string[]
}

export function FinancialInsights({ lines }: FinancialInsightsProps) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Financial insights
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Based on your logged transactions (this month vs last month).
      </p>
      {lines.length === 0 ? (
        <p className="mt-5 text-sm text-zinc-400 dark:text-zinc-500">
          Add transactions to see insights about your spending patterns.
        </p>
      ) : (
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500"
                aria-hidden
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
