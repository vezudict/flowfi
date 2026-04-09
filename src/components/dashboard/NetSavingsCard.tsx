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
    <div
      className={`scale-[1.02] rounded-xl border p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 sm:p-6 ${
        positive
          ? 'border-emerald-200/70 bg-emerald-50/60 shadow-[0_0_16px_2px_rgba(16,185,129,0.08)] hover:shadow-[0_0_22px_4px_rgba(16,185,129,0.13)] dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:shadow-[0_0_16px_2px_rgba(16,185,129,0.06)] dark:hover:shadow-[0_0_22px_4px_rgba(16,185,129,0.10)]'
          : negative
            ? 'border-rose-200/70 bg-white/80 shadow-sm hover:shadow dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700'
            : 'border-zinc-200 bg-white/80 shadow-sm hover:border-zinc-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Net savings · this month
      </p>
      <p
        className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${valueClass}`}
      >
        {negative ? '−' : ''}
        {fmt}
      </p>
      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{monthLabel}</p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Income minus spending, this month.
      </p>
    </div>
  )
}
