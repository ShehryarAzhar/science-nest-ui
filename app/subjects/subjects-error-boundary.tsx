"use client"

import { catchError, type ErrorInfo } from "next/error"
import { CloudOffIcon } from "lucide-react"

import { routeActionClass } from "@/components/route-state"
import { Button } from "@/components/ui/button"
import { SubjectsPanel } from "./subjects-panel"

// Catches a failed getSubjects() below the page header. An error boundary,
// not try/catch: a build that can't reach the backend still fails, and a
// failed revalidation keeps the cached page. The error itself is never shown
function SubjectsError(_props: object, { retry }: ErrorInfo) {
  return (
    <div>
      <SubjectsPanel
        role="alert"
        icon={<CloudOffIcon aria-hidden className="size-5 shrink-0" />}
        heading="Subjects couldn't be loaded"
      >
        <p>Please try again in a moment.</p>
      </SubjectsPanel>
      <Button onClick={() => retry()} className={`mt-4 ${routeActionClass}`}>
        Try again
      </Button>
    </div>
  )
}

export const SubjectsErrorBoundary = catchError(SubjectsError)
