"use client"

import { useQuery } from "@tanstack/react-query"
import { CloudOffIcon } from "lucide-react"

import { SubjectsPanel } from "@/app/subjects/subjects-panel"
import { routeActionClass } from "@/components/route-state"
import { Button } from "@/components/ui/button"
import { weeklyClassQueryOptions } from "@/lib/schedule"
import { isNoStudentProfileError } from "@/lib/student-access"
import { StudentApiError } from "@/lib/student-api"
import type { Subject } from "@/lib/subjects"
import { WeeklyClassForm } from "../../weekly-class-form"
import { ClassLoading, ClassNotFound } from "./class-states"

// Spec 26. The form appears only once the class has loaded, prefilled from
// it. A background refetch doesn't reset it: the student's edits stay
export function EditWeeklyClass({
  classId,
  subjects,
}: {
  classId: number
  subjects: readonly Subject[]
}) {
  const query = useQuery(weeklyClassQueryOptions(classId))

  if (query.data) {
    return <WeeklyClassForm subjects={subjects} editing={query.data} />
  }

  if (query.isError) {
    // BookingShell replaces the page on a 403. studentFetch never surfaces
    // a 401: the query stays pending while the session ends
    if (isNoStudentProfileError(query.error)) return null
    // Any 404, whatever its body: CLAUDE.md doesn't document one here
    if (query.error instanceof StudentApiError && query.error.status === 404) {
      return <ClassNotFound />
    }

    return (
      <div className="max-w-4xl">
        <SubjectsPanel
          role="alert"
          icon={<CloudOffIcon aria-hidden className="size-5 shrink-0" />}
          heading="This class couldn't be loaded"
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

  return <ClassLoading />
}
