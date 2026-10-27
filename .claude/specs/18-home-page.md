# Spec 18: Home Page

- **Status:** Done
- **Created:** 2026-10-27
- **Completed:** 2026-10-27
- **Depends on:** 16-subjects-list-page.md

## Summary
Replace the Next.js starter `app/page.tsx` with the public Science Nest
landing page. It is the first thing a guest sees. It says what the tutor
offers, shows the tutor's credentials (no name or photo), gives an overview
of the subjects with their prices, and explains how booking works. It leads
guests and students into the two booking flows: a free 60-minute trial lesson
and weekly classes. The page is static: it reads no cookies, and guests and
students see the same content.

## User stories
- As a guest, I want to see at a glance what Science Nest teaches and why I
  can trust the tutor, so that I can decide whether to book a trial.
- As a guest, I want to press "Book a free trial" and come back to the
  booking page after logging in or registering, so that I don't lose my
  place.
- As a guest, I want to see every subject with its levels and prices, so
  that I can tell whether my subject and level are covered.
- As a guest, I want a short explanation of how booking works, so that I
  know what happens after the trial.
- As a student, I want the same booking buttons on the home page, so that I
  can start a booking from wherever I land.

## Scope
- Replace `app/page.tsx` at `/` with the landing page. It renders inside the
  app shell (spec 10) and adds no `<main>` of its own.
- Delete `public/next.svg` and `public/vercel.svg`. Only the starter page
  uses them (spec 01 left them for this spec). Nothing else in the page may
  use scaffold colours (`zinc-*`, `bg-white`, `dark:bg-black`).
- **Hero:**
  - a headline (`h1`, Source Serif 4 700, -0.01em, using the existing
    `heading-hero` utility in `app/globals.css`) and one short pitch line
  - the tutor's credentials, the only place on the page they appear: MPhil
    in Biochemistry and Molecular Biology, 8+ years of teaching experience.
    One short plain line (or a two-item list) between the pitch and the
    booking buttons, where it backs up the decision to book. No name, no
    photo, no invented facts (no ratings, student counts or testimonials).
  - the two booking buttons (see below)
  - the `hero-specimen.webp` illustration through `SpecimenImage`, with alt
    "Illustration of stained cells seen through a microscope",
    `loading="eager"` and `fetchPriority="high"`, intrinsic 1120×1120
  - the hero image is visible as soon as the browser has loaded it, without
    waiting for hydration, and with JavaScript disabled. This is a new
    opt-in option on `SpecimenImage` (e.g. a `visibleBeforeHydration` prop,
    name decided while planning): the image isn't hidden in the server HTML,
    and after hydration a failed load (error event, or complete with no
    pixels) still swaps to the fallback. Every other `SpecimenImage` keeps
    today's hidden-until-loaded behaviour.
  - the hex lattice motif (`HexLattice`, `components/brand/hex-lattice.tsx`)
    behind the hero, drawing in once on load (about 800ms). This is the
    app's one motion moment. With `prefers-reduced-motion` it shows static
    and complete.
  - if the hero image fails to load, the hero shows only the lattice: no
    fallback image and no broken icon
- **No separate credentials section.** With only two facts and nothing
  invented to add, a section would repeat the hero or pad it out. Levels
  covered already show on the subject cards.
- **Subjects overview:**
  - a section heading, then every subject from `getSubjects()`
    (`lib/subjects.ts`), in backend order, as the same `SubjectCard` grid
    used on `/subjects` (image, name, level badges, 40/60-minute prices,
    each card linking to `/subjects/<slug>`)
  - a link to `/subjects`
  - the free-trial line (`FreeTrialNote`) near the grid, as on `/subjects`
  - an empty list shows the same "No subjects yet" panel as `/subjects`
  - a failure shows the same inline error panel and Try again as
    `/subjects`, using `SubjectsErrorBoundary` (`catchError`, never
    `try/catch`) around this section only. The hero, how it
    works and closing band stay visible.
- **How it works:** three short static steps, text only (lucide icons are
  fine, no images), in this order:
  1. Book a free 60-minute trial lesson.
  2. Choose a weekly class: subject, level, 40 or 60 minutes, and a weekly
     time slot.
  3. Join your lesson online. Wording (from the frontend-design pass, in the
     Design section's plain, exact tone; may be tightened, but the facts
     stay): "Lessons run on Zoom or Google Meet. Before each one, your tutor
     sends the meeting link on WhatsApp to the phone number you registered
     with, or by email. Your dashboard shows your weekly schedule and cost
     in your local time."
     The app never stores or shows meeting links, so this step doesn't link
     to one or promise one inside the app.
- **Closing CTA band:** a short line plus the same two booking buttons at
  the bottom of the page.
- **Booking buttons** (hero and closing band), shown to everyone, in this
  order:
  - "Book a free trial" (primary) → `/trial-lesson/new`
  - "Book a weekly class" (outline or secondary) → `/classes/new`
  - Plain links, with no `?subject=` (no subject is chosen on the home page).
    The page never reads cookies to change them.
- **Metadata:** the page keeps the root layout's default title
  "Science Nest" (no template suffix). Descriptions and Open Graph are
  spec 19.
- Update CLAUDE.md where this spec changes what's described there: the
  roadmap row's wording (booking CTAs, no register CTA; see Conflicts), the
  home page under Architecture, and the hero lattice draw-in under the
  `HexLattice` bullet.
- Update the `SpecimenImage` description in CLAUDE.md › Design › Images
  (and the `SpecimenImage` bullet under Architecture › UI stack, which
  repeats it) to describe both modes: hidden until loaded (the default),
  and the hero's opt-in visible-before-hydration mode with its documented
  broken-image exception (see Conflicts).

## Out of scope
- Meta descriptions, Open Graph, `sitemap.ts` and `robots.ts`: spec 19.
- Any link to `/register` on the page. The header's Register link (spec 10)
  is unchanged.
- The booking pages themselves: book a weekly class (25) and book a trial
  lesson (28). Until they exist, the buttons lead to the not-found page for
  students (guests first go through `/login`).
- Hiding or changing the trial button for a student who already has a trial
  lesson: spec 28 handles that on the booking page.
- Showing the student's schedule, availability or free slots: specs 21–24.
- Personalising the page for logged-in students (greeting, dashboard link
  in the body): the page stays static. The header already links to the
  dashboard.
- Changing `SubjectCard`, `/subjects` or `/subjects/[slug]` beyond sharing
  code with them.
- A separate pricing section: prices appear only in the subject cards.
- Testimonials, ratings, FAQs, contact forms or newsletter sign-up.
- Generating or changing the illustrations in `public/images/`.

## Routes and pages

| Route | Access | Shows |
|---|---|---|
| `/` | Public (guests, students and admin accounts, same content) | Hero with lattice, illustration, credentials and booking buttons; subjects overview; how it works; closing CTA band |
| `/trial-lesson/new` | Student (guests → `/login?next=/trial-lesson/new` via spec 07) | Built in spec 28 |
| `/classes/new` | Student (guests → `/login?next=/classes/new` via spec 07) | Built in spec 25 |
| `/subjects`, `/subjects/<slug>` | Public | Existing pages (specs 16, 17) |

The proxy doesn't protect `/`. No header nav item is marked current on `/`.

## Backend contract

**`GET /subjects/`** (public, no auth header), through `getSubjects()`
- Request: none.
- Fields used, all through `SubjectCard`: `id` (key), `slug` (image path,
  card link), `name`, `levels` (`{code, name}`, showing `name`),
  `price_40_min`, `price_60_min` (USD, numbers). `description` isn't shown
  on the home page.
- Errors: no 400, 401 or 403 is expected. Any failure (`getSubjects()`
  throws) shows the inline error panel in the subjects section at request
  time, or fails the build. The page never shows the backend's message text
  or status.

No other endpoint is used.

## Behavior
1. **Load:** the page is prerendered from the cached subjects list, so it
   shows in full at once, with no loading placeholder. When the cache life
   expires, the next request revalidates in the background, as for
   `/subjects`.
2. **Hero lattice:** on load, the lattice draws in once (about 800ms) and
   then stays still. It doesn't replay on scroll, hover or theme change.
   With `prefers-reduced-motion: reduce` it appears complete with no
   animation. With JavaScript disabled the lattice still ends up complete
   and visible.
3. **Hero image:** loads eagerly with high priority. Its box is reserved
   (no layout shift). It paints as soon as the browser has it, before the
   page's scripts run, and shows with JavaScript disabled. Only a failed
   load (detected after hydration) leaves just the lattice.
4. **Subject images:** lazy-loaded, with the hex logo mark as the fallback
   (same as `/subjects`).
5. **Booking buttons:** a guest who presses "Book a free trial" goes to
   `/login?next=%2Ftrial-lesson%2Fnew` through the proxy. After logging in,
   or registering through the login page's Register link and then logging
   in, they land on `/trial-lesson/new`. "Book a weekly class" does the same
   for `/classes/new`. A logged-in student goes straight there.
6. **Subjects empty:** the "No subjects yet" panel replaces the grid. The
   `/subjects` link stays.
7. **Subjects error:** if `GET /subjects/` fails and no cached list exists,
   only the subjects section shows the neutral inline panel ("Subjects
   couldn't be loaded"), announced with `role="alert"`, with Try again.
   Never the destructive colour or eosin. While a cached list exists, an
   outage keeps serving it.
8. **Build without the backend:** the build fails with the existing clear
   message from `getSubjects()`, never prerendering the error panel.
9. **Auth:** none. No cookies, headers or current time are read, so `/`
   builds as static (or partially static) with no Cache Components errors.
10. **No mutations,** no TanStack Query.

## Time handling
Not applicable. The "how it works" text mentions local time but shows no
dates or times.

## UI notes
- Use the frontend-design skill before writing the UI, within CLAUDE.md ›
  Design ("Stained slide"): theme tokens only, no new colours, fonts,
  radius values, shadows or motion beyond the hero draw-in.
- Marketing sections: 96px vertical padding on desktop, 56px on mobile.
  Max width 72rem, 16px gutter on mobile, prose at most 65ch.
- Hero: headline at 49px desktop (39px or 31px on mobile) with
  `heading-hero`. Text and buttons on one side, the illustration on the
  other on desktop. On mobile, the illustration sits below the text or is
  shown smaller, and the buttons stay visible without much scrolling.
  Eosin is the brand accent here (e.g. a small hexagon or rule), never for
  errors. No single-word highlight in the headline, no eyebrow or all-caps
  labels.
- Lattice: thin 1px hexagon lines in low-opacity primary, decorative
  (`aria-hidden`), confined to the hero, with legible text over it in both
  themes. No lattice in any other section.
- Credentials (in the hero): short, calm, typographic, in body type (e.g.
  two facts with a lucide icon each). Not a big-number stat block, not a
  middle-dot meta string, no card or panel around them.
- Subjects overview: the same responsive grid as `/subjects` (1, 2, then 3
  columns). Headings start at `h2` under the page's single `h1`. The cards'
  own heading level must fit under that `h2` (see Conflicts).
- How it works: an ordered list (`<ol>`) of three steps, numbered or with
  icons, side by side on desktop and stacked on mobile.
- Closing band: a tint (secondary) panel, radius 16px, with a line of text
  and the two buttons. No lattice, no image.
- Buttons: shadcn `Button` styling on `next/link` (`buttonVariants`), radius
  10px, at least 44px tall on mobile, full width stacked on mobile, side by
  side on desktop. No `→`.
- No tutor name or photo anywhere. No people or faces in images.

## Acceptance criteria
- [x] `/` shows the Science Nest landing page; nothing from the Next.js starter page remains, and `public/next.svg` and `public/vercel.svg` are gone
- [x] The page has exactly one `h1` and no `<main>` of its own (only the layout's `<main id="main-content">`)
- [x] The hero shows the headline, pitch, credentials (MPhil in Biochemistry and Molecular Biology, 8+ years of teaching experience), both booking buttons and the specimen illustration with the specified alt text _(verified in code — check in browser)_
- [x] The hero lattice draws in once on load in about 800ms, then stays still; it doesn't replay on scroll or theme change _(verified in code — check in browser)_
- [x] With reduced motion enabled in the OS or DevTools, the lattice appears complete with no animation _(verified in code — check in browser)_
- [x] With the hero image blocked in DevTools, the hero shows only the lattice, with no broken icon and no layout shift _(verified in code — check in browser)_
- [x] The hero image request is eager and high priority (not lazy); subject images lazy-load
- [x] With JavaScript disabled in DevTools, a reload of `/` shows the hero image _(verified in code — check in browser)_
- [x] On a reload with a slow network (DevTools throttling, e.g. Slow 4G), the hero image appears as soon as it has downloaded, without waiting for the page's scripts to load and hydrate _(verified in code — check in browser)_
- [x] Subject card images on `/`, `/subjects` and `/subjects/<slug>` still stay hidden until loaded and fall back to the hex logo mark, as before _(verified in code — check in browser)_
- [x] The two credentials appear exactly once on the page (in the hero), there's no separate credentials section, and no tutor name, photo, rating or testimonial appears anywhere
- [x] The subjects overview lists every subject from `/subjects`, in the same order, with the same cards (image, name, levels, 40/60-minute prices), each linking to `/subjects/<slug>`, plus a link to `/subjects` and the free-trial line _(verified in code — check in browser)_
- [x] "How it works" shows the three steps as an ordered list; step 3 says lessons run on Zoom or Google Meet and the link arrives before each lesson on WhatsApp (registered phone number) or by email
- [x] The closing band repeats both booking buttons
- [x] Every "Book a free trial" links to `/trial-lesson/new` and every "Book a weekly class" links to `/classes/new`, for guests and students alike
- [x] As a guest, pressing "Book a free trial" goes to `/login` with `next` set to `/trial-lesson/new`, and following Register from there keeps `next` _(verified in code — check in browser)_
- [x] No link on the page body points to `/register`
- [x] The tab title reads "Science Nest" _(verified in code — check in browser)_
- [x] With the backend stopped and no cached list (e.g. `npm run dev` after a restart), only the subjects section shows the inline error panel with Try again; the hero, how it works and closing band still render, and no backend message or status appears _(verified in code — check in browser)_
- [x] With the backend stopped after a successful build, the page still shows the cached subjects _(verified in code — check in browser)_
- [x] Light and dark themes both render the hero, lattice, illustration, cards, steps and buttons legibly, with only theme-token colours _(verified in code — check in browser)_
- [x] At 375px wide there's no horizontal scrolling, sections use the mobile spacing, and the buttons stack full width _(verified in code — check in browser)_
- [x] Every interactive element is reachable with Tab and shows a visible focus ring _(verified in code — check in browser)_
- [x] No hydration warnings in the console (apart from the known next-themes script note) _(verified in code — check in browser)_
- [x] `npm run build` (with the backend running) lists `/` as prerendered (static or partial), with no Cache Components errors
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Roadmap wording vs CLAUDE.md:** the roadmap row says "CTAs to register
  and book a trial", but CLAUDE.md › About the app says public pages use
  "Book a free trial" and "Book a weekly class" for everyone and never link
  guests to `/register`. The user chose to follow CLAUDE.md: the page has
  both booking buttons and no register CTA. The roadmap row's wording should
  be updated to match when this spec is implemented.
- **Card heading level:** `SubjectCard` renders its name as an `h2`. On the
  home page the cards sit under the subjects section's `h2`, so they need an
  `h3` there. How the card gets the right level, without changing it on
  `/subjects`, is decided while planning (sharing code is in scope).
- **One motion moment and the lattice component:** `HexLattice` is static
  and already applies its own opacity. The draw-in must be added without
  changing how spec 17's subject headers look or making them animate.
- **Hero image vs "never a broken icon":** the hero's opt-in
  visible-before-hydration mode can't detect a failed load before
  hydration or without JavaScript, so in that case the browser's own
  broken image with its alt text may show. This is accepted as a deliberate
  exception to CLAUDE.md › Design › Images ("A missing image never shows a
  broken icon"): the hero image ships with the app, and showing it
  immediately matters more. It applies to the hero only; every other
  `SpecimenImage` keeps the rule.

## Open questions
None.
