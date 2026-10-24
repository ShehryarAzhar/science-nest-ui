// Env validation without the server-only marker, for proxy.ts and
// next.config.ts. App code imports lib/env.ts instead

import { z } from "zod";

// An absolute http(s) URL, with any trailing slash removed so callers can
// append paths that start with "/"
const baseUrl = z
  .string({ error: "is required" })
  .trim()
  .min(1, "is required")
  .pipe(
    z.url({
      protocol: /^https?$/,
      error: "must be an absolute http(s) URL",
    }),
  )
  .transform((value) => value.replace(/\/+$/, ""));

const schema = z.object({
  API_BASE_URL: baseUrl,
  SITE_URL: baseUrl,
});

const result = schema.safeParse({
  API_BASE_URL: process.env.API_BASE_URL,
  SITE_URL: process.env.SITE_URL,
});

if (!result.success) {
  // Only names and reasons, never the values themselves
  const problems = result.error.issues
    .map((issue) => `${String(issue.path[0])} ${issue.message}`)
    .join("; ");
  throw new Error(
    `Invalid environment variables: ${problems}. See .env.example.`,
  );
}

export const env = result.data;
