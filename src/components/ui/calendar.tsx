"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayButton,
  DayPicker,
  getDefaultClassNames,
  type DayProps,
  type WeekProps,
} from "react-day-picker"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Div-based grid for DayPicker v9. The default <table> layout fights Tailwind
 * flex utilities in our theme; a real `grid grid-cols-7` keeps 7 aligned columns.
 * Week-number mode is disabled — it needs 8 columns and is not used in Flowfi.
 */

function CalendarMonthGrid({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { className?: string }) {
  return (
    <div
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    />
  )
}

function CalendarWeekdays(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return (
    <div
      role="row"
      className={cn("grid w-full grid-cols-7 gap-1", className)}
      {...rest}
    />
  )
}

function CalendarWeekday({
  className,
  scope: _scope,
  ...rest
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <div
      role="columnheader"
      className={cn(
        "flex size-9 items-center justify-center p-0 text-[0.7rem] font-medium text-muted-foreground sm:text-xs",
        className,
      )}
      {...(rest as React.HTMLAttributes<HTMLDivElement>)}
    />
  )
}

function CalendarWeeks(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return (
    <div
      className={cn("flex w-full flex-col gap-1", className)}
      {...rest}
    />
  )
}

function CalendarWeek({ week: _week, className, ...rest }: WeekProps) {
  return (
    <div
      role="row"
      className={cn("grid w-full grid-cols-7 gap-1", className)}
      {...rest}
    />
  )
}

function CalendarDayCell({
  day: _day,
  modifiers: _modifiers,
  className,
  ...rest
}: DayProps) {
  return (
    <div
      role="gridcell"
      className={cn(
        "relative flex size-9 min-w-0 items-stretch justify-stretch p-0 sm:size-10",
        className,
      )}
      {...rest}
    />
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  showWeekNumber: _showWeekNumber,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "w-full max-w-full rounded-2xl bg-popover p-3 text-popover-foreground shadow-none",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn(
          "flex w-full flex-col gap-4 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn("flex w-full min-w-0 flex-col gap-3", defaultClassNames.month),
        month_grid: cn("w-full", defaultClassNames.month_grid),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 px-0.5",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-9 shrink-0 select-none rounded-lg border border-transparent p-0 hover:bg-muted dark:hover:bg-zinc-800",
          "aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-9 shrink-0 select-none rounded-lg border border-transparent p-0 hover:bg-muted dark:hover:bg-zinc-800",
          "aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-9 w-full items-center justify-center px-10",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-9 w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "has-focus:border-ring relative rounded-md border border-input shadow-xs has-focus:ring-[3px] has-focus:ring-ring/50",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "select-none text-center font-medium text-foreground",
          captionLayout === "label"
            ? "text-sm"
            : "flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        weekdays: cn(defaultClassNames.weekdays),
        weekday: cn(defaultClassNames.weekday),
        weeks: cn(defaultClassNames.weeks),
        week: cn(defaultClassNames.week),
        week_number_header: cn(
          "flex size-9 items-center justify-center",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "flex size-9 items-center justify-center text-xs text-muted-foreground",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day rounded-md [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day,
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start,
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "bg-muted/70 text-foreground data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-foreground/80 aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground opacity-45",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        MonthGrid: CalendarMonthGrid,
        Weekdays: CalendarWeekdays,
        Weekday: CalendarWeekday,
        Weeks: CalendarWeeks,
        Week: CalendarWeek,
        Day: CalendarDayCell,
        Root: ({ className, rootRef, ...rest }) => (
          <div
            data-slot="calendar"
            ref={rootRef}
            className={cn(className)}
            {...rest}
          />
        ),
        Chevron: ({ className, orientation, ...rest }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...rest} />
            )
          }
          if (orientation === "right") {
            return (
              <ChevronRightIcon className={cn("size-4", className)} {...rest} />
            )
          }
          return (
            <ChevronDownIcon className={cn("size-4", className)} {...rest} />
          )
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
      showWeekNumber={false}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "size-full min-h-0 min-w-0 rounded-md p-0 font-normal",
        "text-popover-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:hover:bg-primary/90",
        "data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground",
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground",
        "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-ring group-data-[focused=true]/day:ring-offset-2 group-data-[focused=true]/day:ring-offset-popover",
        "[&>span]:text-xs [&>span]:opacity-80",
        defaultClassNames.day_button,
        className,
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
