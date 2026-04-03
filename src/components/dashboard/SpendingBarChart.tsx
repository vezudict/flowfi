'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/format-currency'

type SpendingBarChartProps = {
  data: { label: string; amount: number }[]
  title: string
}

const axisStyle = { fontSize: 11, fill: '#71717a' }

export function SpendingBarChart({ data, title }: SpendingBarChartProps) {
  const hasSpending = data.some((d) => d.amount > 0)

  if (!hasSpending) {
    return (
      <div className="flex h-[320px] flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        <p className="mt-auto mb-auto text-center text-sm text-zinc-500 dark:text-zinc-400">
          No daily spending recorded this month.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e4e4e7"
            />
            <XAxis
              dataKey="label"
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: '#e4e4e7' }}
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
                formatCurrency(typeof value === 'number' ? value : Number(value))
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
              fill="#18181b"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
