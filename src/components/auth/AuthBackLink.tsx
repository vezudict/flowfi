import Link from 'next/link'
import { Home } from 'lucide-react'

export function AuthBackLink() {
  return (
    <Link
      href="/"
      className="group absolute left-4 top-4 z-10 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-500 outline-none transition-all duration-150 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <Home
        className="h-4 w-4 shrink-0 transition-transform duration-150 ease-out group-hover:scale-110"
        aria-hidden
      />
      <span>Back to home</span>
    </Link>
  )
}
