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
Science (All Levels 1–O), Biochemistry and Molecular Biology (University).

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
