"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { CircleCheckIcon, GlobeIcon } from "lucide-react"

import { editTrialHref, editTrialLabel } from "@/app/dashboard/edit-trial-link"
import { MeetingLinkNote } from "@/app/dashboard/schedule-notes"
import {
  TrialLessonCard,
  type TrialLessonSummary,
} from "@/app/dashboard/trial-lesson-card"
import { routeActionClass } from "@/components/route-state"
import { buttonVariants } from "@/components/ui/button"
import type { TrialLockReason } from "@/lib/schedule"
import { formatTimeZoneLabel } from "@/lib/time-zone"
import { cn } from "@/lib/utils"

// What the page shows instead of the form: the trial just booked, or the
// student's existing one, upcoming or past (completed, or already started).
// A past trial is a plain fact with a next step; only its card carries the
// locked badge (spec 31). An upcoming one, when its id is known, can be
// edited (spec 29)
export type TrialStatusVariant = "booked" | "upcoming" | "past"

const COPY: Record<TrialStatusVariant, { heading: string; line: string }> = {
  booked: {
    heading: "Your free trial is booked.",
    line: "Here are the details of your free trial lesson.",
  },
  upcoming: {
    heading: "Your free trial is booked.",
    line: "Each student gets one free trial lesson. Here are the details of yours.",
  },
  past: {
    heading: "You've already had your free trial.",
    line: "Each student gets one free trial lesson. To keep learning, book a weekly class.",
  },
}

const actionClass = cn(routeActionClass, "w-full sm:w-auto")

export function TrialStatus({
  variant,
  trialLesson,
  timeZone,
  now,
  lockReason = null,
}: {
  variant: TrialStatusVariant
  trialLesson: TrialLessonSummary
  timeZone: string
  now: Date
  // The card's locked display, for the "past" variant
  lockReason?: TrialLockReason | null
}) {
  const { heading, line } = COPY[variant]

  // A booking replaces the form, so focus follows it to the confirmation
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (variant === "booked") headingRef.current?.focus()
  }, [variant])

  return (
    <div className="flex max-w-[65ch] flex-col gap-6">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="flex items-center gap-2 text-xl outline-none"
        >
          {variant === "booked" && (
            <CircleCheckIcon aria-hidden className="size-5 shrink-0 text-success" />
          )}
          {heading}
        </h2>
        <p className="mt-1 text-muted-foreground">{line}</p>
      </div>

      <TrialLessonCard
        trialLesson={trialLesson}
        timeZone={timeZone}
        headingLevel="h3"
        lockReason={lockReason}
      />

      <div className="flex flex-col gap-2 text-muted-foreground">
        {variant !== "past" && <MeetingLinkNote />}
        <p className="flex gap-2">
          <GlobeIcon aria-hidden className="mt-1 size-4 shrink-0" />
          Times are in {formatTimeZoneLabel(timeZone, now)}.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {variant === "past" && (
          <Link
            href="/classes/new"
            className={cn(buttonVariants(), actionClass)}
          >
            Book a weekly class
          </Link>
        )}
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: variant === "past" ? "outline" : "default" }),
            actionClass,
          )}
        >
          Go to dashboard
        </Link>
        {variant !== "past" && trialLesson.id !== undefined && (
          <Link
            href={editTrialHref(trialLesson.id)}
            aria-label={editTrialLabel(trialLesson, timeZone)}
            className={cn(buttonVariants({ variant: "outline" }), actionClass)}
          >
            Edit trial lesson
          </Link>
        )}
      </div>
    </div>
  )
}
