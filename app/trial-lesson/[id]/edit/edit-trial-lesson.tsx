"use client"

import { useLayoutEffect, useState, useSyncExternalStore } from "react"
import { useQuery } from "@tanstack/react-query"
import { CloudOffIcon } from "lucide-react"

import { SubjectsPanel } from "@/app/subjects/subjects-panel"
import { routeActionClass } from "@/components/route-state"
import { Button } from "@/components/ui/button"
import {
  trialLessonLockReason,
  trialLessonQueryOptions,
  type ScheduleTrialLesson,
} from "@/lib/schedule"
import { isNoStudentProfileError } from "@/lib/student-access"
import { StudentApiError } from "@/lib/student-api"
import type { Subject } from "@/lib/subjects"
import { getBrowserTimeZone } from "@/lib/time-zone"
import { TrialLessonForm } from "../../trial-lesson-form"
import { TrialLoading, TrialLocked, TrialNotFound } from "../../trial-states"

// Spec 29. The form appears only once the lesson has loaded, prefilled from
// it. A background refetch doesn't reset it: the student's edits stay
export function EditTrialLesson({
  trialLessonId,
  subjects,
}: {
  trialLessonId: number
  subjects: readonly Subject[]
}) {
  const query = useQuery(trialLessonQueryOptions(trialLessonId))

  if (query.data) {
    return <LoadedTrial trialLesson={query.data} subjects={subjects} />
  }

  if (query.isError) {
    // BookingShell replaces the page on a 403. studentFetch never surfaces
    // a 401: the query stays pending while the session ends
    if (isNoStudentProfileError(query.error)) return null
    // Any 404, whatever its body: CLAUDE.md doesn't document one here
    if (query.error instanceof StudentApiError && query.error.status === 404) {
      return <TrialNotFound />
    }

    return (
      <div className="max-w-4xl">
        <SubjectsPanel
          role="alert"
          icon={<CloudOffIcon aria-hidden className="size-5 shrink-0" />}
          heading="This trial lesson couldn't be loaded"
        >
          <p>Please try again in a moment.</p>
        </SubjectsPanel>
        <div className="mt-4">
          <Button
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className={routeActionClass}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return <TrialLoading />
}

const subscribe = () => () => {}

// The lesson only loads in the browser, so "now" is never taken in the
// prerender. Taken once: a lesson that starts while the form is open is
// refused by the backend on save, and the 403 swaps the form for the locked
// state (spec 31)
function LoadedTrial({
  trialLesson,
  subjects,
}: {
  trialLesson: ScheduleTrialLesson
  subjects: readonly Subject[]
}) {
  const [now] = useState(() => new Date())
  // null on the server and the first client render, for the locked card's
  // local date and hour
  const timeZone = useSyncExternalStore(
    subscribe,
    getBrowserTimeZone,
    () => null,
  )
  // A save the backend refused as locked, which the refetched lesson may
  // not show yet
  const [refused, setRefused] = useState(false)
  // With Cache Components, Next keeps a page left behind in React's
  // <Activity> and shows it again with its state. Cleared when the page is
  // hidden, so a later visit follows the refreshed lesson, per
  // node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md
  useLayoutEffect(() => () => setRefused(false), [])

  const lockReason = trialLessonLockReason(trialLesson, now)
  if (lockReason || refused) {
    if (!timeZone) return <TrialLoading />
    return (
      <TrialLocked
        trialLesson={trialLesson}
        timeZone={timeZone}
        lockReason={lockReason}
        refused={refused}
      />
    )
  }
  return (
    <TrialLessonForm
      subjects={subjects}
      editing={trialLesson}
      onLocked={() => setRefused(true)}
    />
  )
}
