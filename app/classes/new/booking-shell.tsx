"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeftIcon } from "lucide-react"

import { studentAccessFallback } from "@/components/student-access/student-access-fallback"
import { availabilityQueryOptions } from "@/lib/availability"

// The page frame and heading. The form's availability query is the page's
// only student read, so a 403 there (no Student profile) replaces the whole
// page here: the guard's state has its own layout and h1
export function BookingShell({ children }: { children: ReactNode }) {
  const query = useQuery(availabilityQueryOptions())

  if (query.isError) {
    const fallback = studentAccessFallback(query.error)
    if (fallback) return fallback
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <Link
        href="/dashboard"
        className="-ml-1 inline-flex h-11 items-center gap-1 rounded-md px-1 text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeftIcon aria-hidden className="size-4" />
        Dashboard
      </Link>
      <h1 className="mt-4 text-2xl md:text-3xl">Book a weekly class</h1>
      <div className="mt-6 md:mt-8">{children}</div>
    </div>
  )
}
