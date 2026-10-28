import {
  parseUtcTime,
  WEEKDAYS,
  type Weekday,
  type WeeklyGridSlot,
  type WeeklySlotUtc,
} from "@/lib/time-zone"

// Arranges weeklySlotGrid() (spec 06) for the weekly slot picker: each local
// day's slots grouped by part of the day. Pure, UTC slots in, nothing
// converted here

export type DayPart = {
  id: "night" | "morning" | "afternoon" | "evening"
  label: string
  startHour: number
}

// By local start hour: six hours each
export const DAY_PARTS: readonly DayPart[] = [
  { id: "night", label: "Night", startHour: 0 },
  { id: "morning", label: "Morning", startHour: 6 },
  { id: "afternoon", label: "Afternoon", startHour: 12 },
  { id: "evening", label: "Evening", startHour: 18 },
]

export function dayPartOf(hour: number): DayPart {
  return DAY_PARTS[Math.floor(hour / 6)]
}

// With nothing selected, keyboard focus starts on the first slot at or after
// this local time
export const DAYTIME_START_MINUTES = 8 * 60

// The hour as a number, so the key never depends on how the time is spelled
export function slotKey(slot: WeeklySlotUtc): string {
  return `${slot.day}|${parseUtcTime(slot.time)}`
}

export type WeeklyDayGroup = { part: DayPart; slots: WeeklyGridSlot[] }

export type WeeklyLayout = {
  days: Record<Weekday, WeeklyDayGroup[]>
  // Slots sharing a local weekday and time with another, which happens when
  // a clock change falls in the coming week: labelled with their UTC offset
  // so the two can be told apart
  sharesLocalTime: Set<string>
  localDay: Map<string, Weekday>
}

export function buildWeeklyLayout(grid: WeeklyGridSlot[]): WeeklyLayout {
  const days = Object.fromEntries(
    WEEKDAYS.map((day) => [day, [] as WeeklyDayGroup[]]),
  ) as Record<Weekday, WeeklyDayGroup[]>
  const localDay = new Map<string, Weekday>()
  const byLocalTime = new Map<string, WeeklyGridSlot[]>()

  // The grid is sorted by local day, then local time, so groups stay ordered
  for (const slot of grid) {
    const { day, hour, minute } = slot.local
    const groups = days[day]
    const part = dayPartOf(hour)
    const last = groups.at(-1)
    if (last?.part === part) {
      last.slots.push(slot)
    } else {
      groups.push({ part, slots: [slot] })
    }
    localDay.set(slotKey(slot.utc), day)

    const timeKey = `${day}|${hour * 60 + minute}`
    byLocalTime.set(timeKey, [...(byLocalTime.get(timeKey) ?? []), slot])
  }

  const sharesLocalTime = new Set<string>()
  for (const slots of byLocalTime.values()) {
    if (slots.length > 1) {
      for (const slot of slots) sharesLocalTime.add(slotKey(slot.utc))
    }
  }

  return { days, sharesLocalTime, localDay }
}
