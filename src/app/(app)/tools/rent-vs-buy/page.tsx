import Link from 'next/link'
import { RentVsBuyClient } from '@/components/tools/RentVsBuyClient'

export default function RentVsBuyToolPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/tools"
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Financial Tools
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Rent vs Buy Calculator
      </h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Stack total rent over your stay against a simplified purchase cost
        (list price plus a 20% buffer). For education only—not tax, mortgage, or
        investment advice.
      </p>
      <RentVsBuyClient />
    </div>
  )
}
