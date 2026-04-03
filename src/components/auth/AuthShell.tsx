import type { ReactNode } from 'react'

type AuthShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-indigo-50/40 p-6 shadow-sm transition-shadow duration-150 ease-in-out dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-indigo-950/20 sm:p-8">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          ) : null}
        </div>
        {children}
        {footer ? (
          <div className="mt-6 border-t border-zinc-100 pt-6 dark:border-zinc-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
