'use client'

import { PieChartIcon } from 'lucide-react'
import Link from 'next/link'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { SupportedCurrencyCode } from '@/lib/currencies'
import { formatCurrency } from '@/lib/format-currency'

const COLORS = [
  '#18181b',
  '#3f3f46',
  '#52525b',
  '#71717a',
  '#a1a1aa',
  '#d4d4d8',
]

type CategoryPieChartProps = {
  data: { name: string; value: number }[]
  title: string
  currency: SupportedCurrencyCode
}

const cardShell =
  'relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/90 p-4 shadow-sm transition-all duration-150 ease-in-out hover:scale-[1.01] hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950/90 dark:hover:shadow-zinc-950/80'

export function CategoryPieChart({ data, title, currency }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={`flex h-[260px] flex-col sm:h-[320px] ${cardShell}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent dark:from-indigo-400/[0.04]" />
        <h3 className="relative text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        <div className="relative mx-auto mt-auto mb-auto flex max-w-[220px] flex-col items-center justify-center px-4 py-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
            <PieChartIcon className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            No spending this month
          </p>
          <p className="mt-2 text-sm text-zinc-500/90 dark:text-zinc-400/85">
            Category breakdown appears once you log expenses for the current month.
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
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={88}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  formatCurrency(
                    typeof value === 'number' ? value : Number(value),
                    currency,
                  )
                }
                contentStyle={{
                  borderRadius: '0.5rem',
                  border: '1px solid rgb(228 228 231)',
                  fontSize: '0.75rem',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }}
                formatter={(value) => (
                  <span className="text-zinc-600 dark:text-zinc-400">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
