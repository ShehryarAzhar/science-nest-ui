"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { LockIcon, SearchXIcon } from "lucide-react"

import {
  TrialLessonCard,
  TrialLockedNotice,
} from "@/app/dashboard/trial-lesson-card"
import { SubjectsPanel } from "@/app/subjects/subjects-panel"
import { routeActionClass } from "@/components/route-state"
import { buttonVariants } from "@/components/ui/button"
import type { ScheduleTrialLesson, TrialLockReason } from "@/lib/schedule"
import { cn } from "@/lib/utils"

// States shared by the trial lesson pages (specs 28 and 29)

// Static on purpose: CLAUDE.md › Design › Motion allows no pulse
export function TrialLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className="h-96 max-w-4xl rounded-lg bg-muted" />
    </div>
  )
}

function DashboardLink() {
  return (
    <div className="mt-4">
      <Link href="/dashboard" className={cn(buttonVariants(), routeActionClass)}>
        Go to dashboard
      </Link>
    </div>
  )
}

// A malformed id, or a 404: cancelled, or another student's trial lesson
export function TrialNotFound() {
  return (
    <div className="max-w-4xl">
      <SubjectsPanel
        icon={<SearchXIcon aria-hidden className="size-5 shrink-0" />}
        heading="Trial lesson not found"
      >
        <p>
          This trial lesson may have been cancelled, or the link is wrong.
          Your dashboard shows your trial lesson if you have one.
        </p>
      </SubjectsPanel>
      <DashboardLink />
    </div>
  )
}

// Completed or already started, so the backend refuses edits (spec 31).
// The card shows the lock when the loaded data does. `refused`: a save the
// backend just refused with a 403, which may come before the data shows it;
// the lock notice then replaces the panel's line and the heading takes focus,
// since the form it replaces is gone
export function TrialLocked({
  trialLesson,
  timeZone,
  lockReason,
  refused,
}: {
  trialLesson: ScheduleTrialLesson
  timeZone: string
  lockReason: TrialLockReason | null
  refused: boolean
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (refused) headingRef.current?.focus()
  }, [refused])

  return (
    <div className="max-w-4xl">
      <SubjectsPanel
        icon={<LockIcon aria-hidden className="size-5 shrink-0" />}
        heading="This trial lesson can no longer be changed"
        headingRef={headingRef}
      >
        {refused ? (
          <TrialLockedNotice show className="mt-2" />
        ) : (
          <p>It has already started, or it has been marked as completed.</p>
        )}
      </SubjectsPanel>
      <div className="mt-6">
        <TrialLessonCard
          trialLesson={trialLesson}
          timeZone={timeZone}
          headingLevel="h3"
          lockReason={lockReason}
        />
      </div>
      <DashboardLink />
    </div>
  )
}
