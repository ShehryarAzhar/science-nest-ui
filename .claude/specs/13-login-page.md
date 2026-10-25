# Spec 13: Login Page

- **Status:** Done
- **Created:** 2026-10-26
- **Completed:** 2026-10-26
- **Depends on:** 04-drf-error-handling.md, 07-route-protection.md, 10-app-shell-navigation.md

## Summary
Students need a page where they can sign in with their username and password
to reach their dashboard and bookings. This spec builds the `/login` form
(react-hook-form + Zod) on top of the existing `login()` server action. It
shows field and credential errors through the shared normalized error shape.
After signing in, it sends the student back to the page they were trying to
open (the `next` value spec 07 saves) or to `/dashboard`.

## User stories
- As a guest, I want to log in with my username and password so that I can
  see my schedule and book classes.
- As a guest sent to `/login` from a student page, I want to land back on that
  page after logging in so that I don't have to find it again.
- As a guest, I want a clear message when my username or password is wrong or
  a field is empty, so that I know what to fix.
- As a guest without an account, I want a link to registration so that I can
  sign up instead.
- As a keyboard or screen-reader user, I want labelled fields and errors that
  are announced and tied to their inputs, so that I can log in without seeing
  the screen.

## Scope
- **`/login` page** inside the app shell's `<main>`: a heading, the vertical
  logo (CLAUDE.md › Design › Logo: "13 and 14 use the vertical logo"), the
  login form, and a "Register" link to `/register` for guests without an
  account.
- **Login form** (Client Component, react-hook-form + Zod):
  - fields: username and password, each with a visible label
  - `autocomplete="username"` and `autocomplete="current-password"`, password
    input of type `password`
  - a show/hide password toggle (an icon button with an accessible name that
    reflects its state)
  - a submit button "Log in" that is disabled and reads "Logging in…" while
    the request is pending, so a double-click doesn't send two requests
  - client-side Zod validation, per field, on submit (see Behavior)
  - backend errors mapped with `applyServerErrors()`: field messages under
    their inputs, everything else in one form-level message above the submit
    button, rendered with `whitespace-pre-line`
- **`login()` action changes** (`app/login/actions.ts`):
  - takes the `next` value alongside the credentials
  - on failure returns the normalized error (`NormalizedError`) instead of
    `{ error: string }`, using `normalizeApiError()`, so 400 field errors reach
    their inputs
  - keeps the spec 04 rule: a 401 from `POST /auth/jwt/create/` always becomes
    the form-level message "Invalid username or password.", never SimpleJWT's
    `detail`
  - on success redirects to the validated `next`, or `/dashboard` when `next`
    is missing or invalid. Validation happens on the server, never trusting
    the client
  - cookie names and options stay exactly as they are
- **Return-path validation:** `next` is used only if it's a same-site path:
  it starts with a single `/`, doesn't start with `//` or `/\`, contains no
  scheme or host, and isn't `/login` or `/register` (or anything under them).
  Anything else falls back to `/dashboard`. This prevents an open redirect
  through a crafted `/login?next=https://…` link.
- **Page title** "Log in" through the site-wide title template from spec 10.
- **shadcn components** the form needs that aren't installed yet (for example
  `input` and `label`, or `field`), added with `npx shadcn add` and restyled to
  the theme tokens like the existing ones.
- **CLAUDE.md updates:** Auth flow step 1 (the action now redirects to `next`
  or `/dashboard`, not `/`, and returns the normalized error), Backend errors
  (the login form is the first user of `applyServerErrors()`), and "Installed
  but not yet wired up" (react-hook-form and Zod now have a form and schema).

## Out of scope
- The registration page and its form: spec 14. The "Register" link may point
  at a 404 until spec 14 lands.
- Handling 401 and 403 from student endpoints (sending to `/login`, the
  friendly admin-account message): spec 15. An admin account can log in here
  and is sent to `/dashboard` like anyone else; spec 15 shows them the
  friendly message there.
- Redirect rules for guests on student routes and logged-in users on `/login`:
  already done in spec 07 (`proxy.ts`). This spec doesn't change them.
- Token refresh: spec 02.
- Logout: spec 12.
- Password reset, "forgot password", password change, "remember me", social
  login and email login: none exist in the backend or the app.
- A "your session has expired" banner: the proxy's redirect doesn't say why
  the guest was sent to `/login`, so there's nothing reliable to show.
- The dashboard itself: spec 21. Until it exists, a successful login with no
  `next` lands on a 404 at `/dashboard`.
- SEO metadata beyond the page title (descriptions, Open Graph, robots):
  spec 19.

## Routes and pages
| Route | Access | Shows |
|---|---|---|
| `/login` | Guests only (spec 07 redirects logged-in users to `/dashboard`) | Heading, vertical logo, login form, link to `/register` |
| `/login?next=<path>` | Guests only | Same page; after logging in the student goes to `<path>` if it's valid |

## Backend contract
**`POST /auth/jwt/create/`** (public, through the API client in `auth: "public"`
mode, called only from the server action)

- Request body: `{ username, password }`
- Response used: `access`, `refresh` (stored as httpOnly cookies, unchanged
  from today)
- Errors to handle:
  - **400** `{field: [msgs]}` (for example a blank `username` or `password`)
    → messages under the matching input
  - **400** `non_field_errors` → form-level message
  - **401** `{detail}` (wrong username or password, or an inactive account) →
    always the form-level "Invalid username or password."
  - Any other `{detail}` (for example a throttled 429) → form-level message
    with the `detail` text
  - Network failure or timeout → "Couldn't reach the server. Check your
    connection and try again."
  - Non-JSON error page, invalid response or unexpected error → "Something went
    wrong. Try again."

No other endpoint is used. The page doesn't call `GET /auth/users/me/`.

## Behavior
1. **Opening the page.** A guest opens `/login` (directly, from the header's
   "Log in" link, or redirected from a student page with `?next=…`). A
   logged-in user never sees the page; spec 07 redirects them to `/dashboard`.
2. **Reading `next`.** The page reads `next` from the URL and passes it to the
   action with the credentials. With Cache Components on, reading search
   params is dynamic access: the part of the page that reads it must sit
   inside `<Suspense>` (or read it on the client), so the rest of the page
   still renders statically. The fallback must not shift the layout or show a
   spinner.
3. **Client validation (Zod), on submit, then per field as the user fixes
   it:**
   - username: required, "Enter your username." Not trimmed or changed; sent
     exactly as typed (Django usernames are case-sensitive)
   - password: required, "Enter your password." Never trimmed
   - no length or format rules: the backend doesn't apply any at login, and
     extra rules could lock out a valid account
   - an invalid form doesn't call the action; the first invalid field gets
     focus
4. **Submitting.** The button disables and reads "Logging in…". Fields stay
   editable but a second submit can't start while one is pending. No spinner
   or progress animation (CLAUDE.md › Motion).
5. **Success.** The action sets the cookies and redirects to the validated
   `next` or `/dashboard`. The header switches to the student links on the
   next render (it reads the `access` cookie). The password is never kept in
   the URL, logs, or client state after the request.
6. **Failure.** The action returns the normalized error. The form:
   - clears the previous server message first, so a fixed resubmit doesn't
     show a stale one
   - puts field messages under their inputs and the rest in the form-level
     message (`role="alert"` or equivalent, so it's announced)
   - on "Invalid username or password." keeps the username, clears the
     password and focuses the password field
   - keeps everything the user typed for any other error
7. **Field errors** are linked to their inputs (`aria-invalid` and
   `aria-describedby`) and shown in destructive text, paired with the message
   so it's never colour alone.
8. **No TanStack Query cache work.** Login doesn't invalidate or clear any
   queries: a guest has no student data cached, and logout already clears the
   cache (spec 12).
9. **JavaScript.** The form needs JavaScript (react-hook-form). Without it, the
   page shows the form but submitting does nothing harmful; this is accepted.

## Time handling
Not applicable.

## UI notes
- Functional page: clarity first, no hex lattice, no images, no decoration
  (CLAUDE.md › Design › Motif and Images).
- A single centred panel, max width about 24rem, on the background colour.
  The panel is a surface card with a border and 16px radius, no shadow.
  Vertical logo at the top, then the heading "Log in" in Source Serif 4 (600),
  then the form.
- The header already shows the logo, and the page adds the vertical logo
  above the form. On phones and short laptop screens this could push the form
  or the "Log in" button below the fold, as happened on the not-found page.
  Use the frontend-design skill to decide how the vertical logo works with the
  header logo and on small screens (keep, shrink or hide it), so the heading,
  both fields and the "Log in" button are visible without scrolling.
- Inputs and the button use the 10px radius; the button is the primary fill
  and full width. Primary ring on focus.
- Labels sit above inputs. Errors go directly under their input in
  destructive text (14px). The form-level message sits above the submit
  button, in destructive text with an alert icon (lucide), not a toast.
- The show/hide toggle sits inside the password input's right edge (lucide
  `Eye` / `EyeOff`) with a 150ms state change only.
- Under the form, one line: "New to Science Nest?" with a "Register" link in
  primary.
- No all-caps labels, no eyebrow labels, no `→` in the button.
- Mobile: the panel fills the width inside the 16px gutter and keeps the same
  order. Inputs are at least 16px text so iOS doesn't zoom on focus.
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] As a guest, `/login` shows the vertical logo, a "Log in" heading, labelled username and password fields, a "Log in" button and a "Register" link to `/register` _(verified in code — check in browser)_
- [x] The browser tab title is "Log in" with the site-wide title template _(verified in code — check in browser)_
- [x] Submitting the empty form shows "Enter your username." and "Enter your password." under the fields, focuses the username field, and sends no request _(verified in code — check in browser)_
- [x] Typing in a field with an error clears that field's message once it's valid _(verified in code — check in browser)_
- [x] The show/hide toggle switches the password between hidden and visible, and its accessible name changes with it _(verified in code — check in browser)_
- [x] A wrong username or password shows "Invalid username or password." above the button, keeps the username, clears the password and focuses it _(verified in code — check in browser)_
- [x] While logging in, the button is disabled and reads "Logging in…"; a double-click sends only one request _(verified in code — check in browser)_
- [x] Correct credentials with no `next` set the `access` and `refresh` httpOnly cookies and land on `/dashboard` _(verified in code — check in browser)_
- [x] Opening `/dashboard` as a guest, then logging in, lands back on `/dashboard` _(verified in code — check in browser)_
- [x] Opening `/classes/new?subject=3` as a guest, then logging in, lands on `/classes/new?subject=3` _(verified in code — check in browser)_
- [x] `/login?next=https://example.com`, `/login?next=//example.com` and `/login?next=/\example.com` all land on `/dashboard` after logging in _(verified in code — check in browser)_
- [x] `/login?next=%2Fregister` lands on `/dashboard` after logging in _(verified in code — check in browser)_
- [x] After logging in, the header shows the student links (Subjects, Dashboard, Account, Log out) _(verified in code — check in browser)_
- [x] With the backend stopped, submitting shows "Couldn't reach the server. Check your connection and try again." and keeps both fields' values _(verified in code — check in browser)_
- [x] Logged in, opening `/login` still redirects to `/dashboard` (spec 07 unchanged) _(verified in code — check in browser)_
- [x] Field errors are announced by a screen reader and tied to their inputs (`aria-invalid`, `aria-describedby`); the form-level message is announced when it appears _(verified in code — check in browser)_
- [x] The page works and reads correctly in light and dark themes and at 360px wide, with no horizontal scroll _(verified in code — check in browser)_
- [x] On common desktop, laptop and mobile screen sizes, the heading, both fields and the "Log in" button are visible without scrolling (with the on-screen keyboard closed) _(verified in code — check in browser)_
- [x] No tutor name or photo appears on the page _(verified in code — check in browser)_
- [x] CLAUDE.md Auth flow, Backend errors and "Installed but not yet wired up" reflect the new login behavior
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- `app/login/actions.ts` redirects to `/` after logging in and CLAUDE.md
  (Auth flow step 1) documents that. The roadmap says spec 13 redirects to the
  return path or `/dashboard`. This spec changes the action and CLAUDE.md to
  match the roadmap.
- `login()` returns `{ error: string }`, which can't carry 400 field errors.
  Spec 04 left this for spec 13 to decide. This spec moves it to the
  normalized error shape and keeps the 401 message rule.
- `/dashboard` (spec 21) and `/register` (spec 14) don't exist yet, so the
  default redirect and the "Register" link land on the not-found page until
  those specs are built.

## Open questions
None.
