# Spec 19: Public SEO Metadata

- **Status:** Done
- **Created:** 2026-10-28
- **Completed:** 2026-10-28
- **Depends on:** 01-project-setup.md, 16-subjects-list-page.md, 17-subject-detail-page.md, 18-home-page.md

## Summary
Give the public pages (home, subjects list, subject detail) complete search
and share metadata: a title and description for each page, canonical URLs,
Open Graph and Twitter card tags with one generated site-wide share image,
plus `sitemap.xml` and `robots.txt`. Absolute URLs come from `SITE_URL`
(spec 01). This lets guests find Science Nest in search, and makes a shared
link show a clear title, a summary and a branded image. Login and register
stay reachable but aren't indexed.

## User stories
- As a guest searching for a tutor, I want search results for Science Nest
  to show a clear title and summary for the home page, the subjects list and
  each subject, so that I can tell it covers my subject and level.
- As a guest who gets a Science Nest link in a chat app or social post, I
  want the preview to show the page title, a short description and a branded
  image, so that I trust the link and open it.
- As a guest, I want each subject to have its own search result, so that a
  search for my subject leads straight to that subject's page.

## Scope
- **Metadata base:** the root layout sets `metadataBase` from `SITE_URL`
  through `lib/env.ts`, so every relative metadata URL (canonical, Open
  Graph URL and image) becomes absolute on the configured site. No hard-coded
  host anywhere.
- **Site-wide defaults** (root layout), kept alongside the existing title
  template (`%s · Science Nest`, default "Science Nest") and description:
  - Open Graph: `siteName` "Science Nest", `type` "website", locale
    `en_US`, and the generated share image.
  - Twitter: `card` "summary_large_image" with the same image. No
    `site`/`creator` handles (none exist).
  - No `keywords` meta (ignored by search engines).
- **Per-page metadata**, each with its own title, description, canonical URL
  (`alternates.canonical`), and Open Graph / Twitter title, description and
  URL that match that page (not the layout's defaults):
  - `/`: title "Science Nest" (the default, untemplated), a description that
    names the subjects, the free 60-minute trial and that lessons are online.
    The tutor's credentials may appear (MPhil in Biochemistry and Molecular
    Biology, 8+ years of teaching experience). No tutor name.
  - `/subjects`: title "Subjects", a description of the subject list (levels,
    40- and 60-minute prices, free trial).
  - `/subjects/<slug>`: title the subject's name (unchanged from spec 17).
    Description from the subject's `description` (whitespace collapsed to
    single spaces, trimmed, shortened to about 160 characters at a word
    boundary with an ellipsis). When `description` is blank, a generated
    sentence from the name and levels, e.g. "<Name> tutoring online for
    <level names>. Book a free 60-minute trial lesson." Canonical is
    `/subjects/<slug>` in lowercase (the proxy's 308 already sends
    uppercase variants there).
- **Subject detail failure path:** the existing `generateMetadata` try/catch
  (title "Subjects" when `getSubjects()` throws) stays, and also falls back
  to the `/subjects` description. An unknown slug returns the not-found
  title ("Page not found") itself, with no canonical: the page body's
  `notFound()` only streams the not-found metadata in after the HTML
  `<title>`.
- **Login and register:** keep their titles ("Log in", "Register") and add
  `robots: { index: false }` (follow allowed). They are not listed in the
  sitemap and not disallowed in `robots.txt`, so crawlers can see the
  noindex.
- **Open Graph image:** one generated site-wide image (`app/opengraph-image`
  file convention with `next/og` `ImageResponse`, plus the matching
  `twitter-image` or a shared definition), 1200×630 PNG, with `alt`
  "Science Nest: online science tutoring". Content:
  - the Science Nest logo (mark and wordmark, from the light
    `public/logo/` artwork or the paths in `components/brand/logo.tsx`)
  - one short tagline and the credentials line
  - a thin hex lattice in low-opacity primary (the motif is allowed: it's
    the brand's share card, not a form, picker or schedule)
  - light theme colours only (background `#F7F7FB`, foreground `#1C1A33`,
    primary `#3D2F8F`, eosin `#C2295E`), Source Serif 4 for the tagline,
    Atkinson Hyperlegible Next for the credentials. No other fonts or
    colours, no tutor name or photo, no illustration files from
    `public/images/`.
  - fonts: the Source Serif 4 (600) and Atkinson Hyperlegible Next (400)
    font files are bundled in the repo (both SIL Open Font License, with
    the licence text kept next to them) and read at build time. No font is
    fetched from the network.
  - static: generated at build time, no request-time data, no backend call.
    Every public page uses this one image. No per-subject images.
- **`app/sitemap.ts`** → `/sitemap.xml`: absolute URLs for `/`, `/subjects`
  and every `/subjects/<slug>` from `getSubjects()` (the cached list, the
  same source as `generateStaticParams`). No `lastModified` (the backend has
  no timestamps), no `priority` or `changeFrequency` unless planning finds a
  reason. If `getSubjects()` fails, the sitemap fails like the pages do
  (build fails; a failed revalidation keeps the previous sitemap). It never
  bakes in a sitemap without subjects.
- **`app/robots.ts`** → `/robots.txt`: allow all user agents on `/`,
  disallow `/api/`, `/dashboard`, `/account`, `/classes` and
  `/trial-lesson` (the student routes from spec 07), and point to the
  absolute sitemap URL. Static, from `SITE_URL`.
- **Deploy note:** the README gets a Deploy section stating that production
  builds must set `SITE_URL` to the real public domain, otherwise canonical
  URLs, the sitemap, `robots.txt` and `og:image` point at localhost (they're
  built from `SITE_URL` at build time). Added with this spec; keep it
  accurate if the implementation changes what reads `SITE_URL`.
- Update CLAUDE.md: Architecture (metadata base, share image, sitemap and
  robots) and Design › Images (the generated share image is not a
  `public/images/` illustration and doesn't use `SpecimenImage`).

## Out of scope
- Metadata for student pages: account (spec 20), dashboard (spec 21),
  booking and editing pages (specs 25–31). Those specs set their own titles;
  `robots.txt` already keeps them out of crawls.
- Per-subject Open Graph images, `generateImageMetadata`, or dark-mode
  share images.
- Structured data (JSON-LD for `EducationalOrganization`, `Course`,
  `Offer`), `manifest.ts`, and changes to the app icons (spec 08; never edit
  the logo files).
- Analytics, Search Console verification tags, `hreflang` alternates
  (English only).
- Changing page content, the subject data source (`getSubjects()`, spec 16),
  the proxy's lowercase redirect (spec 17), or the not-found page (spec 11),
  except where its metadata needs `noindex` (see Behavior).
- Calling `GET /subjects/{slug}/` (subject detail reads from the cached list,
  spec 17).

## Routes and pages
| Route | Access | What it shows |
|---|---|---|
| `/` | Public | Home metadata: default title, home description, canonical `/`, OG/Twitter tags with the share image |
| `/subjects` | Public | "Subjects · Science Nest", list description, canonical `/subjects`, OG/Twitter tags |
| `/subjects/<slug>` | Public | "<Name> · Science Nest", subject description, canonical `/subjects/<slug>`, OG/Twitter tags |
| `/subjects/<unknown>` | Public | Not-found metadata (title "Page not found"), noindex, no canonical |
| `/login`, `/register` | Guests only (spec 07) | Existing titles, `noindex` |
| `/opengraph-image` (and `/twitter-image` if separate) | Public | 1200×630 PNG share image |
| `/sitemap.xml` | Public | XML sitemap of the three public page types |
| `/robots.txt` | Public | Crawl rules and the sitemap URL |

`proxy.ts`'s matcher already skips paths with a file extension, so
`/sitemap.xml`, `/robots.txt` and the image never trigger a token refresh.
Confirm the image route (no extension in its path) is skipped too, or is
harmless to run through the proxy.

## Backend contract
- `GET /subjects/` (public, via `getSubjects()` in `lib/subjects.ts`, cached
  `"use cache"` + `cacheLife("hours")`): fields used are `name`, `slug`,
  `description` (plain text, may be blank) and `levels[].name`. On any
  failure `getSubjects()` throws "Couldn't fetch subjects from API_BASE_URL.
  Is the backend running?".
- No other endpoint. No student endpoints, no cookies, no auth.

## Behavior
- All metadata, the sitemap, robots and the share image are static: none of
  them read cookies, headers or search params, so every public page stays
  prerendered under Cache Components.
- Titles: the root template produces "<Page> · Science Nest"; the home page
  uses the default "Science Nest" with no suffix. Open Graph and Twitter
  titles match the page's `<title>` text.
- Descriptions: plain sentences, no markup, roughly 120–160 characters,
  never empty. No invented facts (ratings, student counts, testimonials).
- Canonical URLs have no query string and no trailing slash, and use
  `SITE_URL`'s origin. `/subjects/<slug>?x=1` still canonicalises to
  `/subjects/<slug>`.
- Subject detail with the backend down at runtime: the page shows the inline
  error panel (spec 17) and its metadata falls back to title "Subjects" and
  the list description, with no crash. A previously cached page keeps its
  full metadata.
- Not-found: pages that end in `notFound()` and unmatched URLs carry
  `noindex` (Next may already add it; if not, the not-found page sets it) and
  no canonical.
- Login and register: `noindex`, still followable; not in the sitemap.
- Sitemap: lists exactly the public pages that render. A subject added to the
  backend appears after the subjects cache revalidates, like its page.
- Share image: generated once at build; the same image URL appears in
  `og:image` and `twitter:image` on every public page, with width, height and
  alt.
- Auth and redirects: unchanged. No student data, so no 401/403 handling.
- No mutations, so no cache invalidation.

## Time handling
Not applicable.

## UI notes
- No visible page changes. The only new visual is the share image.
- Share image layout: light background, the hex lattice faint along one edge
  (low-opacity primary, 1px-equivalent at the image's scale), the logo
  top-left with clear space of at least 0.25 × mark height, the tagline in
  Source Serif 4 600 and the credentials line in Atkinson Hyperlegible Next
  in muted foreground. Text stays well inside the safe area so platforms
  that crop to a square or 1.91:1 still show the logo and tagline. All text
  pairs meet WCAG AA. No `→`, no all-caps, no eyebrow labels.
- No tutor name or photo anywhere, including the image and every
  description.

## Acceptance criteria
- [x] View source on `/`: `<title>` is "Science Nest", there is a meta description, `<link rel="canonical">` is the site root (`<SITE_URL>`; Next writes the root without a trailing slash), and `og:title`, `og:description`, `og:url`, `og:site_name`, `og:type`, `og:image` (absolute, with width 1200 and height 630 and alt) and `twitter:card` = `summary_large_image` are present
- [x] On `/subjects`: title "Subjects · Science Nest", its own description, canonical `<SITE_URL>/subjects`, and `og:title`/`og:url` match the page, not the home page
- [x] On `/subjects/biology` (and one other subject): title "<Name> · Science Nest", description taken from the subject's description (shortened to about 160 characters when long), canonical `<SITE_URL>/subjects/<slug>`, matching `og:title`/`og:description`/`og:url`
- [x] A subject with a blank description gets the generated description naming the subject and its levels (check by temporarily blanking one in the Django admin) _(verified in code — check in browser)_
- [x] `/subjects/biology?ref=x` has the same canonical as `/subjects/biology`
- [x] `/subjects/does-not-exist` shows the not-found page with title "Page not found · Science Nest", `noindex`, and no canonical
- [x] `/login` and `/register` (logged out) have `<meta name="robots" content="noindex, follow">` (or equivalent noindex) and keep their titles
- [x] All absolute URLs use `SITE_URL`: change `SITE_URL` in `.env`, rebuild, and the canonical, `og:url`, `og:image`, sitemap and robots URLs all follow
- [x] `/opengraph-image` returns a 1200×630 PNG with the logo, tagline, credentials and faint hex lattice in the light theme colours and brand fonts, and no tutor name or photo
- [x] Pasting a public page URL into an Open Graph preview tool (or a chat app on a deployed build) shows the title, description and image _(verified in code — check in browser)_
- [x] `/sitemap.xml` lists `/`, `/subjects` and every subject's `/subjects/<slug>` as absolute URLs, and nothing else (no login, register or student routes)
- [x] `/robots.txt` allows `/`, disallows `/api/`, `/dashboard`, `/account`, `/classes`, `/trial-lesson`, does not disallow `/login` or `/register`, and has a `Sitemap:` line with the absolute sitemap URL
- [x] `npm run build` output shows `/`, `/subjects`, `/subjects/[slug]`, `/sitemap.xml`, `/robots.txt` and the share image as static/prerendered
- [x] With the backend stopped after a build, `/subjects/<slug>` pages that were already cached keep their full metadata; an uncached subject page shows the inline error panel with title "Subjects · Science Nest" _(verified in code — check in browser)_
- [x] The tab titles of every public page are unchanged from specs 16–18
- [x] The share image renders in the brand fonts from the bundled files with the network disconnected during `npm run build`, and the font licence files are in the repo _(verified in code — check in browser)_
- [x] `og:locale` is `en_US` on every public page
- [x] The README's Deploy section says production builds must set `SITE_URL` to the real public domain, or canonical URLs, the sitemap, robots and `og:image` point at localhost
- [x] CLAUDE.md Architecture and Design › Images describe the metadata base, the share image, the sitemap and robots
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Design › Images** lists only four illustration files and says images
  appear "only where listed". The generated share image isn't one of those
  illustrations and is never shown in the app, but it is a new image. This
  spec adds it to CLAUDE.md as an explicit exception (generated, not a
  `public/images/` file, no `SpecimenImage`).
- **Fonts:** `next/font` can't feed `ImageResponse`, which needs raw font
  data, and the brand fonts aren't in the repo as files today. Resolved:
  this spec bundles the font files for the share image only; pages keep
  loading fonts through `next/font` (`app/fonts.ts`).
- **Motif** rules allow the hex lattice "only in the home hero and subject
  headers". The share image is a third place. This spec treats it as
  allowed (it's brand artwork outside the app) and records that in
  CLAUDE.md.

## Open questions
None.
