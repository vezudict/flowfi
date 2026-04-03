'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useCurrency } from '@/contexts/currency-context'
import {
  SUPPORTED_CURRENCIES,
  type CurrencyDefinition,
  type SupportedCurrencyCode,
} from '@/lib/currencies'
import { formatCurrency } from '@/lib/format-currency'
import { toast } from 'sonner'

export function CurrencySelector() {
  const { currency: selected, setCurrency } = useCurrency()
  const [pending, setPending] = useState<SupportedCurrencyCode | null>(null)

  async function select(code: SupportedCurrencyCode) {
    if (code === selected) return
    setPending(code)
    try {
      await setCurrency(code)
      toast.success(`Display currency · ${code}`)
    } catch (e) {
      console.error(e)
      toast.error('Could not save currency')
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/40">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent dark:from-indigo-400/[0.04]" />
      <div className="relative">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Currency
        </h2>
        <p className="mt-1 text-xs text-zinc-500/80 dark:text-zinc-400/80">
          Amounts across your dashboard and tools update as you choose. Saved to your profile when
          signed in; otherwise kept on this device.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {SUPPORTED_CURRENCIES.map((c: CurrencyDefinition) => {
            const isActive = selected === c.code
            const preview = formatCurrency(c.sample, c.code)
            const busy = pending === c.code

            return (
              <button
                key={c.code}
                type="button"
                disabled={busy}
                onClick={() => void select(c.code)}
                className={[
                  'relative rounded-2xl border p-4 transition-all duration-150 ease-in-out',
                  'flex flex-col items-center justify-center gap-1.5 text-center',
                  'outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950',
                  'hover:scale-105 active:scale-[0.99]',
                  'disabled:pointer-events-none disabled:opacity-60',
                  isActive
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.35)] dark:border-indigo-400 dark:bg-indigo-500/15 dark:shadow-[0_0_0_1px_rgba(129,140,248,0.35)]'
                    : 'border-zinc-200/90 bg-white/90 hover:border-indigo-300/80 dark:border-zinc-700 dark:bg-zinc-950/80 dark:hover:border-indigo-500/40',
                ].join(' ')}
              >
                {isActive ? (
                  <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white dark:bg-indigo-500">
                    <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                  </span>
                ) : null}
                <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {c.symbol}
                </span>
                <span className="text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
                  {c.code}
                </span>
                <span className="mt-1 text-[11px] leading-tight text-zinc-400 dark:text-zinc-500">
                  {preview}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
