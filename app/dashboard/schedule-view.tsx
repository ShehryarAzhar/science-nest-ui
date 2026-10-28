"use client"

import { useMemo, useState } from "react"

import { formatUsd } from "@/lib/format-usd"
import type { Schedule } from "@/lib/schedule"
import { BookingLinks } from "./booking-links"
import { DayList } from "./day-list"
import { EmptySchedule } from "./empty-schedule"
import { toLocalSchedule } from "./local-schedule"
import { ScheduleNotes } from "./schedule-notes"
import { TrialLessonCard } from "./trial-lesson-card"
import { WeekGrid } from "./week-grid"

// Rendered only in the browser, once the time zone is known, so "now" is
// taken here and never during the prerender. Kept for the page's lifetime
export function ScheduleView({
  schedule,
  timeZone,
}: {
  schedule: Schedule
  timeZone: string
}) {
  const [now] = useState(() => new Date())
  const { weekly_classes, trial_lesson, weekly_cost } = schedule
  const hasWeeklyClasses = weekly_classes.length > 0
  const local = useMemo(
    () =>
      hasWeeklyClasses ? toLocalSchedule(weekly_classes, timeZone, now) : null,
    [hasWeeklyClasses, weekly_classes, timeZone, now],
  )

  if (!local && !trial_lesson) {
    return <EmptySchedule />
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {trial_lesson && (
        <TrialLessonCard trialLesson={trial_lesson} timeZone={timeZone} />
      )}

      <section aria-labelledby="weekly-classes-heading">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 id="weekly-classes-heading" className="text-xl">
            Weekly classes
          </h2>
          {local && (
            <dl className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">Total per week</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatUsd(weekly_cost)}
              </dd>
            </dl>
          )}
        </div>
        {local ? (
          <>
            <WeekGrid schedule={local} className="mt-4 hidden lg:block" />
            <DayList schedule={local} className="mt-4 lg:hidden" />
          </>
        ) : (
          <p className="mt-2 text-muted-foreground">No weekly classes yet.</p>
        )}
        <BookingLinks hasTrialLesson={trial_lesson !== null} className="mt-6" />
      </section>

      <ScheduleNotes
        timeZone={timeZone}
        now={now}
        hasWeeklyClasses={hasWeeklyClasses}
      />
    </div>
  )
}
