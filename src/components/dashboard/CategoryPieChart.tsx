'use client'

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
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
}

export function CategoryPieChart({ data, title }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:h-[320px] dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        <p className="mt-auto mb-auto text-center text-sm text-zinc-500 dark:text-zinc-400">
          No spending this month yet.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
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
                formatCurrency(typeof value === 'number' ? value : Number(value))
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
  )
}
