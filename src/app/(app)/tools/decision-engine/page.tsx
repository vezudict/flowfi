import { DecisionEngineClient } from '@/components/tools/DecisionEngineClient'

export default function DecisionEngineToolPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Financial Decision Engine
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-zinc-600/85 dark:text-zinc-400/85">
        Enter a planned purchase and your monthly cash flow. We estimate whether
        the cost is a small, moderate, or large share of what you typically have
        left after spending.
      </p>
      <DecisionEngineClient />
    </div>
  )
}
