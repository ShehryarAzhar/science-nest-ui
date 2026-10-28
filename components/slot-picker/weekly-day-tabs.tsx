"use client"

import { useId, useMemo, useState } from "react"
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
import { SlotCell } from "./slot-cell"
import { SlotLegend } from "./slot-legend"
import { useRovingGrid, type RovingItem } from "./use-roving-grid"
import { useWideLayout } from "./use-wide-layout"
import {
  DAYTIME_START_MINUTES,
  slotKey,
  type WeeklyDayGroup,
  type WeeklyLayout,
} from "./weekly-slots"

export type SlotGroupProps = {
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  "aria-disabled"?: boolean
}

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
  const idPrefix = useId()
  // The same column count as the CSS grid below, so Up and Down keep the
  // visible column
  const navRows = useMemo<RovingItem[][]>(
    () =>
      groups.flatMap(({ slots }) => {
        const rows: RovingItem[][] = []
        slots.forEach((slot, index) => {
          if (index % columns === 0) rows.push([])
          rows[rows.length - 1].push({
            key: slotKey(slot.utc),
            col: index % columns,
          })
        })
        return rows
      }),
    [groups, columns],
  )
  const slots = groups.flatMap((group) => group.slots)
  const keys = slots.map((slot) => slotKey(slot.utc))
  const daytime = slots.find(
    ({ local }) => local.hour * 60 + local.minute >= DAYTIME_START_MINUTES,
  )
  const { getItemProps } = useRovingGrid(
    navRows,
    selectedKey && keys.includes(selectedKey)
      ? selectedKey
      : daytime
        ? slotKey(daytime.utc)
        : null,
  )

  return (
    <div role="radiogroup" {...groupProps} className="flex flex-col gap-4">
      {groups.map(({ part, slots: partSlots }) => (
        <div
          key={part.id}
          role="group"
          aria-labelledby={`${idPrefix}-${part.id}`}
          className="flex flex-col gap-2 lg:grid lg:grid-cols-[8rem_1fr] lg:items-start lg:gap-4"
        >
          <p className="flex flex-wrap items-baseline gap-x-2 lg:flex-col lg:pt-1">
            <span id={`${idPrefix}-${part.id}`} className="font-heading font-semibold">
              {part.label}
            </span>
            <span aria-hidden className="text-sm text-muted-foreground tabular-nums">
              {formatTimeOfDay(part.startHour, 0)}–{formatTimeOfDay(part.startHour + 5, 59)}
            </span>
          </p>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {partSlots.map((slot) => {
              const key = slotKey(slot.utc)
              const offset = layout.sharesLocalTime.has(key)
                ? formatUtcOffset(timeZone, slot.occursAt)
                : undefined
              const time = formatTimeOfDay(slot.local.hour, slot.local.minute)
              return (
                <SlotCell
                  key={key}
                  {...getItemProps(key)}
                  name={`${formatWeekday(slot.local.day)} ${time}${offset ? ` ${offset}` : ""}`}
                  timeText={time}
                  offsetText={offset}
                  availability={slotAvailability ? slotAvailability(slot.utc) : null}
                  selected={key === selectedKey}
                  disabled={disabled}
                  onSelect={() => onSelect(slot.utc)}
                  className="min-h-12 flex-col gap-0.5 px-1 py-1"
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
