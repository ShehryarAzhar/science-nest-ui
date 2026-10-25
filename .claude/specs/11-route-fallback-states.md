# Spec 11: Route Fallback States

- **Status:** Done
- **Created:** 2026-10-25
- **Completed:** 2026-10-26
- **Depends on:** 08-design-theme.md, 10-app-shell-navigation.md

## Summary
When a page is still loading, can't be found, or crashes, students and guests
currently see Next's unstyled defaults. This spec adds app-level
`loading.tsx`, `error.tsx`, `not-found.tsx` and `global-error.tsx` in the
"Stained slide" style, so every failure path explains what happened and
offers a way forward. It also creates the shared `SpecimenImage` component
that every later illustrated page (home, subjects, dashboard) uses.

## User stories
- As a guest or student, I want a clear "page not found" page with links
  back into the app, so that a mistyped or old link doesn't strand me.
- As a guest or student, I want a calm message and a "Try again" button when
  something breaks, so that I can recover without reloading or losing my
  place.
- As a guest or student, I want a quiet loading state while a page streams
  in, so that I know the app is responding.
- As a screen-reader user, I want loading and error states announced, so
  that I know what's happening without seeing the page.

## Scope
- **`SpecimenImage`** (`components/specimen-image.tsx` or similar), the one
  shared client component from CLAUDE.md › Design › Images:
  - wraps `next/image` with a string `src` path under `/images/`, never a
    static import
  - requires `alt` (an empty string for decorative images)
  - stays hidden (no broken-image icon, no alt text flash) until the image
    has loaded; then shows it
  - if loading fails, renders a caller-supplied fallback, or nothing when
    none is given (so spec 16/17 can pass the hex logo mark and spec 18 can
    leave only the lattice)
  - lazy-loads by default; supports `loading="eager"` with
    `fetchPriority="high"` for the home hero (no deprecated `priority`)
  - reserves its box (width/height or a sizing container) so showing or
    hiding the image causes no layout shift
  - reveals the loaded image without animation (no motion beyond the Design
    rules)
  - takes a single `src`; no dark variant now. If an image later needs a
    dark variant (`<name>-dark.webp`, per CLAUDE.md › Design › Images), add
    an optional dark src then: render both images and switch with CSS
    (`dark:hidden` / `hidden dark:block`), no JavaScript theme check, so
    there's no flash or hydration mismatch.
- **`app/not-found.tsx`** (root not-found, also used for every unmatched
  URL and any `notFound()` call):
  - renders inside the app shell (header and footer from spec 10)
  - `not-found.webp` via `SpecimenImage`, alt `""`; shows nothing in its
    place if the image fails
  - a heading ("Page not found" or similar), one short line of plain
    explanation, and links to Home (`/`) and Subjects (`/subjects`)
  - metadata title "Page not found" (rendered as "Page not found · Science
    Nest" by the spec 10 template)
  - returns HTTP 404 for unmatched URLs
- **`app/error.tsx`** (root error boundary for errors below the root layout):
  - a client component rendered inside the app shell
  - a heading and a short, non-technical message; never the thrown error's
    `message` or stack
  - a "Try again" button that calls Next 16's `retry()` (re-fetches and
    re-renders the segment), plus a link to Home
  - when the error has a `digest`, shows it as a small reference code
    (tabular figures) the student can quote; nothing otherwise
  - focus moves to the heading when the error UI appears, and the message is
    announced (`role="alert"` or equivalent)
  - a browser tab title such as "Something went wrong · Science Nest" via a
    React `<title>` (error boundaries can't export `metadata`)
- **`app/global-error.tsx`** (errors in the root layout itself):
  - renders its own `<html lang="en">` and `<body>`, since it replaces the
    root layout
  - loads the global stylesheet and both fonts, so it uses the same tokens
    and type as the rest of the app
  - applies the student's saved theme choice (light, dark or system, as
    stored by next-themes) before paint, falling back to the system
    preference, with no flash of the wrong theme
  - shows the logo, the same heading, message, "Try again" (`retry()`) and a
    Home link as `error.tsx`, centred on the page; no header, footer or
    theme toggle (they live in the failed layout)
  - a React `<title>` "Something went wrong · Science Nest"
- **`app/loading.tsx`** (root loading UI, the instant fallback while a page
  segment streams in):
  - a quiet, static placeholder inside the shell's `<main>`, sized within the
    72rem page width so the footer doesn't jump when content arrives
  - no spinner, shimmer or pulse (see Conflicts)
  - an accessible status ("Loading…" for screen readers, `role="status"`)
  - no image, no hex lattice
- Update CLAUDE.md where this spec changes what's described there (e.g. the
  UI stack: `SpecimenImage` location and API, and that the root fallbacks
  exist).

## Out of scope
- Segment-level `loading.tsx`, `error.tsx` or `not-found.tsx` for specific
  routes (e.g. dashboard skeletons): the specs that build those pages (16,
  17, 21, 25–29) add their own if needed.
- `notFound()` for unknown subject slugs: spec 17 (it will show this spec's
  not-found page).
- Friendly 401/403 handling for student endpoints (redirect to login, admin
  account message): spec 15. Those aren't thrown errors and don't use
  `error.tsx`.
- Inline form, toast or query error states (backend validation, "slot was
  just taken"): specs 13, 14, 22–31.
- `forbidden.tsx`, `unauthorized.tsx` and `global-not-found.tsx`: not used
  (the app has a single root layout, so the root `not-found.tsx` covers
  unmatched URLs).
- The home hero image and lattice: spec 18. Subject images and the hex logo
  mark fallback: specs 16 and 17. The dashboard empty-state image: spec 21.
  This spec only creates `SpecimenImage` and uses it for `not-found.webp`.
- Error reporting to an external service: not part of the app.
- Logout: spec 12.

## Routes and pages
No new routes. These files apply app-wide:

| File | When it shows | Access |
|---|---|---|
| `app/not-found.tsx` | Any unmatched URL, or `notFound()` anywhere | Everyone |
| `app/error.tsx` | An uncaught error while rendering a page or nested layout | Everyone |
| `app/global-error.tsx` | An uncaught error in the root layout | Everyone |
| `app/loading.tsx` | While a page segment suspends before its content streams in | Everyone |

## Backend contract
None. These states make no backend calls.

## Behavior
1. **Not found:** visiting `/does-not-exist` returns status 404 and shows the
   not-found page in the shell, with the guest or student nav as usual.
   "Home" goes to `/`, "Subjects" to `/subjects`.
2. **Not-found image:** the illustration appears once loaded. With the image
   missing or blocked, there's no broken icon and no empty bordered box; the
   text and links stand alone and stay centred.
3. **Error:** if a page throws during render, the shell stays, the error
   message replaces the page content, and focus moves to its heading.
   "Try again" calls `retry()`; if the cause is gone the page renders
   normally, otherwise the error UI stays. The digest reference appears only
   when Next provides one (production server errors).
4. **Error content:** the message never includes the error's `message`,
   stack, URL, tokens or backend details, in development or production
   builds (Next's own dev overlay is separate and fine).
5. **Global error:** if the root layout throws, the global error page
   replaces the whole document, in the saved theme with the app's fonts, and
   "Try again" calls `retry()`.
6. **Loading:** on navigation to a page that suspends at the top level, the
   loading placeholder shows at once and is replaced when the page arrives.
   Pages that are fully static never show it. Screen readers hear "Loading".
7. **Cache Components:** none of these files read cookies, headers or the
   current time, so they're static and don't add blocking-route errors to
   `npm run build`. The shell's existing nav `<Suspense>` is unchanged.
8. **No hydration warnings** from these files (apart from the known
   next-themes script note); theme-dependent rendering in `global-error`
   happens before paint, not after mount.
9. **Reduced motion:** nothing in these states animates, so there's nothing
   to turn off; buttons keep the 150ms state-change transition, instant with
   reduced motion as defined in spec 08.

## Time handling
Not applicable.

## UI notes
- Use the frontend-design skill before writing these states, within
  CLAUDE.md › Design: theme tokens only, no new colours, fonts, radius values,
  shadows or motion.
- These are functional pages: clarity first, no hex lattice, no decoration
  beyond the not-found illustration (and the logo on the global error page).
- Layout: centred column, max width 72rem with prose at 65ch, 16px gutter on
  mobile, 16–24px gaps; vertically centred in the available `<main>` height on
  tall screens, top-aligned and scrollable on short ones.
- Heading in Source Serif 4 600 (31px desktop, 25px mobile); body in
  Atkinson Hyperlegible Next at 16px, line-height 1.6, muted-foreground for
  the supporting line.
- Actions: "Try again" is the primary button; Home and Subjects are
  secondary/outline buttons or links. No `→`, no all-caps, no eyebrow labels.
  Touch targets at least 44px tall on mobile.
- Error states use neutral copy and the primary/foreground palette, not the
  destructive colour or eosin (destructive is for confirm buttons and error
  toasts; eosin is never for errors). An icon may accompany the heading.
- Not-found illustration: around 240–320px wide, above the heading, centred;
  readable on both themes (the eosin outlines are designed for both).
- Digest reference: 14px, muted-foreground, `tabular-nums`, selectable text
  (e.g. "Reference: 3141592653").
- Loading placeholder: muted-fill blocks with radius 16px (card) or 10px,
  no shadow, no animation.
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] Visiting `/does-not-exist` returns HTTP 404 and shows the styled not-found page inside the header and footer _(verified in code — check in browser)_
- [x] The not-found tab title reads "Page not found · Science Nest" _(verified in code — check in browser)_
- [x] The not-found page links to Home (`/`) and Subjects (`/subjects`), and both links work _(verified in code — check in browser)_
- [x] The not-found illustration shows once loaded, with an empty `alt`, and is readable in light and dark themes _(verified in code — check in browser)_
- [x] With `not-found.webp` blocked in DevTools, the not-found page shows no broken image icon, no empty box and no layout shift _(verified in code — check in browser)_
- [x] A page that throws during render shows the styled error UI inside the header and footer, with focus on its heading _(verified in code — check in browser)_
- [x] The error UI never shows the thrown error's message or stack _(verified in code — check in browser)_
- [x] "Try again" re-renders the page; once the cause is removed the page loads normally _(verified in code — check in browser)_
- [x] In a production build (`npm run build && npm start`), a server render error shows a reference code from `digest` _(verified in code — check in browser)_
- [x] The error tab title reads "Something went wrong · Science Nest" _(verified in code — check in browser)_
- [x] An error thrown in the root layout shows the global error page with the app's fonts and colours _(verified in code — check in browser)_
- [x] The global error page uses the saved theme (light, dark or system). A one-frame flash of the default theme during in-app navigation is accepted, because the root layout failing is rare. _(verified in code — check in browser)_
- [x] The global error page's "Try again" calls `retry()` and its Home link goes to `/` _(verified in code — check in browser)_
- [x] Navigating to a page that suspends shows the static loading placeholder, with no spinner or pulsing, announced as "Loading" by a screen reader _(verified in code — check in browser)_
- [x] The loading placeholder doesn't make the footer jump when the page content arrives _(verified in code — check in browser)_
- [x] `SpecimenImage` exists as a client component taking a string `src` and required `alt`, hidden until loaded, rendering the given fallback (or nothing) on error, lazy by default and supporting `loading="eager"` + `fetchPriority="high"`
- [x] None of these states uses the hex lattice, the destructive colour or eosin for the error message, or shows a tutor name or photo _(verified in code — check in browser)_
- [x] At 375px wide, all four states fit without horizontal scrolling and their buttons are at least 44px tall _(verified in code — check in browser)_
- [x] On common desktop, laptop and mobile screen sizes (e.g. 1920×1080, 1366×768, 1280×720, 390×844, 375×667, and short landscape phones), the heading, message and buttons of the not-found, error and global error pages are visible without scrolling; the not-found illustration never pushes them below the fold _(verified in code — check in browser)_
- [x] No hydration warnings in the console on the not-found page (apart from the known next-themes script note) _(verified in code — check in browser)_
- [x] `npm run build` shows no Cache Components errors caused by these files
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Loading motion:** CLAUDE.md › Design › Motion allows only the hero
  lattice animation and motion in response to the user. Spinners, shimmer and
  `animate-pulse` skeletons (shadcn's `Skeleton` uses `animate-pulse`) would
  break that, so the loading placeholder is static. If a moving indicator is
  wanted, CLAUDE.md's Motion rules need to allow it first.
- **`global-error` and the theme:** Next's docs note that `global-error`
  renders its own document without the root layout's providers, so the
  next-themes provider and its pre-paint script don't run there. This spec
  requires the saved theme to be applied inside `global-error` itself.
- **Links to `/subjects`:** the subjects page doesn't exist until spec 16, so
  the not-found page's Subjects link shows the not-found page again until
  then.

## Open questions
None.
