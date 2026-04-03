'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogoLink } from '@/components/layout/BrandLogoLink'
import { useAuth } from '@/contexts/auth-context'
import { useCallback, useEffect, useState } from 'react'

function scrollToSection(id: string) {
  if (typeof document === 'undefined') return
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function LandingNavbar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (pathname !== '/') return
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
    if (hash === 'features' || hash === 'tools') {
      const t = window.setTimeout(() => scrollToSection(hash), 100)
      return () => window.clearTimeout(t)
    }
  }, [pathname])

  const onSectionClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      if (pathname === '/') {
        const el = typeof document !== 'undefined' ? document.getElementById(id) : null
        if (el) {
          e.preventDefault()
          scrollToSection(id)
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `#${id}`)
          }
        }
      }
      setMobileOpen(false)
    },
    [pathname],
  )

  return (
    <>
      <header className="relative sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4">
          <BrandLogoLink
            className="text-sm tracking-tight text-zinc-50 transition-colors hover:text-white"
            onLogoActivate={() => setMobileOpen(false)}
          />

          <nav
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex"
            aria-label="On this page"
          >
            <Link
              href="/#features"
              onClick={(e) => onSectionClick(e, 'features')}
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Features
            </Link>
            <Link
              href="/#tools"
              onClick={(e) => onSectionClick(e, 'tools')}
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Tools
            </Link>
            <Link
              href="/guide"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Guide
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 transition-[transform,background-color] duration-150 hover:bg-zinc-100 active:scale-[0.97]"
              onClick={() => setMobileOpen(false)}
            >
              {user ? 'Go to Dashboard' : 'Get Started'}
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="rounded-lg p-2 text-zinc-400 transition-[transform,color] duration-150 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.97] md:hidden"
            >
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </header>

      <div
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 md:hidden ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <nav
        aria-label="Mobile sections"
        className={`fixed inset-x-0 top-14 z-40 border-b border-zinc-800 bg-zinc-950/95 px-4 py-4 backdrop-blur-md transition-[transform,opacity] duration-200 ease-out md:hidden ${
          mobileOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none'
        }`}
      >
        <ul className="flex flex-col gap-1">
          <li>
            <Link
              href="/#features"
              onClick={(e) => onSectionClick(e, 'features')}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800/80"
            >
              Features
            </Link>
          </li>
          <li>
            <Link
              href="/#tools"
              onClick={(e) => onSectionClick(e, 'tools')}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800/80"
            >
              Tools
            </Link>
          </li>
          <li>
            <Link
              href="/guide"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800/80"
            >
              Guide
            </Link>
          </li>
        </ul>
      </nav>
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
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
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
