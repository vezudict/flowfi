'use client'

import { useCallback, useEffect, useState } from 'react'
import { CurrencySelector } from '@/components/settings/CurrencySelector'
import { ThemePreferenceSection } from '@/components/settings/ThemePreferenceSection'

export type SettingsSectionId = 'appearance' | 'currency' | 'security' | 'notifications'

const NAV: {
  id: SettingsSectionId
  label: string
  disabled?: boolean
  soon?: boolean
}[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'currency', label: 'Currency' },
  { id: 'security', label: 'Security', disabled: true, soon: true },
  { id: 'notifications', label: 'Notifications', disabled: true, soon: true },
]

function isSectionId(v: string): v is SettingsSectionId {
  return v === 'appearance' || v === 'currency' || v === 'security' || v === 'notifications'
}

const sectionTitle: Record<SettingsSectionId, { heading: string; description: string }> = {
  appearance: {
    heading: 'Appearance',
    description: 'Choose how FlowFi looks on this device.',
  },
  currency: {
    heading: 'Currency',
    description: 'Display amounts in your preferred currency.',
  },
  security: {
    heading: 'Security',
    description: '',
  },
  notifications: {
    heading: 'Notifications',
    description: '',
  },
}

export function SettingsShell() {
  const [active, setActive] = useState<SettingsSectionId>('appearance')

  const syncFromHash = useCallback(() => {
    const h = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
    if (h && isSectionId(h)) {
      const item = NAV.find((n) => n.id === h)
      if (item && !item.disabled) setActive(item.id)
    }
  }, [])

  useEffect(() => {
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [syncFromHash])

  function goTo(id: SettingsSectionId) {
    const item = NAV.find((n) => n.id === id)
    if (item?.disabled) return
    setActive(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:max-w-4xl lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="text-sm text-zinc-500/80 dark:text-zinc-400/80">
          Preferences for this device and your account.
        </p>
      </header>

      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
        <aside className="shrink-0 md:w-44 lg:w-52">
          <nav
            className="flex flex-row gap-1 overflow-x-auto pb-1 md:flex-col md:gap-0.5 md:overflow-visible md:pb-0 md:border-r md:border-zinc-200/80 md:pr-3 dark:md:border-zinc-800"
            aria-label="Settings sections"
          >
            {NAV.map((item) => {
              const isActive = active === item.id
              if (item.disabled) {
                return (
                  <div
                    key={item.id}
                    className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-400 dark:text-zinc-500"
                    title="Coming soon"
                  >
                    <span>{item.label}</span>
                    {item.soon ? (
                      <span className="rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        Soon
                      </span>
                    ) : null}
                  </div>
                )
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.id)}
                  className={[
                    'shrink-0 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
                    isActive
                      ? 'bg-indigo-100 text-indigo-800 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)] dark:bg-indigo-500/20 dark:text-indigo-200'
                      : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="h-px w-full bg-zinc-200/90 md:hidden dark:bg-zinc-800" aria-hidden />

        <div className="min-w-0 flex-1 space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {sectionTitle[active].heading}
            </h2>
            {sectionTitle[active].description ? (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {sectionTitle[active].description}
              </p>
            ) : null}
          </div>

          {active === 'appearance' ? <ThemePreferenceSection /> : null}

          {active === 'currency' ? (
            <div>
              <CurrencySelector showHeading={false} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
