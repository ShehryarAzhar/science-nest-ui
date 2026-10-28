import { useMemo } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { GENERIC_ERROR_MESSAGE } from "@/lib/drf-errors";
import { studentFetch, StudentApiError } from "@/lib/student-api";
import {
  parseStartsAt,
  parseUtcTime,
  parseWeekday,
  startsAtToUtcWeeklyKey,
  type WeeklySlotUtc,
} from "@/lib/time-zone";

// GET /availability/ for Client Components (it fetches through studentFetch),
// and the CLAUDE.md rules that turn it into blocked slots for the weekly
// (spec 23) and trial (spec 24) pickers. Everything here is UTC; the pickers
// convert to local time. Specs 25–31 invalidate availabilityQueryKey after
// every booking, edit, delete or cancel, and after "already booked"

// Checked here rather than at render: a TimeValueError thrown while
// rendering would skip the page's error panel and reach app/error.tsx
function parses(parse: (value: string) => unknown) {
  return (value: string) => {
    try {
      parse(value);
      return true;
    } catch {
      return false;
    }
  };
}

const weeklyEntrySchema = z.object({
  day: z.string().refine(parses(parseWeekday)).transform(parseWeekday),
  time: z.string().refine(parses(parseUtcTime)),
  mine: z.boolean(),
});

// day and time are checked but never used: the weekly key comes from
// starts_at, so the two can't disagree in a picker
const trialEntrySchema = z.object({
  starts_at: z.string().refine(parses(parseStartsAt)),
  day: z.string().refine(parses(parseWeekday)),
  time: z.string().refine(parses(parseUtcTime)),
  mine: z.boolean(),
});

const availabilitySchema = z.object({
  weekly_classes: z.array(weeklyEntrySchema),
  trial_lessons: z.array(trialEntrySchema),
});

export type AvailabilityWeeklyEntry = z.infer<typeof weeklyEntrySchema>;
export type AvailabilityTrialEntry = z.infer<typeof trialEntrySchema>;
export type Availability = z.infer<typeof availabilitySchema>;

export const availabilityQueryKey = ["availability"] as const;

export function availabilityQueryOptions() {
  return queryOptions({
    queryKey: availabilityQueryKey,
    queryFn: async ({ signal }) => {
      const body = await studentFetch<unknown>("/api/student/availability", {
        signal,
      });
      const parsed = availabilitySchema.safeParse(body);
      if (!parsed.success) {
        // Never Zod's own text
        throw new StudentApiError("GET", {
          kind: "invalid_response",
          status: null,
          fieldErrors: {},
          formErrors: [GENERIC_ERROR_MESSAGE],
        });
      }
      return parsed.data;
    },
    // Overrides the shared 30 s so every picker mount refetches: a slot
    // taken a minute ago shouldn't still look free
    staleTime: 0,
  });
}

// free:  nobody holds it
// taken: someone else's booking (blocked)
// mine:  one of the student's own bookings (blocked, shown as "Yours")
// own:   the booking being edited (selectable, shown as "Yours")
export type SlotAvailability = "free" | "taken" | "mine" | "own";

export type WeeklySlotLookup = (slot: WeeklySlotUtc) => SlotAvailability;
export type TrialSlotLookup = (startsAt: string | Date) => SlotAvailability;

type Hold = { mine: boolean; weekly: boolean };

// The hour as a number, so the key never depends on how the time is spelled
function weeklyKey(slot: WeeklySlotUtc): string {
  return `${parseWeekday(slot.day)}|${parseUtcTime(slot.time)}`;
}

// Two holds on one slot only happen with bad data; anyone else's makes it taken
function hold(map: Map<string | number, Hold>, key: string | number, next: Hold) {
  const current = map.get(key);
  map.set(
    key,
    current
      ? { mine: current.mine && next.mine, weekly: current.weekly || next.weekly }
      : next,
  );
}

function blockedState({ mine }: Hold): SlotAvailability {
  return mine ? "mine" : "taken";
}

function weeklyHolds(data: Availability): Map<string | number, Hold> {
  const holds = new Map<string | number, Hold>();
  for (const entry of data.weekly_classes) {
    hold(holds, weeklyKey(entry), { mine: entry.mine, weekly: true });
  }
  return holds;
}

// Blocks every weekly class's slot and every upcoming trial lesson's UTC
// weekday + hour. ownSlot (editing a weekly class) stays selectable, but only
// when it's one of the student's own weekly classes
export function weeklySlotAvailability(
  data: Availability,
  { ownSlot }: { ownSlot?: WeeklySlotUtc } = {},
): WeeklySlotLookup {
  const holds = weeklyHolds(data);
  for (const entry of data.trial_lessons) {
    hold(holds, weeklyKey(startsAtToUtcWeeklyKey(entry.starts_at)), {
      mine: entry.mine,
      weekly: false,
    });
  }
  const ownKey = ownSlot ? weeklyKey(ownSlot) : null;

  return (slot) => {
    const key = weeklyKey(slot);
    const current = holds.get(key);
    if (!current) {
      return "free";
    }
    if (key === ownKey && current.mine && current.weekly) {
      return "own";
    }
    return blockedState(current);
  };
}

// Blocks every date on a weekly class's UTC weekday + hour and each exact
// trial starts_at (compared as instants). ownStartsAt (editing the trial
// lesson) stays selectable, but only when it's the student's own
export function trialSlotAvailability(
  data: Availability,
  { ownStartsAt }: { ownStartsAt?: string } = {},
): TrialSlotLookup {
  const weekly = weeklyHolds(data);
  const trials = new Map<string | number, Hold>();
  for (const entry of data.trial_lessons) {
    hold(trials, parseStartsAt(entry.starts_at).getTime(), {
      mine: entry.mine,
      weekly: false,
    });
  }
  const ownMs = ownStartsAt ? parseStartsAt(ownStartsAt).getTime() : null;

  return (startsAt) => {
    const instant =
      typeof startsAt === "string" ? parseStartsAt(startsAt) : startsAt;
    const ms = instant.getTime();
    const trial = trials.get(ms);
    if (trial) {
      return ms === ownMs && trial.mine ? "own" : blockedState(trial);
    }
    const clash = weekly.get(weeklyKey(startsAtToUtcWeeklyKey(instant)));
    return clash ? blockedState(clash) : "free";
  };
}

// The lookup is null until availability has loaded. A background refetch,
// or one that fails, keeps the last data, so the lookup stays usable. Pages
// read query.error for 403 and other failures
export function useWeeklyAvailability({
  ownSlot,
}: { ownSlot?: WeeklySlotUtc } = {}) {
  const query = useQuery(availabilityQueryOptions());
  const ownDay = ownSlot?.day;
  const ownTime = ownSlot?.time;
  const slotAvailability = useMemo(
    () =>
      query.data
        ? weeklySlotAvailability(query.data, {
            ownSlot:
              ownDay && ownTime ? { day: ownDay, time: ownTime } : undefined,
          })
        : null,
    [query.data, ownDay, ownTime],
  );
  return { query, slotAvailability };
}

export function useTrialAvailability({
  ownStartsAt,
}: { ownStartsAt?: string } = {}) {
  const query = useQuery(availabilityQueryOptions());
  const slotAvailability = useMemo(
    () =>
      query.data ? trialSlotAvailability(query.data, { ownStartsAt }) : null,
    [query.data, ownStartsAt],
  );
  return { query, slotAvailability };
}
