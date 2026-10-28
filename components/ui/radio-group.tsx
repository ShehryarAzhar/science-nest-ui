"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cn } from "cn"

function RadioGroup<Value>({
  className,
  ...props
}: RadioGroupPrimitive.Props<Value>) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid w-full gap-3", className)}
      {...props}
    />
  )
}

// The dot on its own; RadioCard draws the same dot inside a card
function RadioGroupItem<Value>({
  className,
  ...props
}: RadioPrimitive.Root.Props<Value>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "group/radio relative flex size-4 shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioDot />
    </RadioPrimitive.Root>
  )
}

function RadioDot() {
  return (
    <span
      aria-hidden
      className="relative flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-card transition-colors group-data-checked/radio:border-primary group-data-checked/radio:bg-primary motion-reduce:transition-none"
    >
      <RadioPrimitive.Indicator className="size-1.5 rounded-full bg-primary-foreground" />
    </span>
  )
}

// A whole card as one radio (CLAUDE.md › Design): surface and border, a
// primary border on hover, and when checked a primary border, the accent
// tint and a filled dot, so the choice never shows by colour alone
function RadioCard<Value>({
  className,
  children,
  ...props
}: RadioPrimitive.Root.Props<Value>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-card"
      className={cn(
        "group/radio flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-3 text-left transition-colors outline-none hover:border-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-secondary data-checked:text-secondary-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:border-border data-checked:data-disabled:hover:border-primary motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      <span className="flex h-[1.6em] items-center">
        <RadioDot />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">{children}</span>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem, RadioCard }
