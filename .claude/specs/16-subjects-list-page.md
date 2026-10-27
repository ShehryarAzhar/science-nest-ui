# Spec 16: Subjects List Page

- **Status:** Done
- **Created:** 2026-10-26
- **Completed:** 2026-10-27
- **Depends on:** 03-backend-api-client.md, 10-app-shell-navigation.md

## Summary
A public `/subjects` page that lists every subject the tutor teaches, with
its levels and its 40- and 60-minute prices, rendered on the server from
`GET /subjects/`. Guests use it to decide whether the tutor covers what they
need before registering. Students use it to compare subjects and prices
before booking. Each subject links to its detail page (spec 17). The header,
the 404 page and later the home page already link here.

## User stories
- As a guest, I want to see all subjects with their levels and prices on one
  page, so that I can tell whether the tutor teaches my subject at my level
  and what it costs before I register.
- As a student, I want to compare the 40- and 60-minute prices across
  subjects, so that I can choose which weekly class to book.
- As a guest or student, I want to open a subject from the list, so that I
  can read its full description.
- As a screen-reader user, I want each subject's name, levels and prices
  read in a clear order, so that I can compare them without seeing the cards.

## Scope
- New route `app/subjects/page.tsx` at `/subjects`, public, inside the app
  shell from spec 10 (no own `<main>`).
- Fetches `GET /subjects/` on the server through the API client in
  `auth: "public"` mode (no cookies), cached with `"use cache"` and a
  `cacheLife` of about an hour. The page is prerendered at build time
  (decided with the user, see Conflicts).
- The cached subjects fetch is one shared function that specs 17 and 18
  reuse, rather than fetching subjects their own way. It throws when
  `GET /subjects/` fails. It never catches the error and returns an error
  value, because that result would be cached and the error panel would stay
  for the whole cache life after the backend recovers. The page catches the
  error outside the cached function and shows the inline error panel.
- If the build can't reach the backend, it fails with a clear message, e.g.
  "Couldn't fetch subjects from API_BASE_URL during build. Is the backend
  running?"
- A page header: an `h1` ("Subjects") and one short intro line naming the
  tutor's credentials (MPhil in Biochemistry and Molecular Biology, 8+ years
  of teaching experience) or the offer. No hex lattice, no image in the
  header.
- One card per subject, in the order the backend returns them, showing:
  - the subject illustration `/images/subjects/<slug>.webp` through
    `SpecimenImage` (path built from the slug, no mapping table), alt `""`,
    lazy-loaded, with the hex logo mark (`components/brand/logo.tsx`,
    `variant="mark"`) as the fallback if the image fails
  - the subject name as a heading
  - its levels as badges, using each level's `name` from the API (e.g.
    "O Level", "All Levels (1-O Level)")
  - what the subject offers, from fixed frontend labels per level code (not
    backend data), merged across the subject's levels without duplicates,
    in this order, and shown as a checked list below the level badges so it
    isn't mistaken for them:
    - `o_level` and/or `a_level`: "Exam Preparation", "Past Papers",
      "Notes & Practice"
    - `all_levels`: "Exam Preparation", "Notes & Practice"
    - `university`: "Research Guidance", "Assignments Help"
    - an unknown level code adds nothing; with no labels, the list is left out
  - the 40-minute and 60-minute prices in USD, labelled with their
    duration, in tabular figures
  - a link to `/subjects/<slug>` covering the card (one link per card, named
    after the subject)
- A short line saying the trial lesson is free and lasts 60 minutes, near
  the list (pricing context), with no booking button.
- An empty state when the backend returns no subjects.
- An inline error state when `GET /subjects/` fails, with a Try again action.
  The page header stays visible.
- Page metadata title "Subjects" (shown as "Subjects · Science Nest" by the
  spec 10 template).
- Update CLAUDE.md where this spec changes what's described there (e.g. that
  `/subjects` exists and how the subjects data is cached).

## Out of scope
- The subject detail page `/subjects/[slug]`, its description, booking CTAs
  and the not-found for unknown slugs: spec 17. Until then, the card links
  lead to the not-found page.
- The hex lattice in subject headers: spec 17 (the list page header stays
  plain).
- The home page's subjects overview: spec 18. It may reuse this spec's card,
  but that's spec 18's decision.
- Meta descriptions, Open Graph, `generateMetadata`, `sitemap.ts` and
  `robots.ts`: spec 19. This spec only sets the title.
- Booking buttons on the list page: none. On the subject detail page
  (spec 17) and the home page (spec 18), they're shown to everyone, guests
  and students alike, with the same links: "Book a free trial" →
  `/trial-lesson/new` and "Book a weekly class" → `/classes/new` (with the
  subject preselected where relevant). Guests reach `/login?next=…` through
  the proxy (spec 07) and the login page's Register link carries `next`
  (spec 14). Never link guests to `/register` directly. This keeps public
  pages static (see CLAUDE.md › About the app).
- Filtering, searching or sorting subjects, and grouping by level.
- Showing the subject's description on the list: spec 17 shows it.
- Weekly cost or schedule calculations: spec 21.

## Routes and pages

| Route | Access | Shows |
|---|---|---|
| `/subjects` | Public (guests and students, same content) | Header, subject cards with image, name, level badges and both prices; empty or error state when needed |

The proxy (spec 07) doesn't protect or redirect this route. The header nav
shows "Subjects" as current here.

## Backend contract

**`GET /subjects/`** (public, no auth header)
- Request: none.
- Response: a list of subjects. Fields used: `id` (React key), `name`,
  `slug` (image path and detail link), `levels` (list of `{code, name}`,
  showing `name`), `price_40_min`, `price_60_min` (USD, numbers).
  `description` is returned but not shown here.
- Level codes: `o_level`, `a_level`, `all_levels`, `university`. The UI
  shows the backend's `name`, not a frontend mapping of codes.
- Errors: no 400, 401 or 403 is expected for this public read. Any failure
  (non-2xx `ApiError` with a DRF `{detail}` or non-JSON body, network error,
  timeout, invalid response) shows the inline error state. The page never
  shows the backend's message text or status.

## Behavior
1. **Load:** the page is prerendered with the cached subjects, so it shows
   the full list at once, with no loading placeholder. After the cache life
   expires, the next request revalidates in the background and later
   visitors see the updated list.
2. **Success:** one card per subject in backend order. Prices are formatted
   as US dollars (e.g. "$25", with cents only when the value isn't a whole
   number), with "40 min" and "60 min" labels.
3. **Images:** each card reserves its image box. The illustration appears
   once loaded with no layout shift. If `subjects/<slug>.webp` is missing or
   blocked, the hex logo mark shows in its place, never a broken icon.
4. **Empty:** if the backend returns an empty list, the header stays and a
   short message says no subjects are listed yet, with no illustration.
5. **Error:** if `GET /subjects/` fails, the header stays and an inline
   panel replaces the list: a short heading ("Subjects couldn't be loaded"
   or similar), one line suggesting trying again shortly, and a Try again
   button that re-requests the page data. It's announced to screen readers
   (`role="alert"` or a status region). It uses neutral styling, never the
   destructive colour or eosin. The cached fetch throws, and the page
   catches the error outside the cached function, so an error is never
   cached as if it were the subjects list. Once the backend recovers, Try
   again or the next visit shows the list. While a cached list exists, a
   backend outage doesn't show the panel: the cached list keeps being
   served.
5a. **Build without the backend:** the build fails with a clear message,
   e.g. "Couldn't fetch subjects from API_BASE_URL during build. Is the
   backend running?". It never prerenders the error panel into the static
   page.
6. **Navigation:** clicking or keyboard-activating a card goes to
   `/subjects/<slug>`. Focus shows a visible ring on the card.
7. **Auth:** none. The page reads no cookies and looks the same for guests,
   students and admin accounts. Only the shell's nav differs (spec 10).
8. **Cache Components:** nothing on this page reads cookies, headers or the
   current time, so `npm run build` lists `/subjects` as static (or partially
   static) with no blocking-route errors.
9. **No mutations,** so nothing to invalidate. TanStack Query isn't used:
   the data comes from a Server Component.

## Time handling
Not applicable.

## UI notes
- Use the frontend-design skill before writing the UI, within CLAUDE.md ›
  Design: theme tokens only, no new colours, fonts, radius values, shadows or
  motion.
- Public page in the "Stained slide" direction, but no lattice here. Width
  is at most 72rem with a 16px gutter on mobile.
- Header: `h1` in Source Serif 4 600 (39px desktop, 31px mobile), intro in
  Atkinson Hyperlegible Next 16–20px, muted-foreground, at most 65ch.
- Grid: 1 column on mobile, 2 on tablet, 3 on desktop, with 16–24px gaps.
- Card: surface fill, 1px border, radius 16px, no shadow. Hover and focus
  change the border to primary (150ms, instant with reduced motion). The
  illustration sits at the top or left, about 120–160px, centred.
- Level badges: radius full, secondary tint with secondary text, 14px,
  normal case (no all-caps).
- Prices: two label-value pairs ("40 min" / "$X", "60 min" / "$Y") with
  `tabular-nums`. Use a definition list or similar so a screen reader reads
  label then price.
- The free trial line can use eosin as an accent (eosin marks the trial
  lesson), with text that meets AA on the background. No `→` in links or
  buttons.
- Error and empty panels: surface or muted fill, radius 16px, a lucide icon
  next to the heading, Try again as the primary button (at least 44px tall
  on mobile).
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] `/subjects` loads for a guest and for a logged-in student, with the same content and the matching header nav _(verified in code — check in browser)_
- [x] The "Subjects" nav link is marked as the current page on `/subjects` _(verified in code — check in browser)_
- [x] Every subject from `GET /subjects/` appears once, in the backend's order _(verified in code — check in browser)_
- [x] Each card shows the subject name, all its level names as badges, and both the 40-minute and 60-minute prices in USD with duration labels _(verified in code — check in browser)_
- [x] Each card lists what the subject offers for its levels (O/A Level: Exam Preparation, Past Papers, Notes & Practice; All Levels: Exam Preparation, Notes & Practice; University: Research Guidance, Assignments Help), once each, as a checked list below the level badges that looks different from them, on `/subjects` and the home page _(verified in code — check in browser)_
- [x] Prices use tabular figures and show cents only when the price isn't a whole dollar amount _(verified in code — check in browser)_
- [x] Each card's illustration loads from `/images/subjects/<slug>.webp` with an empty `alt`, and below-the-fold images lazy-load _(verified in code — check in browser)_
- [x] With a subject image blocked in DevTools, its card shows the hex logo mark, with no broken icon and no layout shift _(verified in code — check in browser)_
- [x] Clicking a card, or focusing it with Tab and pressing Enter, goes to `/subjects/<slug>`, and the focused card shows a visible focus ring _(verified in code — check in browser)_
- [x] The page header has no hex lattice, and no tutor name or photo appears anywhere on the page _(verified in code — check in browser)_
- [x] The free 60-minute trial is mentioned on the page, with no booking button _(verified in code — check in browser)_
- [x] The tab title reads "Subjects · Science Nest" _(verified in code — check in browser)_
- [x] With the backend returning an empty list, the page shows the header and an empty-state message _(verified in code — check in browser)_
- [x] With the backend stopped after a successful build, `/subjects` still shows the cached list _(verified in code — check in browser)_
- [x] With the backend stopped and no cached list (e.g. in `npm run dev` after a restart), the page shows the header and the inline error panel with Try again, not the app error page, and no backend message or status _(verified in code — check in browser)_
- [x] After the error panel has appeared and the backend comes back, "Try again" or the next visit shows the list (the error isn't cached) _(verified in code — check in browser)_
- [x] With the backend stopped, `npm run build` fails with a clear message such as "Couldn't fetch subjects from API_BASE_URL during build. Is the backend running?"
- [x] Light and dark themes both render the cards, badges, prices and illustrations legibly _(verified in code — check in browser)_
- [x] At 375px wide the page shows one column with no horizontal scrolling. Tablet shows two columns and desktop three _(verified in code — check in browser)_
- [x] No hydration warnings in the console (apart from the known next-themes script note) _(verified in code — check in browser)_
- [x] `npm run build` (with the backend running) lists `/subjects` as prerendered, with no Cache Components errors
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Build needs the backend:** the page is prerendered from a `"use cache"`
  fetch, so `npm run build` calls `GET /subjects/` and needs
  `API_BASE_URL` reachable. The build fails with a clear message when it
  isn't (decided with the user). The README and CLAUDE.md Commands should
  say so. A CI build without the backend would need a different approach.
- **Error state vs prerendering:** the cached fetch throws, and the page
  catches the error outside it (see Scope). On a build without the backend,
  the catch in the page must not swallow the error into a prerendered
  error panel: the build must fail instead. How the page tells the build
  apart from a request is decided while planning.
- **Links to `/subjects/<slug>`:** the detail page arrives in spec 17. Until
  then, every card leads to the not-found page.
- **`description` may be blank:** not a conflict here (it isn't shown), but
  spec 17 has to handle it.

## Open questions
None.
