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
}

const axisStyle = { fontSize: 11, fill: '#71717a' }

const cardShell =
  'relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/90 p-4 shadow-sm transition-all duration-150 ease-in-out hover:scale-[1.01] hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950/90 dark:hover:shadow-zinc-950/80'

export function SpendingBarChart({ data, title, currency }: SpendingBarChartProps) {
  const hasSpending = data.some((d) => d.amount > 0)

  if (!hasSpending) {
    return (
      <div
        className={`flex h-[260px] flex-col sm:h-[320px] ${cardShell}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent dark:from-indigo-400/[0.04]" />
        <h3 className="relative text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        <div className="relative mx-auto mt-auto mb-auto flex max-w-[240px] flex-col items-center justify-center px-4 py-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
            <BarChart3 className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            No daily totals yet
          </p>
          <p className="mt-2 text-sm text-zinc-500/90 dark:text-zinc-400/85">
            Spending by day charts itself after you add transactions dated this month.
          </p>
          <Link
            href="#add-transaction"
            className="mt-4 inline-flex rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all duration-150 ease-in-out hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Add transaction
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`${cardShell}`}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent dark:from-indigo-400/[0.04]" />
      <div className="relative">
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
                fill="#6366f1"
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
