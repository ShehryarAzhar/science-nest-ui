import { formatUsd } from "@/lib/format-usd"
import { formatTimeRange, formatWeekday } from "@/lib/time-zone"
import { cn } from "@/lib/utils"
import { EditClassLink } from "./edit-class-link"
import type { LocalSchedule } from "./local-schedule"

// Mobile: only the days with classes, Monday first, in local time
export function DayList({
  schedule,
  className,
}: {
  schedule: LocalSchedule
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {schedule.days.map(({ day, classes }) => (
        <section key={day} aria-labelledby={`day-${day}`}>
          <h3 id={`day-${day}`} className="text-base">
            {formatWeekday(day)}
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {classes.map(({ weeklyClass, local }) => (
              <li
                key={weeklyClass.id}
                className="flex items-start justify-between gap-4 rounded-sm border-l-[3px] border-primary bg-secondary px-3 py-2 text-secondary-foreground"
              >
                <div className="min-w-0">
                  <p className="font-semibold wrap-anywhere">
                    {weeklyClass.subject.name}
                  </p>
                  <p className="text-sm">{weeklyClass.level.name}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="text-right tabular-nums">
                    <p>
                      {formatTimeRange(local.hour, local.minute, weeklyClass.duration)}
                    </p>
                    <p className="text-sm">{formatUsd(weeklyClass.price)}</p>
                  </div>
                  <EditClassLink weeklyClass={weeklyClass} local={local} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
