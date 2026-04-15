import Link from 'next/link'
import { BarChart2, Calculator, FileInput, GitCompare, Home, FileText } from 'lucide-react'

const aiTools = [
  {
    title: 'Financial Decision Engine',
    description: 'Ask anything about spending, buying, or financial choices — get an AI verdict based on your actual transactions.',
    href: '/tools/decision-engine',
    Icon: GitCompare,
  },
  {
    title: 'Financial Report',
    description: 'Generate a complete monthly financial summary using AI — spending, income trends, risks, and recommendations.',
    href: '/tools/financial-report',
    Icon: FileText,
  },
] as const

const simulators = [
  {
    title: 'Credit Score Simulator',
    description: 'Simulate how utilization, payments, inquiries, and credit mix affect your score in real time.',
    href: '/tools/credit-score',
    Icon: BarChart2,
  },
  {
    title: 'Tax Estimator',
    description: 'Estimate income tax with slab breakdowns, 80C/HRA deductions, and AI optimization tips.',
    href: '/tools/tax-estimator',
    Icon: Calculator,
  },
] as const

const dataTools = [
  {
    title: 'Import Transactions',
    description: 'Upload a CSV and add rows to your ledger after a quick preview.',
    href: '/tools/import-transactions',
    Icon: FileInput,
  },
  {
    title: 'Rent vs Buy',
    description: 'Estimate whether renting or buying fits your time horizon and cash flow.',
    href: '/tools/rent-vs-buy',
    Icon: Home,
  },
] as const

type Tool = { title: string; description: string; href: string; Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <li>
      <Link
        href={tool.href}
        className="group relative flex h-full min-h-[130px] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/80 p-5 shadow-sm transition-all duration-150 ease-in-out hover:scale-[1.015] hover:shadow-lg sm:p-5 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/40 dark:hover:shadow-zinc-900/60"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <tool.Icon className="h-4 w-4" aria-hidden />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{tool.title}</h2>
          </div>
          <span
            className="mt-0.5 shrink-0 text-zinc-300 transition-[transform,color] duration-150 group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-zinc-600 dark:group-hover:text-indigo-400"
            aria-hidden
          >
            →
          </span>
        </div>
        <p className="relative mt-2.5 flex-1 text-xs leading-relaxed text-zinc-500/90 dark:text-zinc-400/85">
          {tool.description}
        </p>
      </Link>
    </li>
  )
}

function ToolSection({
  label,
  badge,
  tools,
}: {
  label: string
  badge?: string
  tools: readonly Tool[]
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {label}
        </h2>
        {badge && (
          <span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
            {badge}
          </span>
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <ToolCard key={tool.href} tool={tool} />
        ))}
      </ul>
    </section>
  )
}

export default function ToolsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="max-w-2xl space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Financial Tools
        </h1>
        <p className="text-sm text-zinc-500/80 dark:text-zinc-400/80">
          Simulators, calculators, and AI-powered analysis — all connected to your data.
        </p>
      </header>

      <div className="space-y-8">
        <ToolSection label="AI Tools" badge="AI" tools={aiTools} />
        <ToolSection label="Simulators" tools={simulators} />
        <ToolSection label="Data" tools={dataTools} />
      </div>
    </div>
  )
}
