'use client'

import * as React from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
            'h-auto min-h-10 w-full justify-start gap-2 rounded-xl border-input bg-background px-3 py-2 text-left text-sm font-normal text-foreground shadow-sm hover:bg-muted/50',
            'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="truncate">
            {selected ? format(selected, 'MMM d, yyyy') : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={10} className="p-0">
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
          className="rounded-2xl border-0 bg-transparent"
        />
      </PopoverContent>
    </Popover>
  )
}
