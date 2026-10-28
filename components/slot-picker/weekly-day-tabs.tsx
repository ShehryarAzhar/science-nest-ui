"use client"

import { useState } from "react"
import { CheckIcon } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { WeeklySlotLookup } from "@/lib/availability"
import {
  formatTimeOfDay,
  formatUtcOffset,
  formatWeekday,
  startsAtToLocal,
  WEEKDAYS,
  type Weekday,
  type WeeklySlotUtc,
} from "@/lib/time-zone"
import { cn } from "@/lib/utils"
import {
  DayPartSlots,
  type PartSlot,
  type SlotGroupProps,
} from "./day-part-slots"
import { SlotLegend } from "./slot-legend"
import { useWideLayout } from "./use-wide-layout"
import { slotKey, type WeeklyDayGroup, type WeeklyLayout } from "./weekly-slots"

type PickerState = {
  layout: WeeklyLayout
  timeZone: string
  slotAvailability: WeeklySlotLookup | null
  selectedKey: string | null
  disabled: boolean
  onSelect: (slot: WeeklySlotUtc) => void
  groupProps: SlotGroupProps
}

// Every width: pick a local day, then an hour from that day's slots grouped
// by part of the day. 4 per row below lg; from lg each part's 6 hours fit
// one row, so the whole day shows without scrolling
export function WeeklyDayTabs({
  now,
  className,
  ...state
}: PickerState & { now: Date; className?: string }) {
  const { layout, timeZone, selectedKey } = state
  const wide = useWideLayout()
  const selectedDay = selectedKey ? layout.localDay.get(selectedKey) : undefined
  const [day, setDay] = useState<Weekday>(
    () => selectedDay ?? startsAtToLocal(now, timeZone).weekday,
  )

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <SlotLegend />
      <Tabs
        value={day}
        onValueChange={(value: Weekday) => setDay(value)}
      >
        <TabsList aria-label="Day of the week">
          {WEEKDAYS.map((weekday) => (
            <TabsTrigger
              key={weekday}
              value={weekday}
              aria-label={
                weekday === selectedDay
                  ? `${formatWeekday(weekday)}, has your selected time`
                  : formatWeekday(weekday)
              }
            >
              {formatWeekday(weekday, undefined, wide ? "long" : "short")}
              {weekday === selectedDay && (
                <CheckIcon aria-hidden className="absolute top-1 right-1 size-3" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {WEEKDAYS.map((weekday) => (
          <TabsContent key={weekday} value={weekday}>
            <DaySlots
              groups={layout.days[weekday]}
              columns={wide ? 6 : 4}
              {...state}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function DaySlots({
  groups,
  columns,
  layout,
  timeZone,
  slotAvailability,
  selectedKey,
  disabled,
  onSelect,
  groupProps,
}: PickerState & { groups: WeeklyDayGroup[]; columns: number }) {
  const partGroups = groups.map(({ part, slots }) => ({
    part,
    slots: slots.map((slot): PartSlot => {
      const key = slotKey(slot.utc)
      const offset = layout.sharesLocalTime.has(key)
        ? formatUtcOffset(timeZone, slot.occursAt)
        : undefined
      const time = formatTimeOfDay(slot.local.hour, slot.local.minute)
      return {
        key,
        minutes: slot.local.hour * 60 + slot.local.minute,
        name: `${formatWeekday(slot.local.day)} ${time}${offset ? ` ${offset}` : ""}`,
        timeText: time,
        offsetText: offset,
        availability: slotAvailability ? slotAvailability(slot.utc) : null,
        onSelect: () => onSelect(slot.utc),
      }
    }),
  }))

  return (
    <DayPartSlots
      groups={partGroups}
      columns={columns}
      selectedKey={selectedKey}
      disabled={disabled}
      groupProps={groupProps}
    />
  )
}
