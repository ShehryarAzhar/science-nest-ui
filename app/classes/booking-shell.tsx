"use client"

import type { ReactNode } from "react"
import { useQueries } from "@tanstack/react-query"

import { studentAccessFallback } from "@/components/student-access/student-access-fallback"
import { availabilityQueryOptions } from "@/lib/availability"
import { scheduleQueryOptions, weeklyClassQueryOptions } from "@/lib/schedule"
import { BookingFrame } from "./booking-frame"

// The page's student reads are availability and, when editing, the class
// itself; the trial booking page (spec 28) also reads the schedule. A 403
// from any of them (no Student profile) replaces the whole page here: the
// guard's state has its own layout and h1
export function BookingShell({
  heading,
  classId,
  schedule = false,
  children,
}: {
  heading: string
  classId?: number
  schedule?: boolean
  children: ReactNode
}) {
  const queries = useQueries({
    queries: [
      availabilityQueryOptions(),
      ...(classId === undefined ? [] : [weeklyClassQueryOptions(classId)]),
      ...(schedule ? [scheduleQueryOptions()] : []),
    ],
  })

  for (const query of queries) {
    if (query.isError) {
      const fallback = studentAccessFallback(query.error)
      if (fallback) return fallback
    }
  }

  return <BookingFrame heading={heading}>{children}</BookingFrame>
}
