"use client"

import { useId, useMemo } from "react"

import type { SlotAvailability } from "@/lib/availability"
import { formatTimeOfDay } from "@/lib/time-zone"
import { DAYTIME_START_MINUTES, type DayPart } from "./day-parts"
import { SlotCell } from "./slot-cell"
import { useRovingGrid, type RovingItem } from "./use-roving-grid"

// One day's slots under each part of the day, shared by the weekly (spec 23)
// and trial (spec 24) pickers: a radio group whose arrow keys follow the
// visible columns. Each picker turns its own slots into PartSlot items

export type SlotGroupProps = {
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  "aria-disabled"?: boolean
}

export type PartSlot = {
  key: string
  // Local start, minutes after midnight: picks the default tab stop
  minutes: number
  // Accessible name before the state, e.g. "Monday 14:00"
  name: string
  timeText: string
  offsetText?: string
  // null while availability loads
  availability: SlotAvailability | null
  onSelect: () => void
}

export type PartGroup = { part: DayPart; slots: PartSlot[] }

export function DayPartSlots({
  groups,
  columns,
  selectedKey,
  disabled,
  groupProps,
}: {
  groups: PartGroup[]
  columns: number
  selectedKey: string | null
  disabled: boolean
  groupProps: SlotGroupProps
}) {
  const idPrefix = useId()
  // The same column count as the CSS grid below, so Up and Down keep the
  // visible column
  const navRows = useMemo<RovingItem[][]>(
    () =>
      groups.flatMap(({ slots }) => {
        const rows: RovingItem[][] = []
        slots.forEach((slot, index) => {
          if (index % columns === 0) rows.push([])
          rows[rows.length - 1].push({ key: slot.key, col: index % columns })
        })
        return rows
      }),
    [groups, columns],
  )
  const slots = groups.flatMap((group) => group.slots)
  const daytime = slots.find(({ minutes }) => minutes >= DAYTIME_START_MINUTES)
  const { getItemProps } = useRovingGrid(
    navRows,
    selectedKey && slots.some(({ key }) => key === selectedKey)
      ? selectedKey
      : (daytime?.key ?? null),
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
            {partSlots.map((slot) => (
              <SlotCell
                key={slot.key}
                {...getItemProps(slot.key)}
                name={slot.name}
                timeText={slot.timeText}
                offsetText={slot.offsetText}
                availability={slot.availability}
                selected={slot.key === selectedKey}
                disabled={disabled}
                onSelect={slot.onSelect}
                className="min-h-12 flex-col gap-0.5 px-1 py-1"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
