// Shared by the server and Client Components: pure functions with no
// server-only imports. Nothing here reads the current time or the time zone
// implicitly; callers pass "now" (or a reference instant) and an IANA zone

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type ClassDuration = 40 | 60;

// A weekly slot as the backend sends and accepts it: UTC weekday + "HH:00:00"
export type WeeklySlotUtc = { day: Weekday; time: string };

export type LocalTime = { hour: number; minute: number };

export type LocalWeeklyTime = LocalTime & { day: Weekday };

export type LocalDate = { year: number; month: number; day: number };

export type LocalDateTime = LocalDate & LocalTime & { weekday: Weekday };

export type WeeklyGridSlot = {
  utc: WeeklySlotUtc;
  local: LocalWeeklyTime;
  occursAt: Date;
};

export type LocalToWeeklySlotResult =
  | { kind: "ok"; slot: WeeklySlotUtc }
  | { kind: "ambiguous"; slots: WeeklySlotUtc[] }
  | { kind: "nonexistent" };

export type LocalToStartsAtResult =
  | { kind: "ok"; startsAt: string }
  | { kind: "ambiguous"; startsAt: string[] }
  | { kind: "nonexistent" }
  | { kind: "not-full-hour" };

export type TrialSlot = { startsAt: string; local: LocalDateTime };

export type TrialSlotDay = { date: LocalDate; key: string; slots: TrialSlot[] };

export class TimeValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeValueError";
  }
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

// getUTCDay() counts from Sunday; the backend and the app count from Monday
function weekdayOf(utcMs: number): Weekday {
  return WEEKDAYS[(new Date(utcMs).getUTCDay() + 6) % 7];
}

// ---- Parsing and building backend values

export function parseWeekday(value: string): Weekday {
  const day = WEEKDAYS.find((weekday) => weekday === value);
  if (!day) {
    throw new TimeValueError(`"${value}" is not a weekday code.`);
  }
  return day;
}

// Returns the UTC hour of a full-hour "HH:00:00" time
export function parseUtcTime(value: string): number {
  const match = /^([01]\d|2[0-3]):00:00$/.exec(value);
  if (!match) {
    throw new TimeValueError(`"${value}" is not a full hour in HH:00:00.`);
  }
  return Number(match[1]);
}

export function formatUtcTime(hour: number): string {
  return `${pad2(hour)}:00:00`;
}

export function parseStartsAt(value: string): Date {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:Z|\+00:00)$/.exec(
      value,
    );
  if (!match) {
    throw new TimeValueError(`"${value}" is not an ISO 8601 UTC date and time.`);
  }
  const [, year, month, day, hour, minute, second = "00", fraction = "0"] =
    match;
  const ms = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour));
  const date = new Date(ms);
  // Date.UTC rolls 2026-02-30 over to March, so compare the parts back
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day) ||
    date.getUTCHours() !== Number(hour)
  ) {
    throw new TimeValueError(`"${value}" is not a valid date and time.`);
  }
  if (minute !== "00" || second !== "00" || /[^0]/.test(fraction)) {
    throw new TimeValueError(`"${value}" is not on a full hour.`);
  }
  return date;
}

// "2026-11-03T14:00:00Z", the format sent as starts_at
export function formatStartsAt(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

// ---- Wall clock in a time zone

const wallClockFormats = new Map<string, Intl.DateTimeFormat>();

function wallClockFormat(timeZone: string): Intl.DateTimeFormat {
  let format = wallClockFormats.get(timeZone);
  if (!format) {
    // Fixed locale, calendar and digits so the parts are always parseable;
    // h23 avoids "24" at midnight
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
    wallClockFormats.set(timeZone, format);
  }
  return format;
}

function wallClock(utcMs: number, timeZone: string): LocalDateTime {
  const parts: Record<string, number> = {};
  for (const part of wallClockFormat(timeZone).formatToParts(utcMs)) {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }
  }
  const { year, month, day, hour, minute } = parts;
  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday: weekdayOf(Date.UTC(year, month - 1, day)),
  };
}

// Minutes ahead of UTC at that instant (Karachi: 300)
function offsetMinutes(utcMs: number, timeZone: string): number {
  const local = wallClock(utcMs, timeZone);
  const wallMs = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
  );
  return Math.round((wallMs - (utcMs - (utcMs % MINUTE_MS))) / MINUTE_MS);
}

// Client code only: on the server this is the server's zone, not the student's
export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function observesDaylightSaving(
  timeZone: string,
  reference: Date,
): boolean {
  const year = reference.getUTCFullYear();
  return (
    offsetMinutes(Date.UTC(year, 0, 1, 12), timeZone) !==
    offsetMinutes(Date.UTC(year, 6, 1, 12), timeZone)
  );
}

// ---- Weekly slots

function nextOccurrenceMs(
  dayIndex: number,
  hour: number,
  reference: Date,
): number {
  const refMs = reference.getTime();
  const refMidnight = refMs - (((refMs % DAY_MS) + DAY_MS) % DAY_MS);
  const refIndex = WEEKDAYS.indexOf(weekdayOf(refMs));
  let occurrence =
    refMidnight + ((dayIndex - refIndex + 7) % 7) * DAY_MS + hour * HOUR_MS;
  if (occurrence < refMs) {
    occurrence += 7 * DAY_MS;
  }
  return occurrence;
}

// The first instant at or after the reference on that UTC weekday and hour.
// Weekly slots are converted with the offset in force then, so a class just
// after a clock change shows its real local time
export function nextOccurrence(slot: WeeklySlotUtc, reference: Date): Date {
  const dayIndex = WEEKDAYS.indexOf(parseWeekday(slot.day));
  return new Date(
    nextOccurrenceMs(dayIndex, parseUtcTime(slot.time), reference),
  );
}

function toLocalWeeklyTime(local: LocalDateTime): LocalWeeklyTime {
  return { day: local.weekday, hour: local.hour, minute: local.minute };
}

export function weeklySlotToLocal(
  slot: WeeklySlotUtc,
  timeZone: string,
  reference: Date,
): LocalWeeklyTime {
  return toLocalWeeklyTime(
    wallClock(nextOccurrence(slot, reference).getTime(), timeZone),
  );
}

// All 168 UTC slots with their local time, ordered Monday to Sunday by local
// time. Pickers and the schedule build on this instead of local input
export function weeklySlotGrid(
  timeZone: string,
  reference: Date,
): WeeklyGridSlot[] {
  const grid: WeeklyGridSlot[] = [];
  WEEKDAYS.forEach((day, dayIndex) => {
    for (let hour = 0; hour < 24; hour++) {
      const occursAt = nextOccurrenceMs(dayIndex, hour, reference);
      grid.push({
        utc: { day, time: formatUtcTime(hour) },
        local: toLocalWeeklyTime(wallClock(occursAt, timeZone)),
        occursAt: new Date(occursAt),
      });
    }
  });
  return grid.sort(
    (a, b) =>
      WEEKDAYS.indexOf(a.local.day) - WEEKDAYS.indexOf(b.local.day) ||
      a.local.hour - b.local.hour ||
      a.local.minute - b.local.minute ||
      a.occursAt.getTime() - b.occursAt.getTime(),
  );
}

// Looked up in the grid so it always agrees with weeklySlotToLocal. In a
// clock-change week two slots can share a local time (ambiguous) or a local
// hour can have none; so can a local full hour in a half-hour zone
export function localToWeeklySlot(
  local: LocalWeeklyTime,
  timeZone: string,
  reference: Date,
): LocalToWeeklySlotResult {
  const slots = weeklySlotGrid(timeZone, reference)
    .filter(
      ({ local: slotLocal }) =>
        slotLocal.day === local.day &&
        slotLocal.hour === local.hour &&
        slotLocal.minute === local.minute,
    )
    .map(({ utc }) => utc);
  if (slots.length === 0) {
    return { kind: "nonexistent" };
  }
  return slots.length === 1
    ? { kind: "ok", slot: slots[0] }
    : { kind: "ambiguous", slots };
}

// ---- Trial lesson instants

function toUtcMs(startsAt: string | Date): number {
  return (
    typeof startsAt === "string" ? parseStartsAt(startsAt) : startsAt
  ).getTime();
}

export function startsAtToLocal(
  startsAt: string | Date,
  timeZone: string,
): LocalDateTime {
  return wallClock(toUtcMs(startsAt), timeZone);
}

export function localToStartsAt(
  local: LocalDate & LocalTime,
  timeZone: string,
): LocalToStartsAtResult {
  const naive = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
  );
  const check = new Date(naive);
  if (
    check.getUTCFullYear() !== local.year ||
    check.getUTCMonth() !== local.month - 1 ||
    check.getUTCDate() !== local.day ||
    check.getUTCHours() !== local.hour ||
    check.getUTCMinutes() !== local.minute
  ) {
    throw new TimeValueError("That is not a valid local date and time.");
  }

  // The offsets a day either side cover both sides of any clock change
  const candidates = [
    ...new Set(
      [naive - DAY_MS, naive + DAY_MS].map(
        (probe) => naive - offsetMinutes(probe, timeZone) * MINUTE_MS,
      ),
    ),
  ]
    .filter((utcMs) => {
      const wall = wallClock(utcMs, timeZone);
      return (
        wall.year === local.year &&
        wall.month === local.month &&
        wall.day === local.day &&
        wall.hour === local.hour &&
        wall.minute === local.minute
      );
    })
    .sort((a, b) => a - b);

  if (candidates.length === 0) {
    return { kind: "nonexistent" };
  }
  if (candidates.some((utcMs) => utcMs % HOUR_MS !== 0)) {
    return { kind: "not-full-hour" };
  }
  const startsAt = candidates.map((utcMs) => formatStartsAt(new Date(utcMs)));
  return startsAt.length === 1
    ? { kind: "ok", startsAt: startsAt[0] }
    : { kind: "ambiguous", startsAt };
}

// Zone-independent: lets availability match trial lessons against weekly slots
export function startsAtToUtcWeeklyKey(startsAt: string | Date): WeeklySlotUtc {
  const utcMs = toUtcMs(startsAt);
  return {
    day: weekdayOf(utcMs),
    time: formatUtcTime(new Date(utcMs).getUTCHours()),
  };
}

function localDateKey(date: LocalDate): string {
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

// Every full UTC hour strictly after "now" for the given number of days,
// grouped by local date
export function trialSlotList(
  timeZone: string,
  now: Date,
  days: number,
): TrialSlotDay[] {
  const nowMs = now.getTime();
  const end = nowMs + days * DAY_MS;
  const groups: TrialSlotDay[] = [];
  for (
    let utcMs = Math.floor(nowMs / HOUR_MS) * HOUR_MS + HOUR_MS;
    utcMs < end;
    utcMs += HOUR_MS
  ) {
    const local = wallClock(utcMs, timeZone);
    const date = { year: local.year, month: local.month, day: local.day };
    const key = localDateKey(date);
    let group = groups.at(-1);
    if (group?.key !== key) {
      group = { date, key, slots: [] };
      groups.push(group);
    }
    group.slots.push({ startsAt: formatStartsAt(new Date(utcMs)), local });
  }
  return groups;
}

// ---- Display formatting (locale undefined = the browser's)

const displayFormats = new Map<string, Intl.DateTimeFormat>();

function displayFormat(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let format = displayFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options);
    displayFormats.set(key, format);
  }
  return format;
}

export function formatWeekday(
  day: Weekday,
  locale?: string,
  width: "long" | "short" = "long",
): string {
  // 2024-01-01 was a Monday
  return displayFormat(locale, { weekday: width, timeZone: "UTC" }).format(
    Date.UTC(2024, 0, 1 + WEEKDAYS.indexOf(day)),
  );
}

// A local calendar date, e.g. "Thu 29 Oct" or "Thursday 29 October"
export function formatLocalDate(
  date: LocalDate,
  { weekday, month }: { weekday?: "long" | "short"; month: "long" | "short" },
  locale?: string,
): string {
  return displayFormat(locale, {
    weekday,
    day: "numeric",
    month,
    timeZone: "UTC",
  }).format(Date.UTC(date.year, date.month - 1, date.day));
}

export function formatTimeOfDay(
  hour: number,
  minute: number,
  locale?: string,
): string {
  return displayFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(Date.UTC(2024, 0, 1, hour, minute));
}

// Wall-clock arithmetic: ignores a clock change during the class itself
export function formatTimeRange(
  hour: number,
  minute: number,
  duration: ClassDuration,
  locale?: string,
): string {
  const end = (hour * 60 + minute + duration) % (24 * 60);
  return `${formatTimeOfDay(hour, minute, locale)}–${formatTimeOfDay(
    Math.floor(end / 60),
    end % 60,
    locale,
  )}`;
}

export function formatTrialDateTime(
  startsAt: string | Date,
  timeZone: string,
  locale?: string,
): string {
  return displayFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(toUtcMs(startsAt));
}

// "GMT+5", the offset in force at `at`. Tells apart two weekly slots that
// share a local time in a clock-change week
export function formatUtcOffset(
  timeZone: string,
  at: Date,
  locale?: string,
): string | undefined {
  return displayFormat(locale, { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(at)
    .find((part) => part.type === "timeZoneName")?.value;
}

// "Asia/Karachi (GMT+5)", with the offset in force at `at`
export function formatTimeZoneLabel(
  timeZone: string,
  at: Date,
  locale?: string,
): string {
  const offset = formatUtcOffset(timeZone, at, locale);
  const name = timeZone.replace(/_/g, " ");
  return offset ? `${name} (${offset})` : name;
}

// The note shown wherever weekly classes appear in local time (dashboard,
// weekly picker): the daylight-saving sentence only for zones that need it
export function weeklyTimeZoneNote(
  timeZone: string,
  now: Date,
  locale?: string,
): string {
  const label = formatTimeZoneLabel(timeZone, now, locale);
  return observesDaylightSaving(timeZone, now)
    ? `Times are in ${label}. Weekly classes are fixed in UTC, so their local time moves by an hour when your clocks change.`
    : `Times are in ${label}.`;
}
