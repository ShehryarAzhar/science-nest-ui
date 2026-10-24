import type { NextRequest } from "next/server";

import { ApiError, apiRequestWithStatus, type Method } from "@/lib/api-client";
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE } from "@/lib/drf-errors";
import { env } from "@/lib/env";

// Forwards browser requests for the student endpoints to Django with the JWT
// from the httpOnly cookie, and passes the status and body back. Only the
// paths and methods below are forwarded; nothing else reaches the backend

type Context = RouteContext<"/api/student/[...path]">;

const ID = /^[1-9]\d*$/;
const COLLECTIONS = ["classes", "trial-lessons"];

// Allowed methods for a path, or null if the path isn't forwarded
function allowedMethods(segments: string[]): Method[] | null {
  const [first, id, ...rest] = segments;
  if (rest.length > 0) {
    return null;
  }
  if (id === undefined) {
    if (first === "schedule" || first === "availability") {
      return ["GET"];
    }
    if (COLLECTIONS.includes(first)) {
      return ["GET", "POST"];
    }
    return null;
  }
  // Edits use PATCH only
  if (COLLECTIONS.includes(first) && ID.test(id)) {
    return ["GET", "PATCH", "DELETE"];
  }
  return null;
}

function respond(
  status: number,
  body?: unknown,
  headers: Record<string, string> = {},
): Response {
  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    ...headers,
  });
  if (body === undefined) {
    return new Response(null, { status, headers: responseHeaders });
  }
  responseHeaders.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

function errorResponse(error: unknown): Response {
  if (!(error instanceof ApiError)) {
    // Never copy the error's own message: it may hold internal details
    return respond(500, { detail: GENERIC_ERROR_MESSAGE });
  }

  switch (error.kind) {
    case "http":
      // An HTML error page is never passed to the browser
      if (error.nonJson) {
        return respond(error.status ?? 502, { detail: GENERIC_ERROR_MESSAGE });
      }
      // Django's body as sent, or empty (the client's own 401 for a missing
      // cookie)
      return respond(error.status ?? 502, error.body);
    case "network":
      return respond(error.timedOut ? 504 : 502, {
        detail: NETWORK_ERROR_MESSAGE,
      });
    case "invalid_response":
      return respond(502, { detail: GENERIC_ERROR_MESSAGE });
  }
}

async function handle(request: NextRequest, ctx: Context): Promise<Response> {
  const { path } = await ctx.params;
  const methods = allowedMethods(path);

  if (!methods) {
    return respond(404, { detail: "Not found." });
  }

  const method = request.method as Method;
  if (!methods.includes(method)) {
    return respond(
      405,
      { detail: `Method "${request.method}" not allowed.` },
      { Allow: methods.join(", ") },
    );
  }

  // sameSite: lax cookies block most cross-site writes; this closes the rest
  if (method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin !== new URL(env.SITE_URL).origin) {
      return respond(403, { detail: "Cross-site request refused." });
    }
  }

  let body: unknown;
  if (method === "POST" || method === "PATCH") {
    try {
      body = JSON.parse(await request.text());
    } catch {
      return respond(400, { detail: "Invalid JSON body." });
    }
  }

  // Only the method, the mapped path and the body are forwarded: no browser
  // headers, cookies or query string
  try {
    const result = await apiRequestWithStatus<unknown>(
      method,
      `/${path.join("/")}/`,
      { auth: "student", body },
    );
    return respond(result.status, result.body);
  } catch (error) {
    return errorResponse(error);
  }
}

// PUT and HEAD are exported so they get this path's 405 and Allow header,
// instead of Next's route-wide ones or a HEAD mapped onto a backend GET
export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
