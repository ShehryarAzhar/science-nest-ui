import Link from "next/link"
import { LockIcon, SearchXIcon } from "lucide-react"

import { SubjectsPanel } from "@/app/subjects/subjects-panel"
import { routeActionClass } from "@/components/route-state"
import { buttonVariants } from "@/components/ui/button"
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

// Completed or already started, so the backend refuses edits. A plain
// fact, not a warning: spec 31 owns the locked display
export function TrialLocked() {
  return (
    <div className="max-w-4xl">
      <SubjectsPanel
        icon={<LockIcon aria-hidden className="size-5 shrink-0" />}
        heading="This trial lesson can no longer be changed"
      >
        <p>It has already started, or it has been marked as completed.</p>
      </SubjectsPanel>
      <DashboardLink />
    </div>
  )
}
