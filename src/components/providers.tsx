'use client'

import type { ReactNode } from 'react'
import { SessionIdleTracker } from '@/components/session/SessionIdleTracker'
import { AuthProvider } from '@/contexts/auth-context'
import { CurrencyProvider } from '@/contexts/currency-context'
import { AppToaster } from '@/components/ui/AppToaster'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SessionIdleTracker />
      <CurrencyProvider>
        {children}
        <AppToaster />
      </CurrencyProvider>
    </AuthProvider>
  )
}
