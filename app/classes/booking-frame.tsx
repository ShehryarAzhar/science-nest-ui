import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronLeftIcon } from "lucide-react"

// The page frame and heading of the weekly class pages (specs 25 and 26).
// Plain markup, so Suspense fallbacks and the server can render it too
export function BookingFrame({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <Link
        href="/dashboard"
        className="-ml-1 inline-flex h-11 items-center gap-1 rounded-md px-1 text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeftIcon aria-hidden className="size-4" />
        Dashboard
      </Link>
      <h1 className="mt-4 text-2xl md:text-3xl">{heading}</h1>
      <div className="mt-6 md:mt-8">{children}</div>
    </div>
  )
}
