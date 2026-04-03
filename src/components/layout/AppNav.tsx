'use client'

import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'

type AppNavProps = {
  onMenuClick: () => void
}

/** Mobile-only top bar. Hidden on lg+ (sidebar takes over). */
export function AppNav({ onMenuClick }: AppNavProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-zinc-50/90 px-4 backdrop-blur-md lg:hidden dark:border-zinc-800 dark:bg-black/80">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-zinc-500 transition-[transform,color] duration-150 hover:text-zinc-900 active:scale-[0.97] dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <MenuIcon />
        </button>
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Flowfi
        </Link>
      </div>
      <ThemeToggle />
    </header>
  )
}

function MenuIcon() {
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
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
