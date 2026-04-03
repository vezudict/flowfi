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
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <ToolPageNav showToolsIndex={false} />
      <header className="mt-4 max-w-2xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Financial Tools
        </h1>
        <p className="text-sm text-zinc-500/80 dark:text-zinc-400/80">
          Calculators and simulators to support better money decisions.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:scale-[1.01] hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/40 dark:hover:shadow-zinc-900/60"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
              <div className="relative flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {tool.title}
                </h2>
                <span
                  className="mt-0.5 shrink-0 text-zinc-300 transition-[transform,color] duration-150 group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-zinc-600 dark:group-hover:text-indigo-400"
                  aria-hidden
                >
                  →
                </span>
              </div>
              <p className="relative mt-2 flex-1 text-sm leading-relaxed text-zinc-500/90 dark:text-zinc-400/85">
                {tool.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
