import "server-only";

import { cacheLife } from "next/cache";
import { z } from "zod";

import { api } from "@/lib/api-client";

// The one way to read subjects (specs 16, 17 and 18). Public and cached, so
// pages using it prerender. On failure it throws: an error value returned
// from here would be cached for the whole cache life. Pages catch the error
// with an error boundary (catchError), never try/catch, so a failed build
// fails loudly and a failed revalidation keeps the previous page

const levelSchema = z.object({
  // Known codes: o_level, a_level, all_levels, university. Kept open so a new
  // backend code doesn't take the page down; the UI shows `name` anyway
  code: z.string(),
  name: z.string(),
});

const subjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  levels: z.array(levelSchema),
  price_40_min: z.number(),
  price_60_min: z.number(),
});

export type SubjectLevel = z.infer<typeof levelSchema>;
export type Subject = z.infer<typeof subjectSchema>;

export async function getSubjects(): Promise<Subject[]> {
  "use cache";
  cacheLife("hours");

  try {
    const body = await api.get<unknown>("/subjects/", { auth: "public" });
    return z.array(subjectSchema).parse(body);
  } catch (cause) {
    // Logged by the build ("Error occurred prerendering page") and the
    // server; production redacts it before it reaches the browser
    throw new Error(
      "Couldn't fetch subjects from API_BASE_URL. Is the backend running?",
      { cause },
    );
  }
}
