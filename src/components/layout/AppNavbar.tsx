'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { BrandLogoLink } from './BrandLogoLink'
import { ThemeToggle } from './ThemeToggle'

const APP_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tools', label: 'Tools' },
] as const

function linkActive(pathname: string, href: string) {
  if (href === '/tools') {
    return pathname === '/tools' || pathname.startsWith('/tools/')
  }
  return pathname === href
}

function navLinkClass(active: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
    active
      ? 'bg-zinc-200/80 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
  }`
}

export function AppNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      router.replace('/login')
    } finally {
      setSigningOut(false)
      setMobileOpen(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-zinc-50/90 px-4 backdrop-blur-md sm:px-6 lg:px-8 dark:border-zinc-800 dark:bg-black/85">
        <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex min-w-0 items-center gap-2 lg:justify-self-start">
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              className="rounded-lg p-2 text-zinc-500 transition-[transform,color] duration-150 hover:bg-zinc-200/80 hover:text-zinc-900 active:scale-[0.97] lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
            <BrandLogoLink
              className="text-sm font-semibold tracking-tight text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300"
              onClick={() => setMobileOpen(false)}
            />
          </div>

          <nav
            className="hidden items-center gap-0.5 lg:flex lg:justify-self-center"
            aria-label="Main"
          >
            {APP_LINKS.map(({ href, label }) => {
              const active = linkActive(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={navLinkClass(active)}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2 lg:justify-self-end">
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg p-2 text-zinc-500 transition-[transform,color,background-color] duration-150 hover:bg-zinc-200/80 hover:text-zinc-900 active:scale-[0.97] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${
                linkActive(pathname, '/settings') ? 'bg-zinc-200/80 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : ''
              }`}
              aria-label="Settings"
            >
              <IconSettings />
            </Link>
            <ThemeToggle />
            {user ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 transition-[transform,color] duration-150 hover:text-zinc-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {signingOut ? '…' : 'Sign out'}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-[280ms] lg:hidden ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        aria-label="Mobile navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200/80 bg-zinc-50/95 backdrop-blur-md transition-transform duration-[280ms] lg:hidden dark:border-zinc-800 dark:bg-zinc-950/95 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        <div className="flex h-14 items-center border-b border-zinc-200/80 px-4 dark:border-zinc-800">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Menu</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Main">
          {APP_LINKS.map(({ href, label }) => {
            const active = linkActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={navLinkClass(active)}
                aria-current={active ? 'page' : undefined}
              >
                {label}
              </Link>
            )
          })}
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={navLinkClass(linkActive(pathname, '/settings'))}
            aria-current={linkActive(pathname, '/settings') ? 'page' : undefined}
          >
            Settings
          </Link>
        </nav>
      </aside>
    </>
  )
}

function IconMenu() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
