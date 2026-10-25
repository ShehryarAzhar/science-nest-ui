# Spec 12: Logout

- **Status:** Done
- **Created:** 2026-10-26
- **Completed:** 2026-10-26
- **Depends on:** 10-app-shell-navigation.md

## Summary
A logged-in student needs a way to end their session, especially on a shared
or family computer. This spec adds a "Log out" control to the logged-in header
that runs a server action. The action deletes the `access` and `refresh`
cookies and redirects to the home page, so the next page shows the guest
links and student pages send the visitor to `/login`.

## User stories
- As a student, I want a "Log out" control in the header on every page, so
  that I can end my session from wherever I am.
- As a student on a shared computer, I want logging out to remove my session
  completely, so that the next person can't see my schedule or bookings.
- As a student on a phone, I want "Log out" in the mobile menu, so that I can
  reach it without the desktop layout.

## Scope
- **Logout server action**, kept beside the login action (in the `app/login/`
  area or a similar auth location):
  - deletes the `access` and `refresh` cookies, using the same name and
    `path: "/"` the login action and `proxy.ts` set them with, so the browser
    actually drops them
  - then redirects to `/`
  - makes no backend call (CLAUDE.md documents no logout or token-blacklist
    endpoint; see Open questions)
  - takes no input and works whether or not the cookies are still present
- **Header control**, in the logged-in branch of
  `components/layout/site-nav.tsx` only:
  - desktop (`md` and up): a "Log out" button after Account, styled as a
    quiet/ghost button so it doesn't compete with the nav links, never as a
    destructive or primary button
  - mobile: a "Log out" item at the end of the existing "Menu" popover,
    visually separated from the navigation links
  - it is a real `<button>` submitting a form bound to the server action, so
    it works before hydration and without client JS
  - while the action is pending, the control is disabled and reads
    "Logging out…" (no spinner, per Motion), so it can't be submitted twice
- **Client data cleared**: the browser's TanStack Query cache (one client per
  browser session, spec 09) is cleared on logout, so no schedule,
  availability or booking data from the previous student can show for the
  next one before it refetches.
- Update CLAUDE.md where this spec changes something described there (the
  Auth flow section gets a logout step; the UI stack note that "Spec 12 adds
  logout" is replaced by where it lives). Keep cookie names and options
  consistent between the login action, the logout action and `proxy.ts`.

## Out of scope
- The login page and form, and redirecting to the return path after login:
  spec 13.
- Registration: spec 14.
- Handling a 401 from student endpoints by sending the user to `/login`, and
  the friendly 403 message for admin accounts: spec 15.
- Changes to route protection or token refresh in `proxy.ts`: specs 02 and 07
  (unless the conflict below needs a fix there).
- Blacklisting the refresh token. The backend has no blacklist endpoint. If
  one is added later (e.g. SimpleJWT's `POST /auth/jwt/blacklist/`), logout
  should send the refresh token to it before deleting the cookies, as a
  separate change.
- A "You've been logged out" toast, a confirmation dialog, or a logout page.
- "Log out of all devices", session lists, or showing the user's name in the
  header.
- Automatic logout on inactivity.

## Routes and pages
No new routes. The control appears in the header on every page when the
visitor is logged in (an `access` cookie is present), and never for guests.
After logout the visitor lands on `/` (public).

## Backend contract
None. Logout only deletes the app's own cookies. No endpoint in CLAUDE.md
ends a session or revokes a token.

## Behavior
1. A guest never sees "Log out".
2. A logged-in user sees "Log out" in the header (desktop inline, mobile in
   the Menu popover).
3. Activating it submits the server action. While pending, the control is
   disabled and reads "Logging out…".
4. The action deletes both cookies and redirects to `/`. The home page shows
   the guest links (Subjects, Log in, Register) on that same navigation, with
   no manual reload.
5. After logout:
   - visiting `/dashboard`, `/account`, `/classes/...` or `/trial-lesson/...`,
     including with the browser Back button, redirects to `/login?next=...`
     (spec 07's proxy rule), and never shows cached student content
   - `/api/student/...` requests return 401
   - the TanStack Query cache holds no student data
6. If the cookies were already gone (for example the refresh cookie expired),
   logging out on a public page still succeeds and redirects to `/` without
   an error. On a student route the proxy redirects the action's POST to
   `/login?next=…` first, so the action doesn't run; that's accepted, since
   the user is already logged out.
7. If only a `refresh` cookie is present when the user logs out, logging out
   still leaves the browser with neither cookie (see Conflicts: the proxy
   may refresh on that same request).
8. No loading, empty or error states beyond the pending label: there is no
   data and no backend call that can fail. The action never returns or shows
   an error message.
9. Server actions are protected against cross-site posts by Next.js's own
   Origin check; nothing extra is added.
10. Cache Components: the control lives in the existing dynamic, Suspense-
    wrapped nav, so the static shell stays static. `npm run build` reports no
    new blocking-route errors.

## Time handling
Not applicable.

## UI notes
- Use the frontend-design skill before writing the control, within
  CLAUDE.md › Design: theme tokens only, no new colours, fonts, radius
  values, shadows or motion.
- Label "Log out" (sentence case, no `→`, no all-caps). An optional lucide
  `LogOut` icon is decorative (`aria-hidden`); the text stays visible.
- Desktop: ghost/quiet button, radius 10px, matching the height of the other
  nav items; 150ms state change on hover and focus; primary focus ring.
- Mobile: last item in the Menu popover, after a separator, at least 44px
  tall; the menu closes when it's activated.
- Not destructive styling: logging out is safe and reversible, so it doesn't
  use the destructive colour or a confirmation dialog.
- No tutor name or photo. No images.

## Acceptance criteria
- [x] As a guest, the header has no "Log out" control on desktop or in the mobile menu _(verified in code — check in browser)_
- [x] Logged in, at 1280px wide, "Log out" appears in the header after Account as a quiet button _(verified in code — check in browser)_
- [x] Logged in, at 375px wide, "Log out" is the last item in the Menu popover, separated from the links _(verified in code — check in browser)_
- [x] Clicking "Log out" lands on `/`, and the header shows Subjects, Log in and Register without a manual reload _(verified in code — check in browser)_
- [x] After logout, DevTools › Application › Cookies shows no `access` or `refresh` cookie _(verified in code — check in browser)_
- [x] After logout, opening `/dashboard` redirects to `/login?next=%2Fdashboard` _(verified in code — check in browser)_
- [x] After logging out from `/dashboard`, pressing Back doesn't show the dashboard's content _(verified in code — check in browser)_
- [x] After logout, `fetch("/api/student/schedule")` in the console returns 401 _(verified in code — check in browser)_
- [x] With only a `refresh` cookie set (delete `access` in DevTools), logging out still leaves neither cookie _(verified in code — check in browser)_
- [x] With both cookies already deleted in DevTools (header still showing the student links), clicking "Log out" on `/subjects` redirects to `/` without an error, and on `/dashboard` lands on `/login?next=%2Fdashboard` _(verified in code — check in browser)_
- [x] While the action runs, the control is disabled and reads "Logging out…" _(verified in code — check in browser)_
- [x] With JavaScript disabled, "Log out" still logs out and lands on `/` _(verified in code — check in browser)_
- [x] The control is reachable and operable with the keyboard alone on desktop and in the mobile menu _(verified in code — check in browser)_
- [x] With reduced motion on, the control and menu change state without animation _(verified in code — check in browser)_
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- `proxy.ts` runs on the server action's POST too. With only a `refresh`
  cookie, it refreshes first and adds a `Set-Cookie` for a new `access` to
  the response, while the action deletes `access`. Which header the browser
  keeps isn't documented here, so the user could stay logged in. The
  implementation must make sure logout wins (for example, by checking the
  final response's `Set-Cookie` headers), and record any proxy change in
  CLAUDE.md › Auth flow.
- The cookie options are written separately in `app/login/actions.ts` and
  `proxy.ts`, and the logout action would make a third copy of the names and
  path. CLAUDE.md already asks to keep them consistent. Sharing them is the
  implementer's call, but it must not import `server-only` code into
  `proxy.ts`.
- Server actions post to the current URL, and `proxy.ts` redirects guests on
  student routes before the action runs. With both cookies already gone on
  e.g. `/dashboard`, logout lands on `/login?next=…` instead of `/`.
  Accepted; `proxy.ts` is unchanged (see Behavior 6).
- The mobile "Menu" popover (Base UI) needs JavaScript to open, so without
  JS no mobile nav item, including "Log out", is reachable. The no-JS
  criterion applies to the desktop control only.

## Open questions
None.
