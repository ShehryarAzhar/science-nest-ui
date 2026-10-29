"use client"

import {
  createContext,
  use,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { useQuery } from "@tanstack/react-query"
import { CloudOffIcon } from "lucide-react"

import type { TrialLessonSummary } from "@/app/dashboard/trial-lesson-card"
import { SubjectsPanel } from "@/app/subjects/subjects-panel"
import { routeActionClass } from "@/components/route-state"
import { Button } from "@/components/ui/button"
import { scheduleQueryOptions, type ScheduleTrialLesson } from "@/lib/schedule"
import { isNoStudentProfileError } from "@/lib/student-access"
import { getBrowserTimeZone, parseStartsAt } from "@/lib/time-zone"
import { TrialStatus } from "./trial-status"

// Spec 28. One trial lesson per student, and the public "Book a free trial"
// buttons can't know who has one, so the schedule decides: the student's
// trial lesson if there is one, otherwise the form. The form comes in as a
// server-rendered slot (it needs the subject list), so it reports a booking
// through context rather than a callback prop

const TrialBookedContext = createContext<
  ((trialLesson: TrialLessonSummary) => void) | null
>(null)

export function useOnTrialBooked() {
  const onBooked = use(TrialBookedContext)
  if (!onBooked) throw new Error("useOnTrialBooked needs TrialLessonBooking.")
  return onBooked
}

const subscribe = () => () => {}

// Static on purpose: CLAUDE.md › Design › Motion allows no pulse
function TrialLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className="h-96 max-w-4xl rounded-lg bg-muted" />
    </div>
  )
}

export function TrialLessonBooking({ form }: { form: ReactNode }) {
  const query = useQuery(scheduleQueryOptions())
  // null on the server and the first client render, so the prerendered HTML
  // never holds the server's local times
  const timeZone = useSyncExternalStore(
    subscribe,
    getBrowserTimeZone,
    () => null,
  )

  // The trial just booked. It wins over the schedule, which by then holds
  // the same lesson, so the confirmation stays for this visit
  const [booked, setBooked] = useState<TrialLessonSummary | null>(null)

  // With Cache Components, Next keeps a page left behind in React's
  // <Activity> and shows it again with its state. Cleared when the page is
  // hidden, so a later visit shows the existing-trial state from the
  // schedule instead of an old confirmation, per node_modules/next/dist/docs/
  // 01-app/02-guides/preserving-ui-state.md. An unsaved draft is kept
  useLayoutEffect(() => () => setBooked(null), [])

  if (booked && timeZone) {
    return (
      <BookedTrial trialLesson={booked} timeZone={timeZone} />
    )
  }

  // A refetch that fails keeps the schedule already shown
  if (query.data && timeZone) {
    const trialLesson = query.data.trial_lesson
    if (trialLesson) {
      return <ExistingTrial trialLesson={trialLesson} timeZone={timeZone} />
    }
    return <TrialBookedContext value={setBooked}>{form}</TrialBookedContext>
  }

  if (query.isError) {
    // BookingShell replaces the page on a 403. studentFetch never surfaces
    // a 401: the query stays pending while the session ends
    if (isNoStudentProfileError(query.error)) return null

    return (
      <div className="max-w-4xl">
        <SubjectsPanel
          role="alert"
          icon={<CloudOffIcon aria-hidden className="size-5 shrink-0" />}
          heading="Your schedule couldn't be loaded"
        >
          <p>Please try again in a moment.</p>
        </SubjectsPanel>
        <div className="mt-4">
          <Button
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className={routeActionClass}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return <TrialLoading />
}

// Rendered only in the browser, so "now" is never taken in the prerender
function BookedTrial({
  trialLesson,
  timeZone,
}: {
  trialLesson: TrialLessonSummary
  timeZone: string
}) {
  const [now] = useState(() => new Date())
  return (
    <TrialStatus
      variant="booked"
      trialLesson={trialLesson}
      timeZone={timeZone}
      now={now}
    />
  )
}

// Past once completed (set in admin) or started: the same test as the
// backend's lock. "Now" is taken once, so the version doesn't change while
// the page is open
function ExistingTrial({
  trialLesson,
  timeZone,
}: {
  trialLesson: ScheduleTrialLesson
  timeZone: string
}) {
  const [now] = useState(() => new Date())
  const past =
    trialLesson.completed ||
    parseStartsAt(trialLesson.starts_at).getTime() <= now.getTime()
  return (
    <TrialStatus
      variant={past ? "past" : "upcoming"}
      trialLesson={trialLesson}
      timeZone={timeZone}
      now={now}
    />
  )
}
