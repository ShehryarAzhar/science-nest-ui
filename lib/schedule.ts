import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { GENERIC_ERROR_MESSAGE } from "@/lib/drf-errors";
import { studentFetch, StudentApiError } from "@/lib/student-api";
import { parseStartsAt, parseUtcTime, parseWeekday } from "@/lib/time-zone";

// GET /schedule/ for Client Components (it fetches through studentFetch).
// Booking, edit, delete and cancel (specs 25–31) invalidate scheduleQueryKey.
// Also GET /classes/{id}/ and GET /trial-lessons/{id}/ for the edit pages
// (specs 26 and 29)

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

const levelSchema = z.object({ code: z.string(), name: z.string() });

const subjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  levels: z.array(levelSchema),
});

// day_display is the UTC weekday, so it isn't kept
const weeklyClassSchema = z.object({
  id: z.number(),
  subject: subjectSchema,
  level: levelSchema,
  day: z.string().refine(parses(parseWeekday)).transform(parseWeekday),
  time: z.string().refine(parses(parseUtcTime)),
  duration: z.union([z.literal(40), z.literal(60)]),
  price: z.number(),
});

// Also checks the trial booking's 201 body (spec 28)
export const trialLessonSchema = z.object({
  id: z.number(),
  subject: subjectSchema,
  level: levelSchema,
  starts_at: z.string().refine(parses(parseStartsAt)),
  completed: z.boolean(),
});

const scheduleSchema = z.object({
  weekly_classes: z.array(weeklyClassSchema),
  trial_lesson: trialLessonSchema.nullable(),
  weekly_cost: z.number(),
});

export type ScheduleWeeklyClass = z.infer<typeof weeklyClassSchema>;
export type ScheduleTrialLesson = z.infer<typeof trialLessonSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;

// The backend's lock: completed (set in admin), or started. Edit and delete
// then return 403, so no Edit or Cancel is offered and the edit page shows why
export function isTrialLessonLocked(
  trialLesson: Pick<ScheduleTrialLesson, "completed" | "starts_at">,
  now: Date,
) {
  return (
    trialLesson.completed ||
    parseStartsAt(trialLesson.starts_at).getTime() <= now.getTime()
  );
}

// GET /classes/{id}/ returns the weekly class fields without a price
const weeklyClassDetailSchema = weeklyClassSchema.omit({ price: true });

export type WeeklyClassDetail = z.infer<typeof weeklyClassDetailSchema>;

export const scheduleQueryKey = ["schedule"] as const;

export function scheduleQueryOptions() {
  return queryOptions({
    queryKey: scheduleQueryKey,
    queryFn: async ({ signal }) => {
      const body = await studentFetch<unknown>("/api/student/schedule", {
        signal,
      });
      const parsed = scheduleSchema.safeParse(body);
      if (!parsed.success) throw invalidResponse();
      return parsed.data;
    },
  });
}

function invalidResponse() {
  // Never Zod's own text
  return new StudentApiError("GET", {
    kind: "invalid_response",
    status: null,
    fieldErrors: {},
    formErrors: [GENERIC_ERROR_MESSAGE],
  });
}

export function weeklyClassQueryKey(id: number) {
  return ["classes", id] as const;
}

// A 404 (deleted, or another student's) isn't retried: the shared retry rule
// skips 4xx
export function weeklyClassQueryOptions(id: number) {
  return queryOptions({
    queryKey: weeklyClassQueryKey(id),
    queryFn: async ({ signal }) => {
      const body = await studentFetch<unknown>(`/api/student/classes/${id}`, {
        signal,
      });
      const parsed = weeklyClassDetailSchema.safeParse(body);
      if (!parsed.success) throw invalidResponse();
      return parsed.data;
    },
  });
}

export function trialLessonQueryKey(id: number) {
  return ["trial-lessons", id] as const;
}

// GET /trial-lessons/{id}/ returns the same fields as the schedule's
// trial_lesson. A 404 (cancelled, or another student's) isn't retried
export function trialLessonQueryOptions(id: number) {
  return queryOptions({
    queryKey: trialLessonQueryKey(id),
    queryFn: async ({ signal }) => {
      const body = await studentFetch<unknown>(
        `/api/student/trial-lessons/${id}`,
        { signal },
      );
      const parsed = trialLessonSchema.safeParse(body);
      if (!parsed.success) throw invalidResponse();
      return parsed.data;
    },
  });
}
