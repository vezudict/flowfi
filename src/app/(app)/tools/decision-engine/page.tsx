import { DecisionEngineClient } from '@/components/tools/DecisionEngineClient'

export default function DecisionEngineToolPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Financial Decision Engine
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-zinc-500/85 dark:text-zinc-400/85">
          Ask anything — rent, buy, spend, invest — and get an AI verdict based on your actual finances.
        </p>
      </header>
      <DecisionEngineClient />
    </div>
  )
}
