import { Lightbulb } from 'lucide-react'
import Link from 'next/link'
import type { SpendingInsight } from '@/lib/spending-insights'

type FinancialInsightsProps = {
  savingsInsights: SpendingInsight[]
  expenseInsights: SpendingInsight[]
  incomeInsights: SpendingInsight[]
  recurringInsights: SpendingInsight[]
  aiLoading?: boolean
}

function InsightSection({
  title,
  insights,
}: {
  title: string
  insights: SpendingInsight[]
}) {
  if (insights.length === 0) return null
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <ul className="mt-3 space-y-2.5" role="list">
        {insights.map((insight) => (
          <li key={insight.id}>
            <div className="rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3.5 text-sm leading-relaxed text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-300">
              {insight.text}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function FinancialInsights({
  savingsInsights,
  expenseInsights,
  incomeInsights,
  recurringInsights,
  aiLoading = false,
}: FinancialInsightsProps) {
  const total =
    savingsInsights.length +
    expenseInsights.length +
    incomeInsights.length +
    recurringInsights.length

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:scale-[1.01] hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/40 dark:hover:shadow-zinc-950/80">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent dark:from-indigo-400/[0.04]" />
      <div className="relative">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Financial insights
        </h2>
        <p className="mt-1 text-xs text-zinc-500/80 dark:text-zinc-400/80">
          Spending uses debits only (category “income” excluded). Income uses credits. Savings = income
          minus expenses.
        </p>
        {total === 0 ? (
          <div className="mx-auto mt-6 flex max-w-sm flex-col items-center justify-center px-4 py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <Lightbulb className="h-5 w-5" aria-hidden />
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              No insights yet
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500/90 dark:text-zinc-400/85">
              Add debits for spending and credits for income to see savings, spending, and income insights.
            </p>
            <Link
              href="#add-transaction"
              className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Add transaction
            </Link>
          </div>
        ) : (
          <div className="mt-2">
            <InsightSection title="Savings" insights={savingsInsights} />
            {aiLoading ? (
              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Spending
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {[80, 64, 72].map((w) => (
                    <li key={w}>
                      <div className="rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
                        <div className={`h-3.5 w-${w} animate-pulse rounded bg-zinc-200 dark:bg-zinc-700`} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <InsightSection title="Spending" insights={expenseInsights} />
            )}
            <InsightSection title="Income" insights={incomeInsights} />
            <InsightSection title="Recurring" insights={recurringInsights} />
          </div>
        )}
      </div>
    </section>
  )
}
