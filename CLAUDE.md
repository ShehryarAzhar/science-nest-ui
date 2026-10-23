# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — dev server on http://localhost:3000 (Turbopack)
- `npx tsc --noEmit` — type-check
- `npm run lint` — ESLint 9 flat config (`eslint-config-next` core-web-vitals + typescript)
- `npm run build` — production build

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

Subjects: Biology and Chemistry (O Level, A Level), Physics (O Level),
Science (All Levels 1–O), Biochemistry (University), Molecular Biology
(University).

Pages: home, subjects list and detail (public), register, login, student
dashboard (schedule and weekly cost), book or edit a weekly class, book, edit
or cancel the trial lesson, and a read-only account page. No profile editing,
password reset or password change.

## Backend API

Django REST Framework + MySQL, auth via Djoser + SimpleJWT.

- Auth header is `Authorization: JWT <token>` (not Bearer).
- Every path ends with a trailing slash.
- Every date and time is UTC. The frontend converts to the student's local time.
- Errors use DRF format: `{field: [msgs]}`, `non_field_errors`, or `{detail}`.

**Auth (`/auth/`)**
- `POST users/`: register with username, email, password, first_name,
  last_name, phone_number (required, optional `+` then 7–15 digits). Creates
  a Student profile.
- `POST jwt/create/`: username + password → `access`, `refresh`.
- `POST jwt/refresh/`: refresh → `access` only.
- `GET users/me/`: username, email, first_name, last_name, phone_number
  (null for admin accounts). Read-only.

**Subjects (public, read-only):** `GET /subjects/`, `GET /subjects/{slug}/`
- Fields: id, name, slug, description (plain text, may be blank), levels,
  price_40_min, price_60_min (USD, numbers).
- `levels` is a list of `{code, name}`. Codes: `o_level`, `a_level`,
  `all_levels` (All Levels (1-O Level)), `university`.

**Weekly classes (student, full CRUD):** `/classes/`, `/classes/{id}/`
- Send: subject (id), level (code), day (`monday`–`sunday`), time (full hour,
  UTC), duration (40 or 60).
- Returns: subject as `{id, name, slug, levels}`, level as `{code, name}`,
  day and day_display. No price.
- Level must be one of the subject's levels. One booking per weekday + hour
  across all students. Can't take a slot held by an upcoming trial lesson.

**Trial lesson (student, full CRUD):** `/trial-lessons/`, `/trial-lessons/{id}/`
- Send: subject (id), level (code), starts_at (ISO 8601 UTC, full hour,
  future). Always 60 minutes and free.
- One per student. Can't clash with a weekly class or another trial lesson.
- Once completed (set in admin) or past, it is locked: edit and delete return
  403 with a message. It can still be read.

**Schedule (student):** `GET /schedule/`
- Returns weekly_classes (each with its price), trial_lesson (object or null,
  shown even when past), and weekly_cost. Sorted by UTC day and time.

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
an error.

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
- destructive `#B42318` / `#FF8A7A`
- success `#1E7A4C` / `#5FD39A`, on-success `#FFFFFF` / `#14122A` (booking confirmations)
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
and subject headers, plus a single-hex logo mark. Never behind forms,
pickers or the schedule.

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
- A missing image never shows a broken icon. It stays hidden until it loads.
  If it fails, the hero shows only the hex lattice, a subject image shows the
  hex logo mark, and the other images show nothing.
- Hero: `loading="eager"` + `fetchPriority="high"` (`priority` is deprecated
  in Next 16). Everything else lazy-loads.

## Architecture

App Router frontend for a separate **Django backend at `http://127.0.0.1:8000`** (Djoser/SimpleJWT-style endpoints: `/auth/jwt/create/`, `/auth/jwt/refresh/`). The backend URL is currently hard-coded in `app/login/actions.ts` and `proxy.ts`.

### Auth flow (JWT in httpOnly cookies)

Tokens never reach client JS:

1. `app/login/actions.ts` — server action `login()` posts credentials to the backend with axios, stores `access` (5 min) and `refresh` (1 day) as httpOnly, `sameSite: lax` cookies, then `redirect("/")`. Returns `{ error }` on failure.
2. `proxy.ts` — runs on every request. If `access` is missing but `refresh` exists, it calls the refresh endpoint, sets the new `access` cookie on both the forwarded request (so the current render sees it) and the response. If refresh fails, it deletes both cookies and redirects to `/login`.

Keep cookie options (names, `maxAge`, flags) consistent between these two files when changing either.

### UI stack

- **shadcn/ui** with the `base-vega` style, built on `@base-ui/react` (not Radix). Add components with `npx shadcn add <name>`; they land in `components/ui/`. Config in `components.json`.
- **Tailwind CSS v4**, CSS-first config in `app/globals.css` (no `tailwind.config`); processed via `@tailwindcss/turbopack` loader configured in `next.config.ts`. Theme tokens are CSS variables; dark mode uses the `.dark` class variant.
- `cn()` in `lib/utils.ts` re-exports from the `cn` package.
- Icons: `lucide-react`.

### Installed but not yet wired up

TanStack Query, Zustand, react-hook-form + zod (`@hookform/resolvers`), and axios are dependencies intended for data fetching, client state, and forms. There are no providers, stores, or form schemas yet — when adding the first one, a `QueryClientProvider` will need a client component wrapper in `app/layout.tsx`.

Path alias: `@/*` → repo root.

## Spec roadmap

Specs live in `.claude/specs/<NN>-<slug>.md` and are created with
`/create-spec <NN> <name>`. Build them in order.

When a spec changes something described elsewhere in CLAUDE.md (e.g.
Architecture, Auth flow, Installed but not yet wired up), update that section
as part of the spec.

| #  | Spec | Responsibility | Depends on | Status |
|----|------|----------------|------------|--------|
| 01 | project-setup | Environment and repo setup: `.env` (local, git-ignored) and `.env.example` (committed, placeholder values and a comment per variable) for `API_BASE_URL` and `SITE_URL`; a validated, server-only env module that fails clearly on missing values; `.gitignore` covering env files (with an exception for `.env.example`), build output and editor/OS files; `package.json` name `science-nest`; a README with setup and run steps; removal of unused scaffold leftovers (`public/file.svg`, `globe.svg`, `window.svg`, boilerplate README text). Doesn't replace the hard-coded backend URLs (03), or touch fonts, `app/globals.css`, the favicon (08), root layout metadata (10), or `app/page.tsx` and its `next.svg`/`vercel.svg` (18) | — | Stub |
| 02 | session-token-refresh | `proxy.ts` refreshes an expired `access` cookie from the `refresh` cookie; on failure clears both cookies and redirects to `/login` | — | Implemented |
| 03 | backend-api-client | Server-only HTTP client: backend base URL from the env module (spec 01), `Authorization: JWT <access>` from the cookie, trailing-slash paths; replaces the hard-coded URLs in `app/login/actions.ts` and `proxy.ts` | 01 | Stub |
| 04 | drf-error-handling | Normalize DRF errors (`{field: [msgs]}`, `non_field_errors`, `{detail}`) into one shape and map them onto react-hook-form field and form errors | 03 | Stub |
| 05 | student-api-proxy | Route handler that forwards browser requests for student endpoints to Django, adding the JWT from the httpOnly cookie and passing status and body through unchanged | 03 | Stub |
| 06 | time-zone-helpers | Pure helpers converting UTC weekday + hour and UTC `starts_at` to and from the student's local time, including day rollover, plus display formatting | — | Stub |
| 07 | route-protection | Proxy redirects: guests on student routes → `/login` (with return path); logged-in users on `/login` and `/register` → `/dashboard` | 02 | Stub |
| 08 | design-theme | Implement the CLAUDE.md Design section as Tailwind v4 theme tokens in `app/globals.css` (light and dark), load the fonts with `next/font` in the root layout, and restyle installed shadcn components to match; apply the `.dark` class from the saved choice (light, dark or system, default system) via `next-themes`, following the system preference live, with no flash of the wrong theme on load. The toggle control is in 10 | — | Stub |
| 09 | query-provider | TanStack `QueryClientProvider` in a client wrapper mounted in the root layout, with shared defaults (no retry on 401/403/400); also mount the single app-wide toaster (shadcn Sonner) styled with the success, warning and destructive tokens and following the active theme. Specs that show toasts use this toaster and never add their own | 08 | Stub |
| 10 | app-shell-navigation | Root layout chrome: header with guest links (Subjects, Log in, Register) or student links (Dashboard, Account), a light/dark/system theme toggle in the header, footer, site-wide title template | 08 | Stub |
| 11 | route-fallback-states | App-level `loading.tsx`, `error.tsx`, `not-found.tsx` and `global-error.tsx` in the app's style; images: see Design › Images | 08, 10 | Stub |
| 12 | logout | Server action that deletes the `access` and `refresh` cookies and redirects home, triggered from the header | 10 | Stub |
| 13 | login-page | `/login` form (react-hook-form + Zod) using the existing `login()` action, showing field and credential errors, redirecting to the return path or `/dashboard` | 04, 07, 10 | Stub |
| 14 | register-page | `/register` form posting to `POST /auth/users/` with all required fields and phone validation, showing DRF field errors, then continuing to login | 04, 07, 09, 10, 13 | Stub |
| 15 | student-access-guard | Shared handling of student-endpoint auth failures: 401 → `/login`, 403 (admin account without a Student profile) → friendly message component | 05, 09 | Stub |
| 16 | subjects-list-page | Public `/subjects` page rendering `GET /subjects/` on the server: name, levels, 40/60-minute prices; images: see Design › Images | 03, 10 | Stub |
| 17 | subject-detail-page | Public `/subjects/[slug]` page rendering `GET /subjects/{slug}/` (description, levels, prices, booking CTAs); unknown slug → not-found; images: see Design › Images | 11, 16 | Stub |
| 18 | home-page | Replace the starter `app/page.tsx` with the public landing page: pitch, tutor credentials (no name or photo), subjects overview, CTAs to register and book a trial; images: see Design › Images | 16 | Stub |
| 19 | public-seo-metadata | Metadata for public pages (titles, descriptions, Open Graph), `generateMetadata` for subject detail, `sitemap.ts`, `robots.ts` | 01, 16, 17, 18 | Stub |
| 20 | account-page | Read-only `/account` page showing `GET /auth/users/me/` fields | 15 | Stub |
| 21 | student-dashboard | `/dashboard` showing `GET /schedule/`: weekly classes with prices, the trial lesson, weekly cost, in local time, with empty state and links to book; images: see Design › Images | 06, 09, 15 | Stub |
| 22 | availability-query | Query hook for `GET /availability/` and derived blocked sets for the weekly and trial pickers per the API rules, with an "exclude my own slot" option for edits | 05, 06, 09 | Stub |
| 23 | weekly-slot-picker | Reusable control to pick a weekday + full hour in local time, greying out blocked slots, returning UTC `day` + `time` | 22 | Stub |
| 24 | trial-slot-picker | Reusable control to pick a future date + full hour in local time, greying out blocked times, returning a UTC `starts_at` | 22 | Stub |
| 25 | book-weekly-class | `/classes/new` form: subject, level (filtered to the subject), duration 40/60, slot; `POST /classes/`; handles "already booked" by refetching availability; invalidates schedule and availability | 04, 09, 21, 23 | Stub |
| 26 | edit-weekly-class | `/classes/[id]/edit`: load `GET /classes/{id}/`, prefill the form, keep its own slot selectable, save with an update request | 09, 25 | Stub |
| 27 | delete-weekly-class | Delete action with confirmation from the dashboard: `DELETE /classes/{id}/`, then invalidate schedule and availability | 09, 21 | Stub |
| 28 | book-trial-lesson | `/trial-lesson/new` form: subject, level, slot; `POST /trial-lessons/`; only offered when the student has no trial lesson; invalidates schedule and availability | 04, 09, 21, 24 | Stub |
| 29 | edit-trial-lesson | Edit page for the trial lesson: prefill, keep its own slot selectable, save with an update request | 09, 28 | Stub |
| 30 | cancel-trial-lesson | Cancel action with confirmation: `DELETE /trial-lessons/{id}/`, then invalidate schedule and availability | 09, 21 | Stub |
| 31 | trial-lesson-locked-state | Locked display for a past or completed trial lesson: hide edit and cancel, and show the backend's 403 message if an edit or delete is refused | 09, 29, 30 | Stub |

### Open questions
- Trial lesson response fields aren't documented: is there an `id`, `ends_at`, or a completed flag? Without a completed flag, the frontend can only detect "locked" from a past `starts_at` or a 403 (affects 21, 29–31).
- `/schedule/` item shapes aren't documented: the name of each weekly class's price field, and the format of `weekly_cost` (number or string) (affects 21).
- Registration: does Djoser require email activation? Should the app log the student in automatically after registering, or send them to `/login`? (affects 14)
- Does the 5-minute `access` cookie `maxAge` match SimpleJWT's `ACCESS_TOKEN_LIFETIME`? Does the 1-day `refresh` cookie match the refresh token lifetime? (affects 02)
- Should guests see "Book" buttons on public pages that send them to `/login`, or should those buttons only appear for students? (affects 17, 18)
