'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/auth-context'
import { AppToaster } from '@/components/ui/AppToaster'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AppToaster />
    </AuthProvider>
  )
}
