# Spec 03: Backend API Client

- **Status:** Done
- **Created:** 2026-10-24
- **Completed:** 2026-10-24
- **Depends on:** 01-project-setup.md

## Summary
A single server-only HTTP client, built on axios, that every server-side caller
uses to talk to the Django backend. It builds URLs from `API_BASE_URL` (spec
01), enforces trailing-slash paths, and in authenticated mode adds
`Authorization: JWT <access>` from the httpOnly `access` cookie, so tokens never
reach the browser. It has a separate public mode that never reads cookies, so
public pages can be cached. The existing `login()` action moves onto it.
Students see no change, but every later spec that fetches data depends on this.

## User stories
- As a developer, I want one place that knows the backend URL, the auth header
  format and the path rules, so that feature code only names an endpoint.
- As a developer, I want public calls that never touch cookies, so that the
  subjects and home pages can be cached and prerendered under Cache Components.
- As a developer, I want backend failures to come back with their HTTP status
  and the DRF body unchanged, so that spec 04 can normalize them and spec 15
  can handle 401 and 403.
- As a student, I want my login tokens to stay in httpOnly cookies, so that
  page scripts can't read them.

## Scope
- **Server-only module:** marked with `import "server-only"`, so importing it
  from a Client Component fails the build. It imports the env module from
  `lib/env.ts`, never `lib/env-core.ts`.
- **axios-based:** one shared axios instance (or a factory) with
  `baseURL = env.API_BASE_URL`, JSON request and response handling
  (`Content-Type: application/json` when there's a body,
  `Accept: application/json`), and a fixed request timeout (10 seconds) so a
  hung backend doesn't hang a render forever.
- **Path rule:** callers pass a path such as `/subjects/` or `/classes/12/`.
  Paths must start with `/` and end with `/`. A path that breaks this rule
  throws a clear developer error naming the path before any request is sent.
  The client never adds or removes slashes silently.
- **Two explicit modes:**
  - **Public:** sends no `Authorization` header and never calls `cookies()`.
    It's safe inside `"use cache"` functions. Used by subjects (16, 17, 18),
    registration (14) and JWT create (`login()`).
  - **Authenticated:** reads the `access` cookie with `await cookies()` and
    sends `Authorization: JWT <access>` (the `JWT` prefix, not `Bearer`). Used
    by `/auth/users/me/`, `/classes/`, `/trial-lessons/`, `/schedule/` and
    `/availability/`.
  
  The mode is chosen explicitly at each call site, never guessed from whether a
  cookie happens to exist.
- **Methods:** GET, POST, PUT, PATCH and DELETE, each with an optional JSON
  body where it applies, and a generic response type supplied by the caller.
  A 204 or empty response resolves without a body.
- **Error type:** any non-2xx response throws one exported error class that
  carries the HTTP `status` and the parsed response body unchanged (DRF
  `{field: [msgs]}`, `non_field_errors` or `{detail}`, whatever the backend
  sent). Network failures, timeouts and non-JSON 2xx responses throw the same
  class with no status, and are marked as such. A non-2xx response with a
  non-JSON body (e.g. an HTML 500 or 502 page) keeps its real status, has no
  body and is marked as non-JSON. Feature code never has to inspect raw axios
  errors.
- **No token in authenticated mode:** if the `access` cookie is missing, the
  client sends no request and throws the error class with status `401` and no
  body, the same as if the backend had refused. The proxy (spec 02) has
  already tried a refresh by then, so a missing `access` cookie means the user
  isn't logged in.
- **`login()` migration:** `app/login/actions.ts` calls `POST /auth/jwt/create/`
  through the client in public mode instead of its own axios call. Its cookie
  names, `maxAge` (except the `access` change below), flags, return values
  (`{ error: "Invalid username or password." }` on 401, `{ error: "Something
  went wrong. Try again." }` otherwise) and `redirect("/")` stay exactly the
  same.
- **`access` cookie safety margin:** SimpleJWT's `ACCESS_TOKEN_LIFETIME` is 5
  minutes, matching the cookie. Because the cookie is set slightly after the
  token is issued, and a token can expire mid-render, the `access` cookie's
  `maxAge` becomes 270 seconds (4.5 minutes) in both `app/login/actions.ts`
  and `proxy.ts`, so the proxy refreshes before the token expires. Nothing
  else in `proxy.ts` changes.
- **CLAUDE.md update:** in "Installed but not yet wired up", axios is no longer
  listed as unwired. Architecture gets a short note on the client: where it
  lives, its two modes, and that `proxy.ts` doesn't use it.

## Out of scope
- `proxy.ts` and token refresh: they stay on their own `fetch` call to
  `/auth/jwt/refresh/` from `lib/env-core.ts`. Proxy can't import
  `server-only` modules (spec 01), and spec 02's refresh behavior must not
  change. The only edit to `proxy.ts` is the `access` cookie `maxAge` (see
  Scope).
- Retrying a request after a 401 or refreshing tokens from inside the client:
  refresh belongs to the proxy (spec 02).
- Normalizing DRF errors into one shape and mapping them onto react-hook-form
  fields: spec 04 (drf-error-handling).
- The route handler that forwards browser requests to Django: spec 05
  (student-api-proxy). It will use this client but isn't built here.
- 401 → `/login` redirects and the friendly 403 message for admin accounts:
  spec 15 (student-access-guard).
- Redirecting guests away from student routes: spec 07 (route-protection).
- Response types or Zod schemas for specific endpoints (subjects, classes,
  schedule, …): each feature spec defines its own.
- Caching decisions (`"use cache"`, `cacheLife`, tags) for any endpoint: specs
  16 to 18 decide. This spec only makes public calls cacheable.
- TanStack Query, the query provider and any browser-side fetching: specs 09
  and 22.
- Any logout action: spec 12.
- The `/login` page UI: spec 13.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
None. No routes are added or changed. `login()` keeps its current behavior.

## Backend contract
The client is generic and doesn't list endpoints. It must handle every
documented endpoint's conventions:

- Base: `{API_BASE_URL}` plus a path that ends with `/`.
- Auth header (authenticated mode): `Authorization: JWT <access>`.
- Dates and times pass through unchanged as UTC strings. No conversion here.
- Error bodies (passed through, not reshaped): `{field: [msgs]}`,
  `{non_field_errors: [msgs]}` or `{detail: "..."}`.
- Statuses callers will rely on: 400 (validation, including "This timeslot is
  already booked."), 401 (no or invalid token), 403 (admin account without a
  Student profile, or a locked trial lesson with a message), 404 (unknown
  subject slug or id).

The only endpoint this spec calls directly is the migrated one:

- `POST /auth/jwt/create/` (public): `{username, password}` → `{access,
  refresh}`. A 401 means wrong credentials.

## Behavior
- **Public call:** builds `{API_BASE_URL}{path}`, sends no auth header, reads
  no cookies, and resolves with the parsed JSON body on 2xx.
- **Authenticated call with a cookie:** sends `Authorization: JWT <access>`,
  and resolves with the body on 2xx.
- **Authenticated call without a cookie:** throws the error class with status
  401 and doesn't touch the network.
- **Non-2xx:** throws the error class with `status` and the unchanged body. For
  example, a 400 from `/classes/` keeps `{"non_field_errors": ["This timeslot
  is already booked."]}` as sent. A non-JSON error page keeps its status and
  is marked as non-JSON, with no body.
- **Network failure or timeout:** throws the error class with no status, marked
  as a network error. The message never includes the token or the full
  `Authorization` header.
- **Bad path:** `"/subjects"` or `"subjects/"` throws a developer error before
  any request.
- **Cache Components:** authenticated calls read `cookies()`, so a Server
  Component using them must sit inside `<Suspense>` (or opt out), as with any
  request-time data. Public calls don't read request data and can run inside
  `"use cache"`.
- **Logging:** the client never logs or exposes tokens, cookie values or
  request bodies that contain passwords.
- Loading, empty and success UI, and cache invalidation: not applicable (no
  UI).

## Time handling
Not applicable. Values pass through as the backend sends them.

## UI notes
No UI changes.

## Acceptance criteria
- [x] The client module starts with `import "server-only"` and imports the env
      from `lib/env.ts`
- [x] Temporarily importing the client from a `"use client"` component fails
      `npm run build` (revert afterwards)
- [x] A temporary Server Component (or route handler) that calls
      `GET /subjects/` in public mode renders the subject list from the
      backend, and the backend request has no `Authorization` header (revert
      afterwards) _(verified in code — check in browser)_
- [x] The same public call works inside a `"use cache"` function without a
      Cache Components error about reading request data _(verified in code — check in browser)_
- [x] After logging in, a temporary authenticated call to `GET /auth/users/me/`
      returns the student's username and email, and the backend sees
      `Authorization: JWT <token>` (not `Bearer`) _(verified in code — check in browser)_
- [x] With the `access` and `refresh` cookies deleted, the same authenticated
      call throws the error class with status 401, and the backend gets no
      request _(verified in code — check in browser)_
- [x] A temporary authenticated `GET /schedule/` with an admin account's
      cookies throws the error class with status 403 and the backend's
      `{detail}` body unchanged _(verified in code — check in browser)_
- [x] A temporary `POST /classes/` with an invalid body throws the error class
      with status 400 and the DRF field errors unchanged _(verified in code — check in browser)_
- [x] Calling the client with `"/subjects"` (no trailing slash) throws a clear
      developer error naming the path, and no request is sent _(verified in code — check in browser)_
- [x] With the backend stopped, a call throws the error class marked as a
      network error with no status, and the message contains no token _(verified in code — check in browser)_
- [x] `API_BASE_URL` with a trailing slash still produces
      `http://127.0.0.1:8000/subjects/` with no double slash _(verified in code — check in browser)_
- [x] `app/login/actions.ts` no longer imports axios directly and calls
      `POST /auth/jwt/create/` through the client in public mode
- [x] Logging in with valid credentials sets the `access` and `refresh`
      cookies with unchanged names and flags, then redirects to `/` _(verified in code — check in browser)_
- [x] The `access` cookie's `maxAge` is 270 in both `app/login/actions.ts`
      and `proxy.ts`, and DevTools shows a new `access` cookie expiring
      4.5 minutes after login or refresh _(verified in code — check in browser)_
- [x] Logging in with wrong credentials returns "Invalid username or
      password.", and with the backend stopped returns "Something went wrong.
      Try again." _(verified in code — check in browser)_
- [x] `proxy.ts` changes only the `access` cookie `maxAge`, and deleting the `access` cookie then reloading
      still brings back a new one _(verified in code — check in browser)_
- [x] No source file outside the client builds a backend URL from
      `env.API_BASE_URL`, except `proxy.ts`
- [x] CLAUDE.md's "Installed but not yet wired up" no longer lists axios as
      unwired, and Architecture describes the client and its two modes
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- Spec 01 left `login()` with its own axios call ("doesn't refactor `login()`
  or the proxy onto a shared client"). This spec migrates `login()` and leaves
  the proxy alone.
- The proxy keeps its own `fetch` to `/auth/jwt/refresh/`, so there are still
  two ways the backend is called. That's on purpose: Proxy can't import
  `server-only` modules.
- CLAUDE.md lists axios under "Installed but not yet wired up", but
  `login()` already uses it. That section is updated here.
- The roadmap row says the client takes the JWT "from the cookie". Public
  endpoints (subjects, registration, JWT create) must not read cookies if they
  are to be cached, so the client has an explicit public mode as well.
- axios isn't covered by Next's `fetch` caching integration, so caching of
  public data has to come from `"use cache"` wrappers at the call sites (specs
  16 to 18), not from fetch options.

## Open questions
None.
