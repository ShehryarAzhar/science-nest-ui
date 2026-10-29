import { z } from "zod";

import {
  refineLevelOfSubject,
  required,
  subjectField,
} from "@/app/classes/schema";
import { LEAD_TIME_MS } from "@/components/slot-picker/trial-slots";
import type { Subject } from "@/lib/subjects";
import { parseStartsAt } from "@/lib/time-zone";

// The trial lesson form (spec 28). Field names match the backend's, so its
// errors land on them as they are. Unchosen fields are null until submit

export type TrialLessonFormInput = {
  subject: number | null;
  level: string | null;
  starts_at: string | null;
};

function startsAtMs(value: string): number | null {
  try {
    return parseStartsAt(value).getTime();
  } catch {
    return null;
  }
}

// When editing (spec 29), the lesson's own hour is exempt from the lead
// time while it's still in the future: the student may keep it
function meetsLeadTime(value: string, ownStartsAt: string | undefined) {
  const ms = startsAtMs(value) ?? 0;
  const now = Date.now();
  const ownMs = ownStartsAt === undefined ? null : startsAtMs(ownStartsAt);
  if (ownMs !== null && ms === ownMs && ms > now) return true;
  return ms - now >= LEAD_TIME_MS;
}

export function trialLessonFormSchema(
  subjects: readonly Subject[],
  { ownStartsAt }: { ownStartsAt?: string } = {},
) {
  return z
    .object({
      subject: subjectField(subjects),
      level: required(z.string(), "Choose a level."),
      starts_at: required(
        z
          .string()
          // A full UTC hour, as the backend books them
          .refine((value) => startsAtMs(value) !== null, "Choose a time.")
          // The 24-hour lead time is a frontend rule (the backend takes any
          // future full hour). Checked against the moment of submitting, so
          // a page left open can't book inside it
          .refine(
            (value) => meetsLeadTime(value, ownStartsAt),
            "This time is now less than 24 hours away. Choose a later time.",
          ),
        "Choose a time.",
      ),
    })
    .superRefine(refineLevelOfSubject(subjects));
}

export type TrialLessonValues = z.output<ReturnType<typeof trialLessonFormSchema>>;
