'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  type SupportedCurrencyCode,
} from '@/lib/currencies'
import { authedFetch, readAuthedJson } from '@/lib/authed-api'
import { fetchPreferredCurrency } from '@/lib/profile-budget'

const STORAGE_KEY = 'flowfi-preferred-currency'

type CurrencyContextValue = {
  currency: SupportedCurrencyCode
  setCurrency: (next: SupportedCurrencyCode) => Promise<void>
  /** False until first auth + optional profile read completes */
  ready: boolean
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [currency, setCurrencyState] = useState<SupportedCurrencyCode>(DEFAULT_CURRENCY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw && isSupportedCurrency(raw)) setCurrencyState(raw)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setReady(true)
      return
    }

    let cancelled = false
    ;(async () => {
      const { data, error } = await fetchPreferredCurrency(user.id)
      if (cancelled) return
      if (error) {
        console.error('PROFILE FETCH ERROR', error)
      }
      if (!error && data?.preferred_currency && isSupportedCurrency(data.preferred_currency)) {
        setCurrencyState(data.preferred_currency)
        try {
          localStorage.setItem(STORAGE_KEY, data.preferred_currency)
        } catch {
          /* ignore */
        }
      }
      setReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  const setCurrency = useCallback(
    async (next: SupportedCurrencyCode) => {
      setCurrencyState(next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      if (user) {
        const res = await authedFetch('/api/profile/currency', {
          method: 'PATCH',
          json: { preferredCurrency: next },
        })
        const out = await readAuthedJson<{ ok: boolean }>(res)
        if (!out.ok) console.error('[currency] profile update:', out.message)
      }
    },
    [user],
  )

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, ready }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    throw new Error('useCurrency must be used within CurrencyProvider')
  }
  return ctx
}
