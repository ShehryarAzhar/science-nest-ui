"use client"

import { useEffect } from "react"

import { endStudentSession } from "@/lib/student-api"

// Rendered by a Server Component whose student-mode read got a 401. Cookies
// can't be deleted while it renders, so this clears them through
// /api/session/end (a POST) and leaves for the login page. Needs JS: without
// it the message stays (see spec 15, Conflicts)
export function SessionExpiredRedirect() {
  useEffect(() => {
    // Runs once however often the effect fires (dev Strict Mode)
    void endStudentSession()
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-10 text-center md:px-6 md:py-12">
      <p role="status" className="max-w-[65ch] text-muted-foreground">
        Your session has expired. Taking you to log in…
      </p>
    </div>
  )
}
