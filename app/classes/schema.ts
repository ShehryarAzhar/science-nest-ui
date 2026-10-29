import { z } from "zod";

import type { Subject } from "@/lib/subjects";
import { WEEKDAYS, type ClassDuration, type WeeklySlotUtc } from "@/lib/time-zone";

// The weekly class form (spec 25). Built per subject list, since the
// subject must be one of them and the level one of that subject's. Field
// names match the backend's, except the slot: the backend's `day` and `time`
// errors are renamed onto it. Unchosen fields are null until submit

export const SLOT_TAKEN_MESSAGE = "This timeslot is already booked.";

export type WeeklyClassFormInput = {
  subject: number | null;
  level: string | null;
  duration: ClassDuration | null;
  slot: WeeklySlotUtc | null;
};

// Full UTC hours only, as the backend books them
const UTC_FULL_HOUR = /^([01]\d|2[0-3]):00:00$/;

// Shared with the trial lesson form (spec 28)
export function required<T extends z.ZodType>(schema: T, message: string) {
  return schema
    .nullable()
    .refine((value) => value !== null, message)
    .transform((value) => value as z.output<T>);
}

// The level must be one of the chosen subject's
export function refineLevelOfSubject(subjects: readonly Subject[]) {
  return (
    { subject, level }: { subject: number; level: string },
    ctx: z.RefinementCtx,
  ) => {
    const chosen = subjects.find(({ id }) => id === subject);
    if (chosen && level && !chosen.levels.some(({ code }) => code === level)) {
      ctx.addIssue({
        code: "custom",
        path: ["level"],
        message: "Choose a level.",
      });
    }
  };
}

export function subjectField(subjects: readonly Subject[]) {
  const ids = new Set(subjects.map(({ id }) => id));
  return required(
    z.number().refine((id) => ids.has(id), "Choose a subject."),
    "Choose a subject.",
  );
}

export function weeklyClassFormSchema(subjects: readonly Subject[]) {
  return z
    .object({
      subject: subjectField(subjects),
      level: required(z.string(), "Choose a level."),
      duration: required(
        z.union([z.literal(40), z.literal(60)]),
        "Choose a duration.",
      ),
      slot: required(
        z.object({
          day: z.enum(WEEKDAYS),
          time: z.string().regex(UTC_FULL_HOUR),
        }),
        "Choose a time.",
      ),
    })
    .superRefine(refineLevelOfSubject(subjects));
}

export type WeeklyClassValues = z.output<ReturnType<typeof weeklyClassFormSchema>>;
