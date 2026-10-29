import type { ReactNode } from "react"
import { LockIcon } from "lucide-react"

import type { TrialLockReason } from "@/lib/schedule"
import { formatTrialDateTime } from "@/lib/time-zone"
import { cn } from "@/lib/utils"

// What the card shows: a schedule's trial lesson, or one just booked (spec
// 28). The id, when known, is for the Edit link (spec 29)
export type TrialLessonSummary = {
  id?: number
  subject: { name: string }
  level: { name: string }
  starts_at: string
}

// The locked display (spec 31): a warning badge beside "Free trial" and a
// line saying why the lesson can't be changed
const LOCK_COPY: Record<TrialLockReason, { badge: string; line: string }> = {
  completed: {
    badge: "Completed",
    line: "This trial lesson is complete, so it can no longer be changed or cancelled.",
  },
  started: {
    badge: "Started",
    line: "This trial lesson has started, so it can no longer be changed or cancelled.",
  },
  past: {
    badge: "Past",
    line: "This trial lesson's time has passed, so it can no longer be changed or cancelled.",
  },
}

// Shown when the backend refuses an edit or cancellation with a 403. Always
// this wording, never the backend's own text
export const TRIAL_LOCKED_MESSAGE =
  "This trial lesson has started or been completed, so it can no longer be changed or cancelled."

// Styled like SlotTakenNotice: a calm warning, not an error. Always mounted
// so screen readers announce it when it appears
export function TrialLockedNotice({
  show,
  className,
}: {
  show: boolean
  className?: string
}) {
  return (
    <div role="alert">
      {show && (
        <p
          className={cn(
            "flex items-start gap-2 rounded-md bg-warning p-4 text-warning-foreground",
            className,
          )}
        >
          <LockIcon aria-hidden className="mt-1 size-4 shrink-0" />
          {TRIAL_LOCKED_MESSAGE}
        </p>
      )}
    </div>
  )
}

// One-time, so it sits above the weekly schedule and never looks like a
// weekly block. A locked lesson (`lockReason`, spec 31) gets the badge and
// line and no actions. The trial booking and edit pages put it under their
// own h2. `actions` (the dashboard's Edit link and Cancel control, specs 29
// and 30) sit in a row at the foot. The heading takes focus when the
// dashboard's cancel dialog closes and its opener is gone
export function TrialLessonCard({
  trialLesson,
  timeZone,
  headingLevel: Heading = "h2",
  lockReason = null,
  actions,
}: {
  trialLesson: TrialLessonSummary
  timeZone: string
  headingLevel?: "h2" | "h3"
  lockReason?: TrialLockReason | null
  actions?: ReactNode
}) {
  const lock = lockReason ? LOCK_COPY[lockReason] : null

  return (
    <section
      aria-labelledby="trial-lesson-heading"
      className="rounded-lg border border-border border-l-4 border-l-eosin bg-card p-4 md:p-6"
    >
      <div className="flex flex-wrap gap-2">
        <p className="w-fit rounded-full bg-eosin px-2.5 py-0.5 text-sm font-semibold text-eosin-foreground">
          Free trial
        </p>
        {lock && (
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warning px-2.5 py-0.5 text-sm font-semibold text-warning-foreground">
            <LockIcon aria-hidden className="size-3.5 shrink-0" />
            {lock.badge}
          </p>
        )}
      </div>
      <Heading
        id="trial-lesson-heading"
        tabIndex={-1}
        className="mt-3 text-xl outline-none"
      >
        {trialLesson.subject.name}
        <span className="sr-only">, free trial lesson</span>
      </Heading>
      <p className="text-muted-foreground">{trialLesson.level.name}</p>
      <p className="mt-3 text-lg font-semibold tabular-nums">
        {formatTrialDateTime(trialLesson.starts_at, timeZone)}
      </p>
      {lock && (
        <p className="mt-1 max-w-[65ch] text-muted-foreground">{lock.line}</p>
      )}
      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <dt className="text-sm text-muted-foreground">Length</dt>
          <dd className="tabular-nums">60 minutes</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Price</dt>
          <dd>Free</dd>
        </div>
      </dl>
      {actions && (
        <div className="mt-4 flex flex-wrap gap-x-6 border-t border-border pt-2">
          {actions}
        </div>
      )}
    </section>
  )
}
