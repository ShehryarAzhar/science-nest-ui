"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { CalendarCheckIcon, GlobeIcon } from "lucide-react"

import type { TrialSlotLookup } from "@/lib/availability"
import {
  formatTimeZoneLabel,
  formatTrialDateTime,
  getBrowserTimeZone,
} from "@/lib/time-zone"
import { cn } from "@/lib/utils"
import type { SlotGroupProps } from "./day-part-slots"
import { TrialDateTabs } from "./trial-date-tabs"
import {
  buildTrialLayout,
  firstBookableDate,
  safeStartsAtMs,
} from "./trial-slots"

// Spec 24. A controlled picker for the trial lesson's UTC starts_at, shown in
// the student's local time: every full hour from 24 hours ahead for 14 days.
// It never fetches: the page owns useTrialAvailability() (spec 22), passes
// its lookup in, and handles the query's 403 and other errors itself

export type TrialSlotPickerProps = {
  value: string | null
  // null when a refetch takes the selected hour
  onChange: (startsAt: string | null) => void
  // useTrialAvailability()'s slotAvailability; null while it loads
  slotAvailability: TrialSlotLookup | null
  // The trial lesson being edited: offered even inside the 24-hour lead time
  ownStartsAt?: string
  disabled?: boolean
  id?: string
  className?: string
} & Omit<SlotGroupProps, "aria-disabled">

const subscribe = () => () => {}

export function TrialSlotPicker({
  value,
  onChange,
  slotAvailability,
  ownStartsAt,
  disabled = false,
  id,
  className,
  ...groupProps
}: TrialSlotPickerProps) {
  // null on the server and the first client render, so the prerendered HTML
  // never holds the server's local dates and times
  const timeZone = useSyncExternalStore(
    subscribe,
    getBrowserTimeZone,
    () => null,
  )

  // An hour that a refetch shows as taken (or as one of the student's weekly
  // classes) can't stay selected; the form shows the notice (spec 28)
  const valueMs = safeStartsAtMs(value)
  useEffect(() => {
    if (valueMs === null || !slotAvailability) return
    const availability = slotAvailability(new Date(valueMs))
    if (availability === "taken" || availability === "mine") onChange(null)
  }, [valueMs, slotAvailability, onChange])

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
      valueMs={valueMs}
      onChange={onChange}
      slotAvailability={slotAvailability}
      ownStartsAt={ownStartsAt}
      disabled={disabled}
      id={id}
      className={className}
      groupProps={{ ...groupProps, "aria-disabled": disabled || undefined }}
    />
  )
}

// Rendered only in the browser, once the zone is known, so "now" is taken
// here and never during the prerender. Kept for the picker's lifetime, so the
// window doesn't move while the page is open
function PickerView({
  timeZone,
  valueMs,
  onChange,
  slotAvailability,
  ownStartsAt,
  disabled,
  id,
  className,
  groupProps,
}: Omit<TrialSlotPickerProps, keyof SlotGroupProps | "disabled" | "value"> & {
  timeZone: string
  valueMs: number | null
  disabled: boolean
  groupProps: SlotGroupProps
}) {
  const [now] = useState(() => new Date())
  const layout = useMemo(
    () => buildTrialLayout(timeZone, now, ownStartsAt),
    [timeZone, now, ownStartsAt],
  )
  // A value outside the window (not the own hour) shows as nothing selected
  const selectedMs =
    valueMs !== null && layout.dateOf.has(valueMs) ? valueMs : null
  const noneFree =
    slotAvailability !== null &&
    firstBookableDate(layout, slotAvailability) === undefined

  return (
    <div id={id} className={cn("flex flex-col gap-4 lg:max-w-4xl", className)}>
      <p className="flex max-w-[65ch] gap-2 text-muted-foreground">
        <GlobeIcon aria-hidden className="mt-1 size-4 shrink-0" />
        Times are in {formatTimeZoneLabel(timeZone, now)}.
      </p>
      {slotAvailability === null && (
        <p role="status" className="text-muted-foreground">
          Checking which times are free…
        </p>
      )}
      {noneFree && (
        <p className="text-muted-foreground">
          No times are free in the next two weeks.
        </p>
      )}
      <TrialDateTabs
        layout={layout}
        timeZone={timeZone}
        slotAvailability={slotAvailability}
        selectedMs={selectedMs}
        disabled={disabled}
        onSelect={(startsAt) => onChange(startsAt)}
        groupProps={groupProps}
      />
      <p aria-live="polite" className="flex gap-2 tabular-nums">
        {selectedMs !== null && (
          <>
            <CalendarCheckIcon aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
            Your trial lesson: {formatTrialDateTime(new Date(selectedMs), timeZone)}
          </>
        )}
      </p>
    </div>
  )
}
