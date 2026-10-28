"use client"

import { useSyncExternalStore } from "react"
import { useQuery } from "@tanstack/react-query"
import { CloudOffIcon } from "lucide-react"

import { SubjectsPanel } from "@/app/subjects/subjects-panel"
import { routeActionClass } from "@/components/route-state"
import { studentAccessFallback } from "@/components/student-access/student-access-fallback"
import { Button } from "@/components/ui/button"
import { scheduleQueryOptions } from "@/lib/schedule"
import { getBrowserTimeZone } from "@/lib/time-zone"
import { DashboardShell } from "./dashboard-shell"
import { ScheduleView } from "./schedule-view"

const subscribe = () => () => {}

// Static on purpose: CLAUDE.md › Design › Motion allows no pulse
function DashboardLoading() {
  return (
    <DashboardShell>
      <div role="status">
        <span className="sr-only">Loading…</span>
        <div aria-hidden className="h-96 rounded-lg bg-muted" />
      </div>
    </DashboardShell>
  )
}

export function Dashboard() {
  const query = useQuery(scheduleQueryOptions())
  // null on the server and the first client render, so the prerendered HTML
  // never holds the server's local times
  const timeZone = useSyncExternalStore(
    subscribe,
    getBrowserTimeZone,
    () => null,
  )

  // A refetch that fails keeps the schedule already shown
  if (query.data && timeZone) {
    return (
      <DashboardShell>
        <ScheduleView schedule={query.data} timeZone={timeZone} />
      </DashboardShell>
    )
  }

  if (query.isError) {
    // A 403 (no Student profile) replaces the page. studentFetch never
    // surfaces a 401: that query stays pending while the session ends
    const fallback = studentAccessFallback(query.error)
    if (fallback) return fallback

    return (
      <DashboardShell>
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
      </DashboardShell>
    )
  }

  return <DashboardLoading />
}
