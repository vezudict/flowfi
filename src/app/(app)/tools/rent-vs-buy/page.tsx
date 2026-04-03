import { RentVsBuyClient } from '@/components/tools/RentVsBuyClient'

export default function RentVsBuyToolPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Rent vs Buy Calculator
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-zinc-600/85 dark:text-zinc-400/85">
        Stack total rent over your stay against a simplified purchase cost
        (list price plus a 20% buffer). For education only—not tax, mortgage, or
        investment advice.
      </p>
      <RentVsBuyClient />
    </div>
  )
}
