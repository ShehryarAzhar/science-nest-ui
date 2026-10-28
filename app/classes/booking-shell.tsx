"use client"

import type { ReactNode } from "react"
import { useQueries } from "@tanstack/react-query"

import { studentAccessFallback } from "@/components/student-access/student-access-fallback"
import { availabilityQueryOptions } from "@/lib/availability"
import { weeklyClassQueryOptions } from "@/lib/schedule"
import { BookingFrame } from "./booking-frame"

// The page's student reads are availability and, when editing, the class
// itself. A 403 from either (no Student profile) replaces the whole page
// here: the guard's state has its own layout and h1
export function BookingShell({
  heading,
  classId,
  children,
}: {
  heading: string
  classId?: number
  children: ReactNode
}) {
  const queries = useQueries({
    queries: [
      availabilityQueryOptions(),
      ...(classId === undefined ? [] : [weeklyClassQueryOptions(classId)]),
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
