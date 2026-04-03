import Link from 'next/link'

type ToolPageShellProps = {
  title: string
  description: string
}

export function ToolPageShell({ title, description }: ToolPageShellProps) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/tools"
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Financial Tools
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
      <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
        Tool workspace — logic coming soon.
      </div>
    </div>
  )
}
