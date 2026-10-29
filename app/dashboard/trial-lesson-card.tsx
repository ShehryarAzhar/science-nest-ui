import type { ReactNode } from "react"

import { formatTrialDateTime } from "@/lib/time-zone"

// What the card shows: a schedule's trial lesson, or one just booked (spec
// 28). The id, when known, is for the Edit link (spec 29)
export type TrialLessonSummary = {
  id?: number
  subject: { name: string }
  level: { name: string }
  starts_at: string
}

// One-time, so it sits above the weekly schedule and never looks like a
// weekly block. Shown the same way when past or completed (spec 31 adds the
// locked display). The trial booking page puts it under its own h2.
// `actions` (the dashboard's Edit link, spec 29) sit in a row at the foot
export function TrialLessonCard({
  trialLesson,
  timeZone,
  headingLevel: Heading = "h2",
  actions,
}: {
  trialLesson: TrialLessonSummary
  timeZone: string
  headingLevel?: "h2" | "h3"
  actions?: ReactNode
}) {
  return (
    <section
      aria-labelledby="trial-lesson-heading"
      className="rounded-lg border border-border border-l-4 border-l-eosin bg-card p-4 md:p-6"
    >
      <p className="w-fit rounded-full bg-eosin px-2.5 py-0.5 text-sm font-semibold text-eosin-foreground">
        Free trial
      </p>
      <Heading id="trial-lesson-heading" className="mt-3 text-xl">
        {trialLesson.subject.name}
        <span className="sr-only">, free trial lesson</span>
      </Heading>
      <p className="text-muted-foreground">{trialLesson.level.name}</p>
      <p className="mt-3 text-lg font-semibold tabular-nums">
        {formatTrialDateTime(trialLesson.starts_at, timeZone)}
      </p>
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
