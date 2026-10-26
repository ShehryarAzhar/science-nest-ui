# Spec 15: Student Access Guard

- **Status:** Done
- **Created:** 2026-10-26
- **Completed:** 2026-10-26
- **Depends on:** 05-student-api-proxy.md, 09-query-provider.md

## Summary
Every student endpoint (`/classes/`, `/trial-lessons/`, `/schedule/`,
`/availability/`, and `/auth/users/me/` for the account page) can refuse a
request in two ways that aren't the student's fault: 401 when the session is
gone, and 403 when the logged-in account has no Student profile (admin and
staff accounts). This spec handles both in one shared way, for browser queries
through the student API proxy and for Server Components that use the API
client. A 401 sends the user to `/login` and brings them back afterwards. A
403 shows a calm "this area is for student accounts" message in place of the
page. It also adds the shared browser fetch wrapper for `/api/student/…`, so
every later student screen throws the same error type, and the guard and the
retry rule from spec 09 can read it.

## User stories
- As a student whose session has expired, I want to be taken to the login
  page and returned to where I was, so that I can carry on without hunting
  for the page again.
- As a student, I want to be told my session expired rather than shown a
  generic error, so that I know logging in again will fix it.
- As someone logged in with an admin or staff account, I want a clear,
  friendly explanation that student pages need a student account, with a way
  to log out, so that I don't think the app is broken.
- As a developer, I want one fetch wrapper and one error type for student
  data, so that the dashboard, pickers and booking flows (specs 20–31) don't
  each reinvent 401/403 handling.

## Scope
- **Shared browser fetch wrapper** for the student API proxy (spec 05), safe
  in Client Components:
  - Takes a browser path without a trailing slash (`/api/student/schedule`),
    a method (GET, POST, PATCH, DELETE) and an optional JSON body, and passes
    on an `AbortSignal` (so TanStack Query can cancel).
  - Same-origin only; sends `Content-Type: application/json` when there's a
    body. It never adds tokens (the cookie travels on its own).
  - Resolves the parsed JSON body on a 2xx, and nothing for 204 or an empty
    2xx.
  - A 401 doesn't throw: it starts the shared session-end flow (see 401
    handling) and returns a promise that never settles, so queries stay
    loading and mutations stay pending until the page navigates (decided
    while planning, so no error state flashes, Behavior 2).
  - Throws one error type for every other failure, carrying a numeric `status`
    (or none for network failures) and the body normalized with
    `normalizeDrfBody()` (spec 04) as a `NormalizedError`:
    - non-2xx → `kind: "http"`, the response status, the normalized body
      (generic message if the body is empty or not JSON). This includes the
      proxy's own 502/504 for network failures, which carry its network
      message.
    - `fetch` rejected (offline, connection dropped) → `kind: "network"`, no
      status, the network message from `lib/drf-errors.ts`. An abort is
      re-thrown as an abort, not turned into this error.
    - 2xx that isn't valid JSON → `kind: "invalid_response"`, the status, the
      generic message.
  - The error's own message is a safe, user-facing string (the form-level
    message), never a raw body or stack. Spec 09's retry rule works on it
    unchanged (it reads `status`).
- **Shared recognizers** (usable on server and client): "is this a session
  error" (status 401) and "is this a no-Student-profile error" (status 403 on
  a read, see Behavior), for both the browser error type and the server
  `ApiError`.
- **401 handling, browser:** any student query or mutation that fails with
  401 sends the user to `/login?next=<current path + query>` (through
  `safeReturnPath()` rules), once, even if several queries fail at the same
  moment. Before leaving, the TanStack Query cache is cleared, and the `access`
  and `refresh` cookies are deleted (see Conflicts: without this the proxy
  sends a user who still has an `access` cookie straight back to
  `/dashboard`). Components don't handle 401 themselves.
  - The cookies are httpOnly, so browser JavaScript can't delete them. The
    deletion goes through the server (the existing `logout()` action
    pattern, or a small same-origin POST route handler or server action),
    and only then does the browser navigate to `/login`. `document.cookie`
    is never used.
- **401 handling, server:** a Server Component that catches an `ApiError`
  with status 401 from a student-mode call ends up at the same place: cookies
  cleared, then `/login?next=<the page's path + query>`. Cookie clearing
  uses a POST (server action or route handler) wherever possible. If the
  Server Component path can only reach it with a GET (see Conflicts), that
  GET does nothing except clear both cookies and redirect to `/login` with
  `next` validated by `safeReturnPath()`.
- **Session-expired notice on `/login`:** when the guard sends the user to
  login, the login form shows an info notice "Your session has expired. Log in
  again." (the proxy's existing wording) until the next submit. Guests sent
  there by route protection (spec 07) don't see it. `/login` stays static.
- **403 handling:** a shared "student account needed" component that a
  student page renders in place of its content when its data read returns 403
  (browser or server). It shows:
  - heading "Student account needed"
  - text explaining that this area is for student accounts, that the current
    account (for example an admin or staff account) has no student profile,
    and that logging out and signing in with a student account will fix it
  - a "Log out" action using the existing `logout()` action (spec 12,
    clears the query cache, works without JS) and a "Home" link
  - no error styling, no backend `detail` text, no digest
- **CLAUDE.md update:** Architecture gets a short "Student access guard"
  note (the fetch wrapper and error type, the 401 and 403 rules, the
  component), and "Access rules" in Backend API points to it. The UI stack's
  data-fetching bullet names the wrapper as the one browser fetch wrappers
  must use.

## Out of scope
- Query hooks, query keys and response types for schedule, classes, trial
  lessons and availability: specs 21, 22 and 25–31.
- Any student page itself: account page (spec 20), dashboard (spec 21),
  booking and edit pages (specs 25–30). This spec only provides what they
  use.
- 403 on editing or deleting a locked trial lesson: spec 31. A 403 from a
  mutation is left to the calling form, which shows the backend's message
  (see Behavior).
- Token refresh: `proxy.ts` (spec 02) already refreshes before the request
  reaches the proxy route. The wrapper never retries or refreshes on 401.
- Redirecting admin accounts away from student routes in `proxy.ts`, or
  hiding Dashboard and Account from their header nav: the proxy only knows a
  cookie exists, not the account type (spec 07, spec 10 unchanged).
- A link to the Django admin from the 403 message.
- Changing query defaults, the retry rule or the toaster (spec 09).
- Changing the student API proxy's statuses or bodies (spec 05).
- Tests of any kind (per CLAUDE.md).

## Routes and pages
- No new pages. The 403 component renders inside student pages
  (`/dashboard`, `/account`, `/classes/…`, `/trial-lesson/…`) as they're
  built.
- `/login` (guests only): gains the session-expired notice when reached
  through the guard.
- If the plan needs a small endpoint to clear cookies before the login
  redirect, it's same-origin and does nothing else (no backend call).

## Backend contract
No new endpoints. The guard reacts to these documented responses:

- `/classes/`, `/classes/{id}/`, `/trial-lessons/`, `/trial-lessons/{id}/`,
  `/schedule/`, `/availability/` (through `/api/student/…`): 401 without a
  valid token, 403 for a logged-in user with no Student profile.
- `GET /auth/users/me/` (server, student mode): 401 without a valid token.
- The student proxy's own responses: 401 with an empty body (no cookie),
  401 `{"detail": "Your session has expired. Log in again."}` (refresh failed
  in `proxy.ts`), 502/504 `{detail}` for network failures, 404/405 for
  unknown paths and methods.
- 403 `{detail}` on PATCH/DELETE `/trial-lessons/{id}/` for a locked trial
  lesson: not treated as "no Student profile".
- 400 field errors, `non_field_errors` (including "This timeslot is already
  booked.") and 404: passed to the caller as the normalized error, untouched
  by the guard.

## Behavior
1. **Student, everything fine:** the wrapper returns the data; the guard does
   nothing visible.
2. **Session gone (401) during a browser query or mutation:**
   - The first 401 starts the redirect; others arriving meanwhile are
     ignored. No error toast or error state flashes first.
   - The query cache is cleared, both cookies are deleted, and the browser
     goes to `/login?next=<path + query>` with the session-expired notice.
   - After logging in, the user returns to that path (existing login flow).
   - Unsaved form input on the page is lost; that's accepted.
3. **Session gone (401) in a Server Component:** same result as step 2
   (cookies cleared, login with `next` and the notice), with no error page.
4. **No Student profile (403) on a read** (a GET through the wrapper, or a
   student-mode server read): the page shows the "Student account needed"
   component instead of its content. No retry (spec 09 already skips 4xx),
   no toast, no redirect. "Log out" clears cookies and the query cache and
   goes home; "Home" goes to `/`.
5. **403 on a mutation:** not treated as "no Student profile". The form gets
   the normalized error and shows the backend's message as a form-level
   error (spec 31 adds the locked trial lesson treatment).
6. **Other failures** (400, 404, 5xx, network, timeout, invalid response):
   untouched by the guard; the caller shows them using the normalized error.
7. **Loading and empty states:** owned by each page; the guard adds none.
8. **No redirect loops:** after a 401, `/login` never bounces to
   `/dashboard`, because both cookies are gone before the redirect.
9. **Cache Components:** nothing here makes the root layout or `/login`
   dynamic. Server-side handling runs where the page already reads cookies
   (inside `<Suspense>`).

## Time handling
Not applicable.

## UI notes
- Use the frontend-design skill for the 403 component and the login notice,
  within the Design section: theme tokens only, functional-page rules, no
  decoration, no hex lattice, no illustration.
- 403 component: centred in the page's content area, same structure as the
  route states (`components/route-state.tsx`: heading, muted description,
  actions row, 44px actions on mobile), a lucide icon (e.g. a user/shield
  icon) beside or above the heading so meaning isn't colour alone. "Log out"
  is the primary button, "Home" the outline one. Not styled as an error: no
  destructive or warning colours.
- Login notice: same treatment as the existing "account created" notice,
  but informational (surface/secondary tint with an info icon, not success
  or warning), announced with `role="status"`.
- Copy is plain and calm: no "Error", no "Forbidden", no status codes shown.
- No tutor name or photo anywhere.

## Acceptance criteria
Checked with a temporary, uncommitted test page that queries
`/api/student/schedule` with the wrapper and renders the 403 component on a
403, plus a temporary server page that reads `GET /auth/users/me/` in student
mode.

- [x] Logged in as a student, the wrapper returns the same schedule JSON as `fetch("/api/student/schedule")` _(verified in code — check in browser)_
- [x] A wrapper DELETE that gets 204 resolves with no value and no error _(verified in code — check in browser)_
- [x] A wrapper POST that gets 400 throws an error with `status` 400 and Django's field errors in its normalized form _(verified in code — check in browser)_
- [x] With Django stopped, the wrapper throws an http-kind error with status 502 (from the proxy) and the "Couldn't reach the server…" message, and the query retries twice before failing _(verified in code — check in browser)_
- [x] Offline in DevTools, the wrapper throws a network-kind error with no status and the network message _(verified in code — check in browser)_
- [x] With both cookies deleted (page already open), the next query sends the user to `/login?next=<that page>` with the "Your session has expired. Log in again." notice _(verified in code — check in browser)_
- [x] With `access` deleted and `refresh` set to garbage, the next query does the same, and the proxy's 401 JSON never shows as an error on the page _(verified in code — check in browser)_
- [x] With a forged `access` cookie that Django rejects (401) and `refresh` present, the user lands on `/login` (not bounced to `/dashboard`) and both cookies are gone afterwards _(verified in code — check in browser)_
- [x] After a browser 401, DevTools › Application › Cookies shows neither `access` nor `refresh` _(verified in code — check in browser)_
- [x] Two queries failing with 401 at once cause a single navigation to `/login` _(verified in code — check in browser)_
- [x] After the 401 redirect, the TanStack Query cache is empty (DevTools or a reload-free check) _(verified in code — check in browser)_
- [x] Logging in from that login page returns to the original page, query string included _(verified in code — check in browser)_
- [x] A guest opening `/dashboard` directly (spec 07 redirect) does not see the session-expired notice _(verified in code — check in browser)_
- [x] The temporary server page with a rejected token ends on `/login?next=…` with cookies cleared, not on the error page _(verified in code — check in browser)_
- [x] Logged in as an admin account, the test page shows "Student account needed" with "Log out" and "Home", no backend detail text, no retry in the network panel and no toast _(verified in code — check in browser)_
- [x] "Log out" in that message clears both cookies and goes to `/`, and works with JavaScript disabled _(verified in code — check in browser)_
- [x] A 403 from a PATCH or DELETE through the wrapper is returned to the caller as a normalized error, not shown as "Student account needed" _(verified in code — check in browser)_
- [x] The 403 message and the login notice look right in light and dark themes and at 375px wide, with 44px actions on mobile _(verified in code — check in browser)_
- [x] `/login` still builds as a static route
- [x] CLAUDE.md Architecture describes the guard, the wrapper and the error type
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Fetch wrapper ownership:** specs 05 and 09 list the browser fetch
  wrapper as out of scope and leave it to specs 21, 22 and 25–31. This spec
  takes it on (decided with the user), so those specs build on it instead.
- **401 with an `access` cookie present:** route protection (spec 07)
  treats any `access` cookie as logged in and redirects `/login` to
  `/dashboard`. If Django rejects a token that's still in the cookie, a plain
  redirect to `/login` would loop. The guard therefore deletes both cookies
  before the login redirect.
- **Cookies can't be deleted during a Server Component render:** the server
  401 path needs a step that can set cookies (a server action, a route
  handler or `proxy.ts`) before reaching `/login`. The plan picks one; the
  cookie options must match the login action, `proxy.ts` and `logout()`.
- **Logout CSRF if a GET clears cookies:** a POST is preferred. If the
  Server Component path can only use a GET URL that clears cookies and
  redirects to `/login`, any site could link to it and log a student out.
  That's accepted as a low-impact risk: it only logs the user out and
  exposes nothing. The GET does nothing else (no backend call, no other
  cookies touched), and its `next` goes through `safeReturnPath()`.
- **Wrapper 401 doesn't throw** (decided while planning): Scope first said
  the wrapper throws for every failure, but a thrown 401 puts the query or
  form in an error state while the session ends, against Behavior 2. A 401
  never settles instead; the recognizers still classify a server `ApiError`
  401.
- **Proxy 502 kind** (decided while planning): an acceptance criterion
  called the proxy's 502 a network-kind error, but Scope maps every non-2xx
  to `http`. It stays `http` with status 502; `network` is only for a
  rejected `fetch`. The criterion was reworded.
- **Server 401 path needs JavaScript:** to keep cookie clearing a POST, a
  Server Component's 401 renders a client component that POSTs to the
  session-end route after mount, then navigates. No cookie-clearing GET
  exists, so the logout-CSRF risk above doesn't arise. Without JS the user
  sees only the "session expired" message.
- **Server `ApiError` has no method:** any 403 caught in a Server Component
  counts as "no Student profile", which holds because Server Components only
  read. Server actions (mutations) keep using `normalizeApiError()`.
- **403 has two meanings:** "no Student profile" and "locked trial lesson"
  (spec 31) share the status, and CLAUDE.md doesn't document the detail
  text for either. The guard tells them apart by request type (reads vs.
  PATCH/DELETE), not by message text.

## Open questions
None.
