import type { ReactNode } from "react"

import { SessionExpiredRedirect } from "@/components/student-access/session-expired-redirect"
import { StudentAccountNeeded } from "@/components/student-access/student-account-needed"
import { isNoStudentProfileError, isSessionError } from "@/lib/student-access"

// What a student page shows instead of its content for an access failure, or
// null for any other error (the page handles those itself).
// Server: catch (e) { const f = studentAccessFallback(e); if (f) return f; throw e }
// Client: studentFetch never surfaces a 401, so only the 403 case applies
export function studentAccessFallback(error: unknown): ReactNode | null {
  if (isSessionError(error)) {
    return <SessionExpiredRedirect />
  }
  if (isNoStudentProfileError(error)) {
    return <StudentAccountNeeded />
  }
  return null
}
