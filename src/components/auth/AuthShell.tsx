import type { ReactNode } from 'react'

type AuthShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-8 space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
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
