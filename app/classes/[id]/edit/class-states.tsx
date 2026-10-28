import Link from "next/link"
import { SearchXIcon } from "lucide-react"

import { SubjectsPanel } from "@/app/subjects/subjects-panel"
import { routeActionClass } from "@/components/route-state"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Static on purpose: CLAUDE.md › Design › Motion allows no pulse
export function ClassLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className="h-96 max-w-4xl rounded-lg bg-muted" />
    </div>
  )
}

// A malformed id, or a 404: deleted, or another student's class
export function ClassNotFound() {
  return (
    <div className="max-w-4xl">
      <SubjectsPanel
        icon={<SearchXIcon aria-hidden className="size-5 shrink-0" />}
        heading="Class not found"
      >
        <p>
          This class may have been deleted, or the link is wrong. Your
          dashboard lists the weekly classes you can edit.
        </p>
      </SubjectsPanel>
      <div className="mt-4">
        <Link href="/dashboard" className={cn(buttonVariants(), routeActionClass)}>
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
