"use client"

import { useEffect, useRef, useState } from "react"
import { CheckIcon } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TrialSlotLookup } from "@/lib/availability"
import {
  formatLocalDate,
  formatTimeOfDay,
  formatUtcOffset,
  formatWeekday,
} from "@/lib/time-zone"
import { cn } from "@/lib/utils"
import {
  DayPartSlots,
  type PartSlot,
  type SlotGroupProps,
} from "./day-part-slots"
import { SlotLegend } from "./slot-legend"
import { useWideLayout } from "./use-wide-layout"
import {
  firstBookableDate,
  type TrialDate,
  type TrialLayout,
} from "./trial-slots"

type PickerState = {
  layout: TrialLayout
  timeZone: string
  slotAvailability: TrialSlotLookup | null
  selectedMs: number | null
  disabled: boolean
  onSelect: (startsAt: string) => void
  groupProps: SlotGroupProps
}

// Every width: pick a local date from one row of about 15 tabs (scrolling
// sideways when it doesn't fit, with a gap before each Monday so the weeks
// read apart), then an hour from that date's slots grouped by part of the
// day. 4 per row below lg, 6 from lg, as in the weekly picker
export function TrialDateTabs({
  className,
  ...state
}: PickerState & { className?: string }) {
  const { layout, slotAvailability, selectedMs } = state
  const wide = useWideLayout()
  const selectedDate =
    selectedMs !== null ? layout.dateOf.get(selectedMs) : undefined
  // Set once the student picks a date or an hour, so a refetch never moves
  // the date they're looking at. Until then the picker opens on the first
  // date with a free hour, once availability is known
  const [pinned, setPinned] = useState<string | undefined>(selectedDate)
  const open =
    pinned ??
    (slotAvailability ? firstBookableDate(layout, slotAvailability) : undefined) ??
    layout.dates[0]?.key

  // Bring the open date into the row's view without scrolling the page
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const list = listRef.current
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!list || !tab) return
    const left = tab.offsetLeft - 4
    const right = tab.offsetLeft + tab.offsetWidth + 4
    if (left < list.scrollLeft) {
      list.scrollLeft = left
    } else if (right > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = right - list.clientWidth
    }
  }, [open])

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <SlotLegend />
      <Tabs value={open} onValueChange={(value: string) => setPinned(value)}>
        <TabsList
          ref={listRef}
          aria-label="Date"
          className="relative -mx-1 overflow-x-auto p-1"
        >
          {layout.dates.map((date, index) => {
            const longDate = formatLocalDate(date.date, {
              weekday: "long",
              month: "long",
            })
            return (
              <TabsTrigger
                key={date.key}
                value={date.key}
                aria-label={
                  date.key === selectedDate
                    ? `${longDate}, has your selected time`
                    : longDate
                }
                className={cn(
                  "min-h-14 min-w-16 flex-none flex-col gap-0 px-2 py-1",
                  date.weekday === "monday" && index > 0 && "ml-3",
                )}
              >
                <span>{formatWeekday(date.weekday, undefined, "short")}</span>
                <span className="tabular-nums">
                  {formatLocalDate(date.date, { month: "short" })}
                </span>
                {date.key === selectedDate && (
                  <CheckIcon aria-hidden className="absolute top-1 right-1 size-3" />
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {layout.dates.map((date) => (
          <TabsContent key={date.key} value={date.key}>
            <DateSlots
              date={date}
              columns={wide ? 6 : 4}
              {...state}
              onSelect={(startsAt) => {
                setPinned(date.key)
                state.onSelect(startsAt)
              }}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function DateSlots({
  date,
  columns,
  layout,
  timeZone,
  slotAvailability,
  selectedMs,
  disabled,
  onSelect,
  groupProps,
}: PickerState & { date: TrialDate; columns: number }) {
  const longDate = formatLocalDate(date.date, { weekday: "long", month: "long" })
  const groups = date.groups.map(({ part, slots }) => ({
    part,
    slots: slots.map((hour): PartSlot => {
      const instant = new Date(hour.ms)
      const offset = layout.sharesLocalTime.has(hour.ms)
        ? formatUtcOffset(timeZone, instant)
        : undefined
      const time = formatTimeOfDay(hour.local.hour, hour.local.minute)
      return {
        key: String(hour.ms),
        minutes: hour.local.hour * 60 + hour.local.minute,
        name: `${longDate}, ${time}${offset ? ` ${offset}` : ""}`,
        timeText: time,
        offsetText: offset,
        availability: slotAvailability ? slotAvailability(instant) : null,
        onSelect: () => onSelect(hour.startsAt),
      }
    }),
  }))

  return (
    <DayPartSlots
      groups={groups}
      columns={columns}
      selectedKey={selectedMs !== null ? String(selectedMs) : null}
      disabled={disabled}
      groupProps={groupProps}
    />
  )
}
