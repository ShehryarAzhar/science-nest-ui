import { getQueryClient } from "@/components/query-provider";
import {
  formErrorMessage,
  GENERIC_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  normalizeDrfBody,
  type ErrorKind,
  type NormalizedError,
} from "@/lib/drf-errors";
import { safeReturnPath } from "@/lib/return-path";

// Browser fetch wrapper for the student API proxy (app/api/student), for
// Client Components only. The httpOnly cookies travel on their own; this code
// never sees a token

export type StudentMethod = "GET" | "POST" | "PATCH" | "DELETE";

const PREFIX = "/api/student/";

// Thrown for every failure except a 401 (see studentFetch). `status` is what
// the query provider's retry rule reads; the message is always safe to show
export class StudentApiError extends Error {
  readonly kind: ErrorKind;
  readonly status?: number;
  readonly method: StudentMethod;
  readonly normalized: NormalizedError;

  constructor(method: StudentMethod, normalized: NormalizedError) {
    super(formErrorMessage(normalized) ?? GENERIC_ERROR_MESSAGE);
    this.name = "StudentApiError";
    this.kind = normalized.kind;
    this.status = normalized.status ?? undefined;
    this.method = method;
    this.normalized = normalized;
  }
}

function fallback(
  kind: ErrorKind,
  status: number | null,
  message: string,
): NormalizedError {
  return { kind, status, fieldErrors: {}, formErrors: [message] };
}

function parseBody(text: string): { body?: unknown; nonJson: boolean } {
  if (text.trim() === "") {
    return { nonJson: false };
  }
  try {
    return { body: JSON.parse(text), nonJson: false };
  } catch {
    return { nonJson: true };
  }
}

let ending = false;

// Clears the httpOnly cookies on the server, then leaves for the login page
// with a full load: the browser query client, this flag and the header all
// start fresh. Only the first call runs, however many requests got a 401
export async function endStudentSession(): Promise<void> {
  if (ending) {
    return;
  }
  ending = true;

  try {
    await fetch("/api/session/end", { method: "POST", cache: "no-store" });
  } catch {
    // If refresh failed, proxy.ts has already cleared the cookies; leave anyway
  }

  getQueryClient().clear();
  const { pathname, search } = window.location;
  const params = new URLSearchParams({
    expired: "1",
    next: safeReturnPath(pathname + search),
  });
  window.location.replace(`/login?${params}`);
}

// Resolves the JSON body on a 2xx (undefined for 204 or an empty body) and
// throws StudentApiError otherwise. A 401 never settles: it ends the session
// and the page navigates away, so no error state flashes first
export async function studentFetch<T>(
  path: string,
  {
    method = "GET",
    body,
    signal,
  }: { method?: StudentMethod; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  // The proxy adds the backend's trailing slash. Fail loudly instead of
  // fixing the path
  if (!path.startsWith(PREFIX) || path.endsWith("/")) {
    throw new Error(
      `Student API path must start with '${PREFIX}' and not end with '/': ${path}`,
    );
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      signal,
      credentials: "same-origin",
      cache: "no-store",
      headers:
        body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // TanStack Query cancelled it: not a failure
    if (
      signal?.aborted ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw error;
    }
    throw new StudentApiError(
      method,
      fallback("network", null, NETWORK_ERROR_MESSAGE),
    );
  }

  const { status } = response;

  if (status === 401) {
    void endStudentSession();
    return new Promise<never>(() => {});
  }

  const parsed = parseBody(await response.text());

  if (!response.ok) {
    // An empty or non-JSON body gets the generic message
    throw new StudentApiError(
      method,
      normalizeDrfBody(parsed.nonJson ? undefined : parsed.body, status),
    );
  }

  if (parsed.nonJson) {
    throw new StudentApiError(
      method,
      fallback("invalid_response", status, GENERIC_ERROR_MESSAGE),
    );
  }

  return parsed.body as T;
}
