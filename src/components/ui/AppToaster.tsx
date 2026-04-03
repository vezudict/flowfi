'use client'

import { Toaster } from 'sonner'

/** Global toasts — top-right, minimal zinc chrome; respects `html.dark`. */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      offset={16}
      gap={8}
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'group toast !rounded-xl !border !border-zinc-200/90 !bg-white !text-zinc-900 !shadow-lg dark:!border-zinc-800 dark:!bg-zinc-950 dark:!text-zinc-50',
          title: '!text-sm !font-medium',
          description: '!text-xs !text-zinc-500 dark:!text-zinc-400',
          success:
            '!border-l-[3px] !border-l-emerald-600 dark:!border-l-emerald-500',
          error: '!border-l-[3px] !border-l-red-600 dark:!border-l-red-500',
          loading: '!border-l-[3px] !border-l-zinc-400 dark:!border-l-zinc-500',
          closeButton:
            '!text-zinc-400 hover:!bg-zinc-100 dark:hover:!bg-zinc-800 dark:hover:!text-zinc-200',
        },
      }}
    />
  )
}
