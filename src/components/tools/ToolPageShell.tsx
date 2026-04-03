import { ToolPageNav } from './ToolPageNav'

type ToolPageShellProps = {
  title: string
  description: string
}

export function ToolPageShell({ title, description }: ToolPageShellProps) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <ToolPageNav />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-zinc-600/85 dark:text-zinc-400/85">
        {description}
      </p>
      <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
        Tool workspace — logic coming soon.
      </div>
    </div>
  )
}
