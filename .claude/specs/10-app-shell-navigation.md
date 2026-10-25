# Spec 10: App Shell Navigation

- **Status:** Done
- **Created:** 2026-10-25
- **Completed:** 2026-10-25
- **Depends on:** 08-design-theme.md

## Summary
Every page needs the same frame: a header that says where you are and where
you can go, a way to pick light, dark or system theme, and a footer. This spec
adds that shell to the root layout. Guests see links to Subjects, Log in and
Register, and logged-in students see Subjects, Dashboard and Account. It also
builds the shared `Logo` component and replaces the scaffold's "Create Next
App" metadata with a site-wide title template, so every later page gets the
frame for free.

## User stories
- As a guest, I want links to the subjects, login and registration in the
  header, so that I can find out what's taught and sign up.
- As a student, I want links to the subjects, my dashboard and my account in
  the header, so that I can get to my schedule from any page.
- As a guest or student, I want to pick light, dark or follow my device's
  setting, so that the app is comfortable to read.
- As a guest or student on a phone, I want the navigation to fit the screen,
  so that I can reach every link with one hand.
- As a keyboard or screen-reader user, I want a skip link and clearly marked
  navigation, so that I can get to the page content quickly.

## Scope
- **Logo component** `components/brand/logo.tsx` (as described in CLAUDE.md ›
  Design › Logo):
  - inline SVG with `variant="horizontal" | "vertical" | "mark"`, paths copied
    from the matching `public/logo/science-nest-*.svg` files
  - colours from theme tokens, not the hard-coded hex in the files: hexagon
    and bowl in primary, dot in eosin, wordmark in foreground, so it works in
    both themes without the `-dark` files
  - an accessible name "Science Nest" when used as the only content of a
    link, and hidden from assistive tech when decorative
  - a size prop or `className` sizing; at a rendered mark height under 24px it
    draws the favicon mark (hexagon and dot, no bowl)
  - clear space of 0.25 × mark height around it wherever this spec places it
  - `public/logo/` and the app icons are not edited
- **Header** at the top of every page, inside the root layout:
  - the horizontal logo, linking to `/`
  - navigation by auth state:
    - guest: Subjects (`/subjects`), Log in (`/login`), Register
      (`/register`, styled as the primary button)
    - logged in: Subjects (`/subjects`), Dashboard (`/dashboard`), Account
      (`/account`)
  - "logged in" uses the same rule as `proxy.ts`: an `access` cookie is
    present on the request (the proxy has already refreshed it or removed
    both cookies before the page renders). The token isn't checked further
  - the link for the current page (whole-segment match, so `/subjects/biology`
    marks Subjects) is visually marked and has `aria-current="page"`
  - the theme toggle (below)
  - leaves room on the logged-in side for the logout control that spec 12
    adds
- **Theme toggle** in the header: an icon button opening a menu with Light,
  Dark and System, using the `next-themes` provider from spec 08.
  - shows the current choice as checked in the menu; the button icon shows
    the active choice (sun, moon or monitor from lucide)
  - the button has an accessible name ("Theme") and the menu is fully
    keyboard operable
  - renders no theme-dependent icon or checked state until mounted, so there
    is no hydration mismatch
  - the choice is saved and applied as spec 08 already does
- **Mobile navigation:** below the `md` breakpoint the nav links collapse
  into a menu button ("Menu", lucide icon) that opens a popover menu with the
  same links. The logo and theme toggle stay visible. The menu closes on
  link click, Escape and outside click, and returns focus to its button.
- **Footer** at the bottom of every page:
  - the logo mark, the six subjects as clearly separated items ("Biology ·
    Chemistry · Physics · Science · Biochemistry · Molecular Biology", or a
    list), so Biochemistry and Molecular Biology read as two subjects, and the
    tutor credentials (MPhil in Biochemistry and Molecular Biology, 8+ years
    of teaching experience)
  - a Subjects link (shown to everyone)
  - "© Science Nest", with no year (see Behavior › Cache Components)
- **Skip link:** "Skip to content" as the first focusable element, visible
  on focus, jumping to the page content.
- **Layout structure:** the root layout renders the skip link, header, a
  `<main id="main-content">` that grows to fill the page (so the footer sits
  at the bottom of short pages), then the footer. Pages render inside that
  `<main>` and don't add their own.
- **Metadata** in `app/layout.tsx`: title template `%s · Science Nest`, a
  default title "Science Nest", and a site description built from the About
  section (subjects, free 60-minute trial, weekly classes). The scaffold's
  "Create Next App" title and description are removed.
- shadcn components added as needed (e.g. `dropdown-menu`), restyled with the
  theme tokens, radius, elevation and 180ms fade and scale from spec 08.
- Update CLAUDE.md where this spec changes something described there (e.g.
  the UI stack, noting the shell lives in the root layout and pages don't
  render their own `<main>`).

## Out of scope
- The logout action and its button: spec 12.
- Route `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx` and
  `SpecimenImage`: spec 11.
- The pages behind the links: login (13), register (14), subjects list (16),
  dashboard (21), account (20). Until then those links show Next's default
  not-found page.
- Replacing `app/page.tsx`, the home hero and its hex lattice: spec 18.
- Per-page titles, descriptions, Open Graph, `metadataBase`, sitemap and
  robots: spec 19.
- Redirects for guests or logged-in users: already done in `proxy.ts`
  (spec 07). The header only reads the cookie; it never redirects.
- Checking whether the logged-in user has a Student profile, or the friendly
  403 message for admin accounts: spec 15. Admin accounts with a token see
  the student links.
- Showing the user's name or username in the header (no endpoint call here;
  the account page is spec 20).
- "Book a trial" or other booking CTAs in the header: specs 17, 18 and 28.
- The hex lattice motif: not used in the header or footer.

## Routes and pages
No new routes. The header, footer and skip link appear on every page, public
and student alike, and guests-only pages (`/login`, `/register`) too.

## Backend contract
None. The header decides guest or student from the presence of the `access`
cookie only and makes no backend calls.

## Behavior
1. A guest (no `access` cookie) sees Subjects, Log in and Register.
2. A logged-in user sees Subjects, Dashboard and Account, and never Log in or
   Register.
3. When the access cookie has expired but the refresh succeeds in the proxy,
   the same page load already shows the student links. When the refresh
   fails, the page shows the guest links.
4. After the login action redirects, the next page shows the student links
   without a manual reload.
5. Cache Components: reading the cookie is dynamic, so only the auth-dependent
   nav sits inside `<Suspense>`. The logo, theme toggle, footer and the rest of
   the layout stay static. The Suspense fallback shows no auth links (an empty
   space of the same size, so the header doesn't jump), never the wrong set.
   Nothing in the shell reads the current date, so the footer has no year.
   `npm run build` must report no blocking-route or uncached-data errors
   caused by the shell.
6. Theme toggle: picking Light, Dark or System switches the theme at once with
   no colour transition, is remembered across visits, and System follows the
   OS live (all provided by spec 08's provider).
7. Mobile menu and theme menu: open on click, Enter or Space; arrow keys move
   between items; Escape and outside click close; focus returns to the
   trigger. Only one is open at a time.
8. No loading, empty or error states of its own: the shell has no data.
9. No hydration warnings come from the shell (apart from the known
   next-themes script note).

## Time handling
Not applicable.

## UI notes
- Use the frontend-design skill before writing the header, footer and menus,
  within CLAUDE.md › Design: theme tokens only, no new colours, fonts, radius
  values, shadows or motion.
- Header: surface or background with a bottom border, no shadow; content
  max width 72rem, 16px gutter on mobile; height on the 4px grid. Not sticky.
- Nav links: body font, 600 for the current page, primary for link colour;
  the current page also carries a non-colour cue (e.g. underline), so colour
  isn't the only signal. No all-caps, no `→`.
- Register is the one primary button in the guest header; Log in is a plain
  link or ghost button.
- Menus use the popover surface, 16px radius, the single elevation shadow
  and 180ms fade and scale; instant with reduced motion.
- Footer: muted-foreground text on the background, top border, 14 or 16px
  text, stacked on mobile and in a row from `md`.
- Touch targets at least 44px tall on mobile.
- No tutor name or photo anywhere. No images in the shell.

## Acceptance criteria
- [x] As a guest, the header shows Subjects, Log in and Register, and Register looks like the primary button _(verified in code — check in browser)_
- [x] Logged in (with an `access` cookie), the header shows Subjects, Dashboard and Account, with Subjects first, and no Log in or Register _(verified in code — check in browser)_
- [x] With only a valid `refresh` cookie, the first page load already shows the student links _(verified in code — check in browser)_
- [x] With only an invalid `refresh` cookie, the page shows the guest links _(verified in code — check in browser)_
- [x] The logo links to `/` and is announced as "Science Nest" _(verified in code — check in browser)_
- [x] The logo's hexagon and bowl use primary, the dot eosin and the wordmark foreground, readable in both themes _(verified in code — check in browser)_
- [x] On `/subjects/biology` the Subjects link is marked as current and has `aria-current="page"` _(verified in code — check in browser)_
- [x] The theme toggle offers Light, Dark and System, shows the current choice, and switching applies at once and persists after reload _(verified in code — check in browser)_
- [x] With System chosen, changing the OS theme switches the app without a reload _(verified in code — check in browser)_
- [x] The theme menu and mobile menu work with the keyboard only (open, arrow keys, Escape, focus returns to the trigger) _(verified in code — check in browser)_
- [x] At 375px wide, the nav links sit in a "Menu" popover, and the logo and theme toggle stay visible _(verified in code — check in browser)_
- [x] At 1280px wide, the nav links are inline and there's no menu button _(verified in code — check in browser)_
- [x] Tabbing from the address bar focuses "Skip to content" first, and activating it moves focus to the main content _(verified in code — check in browser)_
- [x] On a short page the footer sits at the bottom of the viewport _(verified in code — check in browser)_
- [x] The footer shows the logo mark, all six subjects as separate items (Biology, Chemistry, Physics, Science, Biochemistry, Molecular Biology), the tutor credentials, a Subjects link and "© Science Nest", with no tutor name or photo _(verified in code — check in browser)_
- [x] The browser tab shows "Science Nest" on `/`, and the default description is no longer "Generated by create next app" _(verified in code — check in browser)_
- [x] No hydration warnings in the console on `/` (apart from the known next-themes script note) _(verified in code — check in browser)_
- [x] With reduced motion on, the menus open and close without animation _(verified in code — check in browser)_
- [x] `npm run build` shows no Cache Components errors caused by the shell
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- `app/page.tsx` (scaffold) renders its own `<main>`, which would nest inside
  the layout's `<main>`. It stays until spec 18 replaces the page; spec 18
  must not render a `<main>` of its own.
- There's no `/login` page yet (only `app/login/actions.ts`), and no
  `/register`, `/subjects`, `/dashboard` or `/account` pages. Header links to
  them show not-found until specs 13, 14, 16, 20 and 21.

## Open questions
None.
