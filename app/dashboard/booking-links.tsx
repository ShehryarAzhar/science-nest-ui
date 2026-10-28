import Link from "next/link"

import { routeActionClass } from "@/components/route-state"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The trial link only while the student has no trial lesson (one each).
// Whichever link comes first is the primary one
export function BookingLinks({
  hasTrialLesson,
  className,
}: {
  hasTrialLesson: boolean
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {!hasTrialLesson && (
        <Link
          href="/trial-lesson/new"
          className={cn(buttonVariants(), routeActionClass)}
        >
          Book a free trial
        </Link>
      )}
      <Link
        href="/classes/new"
        className={cn(
          buttonVariants({ variant: hasTrialLesson ? "default" : "outline" }),
          routeActionClass,
        )}
      >
        Book a weekly class
      </Link>
    </div>
  )
}
