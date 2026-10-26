"use client"

import Link from "next/link"
import { catchError, type ErrorInfo } from "next/error"
import { CloudOffIcon } from "lucide-react"

import { routeActionClass } from "@/components/route-state"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SubjectsPanel } from "./subjects-panel"

// Catches a failed getSubjects() below the page header. An error boundary,
// not try/catch: a build that can't reach the backend still fails, and a
// failed revalidation keeps the cached page. The error itself is never shown.
// `standalone` is for a subject detail page, where the panel replaces the
// whole page: it carries the h1 and a way back to the list. notFound() passes
// through catchError untouched
function SubjectsError(
  { standalone = false }: { standalone?: boolean },
  { retry }: ErrorInfo,
) {
  return (
    <div className={standalone ? "py-10 md:py-14" : undefined}>
      <SubjectsPanel
        role="alert"
        icon={<CloudOffIcon aria-hidden className="size-5 shrink-0" />}
        heading="Subjects couldn't be loaded"
        headingLevel={standalone ? "h1" : "h2"}
      >
        <p>Please try again in a moment.</p>
      </SubjectsPanel>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => retry()} className={routeActionClass}>
          Try again
        </Button>
        {standalone && (
          <Link
            href="/subjects"
            className={cn(buttonVariants({ variant: "outline" }), routeActionClass)}
          >
            Subjects
          </Link>
        )}
      </div>
    </div>
  )
}

export const SubjectsErrorBoundary = catchError(SubjectsError)
