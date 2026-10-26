import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { env } from "@/lib/env";

// Ends a session the backend has refused (spec 15): the cookies are httpOnly,
// so only the server can delete them. No backend call, nothing else changes.
// POST only, so a link from another site can't log a student out

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest): Promise<Response> {
  // Same rule as the student API proxy
  if (request.headers.get("origin") !== new URL(env.SITE_URL).origin) {
    return Response.json(
      { detail: "Cross-site request refused." },
      { status: 403, headers: NO_STORE },
    );
  }

  const cookieStore = await cookies();
  // Same deletes as logout() in app/login/actions.ts (path "/")
  cookieStore.delete("access");
  cookieStore.delete("refresh");

  return new Response(null, { status: 204, headers: NO_STORE });
}
