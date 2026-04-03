import Link from 'next/link'
import { ToolPageNav } from '@/components/tools/ToolPageNav'

const tools = [
  {
    title: 'Credit Score Simulator',
    description:
      'Model how different actions might affect your credit score over time.',
    href: '/tools/credit-score',
  },
  {
    title: 'Tax Estimator',
    description:
      'Rough projections for income taxes before you file — useful for planning.',
    href: '/tools/tax-estimator',
  },
  {
    title: 'Financial Decision Engine',
    description:
      'Compare options side by side so you can choose with clearer tradeoffs.',
    href: '/tools/decision-engine',
  },
  {
    title: 'Rent vs Buy Calculator',
    description:
      'Estimate whether renting or buying fits your horizon and cash flow.',
    href: '/tools/rent-vs-buy',
  },
  {
    title: 'Import transactions',
    description:
      'Upload a CSV and add rows to your ledger after a quick preview.',
    href: '/tools/import-transactions',
  },
] as const

export default function ToolsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <ToolPageNav showToolsIndex={false} />
      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Financial Tools
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Calculators and simulators to support better money decisions.
        </p>
      </header>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="group flex h-full flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:shadow-zinc-900/60"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {tool.title}
                </h2>
                <span
                  className="mt-0.5 shrink-0 text-zinc-300 transition-[transform,color] duration-150 group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400"
                  aria-hidden
                >
                  →
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {tool.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
