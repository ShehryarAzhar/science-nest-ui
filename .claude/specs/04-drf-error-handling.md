# Spec 04: DRF Error Handling

- **Status:** Done
- **Created:** 2026-10-24
- **Completed:** 2026-10-24
- **Depends on:** 03-backend-api-client.md

## Summary
The Django backend reports failures in three DRF shapes: `{field: [msgs]}`,
`{non_field_errors: [msgs]}` and `{detail: "..."}`. The API client (spec 03)
passes them through unchanged inside `ApiError`. This spec adds one shared,
normalized error shape and the helpers that build it, plus a helper that puts
those errors onto a react-hook-form form: field messages under their inputs,
everything else as one form-level message. Every form spec (login, register,
booking and editing) then shows backend errors the same way, and students see
clear messages instead of raw JSON or a generic failure.

## User stories
- As a student, I want a rejected form to show the backend's message next to
  the field it's about, so that I know what to fix.
- As a student, I want messages that aren't about one field (for example "This
  timeslot is already booked." or a locked trial lesson) shown clearly above
  or below the form, so that I understand why my booking failed.
- As a student, I want a plain "couldn't reach the server" or "something went
  wrong" message when the backend is down or returns an error page, so that I
  never see raw JSON, HTML or stack traces.
- As a developer, I want one normalized error shape that a server action can
  return and a Client Component can read, so that every form handles backend
  errors the same way.

## Scope
- **Normalized error shape:** one exported, plain, serializable type (it can be
  returned from a server action and crosses to the client unchanged). It holds:
  - `status`: the HTTP status, or none for network and invalid-response
    failures
  - `fieldErrors`: a map from backend field name to a list of messages
  - `formErrors`: a list of messages not tied to one field (from
    `non_field_errors`, `detail`, or a fallback)
  - a `kind` that tells apart an HTTP error, a network failure and an invalid
    (non-JSON) response, mirroring `ApiError.kind`, plus `"unknown"` for
    anything thrown that isn't an `ApiError`
- **Normalizing a DRF body:** a pure function that turns any DRF error body
  into the shape above:
  - `{field: ["msg", …]}` → `fieldErrors[field]`
  - a field whose value is a single string instead of a list → one message
  - `non_field_errors` → `formErrors`
  - `detail` (a string) → `formErrors`. A body with a string `detail` is a
    detail response: only `detail` is used and its other keys (SimpleJWT's
    `code` and `messages`) are ignored
  - a top-level list of strings → `formErrors`
  - nested values (lists of objects or objects under a field, as DRF sends for
    nested or list serializers) → their strings are flattened into that
    field's messages, so nothing is silently dropped
  - an empty, missing or unrecognized body (not an object, list or string) →
    a fallback form message
  - non-string leaves (numbers, booleans, null) are ignored
- **Normalizing a thrown error:** a function that takes anything caught in a
  `try/catch`:
  - `ApiError` with `kind: "http"` and a JSON body → normalized from the body,
    keeping `status`
  - `ApiError` with `kind: "http"` and a non-JSON or empty body (for example an
    HTML 500 or 502 page) → the generic message, keeping `status`
  - `ApiError` with `kind: "network"` → the connection message, no status
  - `ApiError` with `kind: "invalid_response"` → the generic message
  - anything else (a bug, a plain `Error`) → `kind: "unknown"` and the generic
    message, with no details from the error exposed to the student
- **Fixed fallback messages** (exact wording):
  - generic: "Something went wrong. Try again." (the same text `login()`
    already returns)
  - network: "Couldn't reach the server. Check your connection and try again."
- **Usable on both sides:** the shape, the body normalizer and the
  react-hook-form helper work in Client Components and on the server. They
  aren't marked `server-only` and don't import the API client at runtime. Only
  the thrown-error normalizer depends on `ApiError`; if importing it would pull
  the server-only client into a client bundle, it lives on the server side and
  the rest stays shared.
- **react-hook-form mapping:** a helper that takes a form's `setError` (or the
  form), the normalized error and the list of field names the form has:
  - each backend field that matches a form field → `setError(field, …)` with
    all of its messages, one per line (for example joined with `"\n"`), never
    only the first and never merged into one sentence. DRF's password
    validators, for example, can send "too short", "too common" and "entirely
    numeric" together, and the student should see all three
  - an optional rename map for forms whose inputs don't use the backend names
    (for example a slot picker input standing for backend `day` + `time`, or
    `starts_at`)
  - `formErrors`, plus any backend field the form doesn't have, → one
    form-level error on react-hook-form's `root` key (for example
    `root.server`), so the message is never lost. When there are several
    form-level messages, they're all kept, one per line, the same way as
    field messages
  - form specs render field and form-level messages with line breaks
    preserved (for example `whitespace-pre-line`), so each message shows on
    its own line
  - the focus moves to the first field with an error, as react-hook-form does
    for its own validation
  - calling it clears the previous server form-level error first, so a fixed
    and resubmitted form doesn't show a stale message
- **Reading messages out:** small helpers, or documented access, to get the
  form-level message and to check whether a normalized error contains a given
  message, so later specs can spot "This timeslot is already booked." (25, 28)
  without parsing bodies again.
- **Login 401 rule (for spec 13):** a 401 from `POST /auth/jwt/create/`
  always shows `login()`'s own "Invalid username or password.", never
  SimpleJWT's `detail` text. It's clearer, and it doesn't reveal whether the
  username exists. Spec 13 must keep this when it builds the login form, even
  if it moves `login()` onto the normalized shape.
- **CLAUDE.md update:** "Installed but not yet wired up" notes that the
  react-hook-form error mapping now exists (forms and Zod schemas still don't),
  and Architecture gets a short note on where the normalized error lives and
  that form specs use it.

## Out of scope
- Building any form, page or Zod schema: login (13), register (14), booking
  and editing weekly classes (25, 26) and the trial lesson (28, 29).
- Changing `login()`'s return values or messages. It keeps `{ error }` until
  spec 13 decides how the login form uses the normalized shape.
- Redirecting on 401 and the friendly message for admin accounts on 403:
  spec 15 (student-access-guard). This spec keeps `status` so spec 15 can
  branch on it, but adds no redirects or 403 UI.
- Refetching availability after "This timeslot is already booked.": specs 25
  and 28. This spec only lets them detect the message.
- The locked trial lesson display: spec 31. Its 403 message reaches the form
  as a form-level error here; how it's shown beyond that is spec 31.
- Toasts and the toaster: spec 09. This spec doesn't show toasts.
- The route handler that forwards browser requests (spec 05) and normalizing
  errors that come back through it in the browser. If spec 05 needs the body
  normalizer on its responses, it reuses this one.
- Error pages and boundaries (`error.tsx`, `global-error.tsx`): spec 11.
- Translating or rewording backend messages: they're shown as the backend
  sends them.
- Changes to `ApiError` or the API client, other than its existing comment
  pointing here.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
None. No routes are added or changed.

## Backend contract
No endpoint is called by this spec. It handles the error formats CLAUDE.md
documents for every endpoint:

- **400 field errors:** `{"<field>": ["msg", …]}`, for example from
  `POST /auth/users/` (`username`, `email`, `password`, `phone_number`, …),
  `POST /classes/` (`subject`, `level`, `day`, `time`, `duration`) and
  `POST /trial-lessons/` (`subject`, `level`, `starts_at`).
- **400 non-field errors:** `{"non_field_errors": ["msg", …]}`, for example
  "This timeslot is already booked." from `/classes/` and `/trial-lessons/`.
- **`{detail}`:** 401 (no or invalid token, wrong credentials on
  `POST /auth/jwt/create/`), 403 (admin account without a Student profile, or a
  locked trial lesson with a message), 404 (unknown subject slug or id).
- Input arrives as spec 03's `ApiError`: `kind`, `status`, `body` (DRF JSON as
  sent) and `nonJson`.

## Behavior
- **Field error:** a 400 `{"phone_number": ["Enter a valid phone number."]}`
  normalizes to `fieldErrors.phone_number = ["Enter a valid phone number."]`,
  no form errors, `status` 400. Mapped onto a form with a `phone_number`
  input, the message shows under that input and the input is focused.
- **Several messages for one field:** a 400 `{"password": ["This password is
  too short. …", "This password is too common.", "This password is entirely
  numeric."]}` keeps all three in `fieldErrors.password`. Mapped onto a form,
  all three show under the password input, each on its own line. Several
  form-level messages show the same way.
- **Several fields:** each matching input gets its own message. The first
  input with an error gets focus.
- **Non-field error:** `{"non_field_errors": ["This timeslot is already
  booked."]}` normalizes to `formErrors = ["This timeslot is already
  booked."]`. Mapped onto a form, it appears as the form-level error and no
  input is marked.
- **Detail:** `{"detail": "..."}` becomes one form-level message, keeping its
  `status` (401, 403 or 404).
- **SimpleJWT detail:** a 401 `{"detail": "Given token not valid for any token
  type", "code": "token_not_valid", "messages": [...]}` becomes only the
  `detail` message. `code` and `messages` aren't shown.
- **Unknown field:** a backend field the form doesn't have (and that isn't in
  the rename map) is shown in the form-level error, so it's never dropped.
- **Mixed:** a body with both field errors and `non_field_errors` sets both the
  field messages and the form-level error.
- **Backend down or timeout:** the network message as the form-level error, no
  field marked.
- **HTML error page, empty body or invalid JSON:** the generic message as the
  form-level error, `status` kept when there was one.
- **Unexpected exception:** the generic message. The exception's text,
  stack or any token never reaches the student.
- **Resubmitting:** the previous server form-level error is cleared before the
  new result is applied. Field errors are cleared by react-hook-form when the
  field changes or the form revalidates, as usual.
- **Client validation:** not applicable here. Zod schemas belong to each form
  spec, and should match the backend so server field errors are rare.
- **Auth and redirects:** none. 401 and 403 are only normalized; spec 15
  decides what happens.
- **Cache invalidation:** not applicable (no mutations).
- **Loading, empty and success states:** not applicable (no UI).

## Time handling
Not applicable. Messages are shown as the backend sends them; this spec
doesn't parse or convert dates or times.

## UI notes
No visible UI is added. The helpers only set react-hook-form errors; each form
spec renders field messages and the form-level message with its own
components, using the destructive token for error text (never eosin, which is
not for errors). Error messages should be paired with an icon or text, not
colour alone, as the Design section requires.

## Acceptance criteria
Check these with a temporary page and client form (reverted afterwards) that
calls a temporary server action, or with temporary calls to the helpers.

- [x] Normalizing `{"username": ["A user with that username already exists."]}`
      with status 400 gives that message under `fieldErrors.username`, no form
      errors and status 400
- [x] Normalizing `{"email": "Enter a valid email address."}` (a string, not a
      list) gives one message under `fieldErrors.email`
- [x] Normalizing `{"non_field_errors": ["This timeslot is already booked."]}`
      gives that message in `formErrors` and no field errors
- [x] Normalizing `{"detail": "Authentication credentials were not provided."}`
      with status 401 gives that message in `formErrors` and status 401
- [x] Normalizing a body with nested field errors (for example
      `{"subject": {"id": ["Invalid pk."]}}`) keeps the message under
      `fieldErrors.subject`
- [x] Normalizing `null`, `{}`, a number or an empty body gives the generic
      message "Something went wrong. Try again."
- [x] An `ApiError` from a real `POST /auth/users/` with an existing username
      normalizes to a `fieldErrors.username` message from the backend _(verified in code — check in browser)_
- [x] An `ApiError` from a real `POST /classes/` on a taken slot normalizes to
      a form-level "This timeslot is already booked." with status 400, and the
      "contains message" helper finds it _(verified in code — check in browser)_
- [x] With the backend stopped, a caught `ApiError` normalizes to "Couldn't
      reach the server. Check your connection and try again." with no status _(verified in code — check in browser)_
- [x] A caught plain `Error("secret detail")` normalizes to the generic
      message, and "secret detail" doesn't appear in what the student sees
- [x] The normalized result returned from a server action reaches the Client
      Component intact (no serialization error, same contents) _(verified in code — check in browser)_
- [x] Mapping a `phone_number` field error onto a temporary react-hook-form
      form shows the message under the phone input and focuses it _(verified in code — check in browser)_
- [x] Mapping a field error with two messages onto a temporary form shows
      both messages under that input, on separate lines _(verified in code — check in browser)_
- [x] Mapping errors for two fields shows both messages, and focus goes to the
      first of them _(verified in code — check in browser)_
- [x] Mapping `non_field_errors` shows one form-level message and marks no
      input _(verified in code — check in browser)_
- [x] Mapping an error for a backend field the form doesn't have shows it in
      the form-level message _(verified in code — check in browser)_
- [x] With a rename map (for example backend `time` → form `slot`), the `time`
      message shows under the `slot` input _(verified in code — check in browser)_
- [x] Submitting again after a form-level server error clears the old message
      before the new result is shown _(verified in code — check in browser)_
- [x] The shared helpers can be imported from a `"use client"` component and
      `npm run build` still passes (no `server-only` error)
- [x] `login()` still returns "Invalid username or password." and "Something
      went wrong. Try again." exactly as before
- [x] CLAUDE.md's "Installed but not yet wired up" and Architecture describe
      the normalized error and the react-hook-form mapping
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- `ApiError` lives in `lib/api-client.ts`, which is `server-only`. Client
  Components can't import it at runtime, so the thrown-error normalizer that
  uses `instanceof ApiError` must stay on the server side (or check the error
  without importing the class), while the shape, body normalizer and form
  helper stay shared. The plan must keep the client bundle free of the API
  client.
- CLAUDE.md says forms use react-hook-form + Zod but that "no form schemas"
  exist yet. This spec adds form error mapping before any form exists; the
  first real use is spec 13.
- `login()` returns `{ error: string }` rather than the normalized shape. It's
  left alone here so its behavior stays as spec 03 fixed it; spec 13 may move
  it onto the normalized shape.
- CLAUDE.md documents only `{detail}`, but SimpleJWT's 401 for a bad token
  also sends `code` and `messages`. Taken literally, the body rules would show
  them as unknown fields. Resolved in planning: a body with a string `detail`
  uses only `detail`.
- `kind` mirrors `ApiError.kind`, which has no value for an unexpected throw
  (not an `ApiError`). Resolved in planning: a fourth kind, `"unknown"`.

## Open questions
None.
