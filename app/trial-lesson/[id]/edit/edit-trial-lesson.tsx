"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CloudOffIcon } from "lucide-react"

import { SubjectsPanel } from "@/app/subjects/subjects-panel"
import { routeActionClass } from "@/components/route-state"
import { Button } from "@/components/ui/button"
import {
  isTrialLessonLocked,
  trialLessonQueryOptions,
  type ScheduleTrialLesson,
} from "@/lib/schedule"
import { isNoStudentProfileError } from "@/lib/student-access"
import { StudentApiError } from "@/lib/student-api"
import type { Subject } from "@/lib/subjects"
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

// The lesson only loads in the browser, so "now" is never taken in the
// prerender. Taken once: a lesson that starts while the form is open is
// refused by the backend on save (403 in the form alert)
function LoadedTrial({
  trialLesson,
  subjects,
}: {
  trialLesson: ScheduleTrialLesson
  subjects: readonly Subject[]
}) {
  const [now] = useState(() => new Date())
  if (isTrialLessonLocked(trialLesson, now)) return <TrialLocked />
  return <TrialLessonForm subjects={subjects} editing={trialLesson} />
}
