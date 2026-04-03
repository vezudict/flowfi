'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tools', label: 'Tools' },
] as const

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      router.replace('/login')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-zinc-50/90 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="mr-3 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Flowfi
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            {links.map(({ href, label }) => {
              const active =
                href === '/tools'
                  ? pathname === '/tools' || pathname.startsWith('/tools/')
                  : pathname === '/dashboard'
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                    active
                      ? 'bg-zinc-200/80 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        {user ? (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-[transform,color] duration-150 hover:text-zinc-900 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        ) : null}
      </div>
    </header>
  )
}
