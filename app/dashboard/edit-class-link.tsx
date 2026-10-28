import Link from "next/link"
import { PencilIcon, Trash2Icon } from "lucide-react"

import type { ScheduleWeeklyClass } from "@/lib/schedule"
import {
  formatTimeOfDay,
  formatWeekday,
  type LocalWeeklyTime,
} from "@/lib/time-zone"

// Names the class by what the student sees: subject, local weekday and time
function classLabel(weeklyClass: ScheduleWeeklyClass, local: LocalWeeklyTime) {
  return `${weeklyClass.subject.name}, ${formatWeekday(local.day)} ${formatTimeOfDay(local.hour, local.minute)}`
}

export function editClassLabel(
  weeklyClass: ScheduleWeeklyClass,
  local: LocalWeeklyTime,
) {
  return `Edit ${classLabel(weeklyClass, local)}`
}

// The Delete controls' name (spec 27), matching the Edit link's
export function deleteClassLabel(
  weeklyClass: ScheduleWeeklyClass,
  local: LocalWeeklyTime,
) {
  return `Delete ${classLabel(weeklyClass, local)}`
}

// The day list's visible Edit link (spec 26), a 44px touch target
export function EditClassLink({
  weeklyClass,
  local,
}: {
  weeklyClass: ScheduleWeeklyClass
  local: LocalWeeklyTime
}) {
  return (
    <Link
      href={`/classes/${weeklyClass.id}/edit`}
      aria-label={editClassLabel(weeklyClass, local)}
      className="-mr-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 font-semibold text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <PencilIcon aria-hidden className="size-4" />
      Edit
    </Link>
  )
}

// The day list's visible Delete control (spec 27), beside Edit; opens the
// dashboard's one confirm dialog
export function DeleteClassButton({
  weeklyClass,
  local,
  onDelete,
}: {
  weeklyClass: ScheduleWeeklyClass
  local: LocalWeeklyTime
  onDelete: (opener: HTMLElement) => void
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={deleteClassLabel(weeklyClass, local)}
      onClick={(event) => onDelete(event.currentTarget)}
      className="-mr-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 font-semibold text-destructive outline-none hover:underline focus-visible:ring-3 focus-visible:ring-destructive/40"
    >
      <Trash2Icon aria-hidden className="size-4" />
      Delete
    </button>
  )
}
