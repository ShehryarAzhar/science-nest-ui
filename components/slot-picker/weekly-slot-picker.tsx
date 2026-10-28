"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { GlobeIcon } from "lucide-react"

import type { WeeklySlotLookup } from "@/lib/availability"
import {
  getBrowserTimeZone,
  weeklySlotGrid,
  weeklyTimeZoneNote,
  type WeeklySlotUtc,
} from "@/lib/time-zone"
import { cn } from "@/lib/utils"
import { WeeklyDayTabs, type SlotGroupProps } from "./weekly-day-tabs"
import { buildWeeklyLayout, slotKey } from "./weekly-slots"

// Spec 23. A controlled picker for a weekly class's UTC weekday + hour,
// shown in the student's local time. It never fetches: the page owns
// useWeeklyAvailability() (spec 22), passes its lookup in, and handles the
// query's 403 and other errors itself

export type WeeklySlotPickerProps = {
  value: WeeklySlotUtc | null
  // null when a refetch takes the selected slot
  onChange: (slot: WeeklySlotUtc | null) => void
  // useWeeklyAvailability()'s slotAvailability; null while it loads
  slotAvailability: WeeklySlotLookup | null
  disabled?: boolean
  id?: string
  className?: string
} & Omit<SlotGroupProps, "aria-disabled">

const subscribe = () => () => {}

export function WeeklySlotPicker({
  value,
  onChange,
  slotAvailability,
  disabled = false,
  id,
  className,
  ...groupProps
}: WeeklySlotPickerProps) {
  // null on the server and the first client render, so the prerendered HTML
  // never holds the server's local times
  const timeZone = useSyncExternalStore(
    subscribe,
    getBrowserTimeZone,
    () => null,
  )

  // A slot that a refetch shows as taken (or as another of the student's
  // bookings) can't stay selected; the form shows the notice (spec 25)
  useEffect(() => {
    if (!value || !slotAvailability) return
    const availability = slotAvailability(value)
    if (availability === "taken" || availability === "mine") onChange(null)
  }, [value, slotAvailability, onChange])

  if (!timeZone) {
    // Static on purpose: CLAUDE.md › Design › Motion allows no pulse
    return (
      <div
        id={id}
        aria-hidden
        className={cn("h-[32rem] rounded-lg bg-muted lg:max-w-4xl", className)}
      />
    )
  }

  return (
    <PickerView
      timeZone={timeZone}
      value={value}
      onChange={onChange}
      slotAvailability={slotAvailability}
      disabled={disabled}
      id={id}
      className={className}
      groupProps={{ ...groupProps, "aria-disabled": disabled || undefined }}
    />
  )
}

// Rendered only in the browser, once the zone is known, so "now" is taken
// here and never during the prerender. Kept for the picker's lifetime
function PickerView({
  timeZone,
  value,
  onChange,
  slotAvailability,
  disabled,
  id,
  className,
  groupProps,
}: Omit<WeeklySlotPickerProps, keyof SlotGroupProps | "disabled"> & {
  timeZone: string
  disabled: boolean
  groupProps: SlotGroupProps
}) {
  const [now] = useState(() => new Date())
  const layout = useMemo(
    () => buildWeeklyLayout(weeklySlotGrid(timeZone, now)),
    [timeZone, now],
  )
  const selectedKey = value ? slotKey(value) : null
  const shared = {
    layout,
    timeZone,
    slotAvailability,
    selectedKey,
    disabled,
    onSelect: (slot: WeeklySlotUtc) => onChange(slot),
    groupProps,
  }

  return (
    <div id={id} className={cn("flex flex-col gap-4 lg:max-w-4xl", className)}>
      <p className="flex max-w-[65ch] gap-2 text-muted-foreground">
        <GlobeIcon aria-hidden className="mt-1 size-4 shrink-0" />
        {weeklyTimeZoneNote(timeZone, now)}
      </p>
      {slotAvailability === null && (
        <p role="status" className="text-muted-foreground">
          Checking which times are free…
        </p>
      )}
      <WeeklyDayTabs {...shared} now={now} />
    </div>
  )
}
