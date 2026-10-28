import type { CSSProperties } from "react"
import Link from "next/link"

import { formatUsd } from "@/lib/format-usd"
import { formatTimeOfDay, formatTimeRange, formatWeekday, WEEKDAYS } from "@/lib/time-zone"
import { cn } from "@/lib/utils"
import { editClassLabel } from "./edit-class-link"
import type { LocalClass, LocalSchedule } from "./local-schedule"

// Tall enough that a 40-minute block (62px after its 2px gap) holds all three
// lines at leading-tight with py-0.5 (about 57px): subject, time, level and
// price. A shorter hour clips the last line, so the Edit link is the
// subject name stretched over the whole block rather than a fourth line
const HOUR_PX = 96
const COLUMNS = "grid-cols-[4.5rem_repeat(7,minmax(0,1fr))]"

function ClassBlock({
  item,
  firstHour,
}: {
  item: LocalClass
  firstHour: number
}) {
  const { weeklyClass, local, startMinutes, endMinutes, lane, lanes } = item
  const style: CSSProperties = {
    top: ((startMinutes - firstHour * 60) / 60) * HOUR_PX + 1,
    height: ((endMinutes - startMinutes) / 60) * HOUR_PX - 2,
    left: `calc(${(lane / lanes) * 100}% + 4px)`,
    width: `calc(${100 / lanes}% - 8px)`,
  }

  return (
    <li
      style={style}
      className="absolute overflow-hidden rounded-sm border-l-[3px] border-primary bg-secondary px-2 py-0.5 text-sm leading-tight text-secondary-foreground has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50"
    >
      <p className="truncate font-semibold">
        <Link
          href={`/classes/${weeklyClass.id}/edit`}
          aria-label={editClassLabel(weeklyClass, local)}
          className="outline-none decoration-1 underline-offset-2 after:absolute after:inset-0 hover:underline"
        >
          {weeklyClass.subject.name}
        </Link>
      </p>
      <p className="truncate tabular-nums">
        {formatTimeRange(local.hour, local.minute, weeklyClass.duration)}
      </p>
      <p className="flex justify-between gap-2">
        <span className="truncate">{weeklyClass.level.name}</span>
        <span className="tabular-nums">{formatUsd(weeklyClass.price)}</span>
      </p>
    </li>
  )
}

// Desktop only: Monday to Sunday in local time, rows from the earliest start
// to the latest end. Hour labels wrap past midnight
export function WeekGrid({
  schedule,
  className,
}: {
  schedule: LocalSchedule
  className?: string
}) {
  const { days, firstHour, lastHour } = schedule
  const hours = Array.from(
    { length: lastHour - firstHour },
    (_, index) => firstHour + index,
  )
  const height = hours.length * HOUR_PX
  // One rule per hour, drawn with the border token
  const hourRules: CSSProperties = {
    height,
    backgroundImage:
      "linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
    backgroundSize: `100% ${HOUR_PX}px`,
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
      <div aria-hidden className={cn("grid border-b border-border", COLUMNS)}>
        <div />
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-l border-border px-3 py-3 font-heading font-semibold"
          >
            {formatWeekday(day)}
          </div>
        ))}
      </div>
      <div className={cn("grid", COLUMNS)}>
        <div aria-hidden className="relative" style={{ height }}>
          {hours.map((hour, index) => (
            <span
              key={hour}
              className="absolute right-3 text-sm text-muted-foreground tabular-nums"
              style={{ top: index * HOUR_PX + 4 }}
            >
              {formatTimeOfDay(hour % 24, 0)}
            </span>
          ))}
        </div>
        {WEEKDAYS.map((day) => {
          const classes = days.find((group) => group.day === day)?.classes
          return (
            <div key={day} className="relative border-l border-border" style={hourRules}>
              {classes && (
                <ul aria-label={formatWeekday(day)}>
                  {classes.map((item) => (
                    <ClassBlock
                      key={item.weeklyClass.id}
                      item={item}
                      firstHour={firstHour}
                    />
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
