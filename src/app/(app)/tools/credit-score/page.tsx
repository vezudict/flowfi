import { CreditScoreSimClient } from '@/components/tools/CreditScoreSimClient'

export default function CreditScoreToolPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Credit Score Simulator
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-zinc-600/85 dark:text-zinc-400/85">
        Play with a weighted toy formula to see how stronger payments,
        lower utilization, age, and mix might nudge a{' '}
        <strong>synthetic</strong> score—this is <strong>not</strong> a real
        credit bureau calculation.
      </p>
      <CreditScoreSimClient />
    </div>
  )
}
