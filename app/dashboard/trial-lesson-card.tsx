import type { ScheduleTrialLesson } from "@/lib/schedule"
import { formatTrialDateTime } from "@/lib/time-zone"

// One-time, so it sits above the weekly schedule and never looks like a
// weekly block. Shown the same way when past or completed (spec 31 adds the
// locked display)
export function TrialLessonCard({
  trialLesson,
  timeZone,
}: {
  trialLesson: ScheduleTrialLesson
  timeZone: string
}) {
  return (
    <section
      aria-labelledby="trial-lesson-heading"
      className="rounded-lg border border-border border-l-4 border-l-eosin bg-card p-4 md:p-6"
    >
      <p className="w-fit rounded-full bg-eosin px-2.5 py-0.5 text-sm font-semibold text-eosin-foreground">
        Free trial
      </p>
      <h2 id="trial-lesson-heading" className="mt-3 text-xl">
        {trialLesson.subject.name}
        <span className="sr-only">, free trial lesson</span>
      </h2>
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
    </section>
  )
}
