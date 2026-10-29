import Link from "next/link"
import { PencilIcon, XIcon } from "lucide-react"

import { formatTrialDateTime } from "@/lib/time-zone"
import type { TrialLessonSummary } from "./trial-lesson-card"

// Names the trial lesson by what the student sees: subject, local date and
// hour (specs 29 and 30)
function trialLessonLabel(trialLesson: TrialLessonSummary, timeZone: string) {
  return `free trial, ${trialLesson.subject.name}, ${formatTrialDateTime(trialLesson.starts_at, timeZone)}`
}

export function editTrialLabel(
  trialLesson: TrialLessonSummary,
  timeZone: string,
) {
  return `Edit ${trialLessonLabel(trialLesson, timeZone)}`
}

// The Cancel control's name (spec 30), matching the Edit link's
export function cancelTrialLabel(
  trialLesson: TrialLessonSummary,
  timeZone: string,
) {
  return `Cancel ${trialLessonLabel(trialLesson, timeZone)}`
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

// The Free trial card's Cancel control (spec 30), beside Edit and styled
// like the day list's Delete; opens the dashboard's cancel dialog. Only for
// an upcoming trial: a locked one can't be cancelled
export function CancelTrialButton({
  trialLesson,
  timeZone,
  onCancel,
}: {
  trialLesson: TrialLessonSummary
  timeZone: string
  onCancel: (opener: HTMLElement) => void
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={cancelTrialLabel(trialLesson, timeZone)}
      onClick={(event) => onCancel(event.currentTarget)}
      className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 font-semibold text-destructive outline-none hover:underline focus-visible:ring-3 focus-visible:ring-destructive/40"
    >
      <XIcon aria-hidden className="size-4" />
      Cancel
    </button>
  )
}
