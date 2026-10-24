import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env-core";

// Built at module load, outside the try below, so a config error isn't
// mistaken for a failed refresh
const REFRESH_URL = `${env.API_BASE_URL}/auth/jwt/refresh/`;

export async function proxy(request: NextRequest) {
  const access = request.cookies.get("access");
  const refresh = request.cookies.get("refresh");

  // Case 1: the access cookie is still there (or the user isn't logged in)
  if (access || !refresh) {
    return NextResponse.next();
  }

  // Case 2: access expired, but we still have a refresh cookie
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

    // Let the page see the new cookie during this same request
    request.cookies.set("access", data.access);
    const response = NextResponse.next({ request });

    // Save the new cookie in the browser for later requests
    response.cookies.set("access", data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 270,
    });

    return response;
  } catch {
    // Refresh failed: log the user out. API requests get a 401 JSON response,
    // since a fetch would follow a redirect to the login page's HTML; pages
    // are sent to login
    const response = request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json(
          { detail: "Your session has expired. Log in again." },
          { status: 401 },
        )
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("access");
    response.cookies.delete("refresh");
    return response;
  }
}
