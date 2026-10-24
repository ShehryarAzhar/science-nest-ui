import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env-core";

// Built at module load, outside the try below, so a config error isn't
// mistaken for a failed refresh
const REFRESH_URL = `${env.API_BASE_URL}/auth/jwt/refresh/`;

// Same options as the access cookie set by the login action
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 270,
} as const;

const STUDENT_PREFIXES = ["/dashboard", "/account", "/classes", "/trial-lesson"];
const GUEST_ONLY_PREFIXES = ["/login", "/register"];

// Whole segments only, so "/dashboards" isn't a student route
function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const access = request.cookies.get("access");
  const refresh = request.cookies.get("refresh");

  // Access expired but we still have a refresh cookie: get a new access token
  let newAccess: string | undefined;
  let refreshFailed = false;
  if (!access && refresh) {
    try {
      const res = await fetch(REFRESH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refresh.value }),
      });

      if (!res.ok) {
        throw new Error("Refresh rejected");
      }

      const data = await res.json();
      newAccess = data.access as string;

      // Let the page see the new cookie during this same request
      request.cookies.set("access", newAccess);
    } catch {
      refreshFailed = true;
      // Render the rest of this request as a guest
      request.cookies.delete("refresh");
    }
  }

  const loggedIn = Boolean(access) || newAccess !== undefined;

  let response: NextResponse;
  if (pathname.startsWith("/api/") && refreshFailed) {
    // A fetch would follow a redirect to the login page's HTML, so API
    // requests get a 401 JSON response instead
    response = NextResponse.json(
      { detail: "Your session has expired. Log in again." },
      { status: 401 },
    );
  } else if (
    !pathname.startsWith("/api/") &&
    !loggedIn &&
    matchesPrefix(pathname, STUDENT_PREFIXES)
  ) {
    // Keep the page the guest asked for, so login can return to it
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(loginUrl);
  } else if (loggedIn && matchesPrefix(pathname, GUEST_ONLY_PREFIXES)) {
    response = NextResponse.redirect(new URL("/dashboard", request.url));
  } else {
    response =
      newAccess !== undefined || refreshFailed
        ? NextResponse.next({ request })
        : NextResponse.next();
  }

  if (newAccess !== undefined) {
    // Save the new cookie in the browser for later requests
    response.cookies.set("access", newAccess, ACCESS_COOKIE_OPTIONS);
  }
  if (refreshFailed) {
    // Refresh failed: log the user out
    response.cookies.delete("access");
    response.cookies.delete("refresh");
  }

  return response;
}

// Skip static files: without this, every asset on a page with an expired
// access cookie would make its own refresh call. Pages and /api/ still run it
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|images/|logo/|favicon\\.ico|icon\\.svg|apple-icon\\.png|.*\\.[^/]+$).*)",
  ],
};
