import "server-only";

import axios from "axios";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

// Server-only client for the Django backend. Every call names its mode:
// "public" never reads cookies (safe inside "use cache"), "student" sends the
// access cookie as `Authorization: JWT <token>`

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Auth = "public" | "student";

export type ApiErrorKind = "http" | "network" | "invalid_response";

// Thrown for every failed call. `body` is the backend's JSON as sent (DRF
// field errors, non_field_errors or detail). `normalizeApiError` in
// `lib/api-errors.ts` normalizes it
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly body?: unknown;
  readonly nonJson: boolean;
  // Only set for network errors: the request hit the 10 s timeout
  readonly timedOut: boolean;

  constructor(
    message: string,
    details: {
      kind: ApiErrorKind;
      status?: number;
      body?: unknown;
      nonJson?: boolean;
      timedOut?: boolean;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = details.kind;
    this.status = details.status;
    this.body = details.body;
    this.nonJson = details.nonJson ?? false;
    this.timedOut = details.timedOut ?? false;
  }
}

// Status checks and JSON parsing happen below, so axios only throws for
// transport failures and its errors (which hold headers) never escape
const http = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 10_000,
  headers: { Accept: "application/json" },
  validateStatus: () => true,
  responseType: "text",
  transformResponse: [(data) => data],
});

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

// Like apiRequest, but also resolves the 2xx status, for callers that pass it
// on (the student API proxy)
export async function apiRequestWithStatus<T>(
  method: Method,
  path: string,
  { auth, body }: { auth: Auth; body?: unknown },
): Promise<{ status: number; body: T }> {
  // Every backend path ends with a slash. Fail loudly instead of fixing it
  if (!path.startsWith("/") || !path.endsWith("/")) {
    throw new Error(`API path must start and end with '/': ${path}`);
  }

  const label = `${method} ${path}`;
  const headers: Record<string, string> = {};

  if (auth === "student") {
    const access = (await cookies()).get("access")?.value;
    // The proxy has already tried a refresh, so no cookie means logged out
    if (!access) {
      throw new ApiError(`${label} failed: 401`, { kind: "http", status: 401 });
    }
    headers.Authorization = `JWT ${access}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await http.request<string>({
      method,
      url: path,
      headers,
      data: body,
    });
  } catch (error) {
    const timedOut =
      axios.isAxiosError(error) &&
      (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT");
    throw new ApiError(
      `${label} failed: ${timedOut ? "timed out" : "network error"}`,
      { kind: "network", timedOut },
    );
  }

  const { status } = response;
  const parsed = parseBody(
    typeof response.data === "string" ? response.data : "",
  );

  if (status < 200 || status >= 300) {
    throw new ApiError(`${label} failed: ${status}`, {
      kind: "http",
      status,
      ...parsed,
    });
  }

  if (parsed.nonJson) {
    throw new ApiError(`${label} failed: non-JSON response`, {
      kind: "invalid_response",
      nonJson: true,
    });
  }

  // body is undefined for 204 or an empty body
  return { status, body: parsed.body as T };
}

export async function apiRequest<T>(
  method: Method,
  path: string,
  options: { auth: Auth; body?: unknown },
): Promise<T> {
  return (await apiRequestWithStatus<T>(method, path, options)).body;
}

export const api = {
  get: <T>(path: string, options: { auth: Auth }) =>
    apiRequest<T>("GET", path, options),
  post: <T>(path: string, options: { auth: Auth; body?: unknown }) =>
    apiRequest<T>("POST", path, options),
  put: <T>(path: string, options: { auth: Auth; body?: unknown }) =>
    apiRequest<T>("PUT", path, options),
  patch: <T>(path: string, options: { auth: Auth; body?: unknown }) =>
    apiRequest<T>("PATCH", path, options),
  delete: <T = void>(path: string, options: { auth: Auth }) =>
    apiRequest<T>("DELETE", path, options),
};
