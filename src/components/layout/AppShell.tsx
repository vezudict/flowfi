'use client'

import { useState } from 'react'
import { AppNav } from './AppNav'
import { Sidebar, SidebarNav } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar — fixed, out of flow */}
      <Sidebar />

      {/* Mobile backdrop — fades in/out with CSS transition */}
      <div
        aria-hidden
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-[280ms] lg:hidden ${
          sidebarOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Mobile drawer — slides in/out with iOS curve */}
      <aside
        aria-label="Navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200/80 bg-zinc-50/90 backdrop-blur-md transition-transform duration-[280ms] lg:hidden dark:border-zinc-800 dark:bg-black/90 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        <SidebarNav onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content — offset on desktop to clear fixed sidebar */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <AppNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
