import type { SupportedCurrencyCode } from '@/lib/currencies'
import { formatCurrency } from '@/lib/format-currency'

type NetSavingsCardProps = {
  amount: number
  monthLabel: string
  currency: SupportedCurrencyCode
}

export function NetSavingsCard({ amount, monthLabel, currency }: NetSavingsCardProps) {
  const fmt = formatCurrency(Math.abs(amount), currency)
  const positive = amount > 0
  const negative = amount < 0
  const valueClass = negative
    ? 'text-rose-600 dark:text-rose-400'
    : positive
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-zinc-900 dark:text-zinc-50'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/90 p-4 shadow-sm transition-all duration-150 ease-in-out hover:scale-[1.01] hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950/90 dark:hover:shadow-zinc-950/80">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent ${
          positive
            ? 'from-emerald-500/[0.06] dark:from-emerald-400/[0.08]'
            : negative
              ? 'from-rose-500/[0.06] dark:from-rose-400/[0.08]'
              : 'from-indigo-500/[0.04] dark:from-indigo-400/[0.05]'
        }`}
      />
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500/80 dark:text-zinc-400/90">
          Net savings · this month
        </p>
        <p className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${valueClass}`}>
          {negative ? '−' : ''}
          {fmt}
        </p>
        <p className="mt-1 text-xs text-zinc-400/90 dark:text-zinc-500/90">{monthLabel}</p>
        <p className="mt-2 text-xs text-zinc-500/85 dark:text-zinc-400/85">
          Income (credits) minus spending (debits), same month.
        </p>
      </div>
    </div>
  )
}
