import { GlobeIcon, VideoIcon } from "lucide-react"

import { formatTimeZoneLabel, observesDaylightSaving } from "@/lib/time-zone"

// The daylight-saving note (spec 06) only matters for weekly classes, which
// are fixed in UTC
export function ScheduleNotes({
  timeZone,
  now,
  hasWeeklyClasses,
}: {
  timeZone: string
  now: Date
  hasWeeklyClasses: boolean
}) {
  const label = formatTimeZoneLabel(timeZone, now)
  const zoneNote =
    hasWeeklyClasses && observesDaylightSaving(timeZone, now)
      ? `Times are in ${label}. Weekly classes are fixed in UTC, so their local time moves by an hour when your clocks change.`
      : `Times are in ${label}.`

  return (
    <div className="flex max-w-[65ch] flex-col gap-2 text-muted-foreground">
      <p className="flex gap-2">
        <GlobeIcon aria-hidden className="mt-1 size-4 shrink-0" />
        {zoneNote}
      </p>
      <p className="flex gap-2">
        <VideoIcon aria-hidden className="mt-1 size-4 shrink-0" />
        Lessons are on Zoom or Google Meet. Your tutor sends the meeting link
        before each lesson, on WhatsApp to your registered phone number, or by
        email.
      </p>
    </div>
  )
}
