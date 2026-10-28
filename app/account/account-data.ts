import "server-only";

import { z } from "zod";

import { api } from "@/lib/api-client";

// GET /auth/users/me/ in student mode, so it reads the access cookie and is
// never cached across requests. Errors pass through unchanged: the page
// sends 401/403 to the student access guard and the rest to its error panel

const accountSchema = z.object({
  username: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  // null for admin accounts, which have no Student profile
  phone_number: z.string().nullable(),
});

export type Account = z.infer<typeof accountSchema>;

export async function getAccount(): Promise<Account> {
  const body = await api.get<unknown>("/auth/users/me/", { auth: "student" });
  return accountSchema.parse(body);
}
