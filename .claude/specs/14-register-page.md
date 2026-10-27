# Spec 14: Register Page

- **Status:** Done
- **Created:** 2026-10-26
- **Completed:** 2026-10-27
- **Depends on:** 04-drf-error-handling.md, 07-route-protection.md, 09-query-provider.md, 10-app-shell-navigation.md, 13-login-page.md

## Summary
New students need a way to create an account before they can book a trial
lesson or weekly classes. This spec builds the `/register` page: a form
(react-hook-form + Zod) that posts to `POST /auth/users/` through a server
action. It includes an international phone field with a searchable country
selector and real per-country validation, and it sends the number in E.164.
After registering, the student is sent to `/login` with a success notice and
their username filled in, and logs in there.

## User stories
- As a guest, I want to create an account with my name, username, email,
  phone number and password so that I can book lessons.
- As a guest outside the tutor's country, I want to pick my country and type
  my local number so that I don't have to work out the international format
  myself.
- As a guest, I want to know straight away when my phone number isn't valid
  for my country, or when my two passwords don't match, so that I can fix it
  before submitting.
- As a guest, I want the backend's reasons (username taken, password too
  common) shown next to the field they belong to, so that I know what to
  change.
- As a guest who just registered, I want to land on the login page with my
  username already filled in and a clear "account created" message, so that I
  know it worked and can log in at once.
- As a guest sent to `/login` from a student page, I want that return path
  kept if I register first, so that I end up where I was going.
- As a keyboard or screen-reader user, I want every field, the country list
  and every error to be labelled and announced, so that I can register without
  seeing the screen.

## Scope
- **`/register` page** inside the app shell's `<main>`: the vertical logo
  (CLAUDE.md › Design › Logo: "13 and 14 use the vertical logo"), the heading
  "Create your account", the form, and a line "Already have an account?" with
  a "Log in" link to `/login`.
- **Register form** (Client Component, react-hook-form + Zod, following the
  login form's pattern: Zod schema shared with the action, `Field` /
  `FieldError`, a `role="alert"` form-level message above the submit button):
  - first name (`autocomplete="given-name"`)
  - last name (`autocomplete="family-name"`)
  - username (`autocomplete="username"`, no auto-capitalise or spellcheck)
  - email (`type="email"`, `autocomplete="email"`)
  - phone number: country selector + national number input (see Phone field)
  - password (`autocomplete="new-password"`) with the show/hide toggle from
    the login form
  - confirm password (`autocomplete="new-password"`) with its own show/hide
    toggle; checked in the browser only, never sent to the backend
  - a submit button "Create account" that is disabled and reads "Creating
    account…" while pending
- **`register()` server action**: re-checks the input with the shared schema
  (without the confirm field), re-validates the phone number and its E.164
  form on the server, posts to `POST /auth/users/` in `auth: "public"` mode,
  and on success redirects to `/login` (see Behavior › Success). On failure
  returns `normalizeApiError()`'s `NormalizedError`. Doesn't set any cookies.
- **Phone field** (the main new piece):
  - built on `react-phone-number-input` with `libphonenumber-js`, both
    actively maintained. Its peer range (`react >=16.8`) covers React 19; the
    plan confirms it builds and runs under React 19.3 and Next 16.4 (Client
    Component only, no SSR issues, no hydration warnings)
  - the library's default country control is a native `<select>` without
    search, so the spec requires a custom country selector built on Base UI's
    Combobox (`@base-ui/react`, already installed; via `npx shadcn add` if a
    base-vega `combobox` exists, restyled to the tokens). No Radix-based
    "shadcn phone input" snippets
  - the selector lists every country the library supports, each with its
    flag, English name and calling code (e.g. "Pakistan +92"). Search matches
    the country name, ISO code and calling code (typing "92", "+92", "pak" or
    "PK" finds Pakistan)
  - the number input formats as the student types (the library's "as you
    type" formatting) for the selected country
  - typing a full international number starting with `+` switches the
    selector to the matching country
  - with no country selected, the input is treated as international only
    when the student types a leading `+`. Digits without a `+` don't
    auto-select a country (the library's default would prepend a `+` and
    guess one from the digits); they wait until a country is chosen, which
    then reads them as that country's number
  - validation uses the library's full metadata (`max`), which checks real
    number patterns per country, not only length
  - the value submitted is E.164 (e.g. `+923001234567`), which satisfies the
    backend rule (optional `+` then 7–15 digits)
  - **flags are bundled** from the `country-flag-icons` SVGs the library
    ships (passed in explicitly). No request to any external flag CDN; the
    library's default flag URL must not be used
  - the library's own stylesheet isn't imported. Every part is styled with
    the theme tokens (input, border, ring, popover surface, elevation, 10px
    radius; no new colours, radii or motion)
  - **only the register page loads it**: the phone library, its metadata and
    the flags are imported only from the `/register` route's code, so no
    other page's JavaScript grows. A shared, generic Combobox UI component in
    `components/ui/` is fine; anything phone-specific lives with the register
    page
- **Default country (decision, revised):** preselect the country of the
  browser's time zone (`Asia/Karachi` → Pakistan), looked up in a bundled
  time-zone → country table (`countries-and-timezones`, about 10 kB gzipped,
  register page only). A zone shared by several countries (`Europe/London`:
  GB, GG, IM, JE) takes the one the browser's language region names, else
  its main country. A zone with no country (`UTC`) falls back to the region
  of the first preferred language that has one (`en-GB` → United Kingdom);
  with neither, preselect nothing: the selector shows "Country" and the
  student picks one, or types a `+` number. Reasons:
  - the time zone follows where the student is far more often than the
    language setting does (many browsers in Pakistan are set to `en-GB` or
    `en-US`, which made the first, language-only rule preselect the UK)
  - no geo-IP lookup: no external request, and the student's IP isn't sent
    to a third party
  - a language without a region isn't expanded to a guessed one (`en` would
    become US), because a confident wrong default is worse than an empty one
  - a wrong guess is visible (flag and name in the selector) and corrected in
    one step, and the invalid-number message names the country, so the
    student sees why
  - the guess runs on the client after mount, so the static page and the
    server HTML stay the same for everyone (no hydration mismatch); it never
    overrides a country the student already picked
- **Login page changes (small):**
  - shows a one-time success notice and prefills the username when arriving
    from a successful registration (see Behavior › Success)
  - its "Register" link carries the current `next` value to `/register`, so a
    guest sent to `/login?next=/classes/new` who registers first still ends
    up there after logging in
  - `/login` stays statically rendered: anything it reads from the URL is
    read on the client (after mount, or at submit time as today), never during
    the server render
- **Page title** "Register" through the site-wide title template.
- **CLAUDE.md updates:** in Architecture, record that registering doesn't
  log the student in (the app sends them to `/login` with a notice and the
  username prefilled), and describe the register page and phone field (where
  the phone code lives, that it's register-only, flags bundled, E.164).

## Out of scope
- Logging the student in automatically after registering: decided against;
  they log in on `/login` (spec 13's form, unchanged apart from the notice,
  prefill and `next` link).
- Email activation, resend-activation or "check your email" screens: the
  backend doesn't enable Djoser's `SEND_ACTIVATION_EMAIL`, so new users are
  active immediately and can log in right after registering.
- Profile editing, password change, password reset: not in the app.
- The account page showing these fields: spec 20.
- Handling 401 and 403 from student endpoints: spec 15.
- Redirects for logged-in users on `/register` and guests on student routes:
  already done in spec 07 (`proxy.ts`); unchanged.
- Client-side password strength rules or a strength meter: the backend's
  password validators are the only rules (see Behavior).
- Checking username or email availability while typing: no such endpoint.
- Phone verification by SMS or OTP: no backend support.
- Reusing the phone field elsewhere: no other page edits a phone number.
- SEO metadata beyond the page title: spec 19.

## Routes and pages
| Route | Access | Shows |
|---|---|---|
| `/register` | Guests only (spec 07 redirects logged-in users to `/dashboard`) | Vertical logo, heading, register form, link to `/login` |
| `/register?next=<path>` | Guests only | Same page; `next` is passed on to `/login` after registering |
| `/login` (after registering) | Guests only | Spec 13's page with a success notice and the new username filled in |

## Backend contract
**`POST /auth/users/`** (public, through the API client in `auth: "public"`
mode, called only from the server action)

- Request body: `{ username, email, password, first_name, last_name,
  phone_number }`, with `phone_number` in E.164. The confirm-password value is
  never sent.
- `phone_number` rule on the backend: an optional `+` followed by 7–15
  digits, with no surrounding whitespace. No country restriction, and it is
  not unique. Every valid E.164 number passes, so the client's per-country
  validation is stricter than the backend, which is intended.
- Success: creates the user and a Student profile. No response fields are
  used; the action only needs the 2xx.
- Errors to handle:
  - **400** `{field: [msgs]}` for any of the six fields (for example username
    already taken, invalid email, Django password validators such as too
    short, too common, entirely numeric or too similar to the username,
    invalid `phone_number`) → messages under the matching input. Backend
    snake_case names map to the form fields (`first_name`, `last_name`,
    `phone_number`), and `phone_number` errors show under the phone field
  - **400** `non_field_errors` → form-level message
  - Any other `{detail}` (e.g. a throttled 429) → form-level message with the
    `detail` text
  - Network failure or timeout → "Couldn't reach the server. Check your
    connection and try again."
  - Non-JSON error page, invalid response or unexpected error → "Something
    went wrong. Try again."

No other endpoint is used. The register action doesn't call
`POST /auth/jwt/create/`.

## Behavior
1. **Opening the page.** A guest opens `/register` from the header's
   "Register" link, the login page, or directly. A logged-in user is
   redirected to `/dashboard` by spec 07 and never sees it. The page is
   statically rendered; `next` and the default country are read on the
   client.
2. **Client validation (Zod), on submit, then per field as the user fixes
   it:**
   - first name, last name, username: required ("Enter your first name.",
     "Enter your last name.", "Enter a username."). A value of only spaces
     counts as empty. Values are sent as typed; no other format rules (the
     backend owns them)
   - email: required and a valid email ("Enter your email address.", "Enter
     a valid email address.")
   - phone: required ("Enter your phone number."); with no country selected
     and a number without a leading `+`, no country is auto-selected and the
     selector shows "Choose your country, or start with + and your country
     code."; a number starting with `+` still auto-selects the matching
     country; a number that isn't valid for the selected country, "Enter a
     valid phone number for <Country name>." (or "Enter a valid phone
     number." when no country matches)
   - password: required ("Enter a password."). No strength rules on the
     client. Never trimmed
   - confirm password: required ("Enter your password again.") and equal to
     the password ("Passwords don't match."), shown under the confirm field.
     Rechecked when the password changes after a first submit
   - an invalid form doesn't call the action; the first invalid field gets
     focus (the country selector's trigger when the country is the problem)
3. **Submitting.** The button disables and reads "Creating account…". A
   second submit can't start while one is pending. No spinner (CLAUDE.md ›
   Motion).
4. **Success.** The action redirects to `/login`, passing along a valid
   `next` (checked with `safeReturnPath()` rules on the server; dropped if
   unsafe), a flag that registration succeeded and the new username. The
   password never goes into the URL, logs, storage or client state after the
   request. On `/login`:
   - a success notice above the form, "Account created. Log in to continue."
     (success fill with on-success text and a check icon, `role="status"`, so
     it's announced; not a toast)
   - the username field is prefilled and the password field has focus
   - the notice disappears on the next submit or a reload without the flag;
     refreshing or sharing the URL doesn't log anyone in or reveal anything
     beyond the username
   - after logging in, spec 13's redirect to `next` or `/dashboard` applies
5. **Failure.** The action returns the normalized error. The form:
   - clears the previous server messages first
   - maps field messages under their inputs (backend names renamed to form
     fields) and the rest to the form-level message
   - keeps every value, including both passwords, so the student can fix
     just the field in error; focuses the first field with an error
6. **Field errors** are linked to their inputs (`aria-invalid`,
   `aria-describedby`) and shown in destructive text, paired with the message
   so it's never colour alone. For the phone field the error is linked to the
   number input, and the selector trigger is marked invalid when the country
   is the problem.
7. **Country selector behaviour:** opens on click, Enter, Space or Arrow
   Down; typing filters the list; Arrow keys move, Enter selects, Escape
   closes and returns focus to the trigger; after a choice, focus moves to the
   number input. The trigger's accessible name includes the selected country
   ("Country: Pakistan +92"), and flags are decorative (`alt=""` /
   `aria-hidden`). "No country found" shows when the search has no match.
8. **No TanStack Query cache work.** Registering doesn't touch any query.
9. **JavaScript.** The form needs JavaScript. Without it, submitting does
   nothing harmful and never puts the password in the URL (`method="post"`,
   as on login); this is accepted.

## Time handling
Not applicable.

## UI notes
- Use the frontend-design skill for the layout of the form and especially the
  phone field (selector and input as one control, the open list, search,
  empty result, error states), within CLAUDE.md › Design: tokens only, 10px
  radius for the trigger and inputs, popover surface with the one elevation,
  180ms popover fade and scale, 150ms state changes, nothing animated with
  `prefers-reduced-motion`.
- Functional page: clarity first, no hex lattice, no images, no decoration.
- Same panel as login (surface card, border, 16px radius, no shadow), a bit
  wider to fit two name fields side by side on wider screens (about 28rem);
  they stack on phones. Vertical logo handled the same way as on login
  (hidden on short screens), since this form is longer and must not push the
  heading off screen.
- Field order: first name, last name, username, email, phone, password,
  confirm password. Labels above inputs. A short hint under username is fine
  if it reflects a backend rule, but no invented rules.
- Phone field: the country trigger sits at the left of the number input
  inside one bordered control (flag + calling code, e.g. "🇵🇰 +92" as an SVG
  flag), with a chevron. The open list is a popover anchored to the field,
  with a search input at the top, the list scrollable, and the selected
  country marked with a check icon (not colour alone). Flags keep their
  aspect ratio with a hairline border so white flags show on the surface in
  light mode. Calling codes and numbers use `tabular-nums`.
- On phones the list opens full width of the field with a height that leaves
  room for the on-screen keyboard; the search input is at least 16px text so
  iOS doesn't zoom, as are all inputs.
- Errors directly under their field in destructive text (14px). Form-level
  message above the submit button with an alert icon. Full-width primary
  "Create account" button, 10px radius.
- Under the panel: "Already have an account?" with a "Log in" link in
  primary.
- No all-caps labels, no eyebrow labels, no `→` in buttons. No tutor name or
  photo.

## Acceptance criteria
- [x] As a guest, `/register` shows the vertical logo, a "Create your account" heading, labelled first name, last name, username, email, phone, password and confirm password fields, a "Create account" button and a "Log in" link _(verified in code — check in browser)_
- [x] The browser tab title is "Register" with the site-wide title template _(verified in code — check in browser)_
- [x] Logged in, opening `/register` redirects to `/dashboard` (spec 07 unchanged) _(verified in code — check in browser)_
- [x] Submitting the empty form shows a message under every required field, focuses the first one, and sends no request _(verified in code — check in browser)_
- [x] An invalid email shows "Enter a valid email address." _(verified in code — check in browser)_
- [x] Different passwords show "Passwords don't match." under the confirm field; making them equal clears it _(verified in code — check in browser)_
- [x] Both password fields have a working show/hide toggle whose accessible name changes with it _(verified in code — check in browser)_
- [x] With the browser time zone `Asia/Karachi`, the selector starts on Pakistan even when the browser language is `en-GB`; with time zone `UTC` and plain `en`, it starts empty and shows "Country" _(verified in code — check in browser)_
- [x] Searching the country list by "pak", "PK", "92" and "+92" each finds Pakistan; a nonsense search shows "No country found" _(verified in code — check in browser)_
- [x] The country list works by keyboard alone (open, filter, move, select, Escape), and focus moves to the number input after choosing _(verified in code — check in browser)_
- [x] With Pakistan selected, `3001234567` is accepted, and `3001234` or `1234567890` shows "Enter a valid phone number for Pakistan." _(verified in code — check in browser)_
- [x] With United Kingdom selected, `7400 123456` is accepted and formats as typed _(verified in code — check in browser)_
- [x] Typing `+44 7400 123456` with another country selected switches the selector to United Kingdom _(verified in code — check in browser)_
- [x] With no country selected, typing `3001234567` selects no country and, on submit, shows "Choose your country, or start with + and your country code." on the selector _(verified in code — check in browser)_
- [x] With no country selected, typing `+923001234567` selects Pakistan _(verified in code — check in browser)_
- [x] The request to `POST /auth/users/` (seen in the server log or Django) carries `phone_number` in E.164 (e.g. `+923001234567`) and no confirm-password value _(verified in code — check in browser)_
- [x] The Network tab shows no request to any external flag CDN or other third-party host while using the country list _(verified in code — check in browser)_
- [x] Other pages (`/`, `/login`) don't load the phone library, its metadata or the flags (checked in the Network tab or build output)
- [x] A username that already exists shows the backend's message under the username field and keeps every value _(verified in code — check in browser)_
- [x] A weak password (e.g. `12345678`) shows the backend's password messages under the password field _(verified in code — check in browser)_
- [x] A backend error on `phone_number` shows under the phone field _(verified in code — check in browser)_
- [x] While submitting, the button is disabled and reads "Creating account…"; a double-click sends one request _(verified in code — check in browser)_
- [x] A successful registration lands on `/login` with "Account created. Log in to continue.", the username filled in and the password focused; the password never appears in the URL _(verified in code — check in browser)_
- [x] Logging in from there works and lands on `/dashboard` _(verified in code — check in browser)_
- [x] Starting from `/login?next=/classes/new`, clicking Register, registering and logging in lands on `/classes/new`; an unsafe `next` (e.g. `https://example.com`) lands on `/dashboard` _(verified in code — check in browser)_
- [x] With the backend stopped, submitting shows "Couldn't reach the server. Check your connection and try again." and keeps all values _(verified in code — check in browser)_
- [x] Field errors and the form-level message are announced by a screen reader and tied to their inputs; the country trigger announces the selected country _(verified in code — check in browser)_
- [x] The page, the phone field and the open country list read correctly in light and dark themes and at 360px wide, with no horizontal scroll _(verified in code — check in browser)_
- [x] No tutor name or photo appears on the page _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture records the register → `/login` flow and describes the register page and phone field
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- The login page (spec 13) is static and reads `next` only at submit time.
  The success notice, username prefill and `next` on the "Register" link also
  come from the URL, so they must be read on the client without making the
  page dynamic. This spec makes those small changes to `/login`.
- `react-phone-number-input`'s defaults clash with the project rules: its
  default flags load from an external CDN, its country control is an
  unsearchable native `<select>`, and its stylesheet brings its own colours.
  This spec requires bundled flags, a Base UI Combobox selector and token-only
  styling instead.
- **Bundle size trade-off:** real validity needs the library's `max` metadata,
  which is larger than the default `min` (the library documents roughly
  145 kB vs 80 kB minified, before gzip; the plan records the measured
  gzipped figures). The bundled SVG flags add more on top. This is accepted
  because it loads on `/register` only, and the alternative (`min`) checks
  little more than length, which the notes ruled out.

## Open questions
None.
