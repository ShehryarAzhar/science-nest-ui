# Spec 05: Student API Proxy

- **Status:** Done
- **Created:** 2026-10-24
- **Completed:** 2026-10-25
- **Depends on:** 03-backend-api-client.md

## Summary
The JWTs live in httpOnly cookies, so browser code (TanStack Query hooks, booking
forms) can't call Django directly. This spec adds one same-origin route handler
that takes browser requests for the student endpoints, adds
`Authorization: JWT <access>` from the cookie through the server-only API client
(spec 03), and sends back Django's status and JSON body unchanged. The
availability query, the slot pickers and every booking, edit and cancel flow
build on it. Tokens never reach client JS.

## User stories
- As a student, I want the dashboard and booking pages to load and save my
  classes and trial lesson from the browser, so that pickers and lists update
  without a full page reload.
- As a student, I want my login tokens to stay in httpOnly cookies even when
  the browser fetches my data, so that page scripts can't read them.
- As a developer, I want browser code to get Django's exact status and DRF body
  back, so that spec 04's normalizer, spec 15's 401/403 handling and the
  "This timeslot is already booked." check work the same in the browser as on
  the server.

## Scope
- **One route handler** under a single same-origin prefix, `/api/student/…`,
  where the rest of the path names the backend endpoint
  (`/api/student/classes/12` → `/classes/12/`).
- **Allowlist of endpoints and methods.** Only the student endpoints from
  CLAUDE.md are forwarded:

  | Browser path | Backend path | Methods |
  |---|---|---|
  | `/api/student/schedule` | `/schedule/` | GET |
  | `/api/student/availability` | `/availability/` | GET |
  | `/api/student/classes` | `/classes/` | GET, POST |
  | `/api/student/classes/{id}` | `/classes/{id}/` | GET, PATCH, DELETE |
  | `/api/student/trial-lessons` | `/trial-lessons/` | GET, POST |
  | `/api/student/trial-lessons/{id}` | `/trial-lessons/{id}/` | GET, PATCH, DELETE |

  `{id}` must be a positive integer. Any other path → 404, and a known path
  with a method not in its list → 405 with an `Allow` header. Neither calls
  the backend. The handler is never a general open proxy to Django (no auth,
  subjects or admin paths). Edits use PATCH only: a PUT to
  `/api/student/classes/{id}` or `/api/student/trial-lessons/{id}` → 405 with
  `Allow: GET, PATCH, DELETE`.
- **Trailing slash.** The browser calls paths without a trailing slash (Next's
  default `trailingSlash: false` redirects slash URLs). The handler adds the
  trailing slash when building the backend path, as the API client requires.
  A browser request with a trailing slash behaves the same after Next's
  redirect.
- **Forwarding through the API client** in `student` mode, so the backend URL,
  the `JWT` auth header, the 10 s timeout and the path rule come from one place.
- **API client extension (additive):** `lib/api-client.ts` exports a variant
  of its request function that resolves the 2xx status along with the body,
  and `ApiError` gains a `timedOut` flag for network errors that hit the
  timeout. Existing callers and behavior don't change.
- **Request body:** for POST and PATCH, the browser's JSON body is
  forwarded as is. The handler doesn't validate fields (Django does). A body
  that isn't valid JSON → 400 with a DRF-style `{detail}` and no backend call.
  GET and DELETE send no body.
- **Nothing else from the browser is forwarded:** no browser headers, no
  cookies, no query string. Only the method, the mapped path, the JSON body and
  the auth header reach Django.
- **Response passthrough:**
  - 2xx with JSON → same status, same JSON body.
  - 204 or an empty 2xx (e.g. DELETE) → same status, empty body.
  - Non-2xx with a JSON body (400 field errors, `non_field_errors`, 401, 403
    `{detail}`, 404) → same status, body exactly as Django sent it.
  - No `access` cookie → 401 (the client throws before calling the backend),
    returned with an empty or `{detail}` body so the browser sees the same
    status a missing token would get from Django.
  - Non-2xx with a non-JSON body (HTML 500/502 page) → same status, a
    DRF-style `{detail}` with the generic message from `lib/drf-errors.ts`.
    The HTML is never passed to the browser.
  - Network failure or timeout → 502 (timeout: 504) with `{detail}` set to the
    network message from `lib/drf-errors.ts`.
  - Non-JSON 2xx (invalid response) → 502 with the generic `{detail}`.
  - Any other thrown error → 500 with the generic `{detail}`, never the error's
    own text.
- **Responses are never cached:** every response carries
  `Cache-Control: no-store`, and the handler reads request data, so it's
  dynamic under Cache Components.
- **Cross-site protection for mutations:** POST, PATCH and DELETE are
  refused with 403 (no backend call) unless the request's `Origin` header
  matches `SITE_URL` from the env module. `sameSite: lax` cookies already block
  most cross-site writes; this closes the rest.
- **No secrets in responses or logs:** the handler never returns or logs the
  token, cookie values, request headers or request bodies.
- **Proxy refresh failure on API requests:** for requests under `/api/`, when
  the refresh in `proxy.ts` fails, it clears both cookies and returns a 401
  JSON `{detail}` response instead of redirecting to `/login`. A browser
  `fetch` would otherwise follow the redirect and get the login page HTML with
  a 200. Page requests keep the redirect to `/login`. Nothing else in the
  proxy's refresh behavior changes.
- **CLAUDE.md update:** Architecture gets a short note on the student proxy:
  its prefix, the allowlist, that it forwards through the API client, and that
  browser code calls it instead of Django. The Auth flow's `proxy.ts` step
  describes the 401 JSON response for `/api/` requests when refresh fails, and
  the redirect to `/login` for pages.

## Out of scope
- Token refresh itself: `proxy.ts` (spec 02) already runs before the handler
  and refreshes an expired `access` cookie. The handler doesn't retry or
  refresh. The only proxy change is the `/api/` refresh-failure response above.
- Redirecting guests away from student pages: spec 07 (route-protection).
- Turning 401 into a `/login` redirect and 403 into the friendly admin-account
  message in the UI: spec 15 (student-access-guard). This spec only passes the
  statuses through.
- Normalizing errors in the browser: spec 04 already provides
  `normalizeDrfBody()`; callers use it on the proxied body.
- `QueryClientProvider`, query defaults and toasts: spec 09 (query-provider).
- The availability hook and blocked-slot sets: spec 22 (availability-query).
- Any fetch wrapper, query hooks or response types for schedule, classes or
  trial lessons: specs 21, 22 and 25–31 define what they need.
- Proxying `/auth/users/me/`: the account page (spec 20) renders on the server
  with the API client.
- Proxying public endpoints (subjects, registration, JWT create): they're
  called on the server in public mode (specs 13, 14, 16–18).
- Logout: spec 12.
- Rate limiting or request size limits beyond what Next provides.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
- `/api/student/[…path]` (route handler, no page). Callable by a logged-in
  student from the same origin. Guests get 401 and admin accounts get 403,
  both passed through from Django (or produced by the client for a missing
  cookie). No pages are added or changed.

## Backend contract
All in student mode with `Authorization: JWT <access>`; every path ends with `/`.

- `GET /schedule/` → `weekly_classes` (each with its price), `trial_lesson`
  (object or null), `weekly_cost`.
- `GET /availability/` → `weekly_classes: [{day, time, mine}]`,
  `trial_lessons: [{starts_at, day, time, mine}]`.
- `GET /classes/`, `POST /classes/` (subject, level, day, time, duration).
- `GET|PATCH|DELETE /classes/{id}/`.
- `GET /trial-lessons/`, `POST /trial-lessons/` (subject, level, starts_at).
- `GET|PATCH|DELETE /trial-lessons/{id}/`.

The handler doesn't read any of these fields; it passes them through.

Errors passed through unchanged:
- 400 `{field: [msgs]}` or `{non_field_errors: [msgs]}`, including "This
  timeslot is already booked."
- 401 without a valid token.
- 403 `{detail}` for an admin account with no Student profile, and for editing
  or deleting a locked trial lesson.
- 404 for an unknown id.

## Behavior
1. A browser request reaches `proxy.ts` first. If `access` expired and
   `refresh` is valid, the request continues with a fresh `access` cookie.
2. The handler checks the path and method against the allowlist (404 / 405 on
   a miss) and, for mutations, the `Origin` (403 on a mismatch).
3. For POST and PATCH it parses the JSON body (400 `{detail}` if invalid).
4. It calls the backend through the API client in student mode.
5. It returns the status and body per the passthrough rules in Scope, with
   `Cache-Control: no-store` and `Content-Type: application/json` whenever
   there's a body.

- **Logged out (no cookies):** every allowed path returns 401 without a backend
  call.
- **Logged in as a student:** responses match what Django returns for the same
  request.
- **Admin account:** Django's 403 `{detail}` reaches the browser unchanged.
- Loading, empty and success UI, client-side validation and cache invalidation:
  not applicable (no UI). Callers handle them in their own specs.

## Time handling
Not applicable. Dates and times pass through as the UTC values Django sends and
receives.

## UI notes
No UI changes.

## Acceptance criteria
- [x] Logged in as a student, `fetch("/api/student/schedule")` in the browser
      console returns 200 and the same JSON as `GET /schedule/` on Django _(verified in code — check in browser)_
- [x] `fetch("/api/student/availability")` returns Django's availability JSON _(verified in code — check in browser)_
- [x] The Django request log shows `Authorization: JWT <token>` (not `Bearer`)
      and a path ending in `/` for proxied calls _(verified in code — check in browser)_
- [x] A `POST /api/student/classes` with a valid JSON body creates a class and
      returns Django's 201 body _(verified in code — check in browser)_
- [x] A `POST /api/student/classes` for a taken slot returns 400 with
      `{"non_field_errors": ["This timeslot is already booked."]}` (or the
      field form Django sends) exactly as Django sent it _(verified in code — check in browser)_
- [x] A `POST /api/student/classes` with missing fields returns 400 with
      Django's field errors unchanged _(verified in code — check in browser)_
- [x] `PATCH` and `DELETE /api/student/classes/{id}` work; the DELETE returns
      Django's status with an empty body _(verified in code — check in browser)_
- [x] `GET /api/student/classes/999999` returns Django's 404 _(verified in code — check in browser)_
- [x] Editing or deleting a locked trial lesson returns 403 with Django's
      message unchanged _(verified in code — check in browser)_
- [x] Logged in as an admin account, `/api/student/schedule` returns 403 with
      Django's `{detail}` _(verified in code — check in browser)_
- [x] With both cookies deleted, `/api/student/schedule` returns 401 and Django
      receives no request _(verified in code — check in browser)_
- [x] With only the `access` cookie deleted, `/api/student/schedule` still
      returns 200 (the proxy refreshed it) and a new `access` cookie is set _(verified in code — check in browser)_
- [x] `/api/student/subjects`, `/api/student/auth/users/me` and
      `/api/student/classes/abc` return 404 without a backend call _(verified in code — check in browser)_
- [x] `POST /api/student/schedule` returns 405 with `Allow: GET` _(verified in code — check in browser)_
- [x] `PUT /api/student/classes/{id}` and `PUT /api/student/trial-lessons/{id}`
      return 405 with `Allow: GET, PATCH, DELETE`, and Django receives no
      request _(verified in code — check in browser)_
- [x] With the `access` cookie deleted and an invalid `refresh` cookie,
      `fetch("/api/student/schedule")` returns 401 JSON with a `{detail}` (not
      the login page HTML), and both cookies are cleared _(verified in code — check in browser)_
- [x] With the `access` cookie deleted and an invalid `refresh` cookie,
      loading a page still redirects to `/login` _(verified in code — check in browser)_
- [x] A POST with a body that isn't valid JSON returns 400 with a `{detail}`
      and no backend call _(verified in code — check in browser)_
- [x] A POST whose `Origin` isn't `SITE_URL` (e.g. sent with curl and a forged
      `Origin`) returns 403 without a backend call _(verified in code — check in browser)_
- [x] Query strings and extra browser headers (e.g. a custom `X-Test` header)
      don't reach Django _(verified in code — check in browser)_
- [x] With Django stopped, a proxied call returns 502 with the "Couldn't reach
      the server…" `{detail}`, and no token appears in the response or the
      server log _(verified in code — check in browser)_
- [x] Every proxied response has `Cache-Control: no-store` _(verified in code — check in browser)_
- [x] No token or cookie value appears in any response body or header sent to
      the browser _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture describes the student proxy, and its Auth flow
      describes the 401 JSON response for `/api/` requests when refresh fails
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Trailing slashes:** CLAUDE.md says every path ends with a trailing slash,
  but Next redirects slash-ending URLs by default. Only the backend paths end
  with `/`; the browser-facing `/api/student/…` paths don't.
- **"Status and body unchanged":** the roadmap row says the handler passes the
  body through unchanged, but the API client (spec 03) drops non-JSON error
  bodies and gives network failures no status. In those cases the handler
  sends a DRF-style `{detail}` with spec 04's fallback messages (and 502/504
  for network failures) instead of the raw body.
- **Missing-cookie 401:** the client produces this 401 itself without a Django
  body, so its body won't match a real Django 401 exactly. Callers should rely
  on the status, not the body text.
- **2xx status not exposed by the client:** spec 03's client resolved only the
  body, so 201, 200 and 204 couldn't be passed through. Resolved by the
  additive client extension in Scope.
- **Timeouts not distinguishable:** `ApiError` reported timeouts as a plain
  network error, so the 504 couldn't be produced. Resolved by the `timedOut`
  flag in Scope.
- **Refresh-failure 401 wording:** not given here; set to
  `{"detail": "Your session has expired. Log in again."}`.

## Open questions
None.
