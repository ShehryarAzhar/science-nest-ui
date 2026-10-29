import { GlobeIcon, VideoIcon } from "lucide-react"

import { formatTimeZoneLabel, weeklyTimeZoneNote } from "@/lib/time-zone"

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
  const zoneNote = hasWeeklyClasses
    ? weeklyTimeZoneNote(timeZone, now)
    : `Times are in ${formatTimeZoneLabel(timeZone, now)}.`

  return (
    <div className="flex max-w-[65ch] flex-col gap-2 text-muted-foreground">
      <p className="flex gap-2">
        <GlobeIcon aria-hidden className="mt-1 size-4 shrink-0" />
        {zoneNote}
      </p>
      <MeetingLinkNote />
    </div>
  )
}

// Also on the trial booking page (spec 28), with the same wording
export function MeetingLinkNote() {
  return (
    <p className="flex gap-2">
      <VideoIcon aria-hidden className="mt-1 size-4 shrink-0" />
      Lessons are on Zoom or Google Meet. Your tutor sends the meeting link
      before each lesson, on WhatsApp to your registered phone number, or by
      email.
    </p>
  )
}
