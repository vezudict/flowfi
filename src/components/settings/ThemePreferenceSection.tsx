'use client'

import { useEffect, useState } from 'react'
import { Check, Laptop, Moon, Sun } from 'lucide-react'
import {
  applyThemePreference,
  readThemePreference,
  resolveEffectiveDark,
  type ThemePreference,
} from '@/lib/theme-preference'

const options: {
  value: ThemePreference
  label: string
  hint: string
  icon: typeof Sun
}[] = [
  {
    value: 'light',
    label: 'Light',
    hint: 'Always use light appearance.',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    hint: 'Always use dark appearance.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'Auto',
    hint: 'Match this device’s setting.',
    icon: Laptop,
  },
]

export function ThemePreferenceSection() {
  const [preference, setPreference] = useState<ThemePreference>('system')

  useEffect(() => {
    setPreference(readThemePreference())
  }, [])

  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      document.documentElement.classList.toggle('dark', mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [preference])

  function select(next: ThemePreference) {
    applyThemePreference(next)
    setPreference(next)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map(({ value, label, hint, icon: Icon }) => {
          const active = preference === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => select(value)}
              className={[
                'relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-150 ease-in-out',
                'outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950',
                'hover:scale-[1.02] active:scale-[0.99]',
                active
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.35)] dark:border-indigo-400 dark:bg-indigo-500/15 dark:shadow-[0_0_0_1px_rgba(129,140,248,0.35)]'
                  : 'border-zinc-200/90 bg-white/90 hover:border-indigo-300/80 dark:border-zinc-700 dark:bg-zinc-950/80 dark:hover:border-indigo-500/40',
              ].join(' ')}
            >
              {active ? (
                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white dark:bg-indigo-500">
                  <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                </span>
              ) : null}
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{label}</span>
              <span className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">{hint}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Active now:{' '}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {resolveEffectiveDark(preference) ? 'Dark' : 'Light'}
        </span>
        {preference === 'system' ? <span> (from device)</span> : null}
      </p>
    </div>
  )
}
