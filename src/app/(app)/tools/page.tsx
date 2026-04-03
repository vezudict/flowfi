import Link from 'next/link'

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
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Financial Tools
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Calculators and simulators to support better money decisions.
        </p>
      </header>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2">
        {tools.map((tool) => (
          <li key={tool.href}>
            <article className="flex h-full flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {tool.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {tool.description}
              </p>
              <Link
                href={tool.href}
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-[0.97] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:w-auto sm:self-start sm:px-5"
              >
                Open Tool
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </div>
  )
}
