# Spec 20: Account Page

- **Status:** Done
- **Created:** 2026-10-28
- **Completed:** 2026-10-28
- **Depends on:** 15-student-access-guard.md

## Summary
A read-only `/account` page that shows the logged-in user's details from
`GET /auth/users/me/`: username, email, name and phone number. Students can
check what they registered with, especially the phone number and email the
tutor uses to send meeting links. The app doesn't support profile editing,
so the page says how to get details changed instead of offering a form.

## User stories
- As a student, I want to see the details I registered with so that I can
  check the tutor has the right phone number and email for meeting links.
- As a student, I want to know how to get a wrong detail changed, since I
  can't edit it myself.
- As a student whose session has expired, I want to be taken to log in and
  brought back to my account page.
- As someone logged in with an admin account, I want the page to show my
  details without errors, even though I have no phone number.

## Scope
- A new student route `/account` (already protected by `proxy.ts`, linked
  from the header nav, and disallowed in `robots.ts`).
- A server-side read of `GET /auth/users/me/` through the API client in
  student mode, inside `<Suspense>` (Cache Components), with a runtime Zod
  check of the response shape.
- Read-only display of username, email, full name (first + last) and phone
  number.
- A short note under the details saying how to get them changed, with no
  contact details: "To change these details, ask your tutor."
- Admin accounts (`phone_number: null`): the same page with their details
  and no phone row. This is not treated as "Student account needed".
- Blank `first_name`/`last_name` (possible on admin accounts): the name row
  shows a muted "Not set". When only one is set, it's shown alone.
- Session and access handling through the student access guard (spec 15):
  401 → `SessionExpiredRedirect`, 403 (not expected from this endpoint) →
  `StudentAccountNeeded`, both through `studentAccessFallback()`.
- Every other failure (backend down, timeout, 5xx, invalid response) shows
  an inline error panel with Try again, through a segment-level `catchError`
  error boundary (like `SubjectsErrorBoundary`). The heading and the rest of
  the shell stay up.
- A segment loading state for the details while they load (static, no pulse
  or spinner, per Motion).
- Page metadata: title "Account" (through the root title template) and
  `robots: { index: false }`.
- CLAUDE.md update: a short Architecture note on the account page (server
  read, admin handling, error boundary).

## Out of scope
- Editing the profile, changing or resetting the password (not supported by
  the app, per CLAUDE.md).
- A logout button on the page: the header already has one (spec 12).
- Showing schedule, bookings or weekly cost: dashboard (spec 21).
- Adding `/auth/users/me/` to the student API proxy or fetching it in the
  browser with TanStack Query: the page reads it on the server.
- Reformatting the phone number by country or loading
  `react-phone-number-input`/`libphonenumber-js` here: they stay on
  `/register` only (spec 14). The stored value is shown as sent.
- Hiding the Account nav link for admin accounts (spec 10, unchanged).
- Changes to the student access guard itself (spec 15).
- Tests of any kind (per CLAUDE.md).

## Routes and pages
- `/account` (student; guests are redirected to `/login?next=/account` by
  `proxy.ts`, spec 07): page heading "Account", then the details list and
  the change note, or the guard's fallback, or the inline error panel.

## Backend contract
- `GET /auth/users/me/` (student mode, `Authorization: JWT <access>`)
  - Response fields used: `username`, `email`, `first_name`, `last_name`
    (strings), `phone_number` (string, or `null` for admin accounts).
    Read-only.
  - 401 (token missing or rejected): student access guard, session-expired
    flow.
  - 403 `{detail}`: not documented for this endpoint; if it ever arrives,
    the guard shows "Student account needed".
  - Network failure, timeout, non-JSON error page, 5xx, or a 2xx that fails
    the Zod check: inline error panel. The backend's message, the error's
    own text and any digest are never shown.
- No 400 or field errors apply (nothing is sent).

## Behavior
1. **Guest:** `proxy.ts` redirects to `/login?next=/account`; after logging
   in, the user lands back on `/account`.
2. **Loading:** the page heading renders at once. The details area shows a
   static placeholder of the same size until the read finishes.
3. **Student, success:** shows username, email, name and phone number, then
   the note "To change these details, ask your tutor."
4. **Admin account (`phone_number: null`):** shows username, email and name
   (or "Not set"), with no phone row, and the same note. No "Student account
   needed" message.
5. **Session gone (401):** `SessionExpiredRedirect` replaces the content. It
   clears both cookies and goes to `/login?expired=1&next=/account`, with
   the session-expired notice.
6. **403:** `StudentAccountNeeded` replaces the content.
7. **Other failures:** the inline panel "Account details couldn't be loaded"
   with "Please try again in a moment." and a Try again button. Try again
   re-runs the read. A successful retry shows the details.
8. **Freshness:** the read is never cached across requests or users. Each
   visit to the page reads the current values.
9. Nothing is editable: the values are plain text (selectable), with no
   inputs, forms or edit links.

## Time handling
Not applicable.

## UI notes
- Use the frontend-design skill before writing the UI, within the Design
  section: functional page, clarity first, no decoration, no hex lattice,
  no illustration. Theme tokens only.
- Layout: the functional page width (max 72rem, 16px mobile gutter), heading
  "Account" in the heading font, then one bordered surface card (16px
  radius, no shadow) with a description list (`<dl>`): label in
  muted-foreground, value in foreground. Labels: Username, Email, Name,
  Phone. On mobile each label sits above its value. From `sm` up they can
  sit side by side.
- Long values (email, username) wrap or break, never overflow the card at
  375px.
- Phone number in `tabular-nums`.
- "Not set" in muted-foreground, so it doesn't read as a real value.
- The change note is muted body text below the card, with no icon and no
  alert role.
- Error panel: same treatment as the subjects error panel (icon + heading +
  text, `role="alert"`, a 44px Try again button). It sits below the page
  heading and doesn't add its own `h1`.
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] As a guest, opening `/account` redirects to `/login?next=%2Faccount`, and logging in returns to `/account` _(verified in code — check in browser)_
- [x] As a student, `/account` shows the username, email, full name and phone number from `GET /auth/users/me/` _(verified in code — check in browser)_
- [x] The note "To change these details, ask your tutor." appears below the details _(verified in code — check in browser)_
- [x] No inputs, edit buttons or forms appear on the page _(verified in code — check in browser)_
- [x] Logged in as an admin account (`phone_number` null), the page shows their details without a phone row and without "Student account needed" _(verified in code — check in browser)_
- [x] An account with blank first and last names shows "Not set" in muted text for Name _(verified in code — check in browser)_
- [x] With a forged `access` cookie that Django rejects, the page ends on `/login?expired=1&next=%2Faccount` with the session-expired notice, and both cookies are gone _(verified in code — check in browser)_
- [x] With Django stopped, the page shows the heading and the "Account details couldn't be loaded" panel, with no error text, digest or backend message _(verified in code — check in browser)_
- [x] After restarting Django, Try again shows the details without a full reload _(verified in code — check in browser)_
- [x] Changing a detail in the Django admin and reloading `/account` shows the new value _(verified in code — check in browser)_
- [x] A long email doesn't overflow the card at 375px wide _(verified in code — check in browser)_
- [x] The page looks right in light and dark themes and at 375px wide _(verified in code — check in browser)_
- [x] The browser tab title is "Account · Science Nest" (per the root title template) and the page has a `noindex` robots meta tag _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture describes the account page
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Admin accounts get 200, not 403:** spec 15 assumes every student page
  shows "Student account needed" to admin accounts, but
  `GET /auth/users/me/` returns 200 for them (with `phone_number: null`).
  Decided with the user: `/account` shows an admin's details (no phone row)
  instead of the guard's message. Admins see a working Account page and a
  "Student account needed" dashboard.
- **Error handling differs from the guard's server pattern:** spec 15's
  server pattern rethrows non-access errors, which would reach
  `app/error.tsx`. Decided with the user: those errors go to an inline
  panel through a segment error boundary instead, as on `/subjects`.
- **Guard states carry their own layout and `h1`** (decided while
  planning): `StudentAccountNeeded` and `SessionExpiredRedirect` are
  full-page states, so the "Account" heading can't sit in a static shell
  above them. It's rendered by the Suspense fallback, the details and the
  error panel instead. The heading still shows at once, because the fallback
  is prerendered.
- **No `loading.tsx`** (decided while planning): a route `loading.tsx` would
  replace the heading (Behavior 2). The loading state is the page's own
  Suspense fallback.
- **Error panel frame** (decided while planning): reuses `SubjectsPanel`
  from `app/subjects/` as it is. Moving or renaming it is out of scope.
- **Blank email** (decided while planning): admin accounts can have an empty
  email, which Scope doesn't cover. It gets the same muted "Not set" as a
  blank name.

## Open questions
None.
