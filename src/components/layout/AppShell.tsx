'use client'

import { AppNavbar } from './AppNavbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNavbar />
      <main className="flex-1">{children}</main>
    </div>
  )
}
