import Link from 'next/link'
import { TaxEstimatorClient } from '@/components/tools/TaxEstimatorClient'

export default function TaxEstimatorToolPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/tools"
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Financial Tools
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Tax Estimator
      </h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Quick, illustrative estimate using a simple slab structure in Indian
        Rupees. Does not include cess, deductions, rebates, or real filing
        rules.
      </p>
      <TaxEstimatorClient />
    </div>
  )
}
