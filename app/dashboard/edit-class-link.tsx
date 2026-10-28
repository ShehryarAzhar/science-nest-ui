import Link from "next/link"
import { PencilIcon } from "lucide-react"

import type { ScheduleWeeklyClass } from "@/lib/schedule"
import {
  formatTimeOfDay,
  formatWeekday,
  type LocalWeeklyTime,
} from "@/lib/time-zone"

// Names the class by what the student sees: subject, local weekday and time
export function editClassLabel(
  weeklyClass: ScheduleWeeklyClass,
  local: LocalWeeklyTime,
) {
  return `Edit ${weeklyClass.subject.name}, ${formatWeekday(local.day)} ${formatTimeOfDay(local.hour, local.minute)}`
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
