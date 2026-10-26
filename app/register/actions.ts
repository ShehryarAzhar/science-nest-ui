"use server";

import { redirect } from "next/navigation";

import { registerSchema, type RegisterValues } from "@/app/register/schema";
import { api } from "@/lib/api-client";
import { normalizeApiError } from "@/lib/api-errors";
import type { NormalizedError } from "@/lib/drf-errors";
import { safeReturnPath } from "@/lib/return-path";

// Returns the error for the form, or redirects to /login with a notice and
// the new username. No cookies: the student logs in there (no auto login)
export async function register(input: {
  values: RegisterValues;
  next: string | null;
}): Promise<NormalizedError | undefined> {
  // Anyone can call an action, so the input is checked here too. The schema
  // has no confirm or country field, so neither can reach the backend
  const parsed = registerSchema.safeParse(input.values);
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

  const { username, email, password, first_name, last_name, phone_number } =
    parsed.data;

  try {
    await api.post<unknown>("/auth/users/", {
      auth: "public",
      body: { username, email, password, first_name, last_name, phone_number },
    });
  } catch (error) {
    return normalizeApiError(error);
  }

  // Never the password. An unsafe `next` becomes the dashboard, which is
  // where login goes anyway
  const params = new URLSearchParams({ registered: "1", username });
  if (input.next) {
    params.set("next", safeReturnPath(input.next));
  }

  // Outside the try: redirect() throws to navigate
  redirect(`/login?${params}`);
}
