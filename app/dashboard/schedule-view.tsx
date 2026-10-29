"use client"

import { useMemo, useRef, useState } from "react"

import { formatUsd } from "@/lib/format-usd"
import { isTrialLessonLocked, type Schedule } from "@/lib/schedule"
import { BookingLinks } from "./booking-links"
import { DeleteClassDialog } from "./delete-class-dialog"
import { DayList } from "./day-list"
import { EditTrialLink } from "./edit-trial-link"
import { EmptySchedule } from "./empty-schedule"
import { toLocalSchedule, type LocalClass } from "./local-schedule"
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

  // The one delete dialog (spec 27), shared by both layouts: the week grid
  // and the day list are both rendered, one hidden by CSS
  const [deleting, setDeleting] = useState<LocalClass | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const opener = useRef<HTMLElement | null>(null)
  // A refetch that no longer holds the class closes the dialog
  const present =
    deleting !== null &&
    weekly_classes.some((c) => c.id === deleting.weeklyClass.id)

  const openDelete = (item: LocalClass, element: HTMLElement) => {
    opener.current = element
    setDeleting(item)
    setDialogOpen(true)
  }

  // Back to the control that opened it, or, once its class is gone, to the
  // heading of what's left
  const finalFocus = () => {
    const element = opener.current
    if (element?.isConnected) return element
    return (
      document.getElementById("weekly-classes-heading") ??
      document.getElementById("empty-schedule-heading")
    )
  }

  const dialog = (
    <DeleteClassDialog
      target={deleting}
      open={dialogOpen && present}
      onClose={() => setDialogOpen(false)}
      onClosed={() => {
        setDialogOpen(false)
        setDeleting(null)
        opener.current = null
      }}
      finalFocus={finalFocus}
    />
  )

  if (!local && !trial_lesson) {
    return (
      <>
        <EmptySchedule />
        {dialog}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {trial_lesson && (
        <TrialLessonCard
          trialLesson={trial_lesson}
          timeZone={timeZone}
          actions={
            !isTrialLessonLocked(trial_lesson, now) && (
              <EditTrialLink
                trialLesson={trial_lesson}
                id={trial_lesson.id}
                timeZone={timeZone}
              />
            )
          }
        />
      )}

      <section aria-labelledby="weekly-classes-heading">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2
            id="weekly-classes-heading"
            tabIndex={-1}
            className="text-xl outline-none"
          >
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
            <WeekGrid
              schedule={local}
              onDelete={openDelete}
              className="mt-4 hidden lg:block"
            />
            <DayList
              schedule={local}
              onDelete={openDelete}
              className="mt-4 lg:hidden"
            />
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
      {dialog}
    </div>
  )
}
