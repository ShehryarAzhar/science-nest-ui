# Spec 25: Book Weekly Class

- **Status:** Done
- **Created:** 2026-10-28
- **Completed:** 2026-10-29
- **Depends on:** 04-drf-error-handling.md, 09-query-provider.md, 21-student-dashboard.md, 23-weekly-slot-picker.md

## Summary
The `/classes/new` page lets a student book a recurring weekly class: they
choose a subject, a level offered for that subject, a 40- or 60-minute
duration and a free weekday + hour in their own time zone, then submit it to
`POST /classes/`. If someone else takes the slot first, the page says so,
refreshes availability and lets them pick again. After booking, the student
lands on their dashboard with the new class in their schedule.

## User stories
- As a student, I want to book a weekly class in a few clear steps so that
  I have a regular lesson each week.
- As a student coming from a subject page, I want that subject already
  chosen so that I don't have to pick it again.
- As a student, I want to see only the levels the subject is taught at so
  that I can't pick one that will be refused.
- As a student, I want to see what each duration costs per week before I
  book so that I know what I'm committing to.
- As a student, I want taken times greyed out and shown in my own time zone
  so that I pick a time that suits me and can be booked.
- As a student whose chosen time was just taken by someone else, I want a
  clear notice and fresh availability so that I can pick another time
  straight away.
- As a guest following "Book a weekly class", I want to log in or register
  and come back to this page so that I can finish booking.
- As someone logged in with an admin account, I want a friendly message
  rather than an error.

## Scope
- A new student route `/classes/new`. `proxy.ts` already protects
  `/classes` and everything under it, and `robots.ts` already disallows it.
- A booking form (react-hook-form + Zod, following the login and register
  forms' pattern) with four fields, in this order:
  - **Subject:** every subject from `getSubjects()` (spec 16's cached,
    public list, read on the server and passed to the form), showing its
    name. Required.
  - **Level:** only the chosen subject's `levels`, showing each level's
    `name`. Disabled (or hidden) until a subject is chosen. Chosen
    automatically when the subject has exactly one level. When the subject
    changes and the chosen level isn't one of the new subject's levels, the
    level is cleared. Required.
  - **Duration:** 40 or 60 minutes, each option showing the chosen
    subject's weekly price for it (`price_40_min`, `price_60_min`, through
    `formatUsd()`), or just the minutes before a subject is chosen. No
    default. Required.
  - **Time:** the `WeeklySlotPicker` (spec 23), fed by
    `useWeeklyAvailability()` (spec 22) with no own slot. Required.
- **Subject preselection:** `?subject=<slug>` (exact, case-sensitive match
  against the list's slugs) preselects that subject (and its level when it
  has only one). An unknown or missing slug preselects nothing and shows no
  error. The page reads the query string in the browser so the route stays
  a static shell, like `/login`.
- **Summary before submit:** once subject and duration are chosen, the
  weekly price of the booking (the duration's price, "per week") in
  tabular figures. The trial lesson isn't mentioned as a price here.
- **Submit:** a TanStack Query mutation that posts through `studentFetch`
  (`POST /api/student/classes`) with `subject` (the subject's id, not its
  slug), `level` (code), `day` and `time` (UTC, from the picker) and
  `duration` (40 or 60). The submit button shows a pending state and the
  form (picker included) is disabled while it runs.
- **On success:** invalidate `scheduleQueryKey` and `availabilityQueryKey`,
  show a success toast ("Weekly class booked."), and go to `/dashboard`.
- **"Slot was just taken" notice** (warning fill with on-warning text and
  an icon, per Design), shown above the picker when either:
  - the backend answers 400 with "This timeslot is already booked."
    (detected with `hasErrorMessage()`): availability is refetched
    (invalidate `availabilityQueryKey`), and the picker then clears the
    selection by itself when the slot comes back as taken; or
  - a background availability refetch (focus, reconnect) shows the
    selected slot as taken or mine, so the picker clears the selection.
  The notice asks the student to choose another time, and goes away when
  they pick a new slot or submit again.
- **Other backend errors** mapped with `applyServerErrors()` (spec 04):
  `subject`, `level` and `duration` onto their fields, `day` and `time`
  onto the time field, everything else (including other
  `non_field_errors` and `{detail}`) into the form-level `role="alert"`
  message above the submit button.
- Page metadata: title "Book a weekly class" (through the root title
  template) and `robots: { index: false }`.
- A link back to the dashboard.
- CLAUDE.md update: a short Architecture note on the booking page (subjects
  from the server, mutation through `studentFetch`, invalidations, the
  "already booked" flow), and roadmap row 25's status when verified.

## Out of scope
- Editing a weekly class, loading it and keeping its own slot selectable:
  spec 26. Building the form so spec 26 can reuse it is fine, but no edit
  route, PATCH or edit links here.
- Deleting a weekly class: spec 27.
- Booking, editing or cancelling the trial lesson: specs 28–30.
- Changes to the slot picker's own layout or states (spec 23) or the
  availability rules (spec 22).
- Edit or delete controls on the dashboard: specs 26 and 27.
- Recommending a time, checking the tutor's working hours, or limiting how
  many weekly classes a student can book: the backend has no such rules.
- Payment, invoices or any price the backend doesn't return.
- A time zone picker: the browser's zone is used.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
- `/classes/new` (student only)
  - Guest: `proxy.ts` redirects to `/login?next=/classes/new` (query kept,
    e.g. `?subject=biology`), and after logging in or registering the
    student returns here with the subject still preselected.
  - Student: heading "Book a weekly class", the form, and a link back to
    the dashboard.
  - Admin account (no Student profile): `StudentAccountNeeded` instead of
    the form.

## Backend contract
- `GET /subjects/` (public, through `getSubjects()`, cached; spec 16)
  - Uses `id`, `name`, `slug`, `levels` (`{code, name}`), `price_40_min`,
    `price_60_min`.
  - Failure: the existing subjects error boundary (spec 16) shows its
    inline panel instead of the form.
- `GET /availability/` (through `useWeeklyAvailability()`; spec 22)
  - 401: session-expired flow (stays loading, then `/login?expired=1&next=…`).
  - 403: `studentAccessFallback()`'s state replaces the form.
  - Other failures: an inline error with Try again (refetch) where the
    picker would be; the rest of the form stays.
- `POST /classes/` (through `POST /api/student/classes`, student mode)
  - Body: `{ subject: <id>, level: <code>, day: "monday"…"sunday",
    time: "HH:00:00" (UTC), duration: 40 | 60 }`.
  - Success (201): the created class (`id`, `subject`, `level`, `day`,
    `day_display`, `time`, `duration`). Only success matters; nothing from
    the body is shown (never `day_display`).
  - 400 field errors `{subject|level|day|time|duration: [msgs]}`: on their
    fields (day and time on the time field).
  - 400 "This timeslot is already booked." (`non_field_errors` or a field
    list): the "slot was just taken" flow.
  - Other 400 `non_field_errors` (e.g. the slot clashes with an upcoming
    trial lesson, or the level isn't one of the subject's): form-level
    message.
  - 401: session-expired flow; the mutation stays pending (no error flash).
  - 403 `{detail}`: form-level message (admins normally never reach the
    form, since availability already returned 403).
  - 502/504/5xx/network: the safe message from `StudentApiError`, at form
    level. Never the backend's own text for non-JSON errors.

## Behavior
1. **Guest:** redirected to `/login?next=/classes/new…`; back here after
   logging in or registering, with `?subject=` kept.
2. **Before mount:** the page heading and form shell render at once
   (static). The subject list is already in the HTML; the picker shows its
   own static placeholder until the browser's time zone is known; the
   `?subject=` preselection is applied after mount.
3. **Availability loading:** the picker's own loading state (every slot
   disabled with a status line). The other fields can be filled meanwhile.
4. **Filling in:** choosing a subject filters the levels and fills in the
   prices; a single level is chosen for the student; changing subject
   clears a level the new subject doesn't offer. Duration and time are kept
   when the subject changes.
5. **Validation (Zod, client side, matching the backend):**
   - subject: required, one of the listed subject ids;
   - level: required, one of the chosen subject's level codes;
   - duration: required, 40 or 60;
   - time: required, a UTC weekday `monday`–`sunday` + a full hour
     `"HH:00:00"`.
   Messages appear under each field after submit (and on change after
   that), e.g. "Choose a subject", "Choose a level", "Choose a duration",
   "Choose a time".
6. **Submitting:** button pending, form disabled, one request only (double
   clicks don't post twice).
7. **Success:** schedule and availability invalidated, success toast,
   navigation to `/dashboard`, where the new class appears.
8. **Slot taken (400 "already booked"):** the warning notice shows,
   availability is refetched, the picker clears the selection once the slot
   comes back as taken, and the student's other choices stay filled. Picking
   a new slot hides the notice.
9. **Slot taken by a background refetch:** the picker clears the selection
   and the same notice shows, before the student submits.
10. **Other errors:** per Backend contract; the form stays filled and can be
    submitted again.
11. **Session gone (401)** on availability or submit: `studentFetch` ends
    the session and loads `/login?expired=1&next=/classes/new…`, with no
    error flash.
12. **Admin account (403 from availability):** `StudentAccountNeeded`
    replaces the form (it has its own `h1`, so the page heading isn't
    shown above it).
13. **Subjects can't be loaded:** the subjects error panel replaces the form;
    the page heading stays.
14. **Leaving without booking:** nothing is saved; no confirmation dialog.

## Time handling
- The picker (spec 23) shows the 168 weekly UTC slots in the student's
  local time and returns a UTC `day` + `"HH:00:00"`; the form sends exactly
  that. No local → UTC conversion happens in the form.
- The zone note, the clock-change labels and day rollover are the picker's
  (spec 23) and follow the next-occurrence rule.
- The form never shows `day_display` or any UTC weekday.

## UI notes
- Functional page: clarity first, no hex lattice, no illustrations. Max
  width 72rem, 16px mobile gutter, 16–24px gaps; the picker keeps its own
  `max-w-4xl` cap on desktop.
- Use the frontend-design skill before writing the UI, within the Design
  section (theme tokens only, no new colours, fonts, radii or motion).
- Field order top to bottom: subject, level, duration, time, then the
  weekly price summary, the form-level alert and the submit button
  ("Book weekly class", no `→`).
- Subject, level and duration as clearly labelled choice controls; which
  shadcn/Base UI components (e.g. a select or radio cards) is decided in
  planning. None of `select` or `radio-group` is installed yet; add with
  `npx shadcn add` and restyle to the tokens if used. Duration options show
  minutes and price in tabular figures. Level options use each level's
  `name` (e.g. "All Levels (1-O Level)").
- The "slot was just taken" notice: warning fill, on-warning text and a
  lucide icon, never warning text on the background.
- Field errors through `Field`/`FieldError` (`components/ui/field.tsx`);
  the picker's error linked through its `aria-describedby`/`aria-invalid`.
- Touch targets at least 44px tall on mobile.
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] As a guest, opening `/classes/new?subject=biology` redirects to `/login?next=/classes/new?subject=biology` (encoded), and after logging in the booking page opens with Biology preselected _(verified in code — check in browser)_
- [x] As a guest, going from the login page's Register link through registration and login also ends on `/classes/new?subject=…` _(verified in code — check in browser)_
- [x] "Book a weekly class" on the home page, a subject page and the dashboard all open the booking page for a logged-in student _(verified in code — check in browser)_
- [x] The subject list shows every subject from the backend _(verified in code — check in browser)_
- [x] `?subject=chemistry` preselects Chemistry; `?subject=Unknown` and no parameter preselect nothing, with no error _(verified in code — check in browser)_
- [x] The level choices show only the chosen subject's levels, by name _(verified in code — check in browser)_
- [x] Choosing Physics (one level) selects O Level automatically _(verified in code — check in browser)_
- [x] Switching from Biology with A Level to Physics replaces A Level with O Level (Physics's only level); duration and time stay _(verified in code — check in browser)_
- [x] Duration options show the chosen subject's 40- and 60-minute prices in USD, and the summary shows the chosen duration's price per week _(verified in code — check in browser)_
- [x] The picker shows times in the browser's time zone, with taken slots greyed and the student's own bookings marked "Yours" _(verified in code — check in browser)_
- [x] Submitting with nothing chosen shows a message under each missing field and sends no request _(verified in code — check in browser)_
- [x] A valid submit sends `POST /api/student/classes` with the subject id, level code, UTC day and time, and duration, and Django receives `POST /classes/` _(verified in code — check in browser)_
- [x] While submitting, the button shows it's pending and double-clicking posts only once _(verified in code — check in browser)_
- [x] After success, a "Weekly class booked." toast shows and the dashboard lists the new class at the chosen local time, with its price included in the weekly cost _(verified in code — check in browser)_
- [x] Opening `/classes/new` again after booking shows that slot as "Yours" _(verified in code — check in browser)_
- [x] When another student books the chosen slot first, submitting shows the warning "slot was just taken" notice, refetches availability, clears the selection and shows that slot as taken; the other fields stay filled _(verified in code — check in browser)_
- [x] When availability refetches on window focus and the selected slot is now taken, the selection clears and the notice shows _(verified in code — check in browser)_
- [x] Picking a new slot hides the notice, and the booking then succeeds _(verified in code — check in browser)_
- [x] A slot clash with an upcoming trial lesson or another backend `non_field_errors` message shows in the form-level alert above the submit button _(verified in code — check in browser)_
- [x] With Django stopped, submitting shows a safe form-level message, and the form can be submitted again once Django is back _(verified in code — check in browser)_
- [x] With a forged `access` cookie Django rejects, the page ends on `/login?expired=1&next=/classes/new` with no error flash _(verified in code — check in browser)_
- [x] Logged in as an admin account, the page shows the "Student account needed" message instead of the form _(verified in code — check in browser)_
- [x] The tab title is "Book a weekly class" with the site suffix, and the page has `noindex` _(verified in code — check in browser)_
- [x] The page works on a 360px-wide screen with no sideways scrolling, and on desktop in light and dark themes _(verified in code — check in browser)_
- [x] The form is fully usable with the keyboard, and errors are announced _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture describes the booking page and its invalidations
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Subjects from the server, availability and submit in the browser:**
  subjects come from the cached public `getSubjects()` (server-only), while
  the picker, availability and the POST must run in the browser
  (`studentFetch`, local times). The page passes the subject list from a
  Server Component to the client form; it stays static because
  `getSubjects()` is public and cached.
- **Reading `?subject=` without making the page dynamic:** reading
  `searchParams` on the server would make the route dynamic. The login page
  solves the same thing with `useLocationSearch()`, which lives in
  `app/login/`; using it here means moving it to a shared place (e.g.
  `lib/`) rather than importing across routes.
- **Exact "already booked" error shape:** CLAUDE.md gives the message
  ("This timeslot is already booked.") but not whether it arrives under
  `non_field_errors` or a field. `hasErrorMessage()` checks both, so the
  spec doesn't depend on it.
- **Clearing vs. auto-picking the level:** criterion 8 first said switching
  from Biology with A Level to Physics clears the level, which contradicted
  criterion 7 (Physics's single level is picked automatically). The user
  accepted auto-picking as replacing the level; clearing only applies when
  the new subject has several levels and lacks the chosen one.
- **No select or radio components installed:** `components/ui/` has no
  `select` or `radio-group`; planning picks the controls and adds them via
  shadcn if needed.

## Open questions
None.
