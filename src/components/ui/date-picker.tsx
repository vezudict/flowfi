'use client'

import * as React from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type DatePickerInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function isoToDate(iso: string): Date | undefined {
  if (!iso.trim()) return undefined
  const d = parseISO(iso)
  return isValid(d) ? d : undefined
}

export function DatePickerInput({
  id,
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false)
  const selected = isoToDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-auto min-h-10 w-full justify-start rounded-xl border-zinc-300 bg-white px-3 py-2 text-left text-sm font-normal text-zinc-900 shadow-none hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800/80',
            'focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/25 dark:focus-visible:border-indigo-400 dark:focus-visible:ring-indigo-400/30',
            !value && 'text-zinc-500 dark:text-zinc-500',
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" aria-hidden />
          {selected ? format(selected, 'MMM d, yyyy') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden rounded-2xl border border-zinc-200 p-0 shadow-lg dark:border-zinc-800"
        align="start"
        sideOffset={6}
      >
        <Calendar
          mode="single"
          selected={selected}
          captionLayout="label"
          defaultMonth={selected}
          onSelect={(d) => {
            onChange(d ? format(d, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
          initialFocus
          className="rounded-2xl"
        />
      </PopoverContent>
    </Popover>
  )
}
