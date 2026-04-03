import Link from 'next/link'

type ToolPageNavProps = {
  /** Show link to /tools after Home (hide on the tools index page). */
  showToolsIndex?: boolean
}

/** Subtle top-of-page links for tool routes — matches app zinc palette. */
export function ToolPageNav({ showToolsIndex = true }: ToolPageNavProps) {
  return (
    <nav
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 sm:text-sm dark:text-zinc-500"
      aria-label="Page navigation"
    >
      <Link
        href="/"
        className="rounded-md transition-colors hover:text-zinc-800 dark:hover:text-zinc-300"
      >
        ← Home
      </Link>
      {showToolsIndex ? (
        <>
          <span
            className="select-none text-zinc-300 dark:text-zinc-600"
            aria-hidden
          >
            ·
          </span>
          <Link
            href="/tools"
            className="rounded-md transition-colors hover:text-zinc-800 dark:hover:text-zinc-300"
          >
            Financial Tools
          </Link>
        </>
      ) : null}
    </nav>
  )
}
