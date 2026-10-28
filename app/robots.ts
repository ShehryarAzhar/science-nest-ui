import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

// Student routes (proxy.ts) and the API stay out of crawls. /login and
// /register aren't disallowed, so crawlers can read their noindex
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/account", "/classes", "/trial-lesson"],
    },
    sitemap: `${env.SITE_URL}/sitemap.xml`,
  };
}
