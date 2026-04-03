'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/auth-context'
import { CurrencyProvider } from '@/contexts/currency-context'
import { AppToaster } from '@/components/ui/AppToaster'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        {children}
        <AppToaster />
      </CurrencyProvider>
    </AuthProvider>
  )
}
