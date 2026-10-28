import type { TrialSlotLookup } from "@/lib/availability"
import {
  parseStartsAt,
  startsAtToLocal,
  formatStartsAt,
  trialSlotList,
  type LocalDate,
  type TrialSlot,
  type Weekday,
} from "@/lib/time-zone"
import { dayPartOf, type DayPart } from "./day-parts"

// Arranges trialSlotList() (spec 06) for the trial slot picker: the booking
// window's hours grouped by local date, then part of the day. Pure, UTC
// instants in, keyed by epoch ms so "…Z" and "…+00:00" match

const HOUR_MS = 60 * 60 * 1000

// Frontend-only rule: the backend accepts any future full hour, but the tutor
// needs time to send the meeting link
export const LEAD_TIME_MS = 24 * HOUR_MS
export const WINDOW_DAYS = 14

export type TrialHour = TrialSlot & { ms: number }

export type TrialPartGroup = { part: DayPart; slots: TrialHour[] }

export type TrialDate = {
  key: string
  date: LocalDate
  weekday: Weekday
  groups: TrialPartGroup[]
}

export type TrialLayout = {
  dates: TrialDate[]
  // Each offered hour's local date key
  dateOf: Map<number, string>
  // Hours sharing a local date and time with another (the autumn clock
  // change repeats an hour): labelled with their UTC offset
  sharesLocalTime: Set<number>
}

// null for a missing or malformed value, so a stale form value never throws
export function safeStartsAtMs(value: string | null | undefined): number | null {
  if (!value) return null
  try {
    return parseStartsAt(value).getTime()
  } catch {
    return null
  }
}

function dateKey({ year, month, day }: LocalDate): string {
  return `${year}-${month}-${day}`
}

// Every full UTC hour from the first at or after now + 24 hours, for 14 days.
// trialSlotList() starts strictly after its reference, hence the 1 ms. The
// own hour (editing) is added even when it's inside the lead time
export function buildTrialLayout(
  timeZone: string,
  now: Date,
  ownStartsAt?: string,
): TrialLayout {
  const earliestMs = Math.ceil((now.getTime() + LEAD_TIME_MS) / HOUR_MS) * HOUR_MS
  const hours: TrialHour[] = trialSlotList(
    timeZone,
    new Date(earliestMs - 1),
    WINDOW_DAYS,
  ).flatMap(({ slots }) =>
    slots.map((slot) => ({ ...slot, ms: Date.parse(slot.startsAt) })),
  )

  const ownMs = safeStartsAtMs(ownStartsAt)
  if (
    ownMs !== null &&
    ownMs > now.getTime() &&
    !hours.some(({ ms }) => ms === ownMs)
  ) {
    const own = new Date(ownMs)
    hours.push({
      startsAt: formatStartsAt(own),
      local: startsAtToLocal(own, timeZone),
      ms: ownMs,
    })
    hours.sort((a, b) => a.ms - b.ms)
  }

  const dates: TrialDate[] = []
  const dateOf = new Map<number, string>()
  const byLocalTime = new Map<string, number[]>()

  // Sorted by instant, so local dates and times come in order
  for (const hour of hours) {
    const { local } = hour
    const key = dateKey(local)
    let date = dates.at(-1)
    if (date?.key !== key) {
      date = {
        key,
        date: { year: local.year, month: local.month, day: local.day },
        weekday: local.weekday,
        groups: [],
      }
      dates.push(date)
    }
    const part = dayPartOf(local.hour)
    const last = date.groups.at(-1)
    if (last?.part === part) {
      last.slots.push(hour)
    } else {
      date.groups.push({ part, slots: [hour] })
    }
    dateOf.set(hour.ms, key)

    const timeKey = `${key}|${local.hour * 60 + local.minute}`
    byLocalTime.set(timeKey, [...(byLocalTime.get(timeKey) ?? []), hour.ms])
  }

  const sharesLocalTime = new Set<number>()
  for (const group of byLocalTime.values()) {
    if (group.length > 1) group.forEach((ms) => sharesLocalTime.add(ms))
  }

  return { dates, dateOf, sharesLocalTime }
}

function bookable(lookup: TrialSlotLookup, hour: TrialHour): boolean {
  const state = lookup(new Date(hour.ms))
  return state === "free" || state === "own"
}

export function firstBookableDate(
  layout: TrialLayout,
  lookup: TrialSlotLookup,
): string | undefined {
  return layout.dates.find((date) =>
    date.groups.some(({ slots }) => slots.some((hour) => bookable(lookup, hour))),
  )?.key
}
