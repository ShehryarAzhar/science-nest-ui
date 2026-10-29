import Link from "next/link"
import { PencilIcon } from "lucide-react"

import { formatTrialDateTime } from "@/lib/time-zone"
import type { TrialLessonSummary } from "./trial-lesson-card"

// Names the trial lesson by what the student sees: subject, local date and
// hour (spec 29)
export function editTrialLabel(
  trialLesson: TrialLessonSummary,
  timeZone: string,
) {
  return `Edit free trial, ${trialLesson.subject.name}, ${formatTrialDateTime(trialLesson.starts_at, timeZone)}`
}

export function editTrialHref(id: number) {
  return `/trial-lesson/${id}/edit`
}

// The Free trial card's Edit link, a 44px touch target like the day list's
// class links. Only for an upcoming trial: a locked one can't be edited
export function EditTrialLink({
  trialLesson,
  id,
  timeZone,
}: {
  trialLesson: TrialLessonSummary
  id: number
  timeZone: string
}) {
  return (
    <Link
      href={editTrialHref(id)}
      aria-label={editTrialLabel(trialLesson, timeZone)}
      className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 font-semibold text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <PencilIcon aria-hidden className="size-4" />
      Edit
    </Link>
  )
}
