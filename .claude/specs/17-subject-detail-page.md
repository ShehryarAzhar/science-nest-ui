# Spec 17: Subject Detail Page

- **Status:** Done
- **Created:** 2026-10-26
- **Completed:** 2026-10-26
- **Depends on:** 11-route-fallback-states.md, 16-subjects-list-page.md

## Summary
A public `/subjects/<slug>` page for one subject: its name, description,
levels and 40- and 60-minute prices, with the subject illustration and two
booking buttons, "Book a free trial" and "Book a weekly class". It's where a
guest or student decides to book, so it carries them into the booking flow
with the subject already chosen. It's prerendered from the same cached
subjects list as `/subjects`, and an unknown slug shows the not-found page.

## User stories
- As a guest, I want to read what a subject covers, at which levels and for
  how much, so that I can decide whether to book.
- As a guest, I want to press "Book a free trial" and come back to the
  booking page after logging in or registering, with the subject still
  chosen, so that I don't have to find it again.
- As a student, I want to start booking a weekly class or a trial for this
  subject in one click, so that the subject is already filled in.
- As anyone following a broken or outdated link, I want a clear "Page not
  found" page, so that I can get back to the subjects list.

## Scope
- New route `app/subjects/[slug]/page.tsx` at `/subjects/<slug>`, public,
  inside the app shell (no own `<main>`).
- Reads the subject from `getSubjects()` (`lib/subjects.ts`) by matching
  `slug`. It doesn't add a second read path for `GET /subjects/{slug}/`
  (decided with the user: one cache entry, one schema, as CLAUDE.md ›
  Subjects data says).
- Every subject slug from the list is prerendered at build time. A slug
  that isn't in the list calls `notFound()` and renders the app-level
  `app/not-found.tsx` (spec 11).
- Subject header: the subject name as the `h1`, its level names as badges,
  and the static thin hex lattice motif behind or beside it (CLAUDE.md ›
  Design › Motif). The lattice is a reusable component so the home hero
  (spec 18) can use it with its draw-in animation; here it never animates.
- Body:
  - the subject illustration `/images/subjects/<slug>.webp` through
    `SpecimenImage`, alt `""`, lazy-loaded, with the hex logo mark as the
    fallback (same rule as spec 16's cards)
  - the description as plain text, keeping the backend's line breaks as
    paragraphs, at most 65ch wide. A blank description shows nothing (no
    placeholder text, no empty gap)
  - the 40- and 60-minute prices in USD with duration labels, in tabular
    figures, formatted exactly like spec 16's cards (one shared formatter)
  - a line saying the trial lesson is free and lasts 60 minutes
  - the tutor's credentials (MPhil in Biochemistry and Molecular Biology,
    8+ years of teaching experience) in one short line
- Booking buttons, shown to everyone (guests, students, admin accounts):
  - "Book a free trial" → `/trial-lesson/new?subject=<slug>`
  - "Book a weekly class" → `/classes/new?subject=<slug>`
  - Plain links: the page never reads cookies to change them.
- A "Subjects" back link to `/subjects`.
- The same inline error panel and Try again as `/subjects` when no cached
  list exists and `GET /subjects/` fails, caught with an error boundary
  (`catchError`), never `try/catch`.
- Page title: the subject's name (shown as "<Name> · Science Nest" by the
  spec 10 template). Title only; the rest of the metadata is spec 19.
- Update CLAUDE.md where this spec changes what's described there (e.g.
  that `/subjects/[slug]` exists, the `?subject=<slug>` convention for the
  booking pages, and the shared lattice component).

## Out of scope
- Meta descriptions, Open Graph, sitemap and robots: spec 19. If
  `generateMetadata` is needed here to set the per-subject title, spec 19
  extends it rather than replacing it.
- The home page, its hero and the lattice's draw-in animation: spec 18.
- The booking pages themselves and reading `?subject=<slug>` there: book a
  weekly class (25) and book a trial lesson (28). Until they exist, the
  buttons lead to the not-found page for students (guests first go through
  `/login`).
- Hiding or changing the trial button for a student who already has a trial
  lesson: spec 28 handles that on the booking page (CLAUDE.md › About the
  app).
- Showing availability, free slots or the schedule on this page: specs 21–24.
- Changing the subjects list page or its cards beyond sharing code with them.
- A `GET /subjects/{slug}/` fetch, and per-subject fallbacks for subjects
  added after the build beyond the normal cache revalidation (see
  Conflicts).
- Linking guests to `/register`: never, per CLAUDE.md.

## Routes and pages

| Route | Access | Shows |
|---|---|---|
| `/subjects/<slug>` | Public (guests and students, same content) | Subject header with lattice, name and level badges; illustration, description, prices, free-trial line, credentials; booking buttons; back link |
| `/subjects/<unknown>` | Public | App-level not-found page (spec 11), title "Page not found" |
| `/trial-lesson/new?subject=<slug>` | Student (guests → `/login?next=…` via spec 07) | Built in spec 28 |
| `/classes/new?subject=<slug>` | Student (guests → `/login?next=…` via spec 07) | Built in spec 25 |

The proxy doesn't protect `/subjects/<slug>`. The header nav marks
"Subjects" as current here, as on `/subjects`, if spec 10's nav matches
sub-paths; otherwise see Conflicts.

## Backend contract

**`GET /subjects/`** (public, no auth header), through `getSubjects()`
- Request: none.
- Fields used: `slug` (match, image path, booking links), `name`,
  `description` (plain text, may be blank), `levels` (`{code, name}`,
  showing `name`; `code` as key), `price_40_min`, `price_60_min` (USD,
  numbers). `id` isn't needed here.
- Errors: no 400, 401 or 403 is expected. Any failure (`getSubjects()`
  throws) shows the inline error panel at request time, or fails the build.
  The page never shows the backend's message text or status.

`GET /subjects/{slug}/` exists but isn't used (see Scope).

## Behavior
1. **Load:** every known slug is prerendered, so the page shows in full at
   once, with no loading placeholder. When the cache life expires, the next
   request revalidates in the background, as for `/subjects`.
2. **Unknown slug:** a path under `/subjects/` with uppercase letters
   (e.g. `/subjects/Biology`) gets a permanent (308) redirect from
   `proxy.ts` to the same path in lowercase, keeping the query string. A
   lowercase slug that isn't in the list (e.g. `/subjects/does-not-exist`)
   still renders the "Page not found" page. No other slug guessing.
3. **Description:** shown as plain text, never as HTML. Line breaks split it
   into paragraphs. Blank or whitespace-only → the description block is
   omitted.
4. **Images:** the illustration's box is reserved, it appears once loaded
   with no layout shift, and a failed load shows the hex logo mark.
5. **Booking buttons:** both always shown, in this order: "Book a free
   trial" (primary), "Book a weekly class" (secondary or outline). A guest
   who presses one goes to `/login?next=/trial-lesson/new?subject=<slug>`
   (URL-encoded) through the proxy; after logging in, or registering via the
   login page's Register link and then logging in, they land on the booking
   page with `?subject=<slug>` intact. A student goes straight there.
6. **Error:** if `GET /subjects/` fails and no cached list exists, the
   subject header can't be built, so the page shows the same neutral inline
   panel as `/subjects` ("Subjects couldn't be loaded" or a subject-specific
   wording), announced with `role="alert"`, with Try again and a link back
   to `/subjects`. Never the destructive colour or eosin. While a cached
   list exists, an outage keeps serving it.
7. **Build without the backend:** the build fails with the existing clear
   message from `getSubjects()`, never prerendering the error panel.
8. **Auth:** none. No cookies, headers or current time are read, so the
   route builds as static (or partially static) with no Cache Components
   errors.
9. **No mutations,** no TanStack Query.

## Time handling
Not applicable.

## UI notes
- Use the frontend-design skill before writing the UI, within CLAUDE.md ›
  Design: theme tokens only, no new colours, fonts, radius values, shadows or
  motion.
- Max width 72rem, 16px gutter on mobile, marketing-style vertical rhythm
  for the header (up to 96px desktop, 56px mobile) but compact enough that
  the booking buttons are visible on a typical laptop screen without
  scrolling.
- Header: back link "Subjects" (lucide chevron icon, no `→`), `h1` in Source
  Serif 4 600 (39px desktop, 31px mobile), level badges as on the cards
  (radius full, secondary tint, 14px, normal case).
- Lattice: thin 1px hexagon lines in low-opacity primary, decorative
  (`aria-hidden`), static, legible text over it in both themes, kept out of
  the way of the buttons. No lattice behind the body.
- Body layout: illustration (about 200–280px) beside the description on
  desktop, above it on mobile. Prices as a definition list ("40 min" /
  "$X", "60 min" / "$Y") in tabular figures. Free-trial line with the small
  eosin hexagon used on `/subjects`.
- Buttons: shadcn `Button` styling on `next/link` (`buttonVariants`), radius
  10px, at least 44px tall on mobile, full width stacked on mobile, side by
  side on desktop. No `→`.
- No tutor name or photo anywhere. No all-caps or eyebrow labels.

## Acceptance criteria
- [x] Each subject from `/subjects` opens its detail page at `/subjects/<slug>` for a guest and for a logged-in student, with the same content _(verified in code — check in browser)_
- [x] The page shows the subject's name as the heading, all its level names as badges, both prices in USD with "40 min" and "60 min" labels in tabular figures, matching the `/subjects` card _(verified in code — check in browser)_
- [x] The description appears as plain text with its line breaks kept; a subject with a blank description shows no description block and no placeholder _(verified in code — check in browser)_
- [x] The subject header shows a static thin hex lattice that doesn't animate, and no lattice appears behind the body or buttons _(verified in code — check in browser)_
- [x] The illustration loads from `/images/subjects/<slug>.webp` with an empty `alt`; with it blocked in DevTools, the hex logo mark shows instead, with no broken icon and no layout shift _(verified in code — check in browser)_
- [x] The free 60-minute trial and the tutor's credentials are shown, and no tutor name or photo appears anywhere _(verified in code — check in browser)_
- [x] "Book a free trial" links to `/trial-lesson/new?subject=<slug>` and "Book a weekly class" links to `/classes/new?subject=<slug>`, for guests and students alike _(verified in code — check in browser)_
- [x] As a guest, pressing "Book a free trial" goes to `/login` with `next` holding the trial path and `?subject=<slug>`; following Register from there keeps `next` _(verified in code — check in browser)_
- [x] No link on the page points to `/register` _(verified in code — check in browser)_
- [x] The "Subjects" back link goes to `/subjects` _(verified in code — check in browser)_
- [x] `/subjects/does-not-exist` shows the "Page not found" page, and the response is either 404 or carries a `noindex` robots tag (Next's streaming behaviour on the first visit)
- [x] `/subjects/Biology` redirects (308) to `/subjects/biology`, keeping any query string
- [x] After visiting `/subjects/Biology` and `/subjects/CHEMISTRY`, the real pages `/subjects/biology` and `/subjects/chemistry` still load correctly
- [x] The tab title reads "<Subject name> · Science Nest" _(verified in code — check in browser)_
- [x] With the backend stopped after a successful build, the detail pages still show the cached data _(verified in code — check in browser)_
- [x] With the backend stopped and no cached list (e.g. `npm run dev` after a restart), the page shows the inline error panel with Try again and a link to `/subjects`, not the app error page, and no backend message or status _(verified in code — check in browser)_
- [x] Light and dark themes both render the lattice, badges, prices, buttons and illustration legibly _(verified in code — check in browser)_
- [x] At 375px wide there's no horizontal scrolling, the illustration sits above the description and the buttons stack full width _(verified in code — check in browser)_
- [x] Every interactive element is reachable with Tab and shows a visible focus ring _(verified in code — check in browser)_
- [x] No hydration warnings in the console (apart from the known next-themes script note) _(verified in code — check in browser)_
- [x] `npm run build` (with the backend running) lists every `/subjects/<slug>` as prerendered, with no Cache Components errors
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Roadmap wording vs data source:** the roadmap row says the page renders
  `GET /subjects/{slug}/`, but CLAUDE.md › Subjects data makes
  `getSubjects()` the one way to read subjects for specs 16, 17 and 18. The
  user chose `getSubjects()`; the roadmap row's wording should be updated to
  match when this spec is implemented.
- **Empty list breaks the build:** with Cache Components, a dynamic route's
  `generateStaticParams` must return at least one param, and an empty array
  is a build error (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`,
  "With Cache Components"). If the backend has no subjects at build time,
  the build fails. How to handle that (e.g. fail with a clear message, as
  for an unreachable backend) is decided while planning.
- **Subjects added after the build:** a slug that appears in the backend
  after the build isn't prerendered. It must still render once the cached
  list revalidates, not stay a 404 until the next deploy. How the route
  handles slugs not returned by `generateStaticParams` under Cache
  Components is decided while planning.
- **`?subject=<slug>` isn't defined yet:** specs 25 and 28 don't exist.
  This spec sets the convention (the slug, not the id) and CLAUDE.md should
  record it so those specs read it.
- **404 status for unknown slugs:** an unknown slug isn't prerendered, so
  it renders on request. `params` sits inside a `<Suspense>` boundary (Cache
  Components requires it even with `generateStaticParams`), and the root
  `app/loading.tsx` is one too. On the first visit to a given unknown slug,
  the response starts streaming before `notFound()` runs, so it keeps a 200
  status. Next then streams the not-found page with a
  `<meta name="robots" content="noindex">` tag. Later visits return 404.
  The page shown is "Page not found" either way, and `noindex` keeps it out
  of search results. Next's documented fix is a slug check in `proxy.ts`
  before rendering. It was rejected: the proxy can't use the cached
  `getSubjects()` (it's server-only), so the check would need a backend
  call on every request. The acceptance criterion accepts either a 404 or
  a `noindex` tag instead.
- **Route-cache collision on case-insensitive filesystems:** Next saves
  each page rendered at request time as a file under
  `.next/server/route-cache/…/subjects/<slug>.html`. On Windows and macOS
  (case-insensitive by default), `Biology.html` and `biology.html` are the
  same file. A visit to `/subjects/Biology` saved its not-found result over
  the real page's entry, so `/subjects/biology` returned 404 until the next
  build (and `/subjects/CHEMISTRY` once served Chemistry while breaking
  `/subjects/chemistry`). Fix: `proxy.ts` sends any `/subjects/…` path with
  uppercase letters to its lowercase form with a 308, so wrong-case paths
  never render or reach the cache. Unlike the rejected slug check above,
  this needs no backend call: every slug is lowercase, so the check only
  looks at the URL.
- **Nav "current" on sub-paths:** if spec 10's nav marks "Subjects" as
  current only on exact `/subjects`, it won't be marked here. Check while
  planning; changing it is in scope only if it's a matching-rule tweak.

## Open questions
None.
