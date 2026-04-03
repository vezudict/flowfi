import { CurrencySelector } from '@/components/settings/CurrencySelector'

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="text-sm text-zinc-500/80 dark:text-zinc-400/80">
          Account preferences and display options.
        </p>
      </header>

      <CurrencySelector />

      <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-gradient-to-br from-white via-white to-zinc-50/80 p-8 text-center shadow-sm dark:border-zinc-700 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50 sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent dark:from-indigo-400/[0.03]" />
        <p className="relative text-sm text-zinc-500/90 dark:text-zinc-400/85">
          More settings are on the way.
        </p>
      </div>
    </div>
  )
}
