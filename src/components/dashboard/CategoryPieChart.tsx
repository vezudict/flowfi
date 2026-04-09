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
  emptyHeading?: string
  emptyDescription?: string
  /** Map raw segment `name` (analytics key) to display text — legend & tooltip. */
  formatSegmentLabel?: (name: string) => string
}

const cardShell =
  'rounded-xl border border-zinc-200 bg-white/80 p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-px hover:border-zinc-300 hover:shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700'

export function CategoryPieChart({
  data,
  title,
  currency,
  emptyHeading = 'No spending this month',
  emptyDescription = 'Category breakdown appears once you log expenses for the current month.',
  formatSegmentLabel = (name) => name,
}: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={`flex h-[260px] flex-col sm:h-[320px] ${cardShell}`}
      >
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        <div className="mx-auto mt-auto mb-auto flex max-w-[220px] flex-col items-center justify-center px-4 py-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
            <PieChartIcon className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {emptyHeading}
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
                labelFormatter={(label) => formatSegmentLabel(String(label))}
                contentStyle={{
                  borderRadius: '0.5rem',
                  border: '1px solid rgb(228 228 231)',
                  fontSize: '0.75rem',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }}
                formatter={(value) => (
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {formatSegmentLabel(String(value))}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
