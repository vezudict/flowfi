'use client'

import { BarChart3 } from 'lucide-react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SupportedCurrencyCode } from '@/lib/currencies'
import { formatCurrency } from '@/lib/format-currency'

type SpendingBarChartProps = {
  data: { label: string; amount: number }[]
  title: string
  currency: SupportedCurrencyCode
  /** Bar fill (spending vs income). */
  variant?: 'spending' | 'income'
  emptyTitle?: string
  emptyDescription?: string
}

const axisStyle = { fontSize: 11, fill: '#71717a' }

const cardShell =
  'rounded-xl border border-zinc-200 bg-white/80 p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-px hover:border-zinc-300 hover:shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700'

export function SpendingBarChart({
  data,
  title,
  currency,
  variant = 'spending',
  emptyTitle = 'No daily totals yet',
  emptyDescription = 'Spending by day charts itself after you add transactions dated this month.',
}: SpendingBarChartProps) {
  const barFill = variant === 'income' ? '#10b981' : '#6366f1'
  const hasSpending = data.some((d) => d.amount > 0)

  if (!hasSpending) {
    return (
      <div
        className={`flex h-[260px] flex-col sm:h-[320px] ${cardShell}`}
      >
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        <div className="mx-auto mt-auto mb-auto flex max-w-[240px] flex-col items-center justify-center px-4 py-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
            <BarChart3 className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {emptyTitle}
          </p>
          <p className="mt-2 text-sm text-zinc-500/90 dark:text-zinc-400/85">
            {emptyDescription}
          </p>
          <Link
            href="#add-transaction"
            className="mt-4 inline-flex rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all duration-150 ease-in-out hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Add transaction
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`${cardShell}`}>
      <div>
        <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        <div className="h-[220px] w-full sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--chart-grid)"
              />
              <XAxis
                dataKey="label"
                tick={axisStyle}
                tickLine={false}
                axisLine={{ stroke: 'var(--chart-grid)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  new Intl.NumberFormat(undefined, {
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(Number(v))
                }
                width={36}
              />
              <Tooltip
                formatter={(value) =>
                  formatCurrency(
                    typeof value === 'number' ? value : Number(value),
                    currency,
                  )
                }
                labelFormatter={(_, payload) =>
                  String(payload?.[0]?.payload?.label ?? '')
                }
                contentStyle={{
                  borderRadius: '0.5rem',
                  border: '1px solid rgb(228 228 231)',
                  fontSize: '0.75rem',
                }}
              />
              <Bar
                dataKey="amount"
                fill={barFill}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
