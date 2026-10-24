# Spec 01: Project Setup

- **Status:** Done
- **Created:** 2026-10-24
- **Completed:** 2026-10-24
- **Depends on:** None

## Summary
Prepare the repository so any developer can clone it, configure it and run it
the same way. This adds environment configuration for the backend URL and the
public site URL, and a validated server-only env module that becomes the
single source of truth for the backend URL. The login action and the
token-refresh proxy now read the URL from that module. The spec also fixes
`.gitignore`, the project name and the Node.js version requirement, writes a
real README, and removes leftovers from the create-next-app scaffold. Students
see no change. Every later spec that talks to the backend or builds absolute
URLs depends on this.

## User stories
- As a developer, I want a committed `.env.example` that explains every
  variable, so that I can create my local `.env` without reading the code.
- As a developer, I want the backend URL defined in one place, so that I can
  point the app at another backend without editing code.
- As a developer, I want the app to fail with a clear message naming the
  missing or invalid variable, so that I don't chase confusing network errors
  caused by a bad config.
- As a developer, I want secrets and build output kept out of git, so that
  nothing local is committed by accident.
- As a developer, I want a README with the Node.js version, setup and run
  steps, so that I can get the app running against the Django backend quickly.

## Scope
- **`.env`** (local, git-ignored) with working local values:
  `API_BASE_URL=http://127.0.0.1:8000` and `SITE_URL=http://localhost:3000`.
- **`.env.example`** (committed) with the same two variables, placeholder
  values, and a comment above each variable explaining what it is, its format
  (absolute `http`/`https` URL, no trailing slash) and an example:
  - `API_BASE_URL`: base URL of the Django REST backend. Every backend path is
    appended to it.
  - `SITE_URL`: public base URL of this frontend, used later for absolute URLs
    (sitemap, Open Graph, metadata).
- **Env module** (server-only):
  - Reads `API_BASE_URL` and `SITE_URL` from `process.env` and checks both
    with Zod: required, non-empty, absolute `http:` or `https:` URLs.
  - Strips a trailing slash so callers can always append paths that start
    with `/`.
  - Exposes typed values. No code reads `process.env.API_BASE_URL` or
    `process.env.SITE_URL` directly.
  - On a missing or invalid value, throws one error that names every bad
    variable and why, and points to `.env.example`. The error never prints
    variable values.
  - Is marked server-only for app code, so importing it from a Client
    Component fails at build time. Neither variable uses the `NEXT_PUBLIC_`
    prefix, so neither is inlined into the browser bundle.
- **Two files, one definition:** Next treats Proxy like a non-App-Router
  context for `server-only` (it shows up in `server-only` error traces), so
  the env module is split:
  - `lib/env-core.ts`: the Zod validation and the normalised, typed values,
    with no `server-only` marker. Only `proxy.ts` and `next.config.ts` import
    it.
  - `lib/env.ts`: `import "server-only"` and re-exports everything from
    `lib/env-core.ts`. All app code (server actions, Server Components, route
    handlers, the spec 03 API client and later specs) imports this one.

  Both expose the same values from the same validation, so there's only one
  definition.
- **Validation at startup:** `next.config.ts` imports `lib/env-core.ts`, so
  validation runs as soon as Next loads its config at the start of every
  `npm run dev` and `npm run build`, before any request.
- **One source of truth for the backend URL:** replace the hard-coded
  `http://127.0.0.1:8000` in `app/login/actions.ts` (JWT create) and
  `proxy.ts` (JWT refresh) with `API_BASE_URL` from the env module. The
  endpoint paths (`/auth/jwt/create/`, `/auth/jwt/refresh/`) and all cookie
  behavior stay exactly as they are.
- **`.gitignore`**:
  - Ignores all `.env*` files, with an exception for `.env.example` so it can
    be committed.
  - Keeps the existing entries: `node_modules`, `.next/`, `out/`, `build`,
    `coverage`, `*.tsbuildinfo`, `next-env.d.ts`, `.vercel`, debug logs,
    `*.pem` and `.claude/settings.local.json`.
  - Adds editor and OS files: `.vscode/`, `.idea/`, `*.swp`, `Thumbs.db` and
    `desktop.ini`, along with the existing `.DS_Store`.
- **`package.json`**:
  - `name` becomes `science-nest`, and `package-lock.json` is updated to
    match.
  - Adds `"engines": { "node": ">=20.9" }`. This is the minimum in Next 16's
    bundled docs (`01-app/01-getting-started/01-installation.md`, "Minimum
    Node.js version: 20.9") and in `next`'s own `engines` (`>=20.9.0`).
  - No `.nvmrc`, and no other dependency or script changes (except adding the
    `server-only` package if the marker needs it).
- **README** replaces the create-next-app boilerplate, with:
  - A one-paragraph description of Science Nest (a booking frontend for a
    science tutor, without the tutor's name).
  - Prerequisites: Node.js 20.9 or later (matching `engines`) and a running
    Science Nest Django backend.
  - Setup: `npm install`, copy `.env.example` to `.env`, adjust the values.
  - Run: `npm run dev` (http://localhost:3000), plus `npm run build` /
    `npm start`.
  - Checks: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
  - A short env variable table: name, purpose, example.
  - A pointer to `CLAUDE.md` and `.claude/specs/` for architecture and the
    roadmap.
  - No Vercel/Geist boilerplate, and no mention of tests.
- **Scaffold cleanup**: delete `public/file.svg`, `public/globe.svg` and
  `public/window.svg`, which nothing references.

## Out of scope
- The server-only HTTP client (base URL from the env module,
  `Authorization: JWT <access>` header from the cookie, trailing-slash paths):
  spec 03 (backend-api-client). This spec only swaps the URL source in the two
  existing call sites. It doesn't refactor `login()` or the proxy onto a
  shared client.
- Changing token refresh behavior, cookie names, `maxAge` or flags: spec 02
  is implemented, and its behavior must not change.
- The `/login` page and form: spec 13 (login-page).
- Fonts, `app/globals.css` theme tokens, the favicon: spec 08 (design-theme).
- Root layout metadata and the title template: spec 10
  (app-shell-navigation).
- Replacing `app/page.tsx` and removing `public/next.svg` / `public/vercel.svg`,
  which the starter page still uses: spec 18 (home-page).
- Using `SITE_URL` for `metadataBase`, sitemap or robots: spec 19
  (public-seo-metadata).
- Any `NEXT_PUBLIC_` variable, or any client-side access to config.
- Deployment config, Docker, CI and `.nvmrc`.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
None. No routes are added or changed.

## Backend contract
No new endpoints. The two existing calls now build their URL from
`API_BASE_URL`:

- `POST {API_BASE_URL}/auth/jwt/create/`: username + password → `access`,
  `refresh`. On a 401, `login()` keeps returning
  `{ error: "Invalid username or password." }`, and any other failure keeps
  returning `{ error: "Something went wrong. Try again." }`.
- `POST {API_BASE_URL}/auth/jwt/refresh/`: refresh → `access` only. On a
  failure, `proxy.ts` keeps deleting both cookies and redirecting to `/login`.

Every documented path ends with a trailing slash. The base URL itself does
not.

## Behavior
- **Valid config:** with a correct `.env`, `npm run dev` and `npm run build`
  behave exactly as before. Login sets the same cookies, and an expired
  `access` cookie is still refreshed by the proxy.
- **Missing or invalid config:** because `next.config.ts` imports the env
  module, a missing, empty or non-URL value stops `npm run dev` at startup
  (before any request) and `npm run build` with the env module's readable
  error, not a network error from axios/fetch. For example:
  `Invalid environment variables: API_BASE_URL is required; SITE_URL must be an absolute http(s) URL. See .env.example.`
  Values are never echoed.
- **Normalization:** `API_BASE_URL=http://127.0.0.1:8000/` and
  `http://127.0.0.1:8000` both produce `http://127.0.0.1:8000/auth/jwt/create/`,
  with no double slash.
- **Client safety:** importing the app-facing env module from a
  `"use client"` file is a build error, not a silent `undefined`.
- **Git hygiene:** `git status` after creating `.env` doesn't show it, while
  `.env.example` shows up as a new file to commit.
- Loading or error UI and cache invalidation: not applicable.

## Time handling
Not applicable.

## UI notes
No UI changes. Removing the three SVGs must not change the starter home page,
which uses only `next.svg` and `vercel.svg`.

## Acceptance criteria
- [x] `.env.example` is tracked by git and lists `API_BASE_URL` and
      `SITE_URL`, each with a comment, placeholder value and format note
- [x] A local `.env` exists with working values, and `git status` doesn't
      list it
- [x] `git check-ignore .env .env.local .env.production` matches all three,
      and `git check-ignore .env.example` matches nothing
- [x] `.gitignore` covers `.next/`, `node_modules`, `*.tsbuildinfo`,
      `.vscode/`, `.idea/`, `.DS_Store`, `Thumbs.db` and
      `.claude/settings.local.json`
- [x] No `127.0.0.1:8000` is left in source or config files:
      `git grep -n "127.0.0.1:8000" -- . ":!.env.example" ":!*.md"` prints
      nothing. (`.env` is untracked. Markdown docs such as the README,
      CLAUDE.md and the specs may name it as the local default.)
- [x] `app/login/actions.ts` and `proxy.ts` both get the backend URL from the
      env module, and nothing reads `process.env.API_BASE_URL` directly
- [x] Login still works with the value from `.env`: calling `login()` with a
      valid student's credentials (from a temporary form or trigger, reverted
      afterwards, since `/login` UI comes in spec 13) sets the `access` and
      `refresh` cookies with unchanged options, and bad credentials return
      "Invalid username or password." _(verified in code — check in browser)_
- [x] Token refresh still works: after logging in, deleting the `access`
      cookie in DevTools and reloading any page brings back a new `access`
      cookie without a redirect. Corrupting the `refresh` cookie instead
      deletes both cookies and redirects to `/login`. _(verified in code — check in browser)_
- [x] With `API_BASE_URL` removed from `.env`, `npm run dev` fails at
      startup, before any request, with the env module's error naming
      `API_BASE_URL` and pointing to `.env.example`. It's not an axios/fetch
      network error, and no value is printed.
- [x] With `API_BASE_URL` empty, `npm run build` fails with the env module's
      error
- [x] With `API_BASE_URL=not-a-url`, the same checks report that it must be
      an absolute http(s) URL
- [x] With `API_BASE_URL=http://127.0.0.1:8000/` (trailing slash), login and
      refresh still hit `/auth/jwt/create/` and `/auth/jwt/refresh/` with no
      double slash _(verified in code — check in browser)_
- [x] Importing `lib/env.ts` temporarily from a `"use client"` component
      still fails `npm run build`. (Revert afterwards.)
- [x] In that failing build, `proxy.ts` doesn't appear in any `server-only`
      error trace
- [x] `proxy.ts` and `next.config.ts` import `lib/env-core.ts`, all other
      importers use `lib/env.ts`, and `lib/env.ts` only adds
      `import "server-only"` and re-exports
- [x] `package.json` and `package-lock.json` both have the name `science-nest`
- [x] `package.json` has `"engines": { "node": ">=20.9" }`, the README
      prerequisites say Node.js 20.9 or later, and there's no `.nvmrc`
- [x] README describes the app, prerequisites, setup (including copying
      `.env.example`), run and check commands, and the env variables, with no
      create-next-app, Vercel or Geist boilerplate left
- [x] `public/file.svg`, `public/globe.svg` and `public/window.svg` are gone,
      while `public/next.svg`, `public/vercel.svg` and `public/images/` remain
- [x] `http://localhost:3000` still renders the starter page with no broken
      images or console errors _(verified in code — check in browser)_
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- The current `.gitignore` has `.env*` with no exception, so `.env.example`
  can't be committed until the exception is added (in scope here).
- The current README describes Geist fonts and Vercel deployment. It is
  replaced here. Fonts change only in spec 08.
- CLAUDE.md › Architecture says the backend URL is hard-coded in
  `app/login/actions.ts` and `proxy.ts`. This spec makes it come from the env
  module. The roadmap and the Architecture line have already been updated to
  match.
- There's no `/login` page yet (spec 13), so login can only be checked by
  hand through a temporary trigger for `login()`.

## Open questions
None.
