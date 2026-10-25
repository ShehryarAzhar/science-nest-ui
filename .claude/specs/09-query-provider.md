# Spec 09: Query Provider

- **Status:** Done
- **Created:** 2026-10-25
- **Completed:** 2026-10-25
- **Depends on:** 08-design-theme.md

## Summary
TanStack Query and toasts are the shared plumbing for every student data
screen: the dashboard, the availability-driven slot pickers and every
booking, edit and cancel flow. This spec mounts one `QueryClientProvider`
in the root layout, with shared defaults so a request the backend has
already refused (any 4xx except 408 and 429) isn't sent again. It also mounts the
single app-wide toaster (shadcn Sonner), styled with the "Stained slide"
tokens. Later specs then get consistent fetching and feedback without each
setting up their own.

## User stories
- As a student, I want a refused request (bad input, expired session, no
  access) to fail at once instead of retrying, so that I see the reason
  straight away.
- As a student, I want a brief, readable confirmation or notice after I
  book, edit or cancel, so that I know what happened without leaving the
  page.
- As a guest or student, I want notifications to match the app's light or
  dark theme, so that they're comfortable to read.

## Scope
- **Query provider:** a client wrapper component that creates one
  `QueryClient` per browser session (stable across re-renders, never shared
  between server requests) and provides it to the whole app. It's mounted in
  `app/layout.tsx` inside the existing `ThemeProvider`.
- **Shared query defaults:**
  - Queries never retry when the thrown error carries a 4xx HTTP `status`
    (400–499), except 408 and 429. A 4xx means the request itself is wrong,
    so repeating it only delays the error. 408, 429 and other failures
    (network errors, timeouts, 5xx) retry at most twice.
  - The retry rule reads only a numeric `status` property on the thrown
    error. It doesn't define the fetch wrapper or the error type (specs 21,
    22 and 25–31 do), so any later wrapper that throws an error with
    `status` gets the rule automatically.
  - Mutations never retry. Booking twice by accident would be worse than a
    failed booking.
  - A short shared `staleTime` (30 seconds), so moving between pages doesn't
    refetch straight away. 30 seconds is the shared default; spec 22
    overrides it for availability so pickers refetch when they open. Refetch on window focus and reconnect stays on,
    so availability doesn't go stale while a student is away.
- **Toaster:** install shadcn's Sonner component (`npx shadcn add sonner`,
  which adds the `sonner` package and `components/ui/sonner.tsx`) and mount
  it once in the root layout. It's the only toaster in the app.
  - Follows the active theme (light, dark or system) from `next-themes`,
    including live system changes.
  - Variants, each with a lucide icon so colour is never the only signal:
    - success: success fill, on-success text (booking confirmations)
    - warning: warning fill, on-warning text (e.g. "slot was just taken")
    - error: destructive fill, on-destructive text
    - default and info: surface fill, foreground text, border
  - 16px radius, the single popover elevation shadow, body font, 16px text,
    180ms fade and scale on enter and exit, instant with
    `prefers-reduced-motion: reduce`.
  - Toasts have a visible close button and can be dismissed with the
    keyboard.
- Update CLAUDE.md: the "Installed but not yet wired up" section (TanStack
  Query now has a provider, and the toaster exists), and the UI stack with
  the toaster and the rule that later specs use it and never add their own.

## Out of scope
- Any fetch wrapper, error class, query keys or hooks for schedule, classes,
  trial lessons or availability: specs 21, 22 and 25–31.
- Redirecting to `/login` on 401 and the friendly 403 message for admin
  accounts: spec 15 (student-access-guard). This spec only stops retries.
- Cache invalidation after mutations: each mutation spec (25–30).
- The actual toast messages and when they fire: the specs that show them
  (14, 25–31).
- TanStack Query Devtools, server-side prefetching, hydration boundaries and
  persisting the cache.
- Zustand stores and react-hook-form forms: later specs (13 onwards).
- Header, footer and theme toggle: spec 10. Route loading, error and
  not-found pages: spec 11.

## Routes and pages
No new routes. The provider and toaster wrap every page through the root
layout, public and student alike.

## Backend contract
No endpoints are called. The retry rule covers every 4xx status returned
through the student API proxy (spec 05), including those CLAUDE.md documents
for student endpoints: 400 (DRF field or `non_field_errors`, including "This
timeslot is already booked."), 401 (no or expired session), 403 (no Student
profile, or a locked trial lesson), and the proxy's own 404 (unknown path)
and 405 (wrong method). 408 and 429 are the exceptions and retry like
network errors and 5xx.

## Behavior
1. Every page renders inside the query provider and has the toaster
   mounted; nothing is visible until a toast is shown.
2. A query that fails with a 4xx status other than 408 or 429 errors on the
   first attempt with no retry. A query that fails with 408, 429, a network
   error or 5xx tries up to three times in total before showing its error
   state.
3. A mutation that fails is reported once and never resent automatically.
4. Navigating between client-side pages keeps the same query cache; a full
   reload starts a fresh one.
5. Toasts stack at the bottom right on desktop, and full width with the
   16px gutter on mobile. They auto-dismiss after the default duration and
   can be closed early.
6. Switching the theme while a toast is visible restyles it at once.
7. Cache Components: the provider and toaster read no cookies or request
   data, so the root layout stays static and no new `<Suspense>` boundary is
   needed. No hydration warnings come from either.

## Time handling
Not applicable.

## UI notes
- Use the frontend-design skill when styling the toaster, within the Design
  section's rules: theme tokens only, no new colours, fonts, radius values,
  shadows or motion.
- Warning toasts use the warning fill with on-warning text, never warning
  text on the background.
- Toast text meets WCAG AA in both themes; Sonner's live region announces
  toasts to screen readers.
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] React DevTools shows `QueryClientProvider` wrapping the page content on `/` and `/login` _(verified in code — check in browser)_
- [x] The query client is the same object across client-side navigations (DevTools) and is new after a full reload _(verified in code — check in browser)_
- [x] The retry rule in code returns no retry for errors with `status` 400, 401, 403, 404 and 405, and retries up to twice for 408, 429, 5xx and network errors
- [x] Mutations default to no retry
- [x] The page DOM contains exactly one Sonner toaster region (`section` with the notifications label) _(verified in code — check in browser)_
- [x] With a temporary, uncommitted trigger, success, warning, error and default toasts each show their token colours and an icon, in light and dark _(verified in code — check in browser)_
- [x] A visible toast restyles at once when the system theme changes while the app is set to system _(verified in code — check in browser)_
- [x] Toasts have a 16px radius and the popover elevation shadow, and can be closed with the close button and the keyboard _(verified in code — check in browser)_
- [x] With reduced motion on, toasts appear and disappear without animation _(verified in code — check in browser)_
- [x] On a 375px-wide viewport, toasts span the width with a 16px gutter _(verified in code — check in browser)_
- [x] No hydration warnings in the console on `/` (apart from the known next-themes script note) _(verified in code — check in browser)_
- [x] CLAUDE.md "Installed but not yet wired up" and UI stack are updated
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- Spec 05 leaves the browser fetch wrapper to specs 21, 22 and 25–31, so
  nothing yet throws an error with `status`. The retry rule depends on
  those specs throwing errors that carry the HTTP status.

## Open questions
None.
