# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — dev server on http://localhost:3000 (Turbopack)
- `npx tsc --noEmit` — type-check
- `npm run lint` — ESLint 9 flat config (`eslint-config-next` core-web-vitals + typescript)
- `npm run build` — production build (needs the backend running at `API_BASE_URL`: `/subjects` and every `/subjects/<slug>` are prerendered from it, and an empty subjects list fails the build)

## No tests

Do not write any tests in this project: no unit, integration, component, or end-to-end tests, no test files (`*.test.ts`, `*.spec.ts`, `__tests__/`), test utilities, or mocks. Do not install testing libraries or tools (Jest, Vitest, Testing Library, Playwright, Cypress, MSW, etc.), and do not add test scripts or test config to `package.json` or the project. Do not suggest adding tests or ask whether to add them.

When finishing a task, verify only by running `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

## Next.js version caveat

This is Next.js 16.4 with React 19.3 — APIs differ from older versions. Before writing framework code, check the bundled docs in `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`, …). Notable differences already in use here:

- **`proxy.ts`** (root) replaces `middleware.ts`; it exports a `proxy(request)` function.
- `cookies()` from `next/headers` is async (`await cookies()`).
- Global route-typed helpers like `LayoutProps<"/">` are used instead of hand-written prop types.
- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and `experimental.agentFeedback`. With Cache Components on, dynamic data access (cookies, uncached fetches) must sit inside `<Suspense>` or be explicitly cached — read the caching docs before adding data fetching.

## About the app

**Science Nest** is a booking web app for a science tutor. Students register,
browse subjects, book a free 60-minute trial lesson, and book recurring weekly
classes. Teacher and admin work happens only in the Django admin, so this
frontend has no admin or teacher pages. Do not show the tutor's name or photo
anywhere in the app.

Tutor credentials (fine to show in the UI): MPhil in Biochemistry and Molecular
Biology, 8+ years of teaching experience.

Lessons are online, on Zoom or Google Meet. The tutor sends the meeting link
before each lesson, on WhatsApp to the student's registered phone number, or
by email. The app doesn't store or show meeting links. The dashboard (spec
21) and the trial booking confirmation (spec 28) should say how the link
arrives.

Subjects: Biology and Chemistry (O Level, A Level), Physics (O Level),
Science (All Levels 1–O), Biochemistry (University), Molecular Biology
(University).

Pages: home, subjects list and detail (public), register, login, student
dashboard (schedule and weekly cost), book or edit a weekly class, book, edit
or cancel the trial lesson, and a read-only account page. No profile editing,
password reset or password change.

Booking buttons on public pages (subject detail, home) are shown to everyone,
guests and students alike, with the same links: "Book a free trial" →
`/trial-lesson/new` and "Book a weekly class" → `/classes/new` (with the
subject preselected where relevant, as `?subject=<slug>`: the slug, not the
id; specs 25 and 28 read it). Guests are sent to `/login?next=…` by the
proxy (spec 07), and the login page's Register link carries `next` (spec 14),
so they return to the booking page after signing up or logging in. Never link
guests to `/register` directly: a logged-in student would be redirected to
`/dashboard` and lose the target. This keeps the public pages static (no
cookie reads). Because those pages can't hide the trial button, the trial
booking page (spec 28) must handle a student who already has a trial lesson:
show it with a link to the dashboard, not an error.

## Backend API

Django REST Framework + MySQL, auth via Djoser + SimpleJWT.

- Auth header is `Authorization: JWT <token>` (not Bearer).
- Every path ends with a trailing slash.
- Every date and time is UTC. The frontend converts to the student's local time.
  A weekly UTC weekday + hour is converted using the offset in force at its
  next real occurrence (the first one at or after "now" or the given reference
  instant), never the offset at the reference instant itself, so a slot just
  after a daylight-saving change shows its correct local time.
- Errors use DRF format: `{field: [msgs]}`, `non_field_errors`, or `{detail}`.

**Auth (`/auth/`)**
- `POST users/`: register with username, email, password, first_name,
  last_name, phone_number (required, optional `+` then 7–15 digits, no
  surrounding whitespace, no country restriction, not unique). Creates a
  Student profile.
- No email activation: new users are active immediately.
- `POST jwt/create/`: username + password → `access`, `refresh`.
- `POST jwt/refresh/`: refresh → `access` only.
- `GET users/me/`: username, email, first_name, last_name, phone_number
  (null for admin accounts). Read-only.
- No logout or token blacklist endpoint: logout only deletes the app's
  cookies, and a refresh token stays valid on the server until it expires.

**Subjects (public, read-only):** `GET /subjects/`, `GET /subjects/{slug}/`
- Fields: id, name, slug, description (plain text, may be blank), levels,
  price_40_min, price_60_min (USD, numbers).
- `levels` is a list of `{code, name}`. Codes: `o_level`, `a_level`,
  `all_levels` (All Levels (1-O Level)), `university`.

**Weekly classes (student, full CRUD):** `/classes/`, `/classes/{id}/`
- Send: subject (id), level (code), day (`monday`–`sunday`), time (full hour,
  UTC), duration (40 or 60).
- Returns: id, subject as `{id, name, slug, levels}`, level as `{code, name}`,
  day, day_display, time (`"HH:MM:SS"`, UTC) and duration. No price.
- Level must be one of the subject's levels. One booking per weekday + hour
  across all students. Can't take a slot held by an upcoming trial lesson.

**Trial lesson (student, full CRUD):** `/trial-lessons/`, `/trial-lessons/{id}/`
- Send: subject (id), level (code), starts_at (ISO 8601 UTC, full hour,
  future). Always 60 minutes and free.
- Returns: id, subject as `{id, name, slug, levels}`, level as `{code, name}`,
  starts_at (ISO 8601 UTC, e.g. `"2026-11-02T14:00:00Z"`) and completed
  (boolean, read-only). No `ends_at`.
- One per student. Can't clash with a weekly class or another trial lesson.
- The backend accepts any future full hour, but the trial picker (spec 24)
  only offers hours at least 24 hours ahead, so the tutor has time to send
  the meeting link. That lead time is a frontend rule.
- Locked when `completed` (set in admin) or `starts_at` is at or before now:
  edit and delete return 403 with a message. It can still be read. The
  frontend can detect this from those two fields without waiting for a 403.

**Schedule (student):** `GET /schedule/`
- Returns `{weekly_classes, trial_lesson, weekly_cost}`. Each weekly class has
  the weekly class fields plus `price` (its own duration's price from the
  subject's current prices). trial_lesson is the trial lesson object or null,
  shown even when completed or past. weekly_cost is the sum of the prices
  (`0` with no classes; the trial lesson is free). Sorted by UTC day and time.
- Prices and weekly_cost are JSON numbers with 2 decimal places, not strings.

**Availability (student):** `GET /availability/`
- Returns `weekly_classes: [{day, time "HH:MM:SS", mine}]` and
  `trial_lessons: [{starts_at, day, time, mine}]` (upcoming only). Never
  includes ids, subjects, levels, or who booked.
- Used only to grey out taken slots in the pickers. The booking routes still
  validate, and can return 400 "This timeslot is already booked." When that
  happens, show the message and refetch availability.
- Weekly picker: block every weekly_classes day + time and every trial
  lesson's day + time.
- Trial picker: block every date that falls on a weekly_classes day + time,
  and each exact trial starts_at.
- When editing, keep the booking's own slot selectable.

**Access rules:** `/classes/`, `/trial-lessons/`, `/schedule/` and
`/availability/` return 401 without a token, and 403 for a logged-in user with
no Student profile (admin accounts). Show those users a friendly message, not
an error (see Architecture › Student access guard).

## Design

Every page and component follows this section. For any design or UI work
(new pages, components, layouts, styling, empty, loading and error states,
responsive behaviour), use the frontend-design skill from the installed
frontend-design plugin before writing the UI code. The skill shapes layout,
composition and details, but always within these rules: it must not change
the direction, and must not add new colours, fonts, radius values or
motion beyond what's defined here. Use the theme tokens.

**Direction: "Stained slide."** Histology colours, hematoxylin violet and eosin
pink, on calm cool-white "glass". Exact, academic and trustworthy rather than
playful. The nest appears as a hexagon lattice (benzene ring, cell, honeycomb).
Functional pages (dashboard, pickers, forms) put clarity first: no decoration.

**Colours** (light / dark; tokens in `app/globals.css`):
- background `#F7F7FB` / `#14122A` · surface (card, popover) `#FFFFFF` / `#1D1A38`
- foreground `#1C1A33` / `#ECEAF7` · muted-foreground `#5B5873` / `#A9A5C4`
- primary `#3D2F8F` / `#A89CF5`, on-primary `#FFFFFF` / `#14122A` (buttons, links, selected, ring)
- eosin `#C2295E` / `#FF7AA8`, on-eosin `#FFFFFF` / `#14122A` (brand accent: "yours", trial lesson, hero; never errors)
- secondary = accent tint `#ECE9F8` / `#2A2550`, text `#2D2370` / `#DCD7FA`
- muted `#EEEDF3` / `#232040` · border = input `#DCDAE8` / `#34304F`
- destructive `#B42318` / `#FF8A7A`, on-destructive `#FFFFFF` / `#14122A` (solid
  confirm buttons in delete and cancel dialogs, and error toasts)
- success `#1E7A4C` / `#5FD39A`, on-success `#FFFFFF` / `#14122A` (confirmations, e.g. booking confirmed, account created)
- warning `#F2B53A` / `#F5C451`, on-warning `#1C1A33` / `#14122A` (locked trial lesson,
  "slot was just taken" notice). Use warning only as a fill with on-warning text,
  never as text on the background. Pair both with an icon, not colour alone.
- All text pairs meet WCAG AA.

**Type:** headings Source Serif 4 (600; hero 700, -0.01em); body and UI
Atkinson Hyperlegible Next (400/600), both via `next/font`. Scale
14/16/20/25/31/39/49px, body line-height 1.6, prose max 65ch, `tabular-nums`
for times and prices. No all-caps labels, no eyebrow labels, no single-word
highlight in headlines, no `→` in buttons.

**Shape and depth:** radius 10px (buttons, inputs), 16px (cards, panels,
dialogs), 8px (slot cells), full (badges). No card shadows; borders and tints
carry structure. One elevation for popovers, dialogs and menus:
`0 12px 32px -12px rgb(61 47 143 / .28)` (dark: `rgb(0 0 0 / .6)`).

**Spacing:** 4px grid; marketing sections 96px vertical (56px mobile);
functional pages 16–24px gaps, max width 72rem; mobile-first, 16px gutter.

**Motion:** one moment only, the home hero's hex lattice drawing in (~800ms).
Otherwise only in response to the user: 150ms state changes, 180ms dialog and
popover fade and scale. No scroll-reveal. Respect `prefers-reduced-motion`
(static lattice, instant transitions).

**Motif:** thin hex lattice (1px, low-opacity primary), only in the home hero
and subject headers, plus a single-hex logo mark (and the generated share
image, see Images). Never behind forms, pickers or the schedule.

**Slot pickers and schedule** (never colour alone):
- available: surface + border; primary border on hover or focus
- taken: muted fill, hatch pattern, "Taken", disabled
- mine: 2px eosin outline + dot + "Yours" (own slot stays selectable when editing)
- selected: primary fill, check icon
- Schedule: desktop week grid in local time. Weekly classes are tint blocks
  with a 3px primary left rule. Mobile: list grouped by day. Weekly cost in
  tabular figures.
- Trial lesson: one-time, so never inside the weekly grid or styled like a
  repeating block. Show it as its own eosin-accented "Free trial" card above
  the grid, with its full local date and time (weekday, date, hour).

### Images

Transparent WebP illustrations in `public/images/`, only where listed below.
Never in forms, slot pickers or the schedule. No people or faces.

**Style:** flat textbook-plate illustration in H&E stain colours: eosin
`#C2295E` outlines (visible on both themes), fills `#A89CF5` / `#FF7AA8`,
small `#3D2F8F` details, no black, white or gradients. If one fails in dark
mode, add `<name>-dark.webp` for that image only.

| File | Used in (spec) | Min size | Alt |
|---|---|---|---|
| `hero-specimen.webp` | Home hero (18) | 1120×1120 | "Illustration of stained cells seen through a microscope" |
| `subjects/<slug>.webp` | Subject cards and detail body (16, 17, 18) | 480×480 | `""` |
| `empty-schedule.webp` | Dashboard empty state (21) | 640×478 | `""` |
| `not-found.webp` | `not-found.tsx` (11) | 640×640 | `""` |

Subject slugs: `biology`, `chemistry`, `physics`, `science`, `biochemistry`,
`molecular-biology`. The path is built from the slug, with no mapping table.

**Google Flow prompt** = this opening + the subject below + this ending.
- Opening: "Flat vector scientific illustration in the style of a modern
  textbook plate, coloured like an H&E-stained microscope slide: uniform
  medium-weight rounded outlines in eosin pink #C2295E, fills in soft violet
  #A89CF5 and light pink #FF7AA8, small deep violet #3D2F8F details, no black,
  no white areas, no gradients, flat even lighting, moderate detail."
- Ending: "isolated subject, centred, plain solid flat white background, no
  shadow on the ground, no text, no watermark"
- Subjects: hero, tightly packed hexagonal stained cells in a circular
  microscope field. biology, an animal cell with nucleus and mitochondria.
  chemistry, a conical flask with a benzene ring rising from it. physics, a
  convex lens focusing light rays. science, a leaf, a beaker and a magnet.
  biochemistry, an enzyme binding a substrate (lock and key). molecular-biology,
  a DNA helix partly unzipping beside an mRNA strand. empty-schedule, an empty
  slide and petri dish. not-found, a magnifying glass over an empty slide.

**Rules:**
- One shared `SpecimenImage` client component (created in spec 11) wraps
  `next/image` with string paths, never static imports.
- A missing image never shows a broken icon. By default it stays hidden
  until it loads. If it fails, the hero shows only the hex lattice, a subject
  image shows the hex logo mark, and the other images show nothing.
- Exception, the hero only (spec 18): it uses `SpecimenImage`'s opt-in
  `visibleBeforeHydration` mode, so it paints as soon as it arrives, before
  hydration and without JavaScript. A failed load is detected only after
  hydration, so before that (or without JavaScript) the browser's own broken
  image with alt text may show. Accepted because the hero image ships with
  the app and showing it immediately matters more.
- Hero: `loading="eager"` + `fetchPriority="high"` (`priority` is deprecated
  in Next 16). Everything else lazy-loads.
- Exception, the share image (spec 19): `app/opengraph-image.tsx` is
  generated at build time, never shown in the app, not a `public/images/`
  file and doesn't use `SpecimenImage`. Light theme colours only, the light
  horizontal logo, the hex lattice, and the brand fonts bundled in
  `assets/fonts/` (see Architecture › SEO metadata).

### Logo

- **Mark** (viewBox 48): pointy-top hexagon, circumradius 21, stroke 3, round
  joins; bowl `M14.031 19.351 A11 11 0 1 0 33.969 19.351`, stroke 3, round
  caps; dot at (24, 29), r 4. Hexagon and bowl use primary, the dot uses eosin.
- **Wordmark:** "Science Nest" in Source Serif 4 SemiBold, outlined, with a
  hexagon for the dot on the "i".
- **Files:** `public/logo/science-nest-{horizontal,vertical,mark}{,-dark,-mono}.svg`;
  `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`. Don't edit them.
  - 08 confirms the app icons work.
  - 10 builds `components/brand/logo.tsx`: inline SVG,
    `variant="horizontal" | "vertical" | "mark"`, paths copied from the
    `public/logo` files, colours from theme tokens.
  - 13 and 14 use the vertical logo.
- Clear space: 0.25 × mark height. Below 24px, use the favicon mark (hexagon
  and dot, no bowl).

## Architecture

App Router frontend for a separate **Django backend** (Djoser/SimpleJWT-style endpoints: `/auth/jwt/create/`, `/auth/jwt/refresh/`). The backend URL comes from `API_BASE_URL`, validated together with `SITE_URL` by the env module (spec 01). It's two files with one definition:

- `lib/env-core.ts` — Zod validation and the normalised `env` values (trailing slash stripped), no `server-only` marker. Imported only by `proxy.ts` (Next treats Proxy as outside the App Router for `server-only`) and `next.config.ts` (so a missing or invalid value stops `npm run dev` and `npm run build` at startup).
- `lib/env.ts` — `import "server-only"` plus a re-export of `lib/env-core.ts`. All app code imports this one: server actions, Server Components, route handlers and the API client (`lib/api-client.ts`).

No code hard-codes the backend URL or reads these variables from `process.env` directly.

### Backend API client

`lib/api-client.ts` (server-only, axios, 10 s timeout) is how app code calls Django: `api.get/post/put/patch/delete<T>(path, { auth, body? })`. Paths must start and end with `/`; anything else throws before a request is sent.

- `auth: "public"` never reads cookies, so it's safe inside `"use cache"` (subjects, registration, JWT create).
- `auth: "student"` sends `Authorization: JWT <access>` from the cookie. Without the cookie it throws a 401 `ApiError` without calling the backend. Callers must sit inside `<Suspense>` under Cache Components.
- Every failure throws `ApiError` with `kind` (`http`, `network`, `invalid_response`), `status` (every response that arrived, including non-JSON errors), `body` (the DRF JSON as sent; normalized by `lib/api-errors.ts`), `nonJson` and `timedOut` (network errors that hit the timeout). It never carries tokens, headers or request bodies.
- `apiRequestWithStatus<T>(method, path, options)` resolves `{ status, body }` instead of just the body, for callers that pass the 2xx status on (the student API proxy).

`proxy.ts` doesn't use it: Proxy can't import `server-only` modules, so refresh keeps its own `fetch`.

### Student API proxy

Browser code never calls Django directly (it has no token). It calls `app/api/student/[...path]/route.ts`, which forwards through the API client in student mode and returns Django's status and JSON body unchanged. Browser paths have no trailing slash; the handler adds it for the backend.

| Browser path | Methods |
|---|---|
| `/api/student/schedule`, `/api/student/availability` | GET |
| `/api/student/classes`, `/api/student/trial-lessons` | GET, POST |
| `/api/student/classes/{id}`, `/api/student/trial-lessons/{id}` | GET, PATCH, DELETE (edits use PATCH only) |

- Any other path → 404, any other method → 405 with a per-path `Allow` header, neither calling the backend.
- POST, PATCH and DELETE need an `Origin` matching `SITE_URL` (403 otherwise). A body that isn't valid JSON → 400.
- Only the method, mapped path, JSON body and auth header reach Django: no browser headers, cookies or query string.
- Non-JSON error pages → same status with the generic `{detail}`; network failures → 502 (timeout 504) with the network `{detail}`; invalid 2xx → 502; anything else → 500. The client's own 401 for a missing cookie has an empty body.
- Every response has `Cache-Control: no-store`.

### Subjects data

`lib/subjects.ts` (server-only): `getSubjects()` is the one way to read `GET /subjects/` (specs 16, 17, 18), with the `Subject` and `SubjectLevel` types and a Zod check of the response. It's `"use cache"` + `cacheLife("hours")` in public mode, so pages using it are prerendered and `npm run build` needs the backend reachable.

- On any failure it throws "Couldn't fetch subjects from API_BASE_URL. Is the backend running?" (the `ApiError` as `cause`). It never returns an error value, which would be cached for the whole cache life.
- Pages catch that with an error boundary (`catchError` from `next/error`, e.g. `app/subjects/subjects-error-boundary.tsx`), never `try/catch`: Next still fails the build on an error caught by a boundary during prerender, and a failed runtime revalidation keeps the previous page. A `try/catch` would bake the error state into the static page.
- `/subjects` (`app/subjects/`) shows the inline error panel only when no cached list exists; Try again calls `retry()`.
- `/subjects/[slug]` (spec 17) finds its subject in the same list (never `GET /subjects/{slug}/`). `generateStaticParams` returns every slug, and throws a clear error on an empty list (Cache Components rejects an empty array). Slugs added later render on their first request once the list revalidates. An unknown slug (exact, case-sensitive match) → `notFound()`. The page uses `SubjectsErrorBoundary standalone` (the panel carries the `h1` and a link back to `/subjects`).
- The one `try/catch` around `getSubjects()` is in that page's `generateMetadata` (falls back to the title "Subjects"): a throw there would show `app/error.tsx` instead of the inline panel. It's safe because the page body still throws into the boundary.
- Shared with the list: `formatUsd()` (`lib/format-usd.ts`), `LevelBadges` and `FreeTrialNote` (`app/subjects/`).
- Subject cards (`/subjects` and the home page) also list what each subject offers: fixed frontend labels per level code, not backend data, in `lib/subject-offerings.ts` (`subjectOfferings(levels)`: the union across the subject's levels, no duplicates, in this order; unknown codes add nothing). `o_level` and/or `a_level` → "Exam Preparation", "Past Papers", "Notes & Practice"; `all_levels` → "Exam Preparation", "Notes & Practice"; `university` → "Research Guidance", "Assignments Help". `SubjectOfferings` (`app/subjects/subject-offerings.tsx`) shows them as a plain list with primary check icons below the level badges, never as pills, so they aren't mistaken for levels.
- The home page `/` (spec 18, `app/page.tsx`) is static (no cookies) and shows the same grid through `SubjectList` (`app/subjects/subject-list.tsx`, shared with `/subjects`) with `headingLevel="h3"`, inside `SubjectsErrorBoundary` around that section only, so the rest of the page stays up. Its booking links carry no `?subject=`. In the page content, the tutor's credentials appear once, in the hero (the site footer also lists them on every page).

### SEO metadata

Spec 19. Public pages carry search and share metadata; everything is static.

- The root layout sets `metadataBase` from `SITE_URL` (`lib/env.ts`), so
  metadata URLs are relative paths. It also sets the title template,
  `SITE_DESCRIPTION`, `openGraph` (site name, `website`, `en_US`) and
  `twitter: { card: "summary_large_image" }`.
- `lib/site-metadata.ts`: the shared constants and
  `publicPageMetadata({ title, description, path, absoluteTitle? })`
  (title, description, canonical, and `openGraph` with title, URL and the
  share image), used by `/`, `/subjects` and `/subjects/[slug]`.
  `subjectDescription()` turns a subject's description into one line of at
  most 160 characters, or generates one from the name and levels when it's
  blank.
- Metadata merges shallowly: a page's `openGraph` replaces the layout's, and
  with it the root `opengraph-image`, so `publicPageMetadata()` lists the
  image (`/opengraph-image`) itself. Twitter tags are never set per page:
  Next fills them in from `openGraph`.
- `app/opengraph-image.tsx`: the one share image (1200×630 PNG, `alt` and
  `size` from `lib/site-metadata.ts`). `next/font` can't feed
  `ImageResponse`, so Source Serif 4 Semibold and Atkinson Hyperlegible Next
  Regular are bundled as TTFs in `assets/fonts/` (SIL OFL, licences next to
  them) and read from disk at build time. The lattice reuses
  `LATTICE_PATH`, `VIEW_W` and `VIEW_H` from `components/brand/hex-lattice.tsx`.
- `app/sitemap.ts`: `/`, `/subjects` and every subject from `getSubjects()`
  (throws on failure or an empty list, like the pages). `app/robots.ts`:
  disallows `/api/` and the student routes, and points to the sitemap.
  `/login` and `/register` aren't disallowed, so crawlers can read their
  `robots: { index: false, follow: true }`.
- Not-found pages get `noindex` from Next automatically. The proxy also
  runs on `/opengraph-image` (no extension), which is harmless: pages never
  load the image themselves.
- Production builds must set `SITE_URL` to the real domain (README › Deploy).

### Backend errors

Every form shows backend errors through one shape, `NormalizedError` (`kind`, `status`, `fieldErrors`, `formErrors`):

- `lib/drf-errors.ts` (shared, safe in Client Components): the type, `normalizeDrfBody()`, the fallback messages, and the readers `formErrorMessage()` and `hasErrorMessage()` (e.g. to spot "This timeslot is already booked."). A body with a string `detail` uses only `detail`, so SimpleJWT's `code` and `messages` are ignored.
- `lib/api-errors.ts` (server-only): `normalizeApiError(error)` for anything caught around an API call. Server actions return its result to the client. Non-`ApiError` throws get `kind: "unknown"` and the generic message, never the error's own text.
- `lib/form-errors.ts` (shared): `applyServerErrors(form, error, { fields, rename? })` sets each field's messages and puts the rest on `root.server`, joined with `\n`. Forms render them with `whitespace-pre-line`.

A 401 from `POST /auth/jwt/create/` always shows "Invalid username or password.", never SimpleJWT's `detail`.

The login form (`app/login/login-form.tsx`) is the first user of `applyServerErrors()`; later forms follow its pattern (Zod schema shared with the action, `Field`/`FieldError` from `components/ui/field.tsx`, a `role="alert"` form-level message above the submit button).

### Student access guard

Spec 15. How student pages handle 401 and 403 from student endpoints:

- `lib/student-api.ts` (Client Components only): `studentFetch<T>(path, { method, body, signal })` is the only browser fetch wrapper for `/api/student/…` (paths without a trailing slash). It resolves the JSON body (`undefined` for 204 or an empty body) and throws `StudentApiError` (`kind`, `status`, `method`, `normalized: NormalizedError`, a safe `message`) for every failure except a 401: non-2xx → `http` with the status (the proxy's 502/504 too); a rejected fetch → `network` with no status; a non-JSON 2xx → `invalid_response`. Aborts are re-thrown as aborts.
- **401:** `studentFetch` calls `endStudentSession()` and returns a promise that never settles, so queries stay loading and mutations pending (no error flash). The first call only: POST `/api/session/end` (deletes both httpOnly cookies, same-origin `Origin` required, no backend call), clear the query cache, then a full load of `/login?expired=1&next=<path + query>` (through `safeReturnPath()`). The cookies must go first: with an `access` cookie still set, `proxy.ts` would bounce `/login` back to `/dashboard`. The login form shows "Your session has expired. Log in again." for `expired=1`.
- **403 on a read** (a GET through `studentFetch`, or any student-mode `ApiError` in a Server Component, which only read): the page renders `StudentAccountNeeded` (`components/student-access/`) instead of its content, with Log out and Home. A 403 from PATCH or DELETE (locked trial lesson) goes to the form like any other error.
- `lib/student-access.ts` (shared): `isSessionError()` and `isNoStudentProfileError()`, structural checks on `status` (and `method`) that work for both error types.
- `studentAccessFallback(error)` (`components/student-access/student-access-fallback.tsx`) returns the element to render, or `null`. Server Components: `catch (e) { const f = studentAccessFallback(e); if (f) return f; throw e }`; its 401 branch renders `SessionExpiredRedirect`, which runs `endStudentSession()` after mount (needs JS). Server actions keep using `normalizeApiError()`.

### Account page

Spec 20. `/account` (`app/account/`) reads `GET /auth/users/me/` on the server through `getAccount()` (`account-data.ts`, server-only, student mode, Zod-checked, never cached) inside `<Suspense>`.

- Read-only: username, email, name (first + last, or a muted "Not set"; a blank email gets the same) and phone, then "To change these details, ask your tutor."
- Admin accounts get 200 with `phone_number: null`, not 403: they see their details with no phone row, not "Student account needed".
- 401/403 go through `studentAccessFallback()`, whose states replace the whole page. The "Account" heading is in `AccountShell`, rendered by the Suspense fallback, the details and the error panel, so it never sits above the guard's own `h1`.
- Every other failure is rethrown to `AccountErrorBoundary` (`catchError`, `SubjectsPanel` frame, Try again → `retry()`), never `app/error.tsx`.

### Student dashboard

Spec 21. `/dashboard` (`app/dashboard/`) is a static shell. The schedule loads in the browser, unlike `/account`, because local times only render on the client.

- `lib/schedule.ts` (Client Components only, it uses `studentFetch`): the Zod-checked `Schedule` types, `scheduleQueryKey` (`["schedule"]`) and `scheduleQueryOptions()`. Specs 25–31 invalidate `scheduleQueryKey` after every booking, edit, delete or cancel. The Zod check also runs `day`, `time` and `starts_at` through the `lib/time-zone.ts` parsers, so a bad value fails the query (inline panel) instead of throwing `TimeValueError` during render. A failed check throws a `StudentApiError` (`invalid_response`, generic message).
- The zone comes from `useSyncExternalStore` (`null` on the server), and `ScheduleView` renders only once it's known. It takes "now" once with `useState`, so `new Date()` never runs in the prerender (Cache Components rejects it there).
- `app/dashboard/local-schedule.ts` turns weekly classes into local weekday + minutes (a class past local midnight stays on its start day, ending after 1440), sorted and grouped in local order, plus the grid's hour range and side-by-side lanes for overlaps (only possible in an autumn clock-change week).
- A 403 renders `studentAccessFallback()`'s state with no shell (it has its own `h1`). Other failures show the `SubjectsPanel` error with Try again → `refetch()`. A failed background refetch keeps the schedule already shown.
- Desktop (`lg` and up): `WeekGrid`, 96px per hour, so a 40-minute block fits all three lines (subject, time, level and price). Below `lg`: `DayList`. The trial lesson is `TrialLessonCard`, above both.
- Edit links (spec 26) to `/classes/{id}/edit`, named "Edit <subject>, <local weekday> <time>" (`app/dashboard/edit-class-link.tsx`): on `WeekGrid` the subject name is a link stretched over the whole block (no fourth line, the hour height stays 96px; focus rings the block), on `DayList` a visible 44px "Edit" link in the row's right column.
- Delete (spec 27), dashboard only: on `WeekGrid` a 24px trash icon button in the block's top-right corner, above the stretched Edit link (the subject line leaves room for it, the hour stays 96px); on `DayList` a 44px "Delete" button beside "Edit". Both are named "Delete <subject>, <local weekday> <time>" (`app/dashboard/edit-class-link.tsx`) and open the one `DeleteClassDialog` (`delete-class-dialog.tsx`), held by `ScheduleView` since both layouts are rendered. It shows the class as the schedule does, "Keep class" (initial focus) and a solid destructive "Delete class" ("Deleting…"). `DELETE /api/student/classes/{id}` through `studentFetch`, a ref guard against double clicks, no closing (Escape, outside click, Keep) while pending. Success or a 404 (already gone, an info toast "This class was already deleted.") removes the class from the cached schedule at once, refetches `scheduleQueryKey` now (the dashboard is mounted, unlike specs 25–26), and invalidates availability and `weeklyClassQueryKey(id)` with `refetchType: "none"`; then "Weekly class deleted.". Other errors stay in the dialog (`role="alert"`); a 401 keeps it pending until the session-expired redirect. A refetch that drops the class closes the dialog. Focus returns to the opener, or once it's gone to the "Weekly classes" heading or the empty state's heading.

### Availability

Spec 22. `lib/availability.ts` (Client Components only, it uses `studentFetch`) is the one place the Backend API › Availability rules live; pickers and forms never re-derive them.

- `availabilityQueryKey` (`["availability"]`) and `availabilityQueryOptions()`, with `staleTime: 0` so every picker mount refetches (focus, reconnect and retry follow the shared defaults). Specs 25–31 invalidate the key after every booking, edit, delete or cancel, and after "This timeslot is already booked." The Zod check runs `day`, `time` and `starts_at` through the `lib/time-zone.ts` parsers; a failure throws a generic `invalid_response` `StudentApiError`.
- Lookups work in UTC only and return `SlotAvailability`: `free`, `taken` (someone else's, blocked), `mine` (the student's own booking, blocked, "Yours") or `own` (the booking being edited, selectable, "Yours").
- `weeklySlotAvailability(data, { ownSlot })`: blocks every weekly class's `day` + `time` and every trial lesson's UTC weekday + hour (from `starts_at` via `startsAtToUtcWeeklyKey()`; the response's trial `day`/`time` are checked but not used).
- `trialSlotAvailability(data, { ownStartsAt })`: blocks any candidate on a weekly class's UTC weekday + hour and each exact trial `starts_at` (compared as instants).
- The own slot is `own` only when the response holds it as one of the student's (`mine`) bookings of that kind; otherwise the option does nothing.
- `useWeeklyAvailability({ ownSlot })` and `useTrialAvailability({ ownStartsAt })` return `{ query, slotAvailability }`; the lookup is `null` until data loads and keeps the last data through a refetch. Pages read `query.error` (403 → `studentAccessFallback()`).

### Weekly slot picker

Spec 23. `WeeklySlotPicker` (`components/slot-picker/weekly-slot-picker.tsx`, client) is the one control for a weekly class's slot (specs 25 and 26).

- Controlled and UTC only: `value` and `onChange` carry `{ day, time }` (`onChange(null)` when a refetch shows the selected slot as `taken` or `mine`; the form shows the notice). It never fetches: the page calls `useWeeklyAvailability({ ownSlot })` and passes `slotAvailability` (`null` = loading, every cell disabled with a status line), and handles the query's 403 and errors itself. Also `disabled`, `id` and the radiogroup's `aria-label`/`aria-labelledby`/`aria-describedby`/`aria-invalid`.
- Offers all 168 slots from `weeklySlotGrid()`, arranged by `buildWeeklyLayout()` (`components/slot-picker/weekly-slots.ts`): each local day's slots grouped into four parts of the day by local start hour (Night, Morning, Afternoon, Evening). When a clock change in the coming week puts two UTC slots on one local day and time, both are offered and labelled with `formatUtcOffset()`.
- Zone from `useSyncExternalStore`, "now" once in `useState` after mount; before that a static placeholder, so the prerender holds no local times. The zone note is `weeklyTimeZoneNote()`.
- Layout (`weekly-day-tabs.tsx`, every width): `components/ui/tabs.tsx` day tabs (a check on the day holding the selection), opening on the selected slot's local day or today's local weekday, then that day's slots under each part's name and range, drawn by `DayPartSlots` (`day-part-slots.tsx`, shared with the trial picker, with the `SlotGroupProps` type; parts of the day in `day-parts.ts`). `useWideLayout()` (`use-wide-layout.ts`, Tailwind's `lg` via `matchMedia`) sets 4 per row with the part above (short weekday names) or, from `lg`, one row of 6 per part with the part beside it (full weekday names, picker capped at `max-w-4xl`), so the whole day fits without scrolling. The same column count drives the CSS grid and the keyboard rows. No desktop week grid: it was replaced after a browser review (spec 23 › Conflicts).
- `SlotCell` (`slot-cell.tsx`) draws the Design states: free (surface, primary border on hover), taken (`slot-hatch` utility in `app/globals.css`, "Taken"), mine and own (2px eosin border, dot, "Yours"; own stays selectable), selected (primary fill, check). Its accessible name is weekday, time (and offset) and state. `SlotLegend` explains them.
- Keyboard: one cell in the tab order (`use-roving-grid.ts`), the selected slot or else the first at or after 08:00 local; arrows only move focus (Up/Down keep the visible column, Left/Right move along the row, Home/End), Space, Enter or a click selects. Taken and "Yours" cells stay focusable but `aria-disabled`, so screen readers announce them; this departs from the radio pattern's select-on-arrow on purpose. Base UI's RadioGroup isn't used: its arrow keys are linear only.

### Trial slot picker

Spec 24. `TrialSlotPicker` (`components/slot-picker/trial-slot-picker.tsx`, client) is the one control for the trial lesson's slot (specs 28 and 29), a sibling of the weekly picker built from the same parts (`DayPartSlots`, `SlotCell`, `SlotLegend`, `useRovingGrid`, `useWideLayout`).

- Controlled and UTC only: `value` and `onChange` carry a `starts_at` string (`onChange(null)` when a refetch shows the selected hour as `taken` or `mine`). It never fetches: the page calls `useTrialAvailability({ ownStartsAt })` and passes `slotAvailability` (`null` = loading). Also `ownStartsAt` (editing), `disabled`, `id` and the radiogroup's aria props. A malformed or out-of-window value shows nothing selected and never throws.
- Window (`trial-slots.ts`, `buildTrialLayout()`): every full UTC hour from the first at or after "now" + 24 hours, for 14 days (336 hours, from `trialSlotList()`), "now" taken once after mount. The 24-hour lead time is a frontend rule only (the backend accepts any future full hour). The own hour when editing is offered even inside the lead time, as long as it's in the future. Hours are keyed by epoch ms; a local hour repeated by the autumn clock change shows twice, each labelled with `formatUtcOffset()`.
- Layout (`trial-date-tabs.tsx`): one row of local-date tabs (short weekday over `formatLocalDate()`'s "29 Oct", a gap before each Monday, scrolling sideways when it doesn't fit, a check on the date holding the selection), then that date's hours under the parts of the day, 4 or 6 per row as in the weekly picker. It opens on the selected hour's date, else the first date with a free hour once availability loads; after the student picks a date or hour, a refetch never moves it.
- Notes: "Times are in <zone> (<offset>)." (no daylight-saving sentence), the loading status, "No times are free in the next two weeks." when nothing is bookable, and below the hours the selected hour in full (`formatTrialDateTime()`).

### Book weekly class

Spec 25. `/classes/new` (`app/classes/new/`) is a static shell: `page.tsx` reads `getSubjects()` (cached, public) inside `SubjectsErrorBoundary`, and passes the list to `WeeklyClassForm` (`app/classes/weekly-class-form.tsx`, client, shared with spec 26). Availability, local times and `?subject=<slug>` (exact slug, through `lib/use-location-search.ts`, applied once after mount) are read in the browser.

- `BookingShell` (`app/classes/booking-shell.tsx`, client) renders `BookingFrame` (`booking-frame.tsx`: the back link and the `h1`, plain markup for Suspense fallbacks), and watches the availability query: its 403 renders `studentAccessFallback()`'s state in place of the whole page. A failed subjects read keeps the heading and shows the subjects panel instead of the form.
- Form (react-hook-form + `weeklyClassFormSchema(subjects)` in `app/classes/schema.ts`): subject, level (the subject's levels only; auto-picked when there's one, cleared when the new subject lacks it), duration (with the subject's weekly price), and `WeeklySlotPicker` with no own slot. The backend's `day` and `time` errors are renamed onto `slot`. Radio groups and the picker are focused on error through their tab stop.
- Submit: a TanStack mutation through `studentFetch` (`POST /api/student/classes`), a ref guard against double posts, the form disabled until navigation. On success, `scheduleQueryKey` and `availabilityQueryKey` are invalidated with `refetchType: "none"` (an immediate refetch would show the new class as "mine" in the still-mounted picker and flash the taken notice; both refetch on their next mount), then a "Weekly class booked." toast and `/dashboard`.
- Pages left behind aren't unmounted: with Cache Components, Next hides them in React's `<Activity>` and shows them again with their state (`node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`). So after a successful save, a `useLayoutEffect` cleanup (it runs when the page is hidden) resets the mutation, the double-post ref, the notice and the values (empty when booking; when editing, the saved class, also written into its query so `editing` and the own slot follow). Without it, returning to the page finds it still "Saving…". Unsaved drafts are kept. Specs 28–29 need the same.
- "This timeslot is already booked." (`SLOT_TAKEN_MESSAGE`, via `hasErrorMessage()`): the warning notice above the picker, and availability is refetched; the picker then clears the slot itself. The notice also shows when a background refetch clears the selected slot (`onChange(null)`), and hides when a new slot is picked or on submit. Any other backend message goes through `applyServerErrors()`.
- An availability failure other than 403, with nothing loaded yet, shows an inline panel with Try again where the picker goes.

### Edit weekly class

Spec 26. `/classes/[id]/edit` (`app/classes/[id]/edit/`) reuses spec 25's `WeeklyClassForm` with `editing` set.

- Class ids are only known per request, so `page.tsx` awaits `params` inside `<Suspense>`; the fallback (`BookingFrame` + a static `ClassLoading`) is the prerendered shell. An id that isn't `^[1-9]\d*$` (the student API proxy's rule) shows `ClassNotFound` with no request.
- The class loads in the browser: `weeklyClassQueryOptions(id)` / `weeklyClassQueryKey(id)` (`["classes", id]`) in `lib/schedule.ts`, Zod-checked like the schedule (no `price`, no `day_display`). `BookingShell` gets `classId` and watches it with availability, so a 403 from either replaces the page. A 404 (any body; CLAUDE.md documents none) → "Class not found" with a dashboard link; other failures → inline panel with Try again. The form mounts only once the class has loaded, and a background refetch never resets it.
- Prefill checks the current subject list: a subject no longer listed starts unchosen, a level the subject no longer offers is cleared (or its single level picked). No `?subject=` preselection.
- `useWeeklyAvailability({ ownSlot })` gets the class's slot as loaded, so it stays "Yours" and selectable after another slot is picked.
- Save: `PATCH /api/student/classes/{id}` with all five fields ("Save changes", "Saving…"). On success, schedule, availability and the class's query are invalidated with `refetchType: "none"`, then a "Weekly class updated." toast and `/dashboard`. Errors and the "already booked" notice work as in booking; a 404 from PATCH lands in the form-level alert.

### Time zones

`lib/time-zone.ts` (shared, pure) holds every UTC ↔ local conversion and time display format. Callers always pass the IANA time zone and "now" (or a reference instant); the helpers never read either themselves. `getBrowserTimeZone()` is for client code only.

- Weekly slots (`day` + `"HH:00:00"`) follow the next-occurrence rule (see Backend API). `weeklySlotGrid()` lists all 168 UTC slots with local labels; pickers and the schedule build on it and on `trialSlotList()` (future full UTC hours grouped by local date), never on local input, so half-hour zones like `Asia/Kolkata` still get every slot.
- Local → UTC (`localToWeeklySlot()`, `localToStartsAt()`) returns a result with `kind`: `ok`, `ambiguous` (autumn clock change), `nonexistent` (spring gap, or no full UTC hour), and for trials `not-full-hour`. Nothing is silently shifted.
- Parsers (`parseWeekday`, `parseUtcTime`, `parseStartsAt`) throw `TimeValueError` on bad backend values. Never show `day_display`: it's the UTC weekday.
- The server doesn't know the student's zone, so local times render only in Client Components after mount (see `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`). `weeklyTimeZoneNote()` builds the zone note for specs 21 and 23 (the daylight-saving sentence only when `observesDaylightSaving()` is true). `formatUtcOffset()` ("GMT+1") labels two weekly slots that share a local time in a clock-change week; `formatWeekday()` takes `"short"` for compact day labels. `formatLocalDate()` formats a local calendar date ("Thu 29 Oct", "Thursday 29 October") for the trial picker.

### Auth flow (JWT in httpOnly cookies)

Tokens never reach client JS:

1. `app/login/actions.ts` — server action `login({ username, password, next })`, called by the `/login` form (`app/login/login-form.tsx`, which reads `next` from the URL at submit time so the page stays static). It re-checks the input with the shared Zod schema (`app/login/schema.ts`), posts the credentials through the API client (public mode), stores `access` (270 s, 30 s before the 5-minute token expires) and `refresh` (1 day, the backend's SimpleJWT default lifetime) as httpOnly, `sameSite: lax` cookies, then redirects to `safeReturnPath(next)` (`lib/return-path.ts`: same-site paths only; anything else, `/login` or `/register` → `/dashboard`). On failure it returns a `NormalizedError` (a 401 → "Invalid username or password.").
2. `proxy.ts` — runs on pages and `/api/`. First, any `/subjects/…` path with uppercase letters gets a permanent (308) redirect to the same path in lowercase (query kept, percent escapes untouched, no backend call): slugs are lowercase, and a wrong-case render would otherwise share a route-cache file with the real page on case-insensitive filesystems (spec 17). Its `config.matcher` skips static files (`/_next/static`, `/_next/image`, `/images/`, `/logo/`, the app icons and any path with a file extension), so one page load makes at most one refresh call. If `access` is missing but `refresh` exists, it calls the refresh endpoint, sets the new `access` cookie on both the forwarded request (so the current render sees it) and the response. If refresh fails, it deletes both cookies and treats the request as a guest's; requests under `/api/` then get a 401 JSON `{"detail": "Your session has expired. Log in again."}` (a fetch would otherwise follow a redirect to the login page's HTML).
3. Route protection (same file, after the refresh step). "Logged in" means an `access` cookie is present or a refresh just succeeded; the token isn't checked any further. Guests on student routes (`/dashboard`, `/account`, `/classes`, `/trial-lesson`, matched on whole segments with everything under them) are redirected to `/login?next=<path + query>`. Logged-in users on `/login` or `/register` are redirected to `/dashboard`. Every other page, including public pages after a failed refresh, loads normally.
4. `app/login/actions.ts` — server action `logout()` deletes both cookies (path `/`) and `redirect("/")`, with no backend call. The header's form posts it directly (works without JS) and clears the TanStack Query cache on submit. Server actions post to the current URL, so a user whose cookies are already gone on a student route gets the proxy's `/login?next=…` redirect instead and the action doesn't run (they're logged out anyway).
5. `app/api/session/end/route.ts` — POST only, deletes both cookies the same way when the student access guard ends a session the backend refused (see Student access guard).

Keep cookie options (names, `maxAge`, flags) consistent between these two files, the logout action and the session-end route when changing any of them.

**Registration doesn't log in.** `app/register/actions.ts` — server action `register({ values, next })` re-checks the input with `registerSchema` (`app/register/schema.ts`), posts to `POST /auth/users/` (public mode), sets no cookies, and redirects to `/login?registered=1&username=…` (plus `next`, passed through `safeReturnPath()`; never the password). On failure it returns a `NormalizedError`. The login form reads those params in the browser (`lib/use-location-search.ts`, so `/login` stays static): a success notice until the next submit, the username prefilled, the password focused. The login page's "Register" link carries `next` on to `/register`.

### Register page and phone field

`/register` (spec 14) is static; `next` is read at submit time and the default country after mount. The phone field lives only in `app/register/` (`phone-field.tsx`, `country-combobox.tsx`), so only that route loads `react-phone-number-input` (`/max` metadata, for real per-country validity via `libphonenumber-js/max`) and its flags (bundled from `react-phone-number-input/flags`: never the library's default flag CDN URL, never its `style.css`). The value sent is E.164. The country selector is a Base UI Combobox (`components/ui/combobox.tsx`, trimmed shadcn parts, restyled to the tokens) that searches name, ISO code and calling code. The default country comes from the browser time zone via `countries-and-timezones` (register page only, about 10 kB gzipped): a zone shared by several countries prefers the language region, else its main country; a zone with no country falls back to the first `navigator.languages` region; otherwise no default. No geo-IP lookup. With no country selected, input counts as international only after a typed leading `+`: digits without one stay as a draft (no country is guessed from them) until a country is chosen, so the field uses the library's basic input (`smartCaret={false}`). Keep `libphonenumber-js` updated: its full metadata can reject newly assigned number ranges until it's updated. The password show/hide input is shared by login and register (`components/password-input.tsx`).

### UI stack

- **shadcn/ui** with the `base-vega` style, built on `@base-ui/react` (not Radix). Add components with `npx shadcn add <name>`; they land in `components/ui/`. Config in `components.json`.
- **Tailwind CSS v4**, CSS-first config in `app/globals.css` (no `tailwind.config`); processed via `@tailwindcss/turbopack` loader configured in `next.config.ts`. Theme tokens are CSS variables; dark mode uses the `.dark` class variant.
- `cn()` in `lib/utils.ts` re-exports from the `cn` package.
- Icons: `lucide-react`.
- Theme: `next-themes` (spec 08), via the client wrapper
  `components/theme-provider.tsx` in the root layout (class strategy, default
  `system`, saved in localStorage). Known and expected: in dev, React 19 may
  log "Encountered a script tag while rendering React component…" for
  next-themes' inline script. It's dev-only and harmless (the script already
  ran from the server HTML before paint), so don't replace next-themes to
  silence it.
- Data fetching: TanStack Query (spec 09), via the client wrapper
  `components/query-provider.tsx` in the root layout (one client per browser
  session, a new one per server render). Shared defaults: queries never retry
  a 4xx except 408 and 429, everything else retries at most twice; mutations
  never retry; `staleTime` 30 s (availability overrides it with 0 in
  `lib/availability.ts`, spec 22). The
  retry rule reads a numeric `status` on the thrown error; browser code
  fetches student data only through `studentFetch` (`lib/student-api.ts`),
  whose `StudentApiError` carries it. The schedule query and its key are in
  `lib/schedule.ts` (see Student dashboard).
- Toasts: shadcn Sonner in `components/ui/sonner.tsx`, mounted once in the
  root layout and styled with the theme tokens (success, warning and
  destructive fills, surface for default and info). Import `toast` from
  `@/components/ui/sonner`, never from `sonner` (the wrapper gives plain
  toasts their info icon), and never add another `<Toaster />`. Its fade and
  scale motion overrides Sonner's CSS in `app/globals.css`.
- App shell (spec 10) lives in the root layout: skip link, header
  (`components/layout/site-header.tsx`), `<main id="main-content">`, footer
  (`components/layout/site-footer.tsx`). Pages render inside that `<main>`
  and never add their own. Only the header nav reads the `access` cookie
  (and `usePathname`), inside `<Suspense>`; the rest of the shell is static.
  The logged-in branch of `components/layout/site-nav.tsx` ends with the
  logout control (`components/layout/logout-button.tsx`: a quiet button on
  desktop, the last Menu item after a separator on mobile). The logo is `components/brand/logo.tsx`
  (`height` in px drives the under-24px favicon mark, copied from
  `app/icon.svg`). Menus use `components/ui/dropdown-menu.tsx`, restyled to
  the tokens; searchable pickers use `components/ui/combobox.tsx`, styled the same; confirm dialogs use `components/ui/dialog.tsx` (Base UI Dialog, not AlertDialog, which can't close on an outside click; trimmed, no corner close button; 16px radius, the one elevation, 180ms fade and scale; the backdrop is `foreground` at 20%, since Design has no scrim colour; specs 27 and 30); tabs use `components/ui/tabs.tsx` (trimmed, no shadows, the active tab marked by fill, weight and a primary rule); choices use `components/ui/radio-group.tsx` (Base UI, restyled: `RadioCard` is a whole card as one radio, checked = primary border, accent tint and a filled dot). Both fonts are defined once in `app/fonts.ts`.
- Route fallbacks (spec 11), app-level only: `app/not-found.tsx` (every
  unmatched URL and `notFound()`, title "Page not found"), `app/error.tsx`
  (Next 16 `retry()`, shows only the `digest` as a reference, never the
  error's message), `app/global-error.tsx` (its own `<html>`/`<body>`,
  `globals.css`, the fonts and `ThemeProvider`, since it replaces the root
  layout) and a static `app/loading.tsx` (no pulse or spinner, per Motion).
  They share `components/route-state.tsx` (layout) and
  `components/error-state.tsx` (error content). Pages add segment-level
  fallbacks only when they need them.
- `components/specimen-image.tsx` (`SpecimenImage`) is the only way to show
  `public/images/` illustrations: string `src`, required `alt`, `width` and
  `height` (intrinsic), `className` sizes the reserved box, optional
  `fallback` shown if loading fails (nothing otherwise), lazy by default,
  `loading="eager"` + `fetchPriority="high"` for the hero. Two modes: hidden
  until loaded (default), or `visibleBeforeHydration` (the hero only, with
  the broken-image exception in Design › Images). Single `src`; a
  dark variant, if ever needed, is a second image switched with CSS.
- `components/brand/hex-lattice.tsx` (`HexLattice`) is the one hex lattice
  motif: a single decorative path, static by default (subject headers, spec
  17). `drawIn` (the home hero only, spec 18) traces every hexagon at once
  with a CSS stroke dash (`animate-lattice-draw` in `app/globals.css`,
  800ms, once), so it also completes without JavaScript and is static under
  reduced motion.

### Installed but not yet wired up

Zustand is a dependency intended for client state, with no stores yet. react-hook-form + zod (`@hookform/resolvers`) are wired up: the login form and its schema (`app/login/`) are the first, then the register form (`app/register/`) and the weekly class form (`app/classes/`, booking and editing), with backend errors mapped by `lib/form-errors.ts` (see Backend errors).

Path alias: `@/*` → repo root.

## Spec roadmap

Specs live in `.claude/specs/<NN>-<slug>.md` and are created with
`/create-spec <NN> <name>`. Build them in order.

When a spec changes something described elsewhere in CLAUDE.md (e.g.
Architecture, Auth flow, Installed but not yet wired up), update that section
as part of the spec.

| #  | Spec | Responsibility | Depends on | Status |
|----|------|----------------|------------|--------|
| 01 | project-setup | Environment and repo setup: `.env` (local, git-ignored) and `.env.example` (committed, placeholder values and a comment per variable) for `API_BASE_URL` and `SITE_URL`; a validated, server-only env module that fails clearly on missing or invalid values, importable from `proxy.ts` (split into `lib/env-core.ts` + `lib/env.ts` if the server-only marker breaks there); replacing the hard-coded `http://127.0.0.1:8000` in `app/login/actions.ts` and `proxy.ts` with `API_BASE_URL` from the env module; `.gitignore` covering env files (with an exception for `.env.example`), build output and editor/OS files; `package.json` name `science-nest` and `engines.node` `>=20.9`; a README with setup and run steps; removal of unused scaffold leftovers (`public/file.svg`, `globe.svg`, `window.svg`, boilerplate README text). Doesn't add the HTTP client (03), or touch fonts, `app/globals.css`, the favicon (08), root layout metadata (10), or `app/page.tsx` and its `next.svg`/`vercel.svg` (18) | — | Implemented |
| 02 | session-token-refresh | `proxy.ts` refreshes an expired `access` cookie from the `refresh` cookie; on failure clears both cookies (spec 07 decides which pages then redirect to `/login`) | — | Implemented |
| 03 | backend-api-client | Server-only HTTP client: backend base URL from the env module (spec 01), `Authorization: JWT <access>` from the cookie, trailing-slash paths | 01 | Implemented |
| 04 | drf-error-handling | Normalize DRF errors (`{field: [msgs]}`, `non_field_errors`, `{detail}`) into one shape and map them onto react-hook-form field and form errors | 03 | Implemented |
| 05 | student-api-proxy | Route handler that forwards browser requests for student endpoints to Django, adding the JWT from the httpOnly cookie and passing status and body through unchanged | 03 | Implemented |
| 06 | time-zone-helpers | Pure helpers converting UTC weekday + hour and UTC `starts_at` to and from the student's local time, including day rollover, plus display formatting | — | Implemented |
| 07 | route-protection | Proxy redirects: guests on student routes → `/login` (with return path); logged-in users on `/login` and `/register` → `/dashboard` | 02 | Implemented |
| 08 | design-theme | Implement the CLAUDE.md Design section as Tailwind v4 theme tokens in `app/globals.css` (light and dark), load the fonts with `next/font` in the root layout, and restyle installed shadcn components to match; apply the `.dark` class from the saved choice (light, dark or system, default system) via `next-themes`, following the system preference live, with no flash of the wrong theme on load. The toggle control is in 10 | — | Implemented |
| 09 | query-provider | TanStack `QueryClientProvider` in a client wrapper mounted in the root layout, with shared defaults (no retry on 4xx except 408 and 429); also mount the single app-wide toaster (shadcn Sonner) styled with the success, warning and destructive tokens and following the active theme. Specs that show toasts use this toaster and never add their own | 08 | Implemented |
| 10 | app-shell-navigation | Root layout chrome: header with guest links (Subjects, Log in, Register) or student links (Subjects, Dashboard, Account), a light/dark/system theme toggle in the header, footer, site-wide title template | 08 | Implemented |
| 11 | route-fallback-states | App-level `loading.tsx`, `error.tsx`, `not-found.tsx` and `global-error.tsx` in the app's style; images: see Design › Images | 08, 10 | Implemented |
| 12 | logout | Server action that deletes the `access` and `refresh` cookies and redirects home, triggered from the header | 10 | Implemented |
| 13 | login-page | `/login` form (react-hook-form + Zod) using the existing `login()` action, showing field and credential errors, redirecting to the return path or `/dashboard` | 04, 07, 10 | Implemented |
| 14 | register-page | `/register` form posting to `POST /auth/users/` with all required fields and phone validation, showing DRF field errors, then continuing to login | 04, 07, 09, 10, 13 | Implemented |
| 15 | student-access-guard | Shared handling of student-endpoint auth failures: 401 → `/login`, 403 (admin account without a Student profile) → friendly message component | 05, 09 | Implemented |
| 16 | subjects-list-page | Public `/subjects` page rendering `GET /subjects/` on the server: name, levels, 40/60-minute prices; images: see Design › Images | 03, 10 | Implemented |
| 17 | subject-detail-page | Public `/subjects/[slug]` page from the cached subjects list (`getSubjects()`) (description, levels, prices, booking CTAs); unknown slug → not-found; images: see Design › Images | 11, 16 | Implemented |
| 18 | home-page | Replace the starter `app/page.tsx` with the public landing page: pitch, tutor credentials (no name or photo), subjects overview, "Book a free trial" and "Book a weekly class" CTAs (no register link); images: see Design › Images | 16 | Implemented |
| 19 | public-seo-metadata | Metadata for public pages (titles, descriptions, Open Graph), `generateMetadata` for subject detail, `sitemap.ts`, `robots.ts` | 01, 16, 17, 18 | Implemented |
| 20 | account-page | Read-only `/account` page showing `GET /auth/users/me/` fields | 15 | Implemented |
| 21 | student-dashboard | `/dashboard` showing `GET /schedule/`: weekly classes with prices, the trial lesson, weekly cost, in local time, with empty state and links to book; images: see Design › Images | 06, 09, 15 | Implemented |
| 22 | availability-query | Query hook for `GET /availability/` and derived blocked sets for the weekly and trial pickers per the API rules, with an "exclude my own slot" option for edits | 05, 06, 09 | Implemented |
| 23 | weekly-slot-picker | Reusable control to pick a weekday + full hour in local time, greying out blocked slots, returning UTC `day` + `time` | 22 | Implemented |
| 24 | trial-slot-picker | Reusable control to pick a future date + full hour in local time, greying out blocked times, returning a UTC `starts_at` | 22 | Implemented |
| 25 | book-weekly-class | `/classes/new` form: subject, level (filtered to the subject), duration 40/60, slot; `POST /classes/`; handles "already booked" by refetching availability; invalidates schedule and availability | 04, 09, 21, 23 | Implemented |
| 26 | edit-weekly-class | `/classes/[id]/edit`: load `GET /classes/{id}/`, prefill the form, keep its own slot selectable, save with PATCH | 09, 25 | Implemented |
| 27 | delete-weekly-class | Delete action with confirmation from the dashboard: `DELETE /classes/{id}/`, then invalidate schedule and availability | 09, 21 | Implemented |
| 28 | book-trial-lesson | `/trial-lesson/new` form: subject, level, slot; `POST /trial-lessons/`; only offered when the student has no trial lesson; invalidates schedule and availability | 04, 09, 21, 24 | Stub |
| 29 | edit-trial-lesson | Edit page for the trial lesson: prefill, keep its own slot selectable, save with PATCH | 09, 28 | Stub |
| 30 | cancel-trial-lesson | Cancel action with confirmation: `DELETE /trial-lessons/{id}/`, then invalidate schedule and availability | 09, 21 | Stub |
| 31 | trial-lesson-locked-state | Locked display for a past or completed trial lesson: hide edit and cancel, and show the backend's 403 message if an edit or delete is refused | 09, 29, 30 | Stub |
