"use client"

import { useEffect, useRef, type ReactNode } from "react"
import Link from "next/link"

import { RouteState, routeActionClass } from "@/components/route-state"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Shared by app/error.tsx and app/global-error.tsx. Only the digest is read
// from the error: its message and stack are never shown
export function ErrorState({
  error,
  retry,
  fullReloadHome = false,
  media,
}: {
  error: unknown
  retry: () => void
  // global-error: the root layout failed, so leave with a full page load
  fullReloadHome?: boolean
  media?: ReactNode
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const digest =
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : null

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const homeClass = cn(buttonVariants({ variant: "outline" }), routeActionClass)

  return (
    <>
      <title>Something went wrong · Science Nest</title>
      <RouteState
        media={media}
        heading="Something went wrong"
        headingRef={headingRef}
        description="This page couldn't be loaded. Try again, or go back to the home page."
        descriptionRole="alert"
        actions={
          <>
            <Button onClick={() => retry()} className={routeActionClass}>
              Try again
            </Button>
            {fullReloadHome ? (
              // A full load on purpose: the root layout itself has failed
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a href="/" className={homeClass}>
                Home
              </a>
            ) : (
              <Link href="/" className={homeClass}>
                Home
              </Link>
            )}
          </>
        }
        footnote={digest && `Reference: ${digest}`}
      />
    </>
  )
}
