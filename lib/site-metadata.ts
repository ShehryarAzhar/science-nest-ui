import type { Metadata } from "next";

import type { Subject } from "@/lib/subjects";

// Shared search and share metadata for the public pages (spec 19). Paths are
// relative: the root layout's metadataBase (SITE_URL) makes them absolute

export const SITE_NAME = "Science Nest";

export const SITE_DESCRIPTION =
  "Science tutoring in Biology, Chemistry, Physics, Science, Biochemistry and Molecular Biology. Book a free 60-minute trial lesson, then weekly classes online.";

export const SUBJECTS_DESCRIPTION =
  "Every subject and level Science Nest teaches, from O Level to university, with 40- and 60-minute lesson prices. Start with a free 60-minute trial online.";

// app/opengraph-image.tsx exports these too, so the route and the tags each
// page lists can't drift apart
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };
export const SHARE_IMAGE_ALT = "Science Nest: online science tutoring";

const SHARE_IMAGE = {
  url: "/opengraph-image",
  ...SHARE_IMAGE_SIZE,
  alt: SHARE_IMAGE_ALT,
  type: "image/png",
};

export const BASE_OPEN_GRAPH = {
  siteName: SITE_NAME,
  type: "website",
  locale: "en_US",
} satisfies Metadata["openGraph"];

// Metadata merges shallowly: a page's openGraph replaces the layout's, and
// with it the root opengraph-image, so every public page lists the image
// itself. Twitter isn't set here: Next fills its title, description and
// image from openGraph, under the layout's summary_large_image card
export function publicPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...BASE_OPEN_GRAPH,
      // The title template doesn't reach openGraph, so match <title> here
      title: absoluteTitle ? title : `${title} · ${SITE_NAME}`,
      description,
      url: path,
      images: [SHARE_IMAGE],
    },
  };
}

const MAX_DESCRIPTION = 160;

// The subject's own description on one line, shortened at a word boundary;
// a generated sentence when the backend's is blank
export function subjectDescription({ name, description, levels }: Subject) {
  const text = description.replace(/\s+/g, " ").trim();

  if (!text) {
    const levelNames = new Intl.ListFormat("en-US").format(
      levels.map((level) => level.name),
    );
    return levelNames
      ? `${name} tutoring online for ${levelNames}. Book a free 60-minute trial lesson.`
      : `${name} tutoring online. Book a free 60-minute trial lesson.`;
  }

  if (text.length <= MAX_DESCRIPTION) return text;
  const cut = text.lastIndexOf(" ", MAX_DESCRIPTION - 1);
  return `${text.slice(0, cut > 0 ? cut : MAX_DESCRIPTION - 1).replace(/[\s.,;:]+$/, "")}…`;
}
