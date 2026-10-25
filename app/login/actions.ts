"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { INVALID_CREDENTIALS_MESSAGE, loginSchema } from "@/app/login/schema";
import { api, ApiError } from "@/lib/api-client";
import { normalizeApiError } from "@/lib/api-errors";
import type { NormalizedError } from "@/lib/drf-errors";
import { safeReturnPath } from "@/lib/return-path";

// Returns the error for the form, or redirects to `next` (when it's a safe
// same-site path) or the dashboard
export async function login(input: {
  username: string;
  password: string;
  next: string | null;
}): Promise<NormalizedError | undefined> {
  // Anyone can call an action, so the input is checked here too
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    const formErrors: string[] = [];
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string") {
        (fieldErrors[field] ??= []).push(issue.message);
      } else {
        formErrors.push(issue.message);
      }
    }
    return { kind: "unknown", status: null, fieldErrors, formErrors };
  }

  try {
    const data = await api.post<{ access: string; refresh: string }>(
      "/auth/jwt/create/",
      {
        auth: "public",
        body: {
          username: parsed.data.username,
          password: parsed.data.password,
        },
      },
    );

    const cookieStore = await cookies();

    cookieStore.set("access", data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 270, // 4.5 minutes, 30 s before the token expires
    });

    cookieStore.set("refresh", data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
  } catch (error) {
    // Never SimpleJWT's own detail (spec 04)
    if (error instanceof ApiError && error.status === 401) {
      return {
        kind: "http",
        status: 401,
        fieldErrors: {},
        formErrors: [INVALID_CREDENTIALS_MESSAGE],
      };
    }
    return normalizeApiError(error);
  }

  // Outside the try: redirect() throws to navigate
  redirect(safeReturnPath(input.next));
}

// No backend call: there's no logout or token blacklist endpoint
export async function logout() {
  const cookieStore = await cookies();

  // delete() sends path "/", the path login and proxy.ts set them with
  cookieStore.delete("access");
  cookieStore.delete("refresh");

  redirect("/");
}
