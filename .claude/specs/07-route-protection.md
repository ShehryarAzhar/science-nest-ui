# Spec 07: Route Protection

- **Status:** Done
- **Created:** 2026-10-25
- **Completed:** 2026-10-25
- **Depends on:** 02-session-token-refresh (not created yet)

## Summary
Student pages (dashboard, account, booking and editing) only work with a
session. This spec makes `proxy.ts` send guests who open a student route to
`/login`, with the page they wanted saved as a return path. It also sends
logged-in users who open `/login` or `/register` to `/dashboard`. A failed
token refresh no longer forces visitors on public pages to log in. Their
cookies are cleared and they keep browsing as guests.

## User stories
- As a guest, I want a student page to send me to the login page instead of
  showing a broken or empty page, so that I know I need to log in.
- As a guest, I want the page I asked for to be remembered, so that spec 13
  can take me back there after I log in.
- As a student, I want `/login` and `/register` to send me to my dashboard,
  so that I don't log in or register again by mistake.
- As a visitor whose session expired, I want public pages (home, subjects)
  to keep loading, so that an expired session only matters on student pages.

## Scope
- **Student routes**, matched by path prefix on whole segments:
  `/dashboard`, `/account`, `/classes` and `/trial-lesson`, each with
  everything under it (e.g. `/classes/new`, `/classes/12/edit`,
  `/trial-lesson/new`). `/dashboards` or `/classes-info` don't match. The
  list covers the pages from specs 20–31 even though they don't exist yet.
- **Guest-only routes:** `/login` and `/register` (and anything under them).
- **Session state in the proxy** comes from cookies only, after the existing
  refresh step (spec 02):
  - *Logged in:* an `access` cookie is present, or a refresh just succeeded.
  - *Guest:* no `access` and no `refresh` cookie, or a refresh just failed.
  The proxy doesn't call the backend to check the token any further.
- **Guest on a student route** → redirect to `/login?next=<return path>`.
  The return path is the request's own pathname plus its query string,
  URL-encoded (e.g. `/classes/new?subject=3` →
  `/login?next=%2Fclasses%2Fnew%3Fsubject%3D3`). It's always built from the
  request and is always a same-origin path.
- **Logged-in user on a guest-only route** → redirect to `/dashboard`. Any
  `next` parameter is ignored.
- **Refresh-failure change:** when refresh fails, the proxy still deletes
  both cookies, and `/api/` requests still get the 401 JSON
  `{"detail": "Your session has expired. Log in again."}`. Page requests now
  follow the guest rules above: student route → `/login?next=…`; any other
  page (including `/login` and `/register`) → loads normally as a guest,
  with the cookie deletions on the response.
- **Refresh success on a guest-only route:** redirect to `/dashboard`, and
  the new `access` cookie is set on the redirect response.
- **Proxy matcher:** `proxy.ts` exports a `config.matcher` so the proxy
  skips static files. Without one, it runs on every request. Then every
  asset request on a page with an expired `access` cookie triggers its own
  refresh call, and the redirect rules could catch assets. The matcher
  excludes:
  - `/_next/static` and `/_next/image`
  - `/images/` and `/logo/` (the `public/` folders)
  - `favicon.ico`, `icon.svg` and `apple-icon.png`
  - any path whose last segment has a file extension (e.g. `/robots.txt`,
    `/foo.webp`)

  Every page and every `/api/` path still goes through the proxy. Per the
  bundled docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`,
  "Matcher" and "Negative matching"), the matcher must be a constant that
  can be analysed at build time (a negative-lookahead regex string), not a
  value built from variables. Next still runs the proxy for `/_next/data`
  routes whatever the matcher says. That's intended and needs no handling.
- Update the CLAUDE.md "Auth flow (JWT in httpOnly cookies)" section to
  describe the new redirect rules, the refresh-failure change and the
  matcher. The proxy no longer runs on every request.

## Out of scope
- The login form, reading and validating `next`, and redirecting after login
  (the `login()` action still redirects to `/`): spec 13.
- The register page: spec 14.
- Logout: spec 12.
- Handling 401/403 from student endpoints inside pages, and the friendly
  message for admin accounts without a Student profile: spec 15.
- The student pages themselves: specs 20–31.
- Changing how the refresh works (endpoint, cookie names, `maxAge`, flags):
  spec 02.
- Any change to `/api/` behavior beyond what exists today: specs 05 and 15.
- Header links that change with login state: spec 10.
- Any `next.config.ts` changes.

## Routes and pages
| Route | Access | Guest | Logged in |
|---|---|---|---|
| `/dashboard`, `/account`, `/classes/**`, `/trial-lesson/**` | Student | Redirect to `/login?next=…` | Passes through |
| `/login`, `/register` | Guests only | Passes through | Redirect to `/dashboard` |
| Everything else (`/`, `/subjects/**`, …) | Public | Passes through | Passes through |
| `/api/**` | Unchanged | Unchanged | Unchanged |
| Static files (see Scope › Proxy matcher) | Public, proxy skipped | Served directly | Served directly |

Pages that don't exist yet still redirect as above, so a guest opening
`/dashboard` before spec 21 lands on `/login`, and a logged-in user lands on
`/dashboard` (404 until spec 21).

## Backend contract
No new calls. The proxy keeps using the existing refresh call from spec 02:

- `POST /auth/jwt/refresh/`, body `{ "refresh": "<token>" }` → `{ "access" }`.
  Any non-2xx response or network failure counts as a failed refresh.

## Behavior
0. Requests excluded by the matcher never reach the proxy: no refresh, no
   redirect, no cookie changes.
1. The proxy runs the existing refresh step first (only when `access` is
   missing and `refresh` exists).
2. It then decides the session state: logged in or guest (see Scope).
3. `/api/` requests: unchanged. On a failed refresh, the 401 JSON; otherwise
   they pass through.
4. Page requests:
   - Student route + guest → 307 redirect to `/login?next=<encoded path+query>`.
   - Guest-only route + logged in → 307 redirect to `/dashboard`.
   - Otherwise → pass through (forwarding the refreshed `access` cookie on
     the request when a refresh just succeeded, as today).
5. Whenever a refresh failed, the response (redirect or pass-through) deletes
   both cookies.
6. Whenever a refresh succeeded, the response (redirect or pass-through) sets
   the new `access` cookie with the same options as today.
7. Admin accounts (logged in, no Student profile) are treated as logged in:
   `/login` sends them to `/dashboard`, where spec 15 shows the friendly
   message. They aren't blocked from student routes here.
8. No loading, empty or error UI: everything happens in the proxy before the
   page renders.

## Time handling
Not applicable.

## UI notes
No UI. Redirects only.

## Acceptance criteria
- [x] With no cookies, opening `/dashboard` redirects to `/login?next=%2Fdashboard`
- [x] With no cookies, opening `/classes/new?subject=3` redirects to `/login?next=%2Fclasses%2Fnew%3Fsubject%3D3`
- [x] With no cookies, `/account`, `/classes/12/edit` and `/trial-lesson/new` each redirect to `/login` with their own `next`
- [x] With no cookies, `/`, `/login` and `/register` load without a redirect
- [x] Paths that only share a prefix (e.g. `/dashboards`) aren't treated as student routes
- [x] Logged in (valid `access` cookie), opening `/login` or `/register` redirects to `/dashboard`
- [x] Logged in, opening `/login?next=%2Faccount` still redirects to `/dashboard`
- [x] Logged in, student routes and public pages load without a redirect
- [x] With only a valid `refresh` cookie, opening `/dashboard` passes through and the browser gets a new `access` cookie _(verified in code — check in browser)_
- [x] With only a valid `refresh` cookie, opening `/login` redirects to `/dashboard` and the browser gets a new `access` cookie _(verified in code — check in browser)_
- [x] With only an invalid `refresh` cookie, opening `/dashboard` redirects to `/login?next=%2Fdashboard` and both cookies are deleted
- [x] With only an invalid `refresh` cookie, opening `/` or `/login` loads as a guest (no redirect) and both cookies are deleted
- [x] With only an invalid `refresh` cookie, `GET /api/student/schedule` still returns 401 with `{"detail": "Your session has expired. Log in again."}`
- [x] Without cookies, `/api/student/schedule` still returns 401 rather than a redirect
- [x] With an expired `access` cookie (deleted) and a valid `refresh` cookie, loading a page triggers exactly one `POST /auth/jwt/refresh/` in the Django log _(verified in code — check in browser)_
- [x] Without cookies, static files load normally (200, no redirect): a `/_next/static` asset, a `/_next/image` URL, a file under `/images/` and `/logo/`, `/favicon.ico`, `/icon.svg`, `/apple-icon.png`
- [x] With cookies (valid, expired `access`, and invalid `refresh`), the same static files load normally, no refresh call reaches Django for them, and their responses don't set or delete cookies
- [x] Pages and `/api/student/...` paths still go through the proxy (the redirect and 401 criteria above hold)
- [x] Every criterion above still passes with the matcher in place
- [x] The CLAUDE.md "Auth flow" section describes the new redirect rules, the refresh-failure change and the matcher
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- `proxy.ts` and the CLAUDE.md "Auth flow" section currently redirect every
  page request to `/login` after a failed refresh, including public pages. By
  decision, this spec limits that redirect to student routes. Update both.
- `app/login/actions.ts` redirects to `/` after login, and the roadmap says
  spec 13 redirects to the return path or `/dashboard`. This spec only
  creates `next`. Nothing consumes it until spec 13.
- Spec 02 has no spec file in `.claude/specs/`, although the roadmap marks it
  Implemented.

## Open questions
None.
