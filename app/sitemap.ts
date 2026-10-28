import type { MetadataRoute } from "next";

import { env } from "@/lib/env";
import { getSubjects } from "@/lib/subjects";

// The public pages only: home, the subject list and every subject from the
// cached list (the same source as /subjects/[slug]'s generateStaticParams).
// A failed fetch throws, so the build fails and a failed revalidation keeps
// the previous sitemap. No lastModified: the backend has no timestamps
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const subjects = await getSubjects();
  if (subjects.length === 0) {
    throw new Error(
      "No subjects returned from API_BASE_URL; sitemap.xml needs at least one.",
    );
  }

  return [
    { url: `${env.SITE_URL}/` },
    { url: `${env.SITE_URL}/subjects` },
    ...subjects.map(({ slug }) => ({ url: `${env.SITE_URL}/subjects/${slug}` })),
  ];
}
