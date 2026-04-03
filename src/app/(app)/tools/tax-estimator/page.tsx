import { TaxEstimatorClient } from '@/components/tools/TaxEstimatorClient'

export default function TaxEstimatorToolPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Tax Estimator
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-zinc-600/85 dark:text-zinc-400/85">
        Quick, illustrative estimate using a simple slab structure in Indian
        Rupees. Does not include cess, deductions, rebates, or real filing
        rules.
      </p>
      <TaxEstimatorClient />
    </div>
  )
}
