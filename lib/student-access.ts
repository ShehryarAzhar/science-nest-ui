// Recognizers for student-endpoint access failures, shared by server and
// client. Structural checks only, so they work on both the server ApiError
// (lib/api-client.ts, server-only) and the browser StudentApiError
// (lib/student-api.ts) without importing either

function statusOf(error: unknown): unknown {
  return typeof error === "object" && error !== null && "status" in error
    ? error.status
    : undefined;
}

// No session (or one Django rejected)
export function isSessionError(error: unknown): boolean {
  return statusOf(error) === 401;
}

// A logged-in account with no Student profile (admin or staff). Only a read
// counts: a 403 from PATCH or DELETE is a locked trial lesson, shown as the
// lock notice (spec 31). The server ApiError has no method, and only Server
// Components (which only read) pass it here; server actions use
// normalizeApiError() instead
export function isNoStudentProfileError(error: unknown): boolean {
  if (statusOf(error) !== 403) {
    return false;
  }
  if (typeof error === "object" && error !== null && "method" in error) {
    return error.method === "GET";
  }
  return true;
}
