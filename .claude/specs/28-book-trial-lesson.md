# Spec 28: Book Trial Lesson

- **Status:** Done
- **Created:** 2026-10-29
- **Completed:** 2026-10-29
- **Depends on:** 04-drf-error-handling.md, 09-query-provider.md, 21-student-dashboard.md, 24-trial-slot-picker.md

## Summary
The `/trial-lesson/new` page lets a student book their one free 60-minute
trial lesson: they choose a subject, a level offered for it and a free date
and hour in their own time zone, then submit to `POST /trial-lessons/`. On
success the page shows a confirmation with the lesson's local date and time
and how the meeting link will arrive. A student who already has a trial
lesson sees it with a link to the dashboard instead of the form, because the
public "Book a free trial" buttons can't be hidden from them.

## User stories
- As a student, I want to book a free trial lesson in a few clear steps so
  that I can try a lesson before booking weekly classes.
- As a student coming from a subject page, I want that subject already
  chosen so that I don't have to pick it again.
- As a student, I want to see only the levels the subject is taught at so
  that I can't pick one that will be refused.
- As a student, I want free dates and hours shown in my own time zone, with
  taken ones greyed out, so that I pick a time that suits me and can be
  booked.
- As a student whose chosen hour was just taken, I want a clear notice and
  fresh availability so that I can pick another hour straight away.
- As a student who has just booked, I want to see exactly when the lesson is
  and how I'll get the meeting link so that I know what happens next.
- As a student who already has a trial lesson, I want to see it rather than
  an error so that I know I've used my free trial.
- As a guest following "Book a free trial", I want to log in or register and
  come back to this page so that I can finish booking.
- As someone logged in with an admin account, I want a friendly message
  rather than an error.

## Scope
- A new student route `/trial-lesson/new`. `proxy.ts` already protects
  `/trial-lesson` and everything under it; `robots.ts` already disallows it.
- **Existing trial lesson check:** the page reads the student's schedule
  (`scheduleQueryOptions()`, spec 21) and uses its `trial_lesson`. When it's
  not null (there is one per student), the page shows an existing-trial
  state instead of the form, matched to the lesson's situation. Both
  versions keep the page `h1`, then a status message, then the trial lesson
  (subject, level, full local date and time, "Free trial", styled like the
  dashboard's trial card), then the actions. No form, no picker.
  - **Upcoming** (`completed` is false and `starts_at` is after now):
    - status: "Your free trial is booked." with the line "Each student
      gets one free trial lesson. Here are the details of yours.";
    - below the card, the meeting-link note (Zoom or Google Meet, the link
      arrives on WhatsApp to the registered phone number, or by email);
    - action: a primary "Go to dashboard" link.
  - **Past or completed** (`completed` is true, or `starts_at` is at or
    before now, the same test CLAUDE.md gives for a locked trial):
    - status: "You've already had your free trial." with the line "Each
      student gets one free trial lesson. To keep learning, book a weekly
      class.";
    - no meeting-link note (the lesson is over);
    - actions: a primary "Book a weekly class" link to `/classes/new` and
      an outline "Go to dashboard" link.
- When `trial_lesson` is null, a booking form (react-hook-form + Zod,
  following the weekly booking form's pattern) with three fields, in this
  order:
  - **Subject:** every subject from `getSubjects()` (spec 16's cached,
    public list, read on the server and passed to the form), by name.
    Required.
  - **Level:** only the chosen subject's `levels`, by `name`. Disabled (or
    hidden) until a subject is chosen; picked automatically when the subject
    has exactly one; cleared when the subject changes and the new subject
    doesn't offer it. Required.
  - **Time:** the `TrialSlotPicker` (spec 24), fed by
    `useTrialAvailability()` (spec 22) with no own `starts_at`. Required.
- **Subject preselection:** `?subject=<slug>` (exact, case-sensitive match),
  read in the browser after mount through `useLocationSearch()`, as in spec
  25. An unknown or missing slug preselects nothing and shows no error.
- The lesson's fixed facts near the submit button: 60 minutes, free, online
  on Zoom or Google Meet. No price figure.
- **Submit:** a TanStack Query mutation through `studentFetch`
  (`POST /api/student/trial-lessons`) with `subject` (id), `level` (code) and
  `starts_at` (UTC, from the picker). Pending button, form and picker
  disabled, one request only.
- **24-hour lead time at submit:** Zod rejects a `starts_at` less than 24
  hours after the moment of submitting (not the moment the page opened),
  with a message on the time field asking for a later time. This is a
  frontend rule; the backend only requires a future full hour.
- **On success:**
  - invalidate `scheduleQueryKey` and `availabilityQueryKey`;
  - a success toast ("Trial lesson booked.");
  - the form is replaced, on the same page, by a confirmation panel:
    success heading, subject, level, the full local date and time
    (`formatTrialDateTime()`), 60 minutes, free, and the meeting-link note:
    lessons are on Zoom or Google Meet, and the tutor sends the link before
    the lesson on WhatsApp to the registered phone number, or by email. A
    primary link to the dashboard. Focus moves to the confirmation heading.
- **"Slot was just taken" notice** (warning fill, on-warning text and an
  icon), above the picker, exactly as in spec 25: shown on a 400 "This
  timeslot is already booked." (detected with `hasErrorMessage()`, then
  availability is refetched and the picker clears the hour once it comes
  back taken), or when a background refetch makes the picker clear the
  selected hour. Hidden when a new hour is picked or on submit.
- **Other backend errors** through `applyServerErrors()`: `subject` and
  `level` on their fields, `starts_at` on the time field, everything else
  (`non_field_errors`, `{detail}`) in the form-level `role="alert"` message
  above the submit button.
- **Pages kept in `<Activity>`:** returning to the page after it was hidden
  (Cache Components keeps its state, CLAUDE.md › Book weekly class) must not
  find it "Booking…" or still showing an old confirmation. After a booking,
  revisiting shows the existing-trial state; unsaved drafts are kept.
- Page metadata: title "Book a free trial" (through the root title
  template) and `robots: { index: false }`.
- A link back to the dashboard.
- CLAUDE.md update: an Architecture note on the trial booking page (the
  existing-trial check, the form, the lead-time check, the confirmation, the
  invalidations), and roadmap row 28's status when verified.

## Out of scope
- Editing the trial lesson, loading it by id and keeping its own hour
  selectable: spec 29. No edit route, PATCH or edit links here, including on
  the existing-trial state.
- Cancelling the trial lesson: spec 30. No cancel control here.
- The locked display for a past or completed trial lesson, and the backend's
  403 on edit or delete: spec 31. Here a past or completed trial lesson
  only changes the existing-trial state's wording and next step (see Scope).
- Changes to the trial picker's window, layout or states (spec 24) or the
  availability rules (spec 22).
- Hiding the "Book a free trial" buttons on public pages: they stay static
  (CLAUDE.md › About the app). The dashboard already hides its trial link.
- Booking, editing or deleting weekly classes: specs 25–27.
- Storing or showing a meeting link, or a time zone picker.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
- `/trial-lesson/new` (student only)
  - Guest: `proxy.ts` redirects to `/login?next=/trial-lesson/new` (query
    kept, e.g. `?subject=biology`); after logging in or registering the
    student returns here with the subject still preselected.
  - Student without a trial lesson: heading "Book a free trial", the form,
    a link back to the dashboard; after booking, the confirmation panel.
  - Student with a trial lesson: the same heading, their trial lesson and a
    link to the dashboard.
  - Admin account (no Student profile): `StudentAccountNeeded` instead of
    the page.

## Backend contract
- `GET /subjects/` (public, `getSubjects()`, cached; spec 16)
  - Uses `id`, `name`, `slug`, `levels` (`{code, name}`). Prices aren't
    used (the trial is free).
  - Failure: the subjects error panel replaces the form; the heading stays.
- `GET /schedule/` (through `scheduleQueryOptions()`; spec 21)
  - Uses only `trial_lesson`: null, or `{id, subject {id, name, slug,
    levels}, level {code, name}, starts_at, completed}`.
  - 401: session-expired flow. 403: `studentAccessFallback()`'s state
    replaces the page. Other failures: inline panel with Try again
    (refetch) in place of the form.
- `GET /availability/` (through `useTrialAvailability()`; spec 22)
  - 401: session-expired flow. 403: `studentAccessFallback()`'s state.
  - Other failures with nothing loaded yet: an inline panel with Try again
    where the picker goes; the other fields stay.
- `POST /trial-lessons/` (through `POST /api/student/trial-lessons`)
  - Body: `{ subject: <id>, level: <code>, starts_at: "YYYY-MM-DDTHH:00:00Z" }`.
  - Success (201): the created trial lesson (`id`, `subject`, `level`,
    `starts_at`, `completed`). The confirmation may use its `subject`,
    `level` and `starts_at`; never shows `id`.
  - 400 field errors `{subject|level|starts_at: [msgs]}`: on their fields
    (`starts_at` on the time field).
  - 400 "This timeslot is already booked.": the "slot was just taken" flow.
  - Other 400 `non_field_errors` (e.g. the student already has a trial
    lesson, a clash with a weekly class, a level the subject doesn't offer,
    a past `starts_at`): form-level message.
  - 401: session-expired flow; the mutation stays pending (no error flash).
  - 403 `{detail}`: form-level message.
  - 502/504/5xx/network: the safe `StudentApiError` message at form level.

## Behavior
1. **Guest:** redirected to `/login?next=/trial-lesson/new…`; back here
   after logging in or registering, with `?subject=` kept.
2. **Before mount:** the heading and a static loading state render at once
   (prerendered shell, no local times, no pulse or spinner).
3. **Schedule loading:** the static loading state; the form isn't shown yet,
   so a student with a trial lesson never sees the form flash.
4. **Has a trial lesson:** the existing-trial state (see Scope): the
   upcoming version, or the past-or-completed version when `completed` is
   true or `starts_at` is at or before now. "Now" is taken once after
   mount, so the version doesn't change while the page is open.
5. **No trial lesson:** the form. Availability loads in the picker (every
   hour disabled with its status line); subject and level can be filled
   meanwhile. `?subject=` preselection applies after mount.
6. **Filling in:** choosing a subject filters the levels; a single level is
   picked; switching subject clears a level the new one lacks. The chosen
   hour is kept when the subject changes.
7. **Validation (Zod, client side, matching the backend plus the lead
   time):**
   - subject: required, one of the listed subject ids ("Choose a subject");
   - level: required, one of the chosen subject's codes ("Choose a level");
   - time: required ("Choose a time"), a full UTC hour, and at least 24
     hours after the moment of submitting ("This time is now less than 24
     hours away. Choose a later time.").
   Messages show under each field after submit, and on change after that.
8. **Submitting:** button pending ("Booking…"), form disabled, one request
   only.
9. **Success:** schedule and availability invalidated, success toast, the
   confirmation panel replaces the form and takes focus. Its dashboard link
   goes to `/dashboard`, where the trial lesson card shows the same local
   date and time. The schedule refetch triggered by the invalidation must
   not swap the confirmation for the existing-trial state during this visit.
10. **Slot taken (400 "already booked"):** warning notice, availability
    refetched, the picker clears the hour once it comes back taken, subject
    and level stay filled. Picking a new hour hides the notice.
11. **Slot taken by a background refetch:** the picker clears the hour and
    the same notice shows, before the student submits.
12. **Other errors:** per Backend contract; the form stays filled and can be
    submitted again.
13. **Session gone (401)** on schedule, availability or submit:
    `studentFetch` ends the session and loads
    `/login?expired=1&next=/trial-lesson/new…`, with no error flash.
14. **Admin account (403 from schedule or availability):**
    `StudentAccountNeeded` replaces the page (it has its own `h1`).
15. **Subjects can't be loaded:** the subjects error panel replaces the
    form; the heading stays. (A student with a trial lesson still sees it if
    the existing-trial state doesn't need the subject list.)
16. **Leaving without booking:** nothing saved, no confirmation dialog.

## Time handling
- The picker (spec 24) shows full UTC hours from 24 hours ahead for 14 days
  in the student's local time and returns a UTC `starts_at`; the form sends
  exactly that. No local → UTC conversion in the form.
- The lead-time check compares the chosen instant with "now" at submit
  time, as instants (never as strings).
- The existing trial lesson and the confirmation show `starts_at` in local
  time with `formatTrialDateTime()` (weekday, date, hour), rendered only in
  the browser after mount, with the zone note ("Times are in <zone>.") where
  a time is shown.
- Never shows UTC dates or times.

## UI notes
- Functional page: clarity first, no hex lattice, no illustrations. Max
  width 72rem, 16px mobile gutter, 16–24px gaps; the picker keeps its own
  width cap.
- Use the frontend-design skill before writing the UI, within the Design
  section (theme tokens only, no new colours, fonts, radii or motion).
- Should feel like a sibling of `/classes/new`: same frame (back link and
  `h1`), same field styles (`RadioCard`s or whatever spec 25 uses), same
  notice and form-level alert. Reuse its pieces rather than copying them
  where that's clean.
- Field order: subject, level, time, then the lesson facts (60 minutes,
  free, online), the form-level alert and the submit button ("Book free
  trial", no `→`).
- Eosin accents the trial lesson ("Free trial" badge, card rule) in the
  existing-trial state and the confirmation, never inside the picker or for
  errors. The confirmation's success mark uses the success token with an
  icon.
- The existing-trial state and the confirmation follow the dashboard's
  `TrialLessonCard` look; reusing it is fine.
- Existing-trial state layout, one column within prose width (65ch), left
  aligned:
  ```
  Book a free trial                      (h1, unchanged)
  Your free trial is booked.             (status, 20px serif heading)
  Each student gets one free trial…      (body, muted)
  ┌▌Free trial ─────────────────────┐
  │▌Biology · A Level               │   (trial card, eosin left rule)
  │▌Monday 2 November 2026, 14:00   │
  └─────────────────────────────────┘
  [video] Lessons are on Zoom…           (upcoming only, muted, icon)
  Times are in <zone>.                   (muted, icon)
  [Go to dashboard]                      (upcoming: primary)
  [Book a weekly class] [Go to dashboard] (past: primary + outline)
  ```
  The status message is a heading for the state (below the `h1`), so screen
  reader users hear it before the card. No icon, colour or illustration
  marks the past version as an error or a warning: it's a plain fact with a
  next step. Buttons stack full width on mobile.
- The meeting-link note uses the same wording as the dashboard's note.
- Touch targets at least 44px tall on mobile. No tutor name or photo
  anywhere.

## Acceptance criteria
- [x] As a guest, opening `/trial-lesson/new?subject=biology` redirects to `/login?next=/trial-lesson/new?subject=biology` (encoded), and after logging in the page opens with Biology preselected _(verified in code — check in browser)_
- [x] As a guest, going from the login page's Register link through registration and login also ends on `/trial-lesson/new?subject=…` _(verified in code — check in browser)_
- [x] "Book a free trial" on the home page, a subject page and the dashboard all open this page for a logged-in student _(verified in code — check in browser)_
- [x] Before the schedule loads, a static loading state shows and the form doesn't flash _(verified in code — check in browser)_
- [x] A student with an upcoming trial lesson sees "Your free trial is booked.", the lesson's subject, level and full local date and time, the meeting-link note and a "Go to dashboard" link, with no form and no error _(verified in code — check in browser)_
- [x] A student whose trial lesson is past or marked completed in the admin sees "You've already had your free trial.", the lesson's subject, level and full local date and time, no meeting-link note, and "Book a weekly class" (opens `/classes/new`) plus "Go to dashboard", with no form and no error _(verified in code — check in browser)_
- [x] A student without a trial lesson sees the form with every subject from the backend _(verified in code — check in browser)_
- [x] `?subject=chemistry` preselects Chemistry; `?subject=Unknown` and no parameter preselect nothing, with no error _(verified in code — check in browser)_
- [x] The level choices show only the chosen subject's levels; Physics selects O Level automatically _(verified in code — check in browser)_
- [x] The picker shows hours from 24 hours ahead in the browser's time zone, with taken hours greyed and the student's weekly classes marked "Yours" _(verified in code — check in browser)_
- [x] Submitting with nothing chosen shows a message under each field and sends no request _(verified in code — check in browser)_
- [x] With the page left open until the chosen hour is under 24 hours away, submitting shows the lead-time message on the time field and sends no request _(verified in code — check in browser)_
- [x] A valid submit sends `POST /api/student/trial-lessons` with the subject id, level code and UTC `starts_at`, and Django receives `POST /trial-lessons/` _(verified in code — check in browser)_
- [x] While submitting, the button shows "Booking…" and double-clicking posts only once _(verified in code — check in browser)_
- [x] After success, a "Trial lesson booked." toast shows and the confirmation panel shows the subject, level, local date and time, and how the meeting link arrives (WhatsApp or email), with focus on its heading _(verified in code — check in browser)_
- [x] The confirmation's dashboard link opens `/dashboard`, where the "Free trial" card shows the same local date and time _(verified in code — check in browser)_
- [x] Navigating back to `/trial-lesson/new` after booking shows the existing-trial state, not the form or a stale "Booking…" _(verified in code — check in browser)_
- [x] When another booking takes the chosen hour first, submitting shows the warning notice, refetches availability and clears the hour, which then shows as taken; subject and level stay filled _(verified in code — check in browser)_
- [x] When availability refetches on window focus and the selected hour is now taken, the selection clears and the notice shows _(verified in code — check in browser)_
- [x] Picking a new hour hides the notice, and the booking then succeeds _(verified in code — check in browser)_
- [x] A backend `non_field_errors` message (e.g. a clash with a weekly class, or the student already has a trial lesson) shows in the form-level alert _(verified in code — check in browser)_
- [x] With Django stopped, submitting shows a safe form-level message, and the form can be submitted again once Django is back _(verified in code — check in browser)_
- [x] With a forged `access` cookie Django rejects, the page ends on `/login?expired=1&next=/trial-lesson/new` with no error flash _(verified in code — check in browser)_
- [x] Logged in as an admin account, the page shows the "Student account needed" message _(verified in code — check in browser)_
- [x] With the schedule request failing (not 401/403), an inline panel with Try again shows instead of the form _(verified in code — check in browser)_
- [x] The tab title is "Book a free trial" with the site suffix, and the page has `noindex` _(verified in code — check in browser)_
- [x] The page works on a 360px-wide screen with no sideways scrolling, and on desktop in light and dark themes _(verified in code — check in browser)_
- [x] The form is fully usable with the keyboard, and errors and the confirmation are announced _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture describes the trial booking page
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Confirmation on the page vs. spec 25's redirect:** weekly booking
  toasts and goes to `/dashboard`; this page stays and shows a confirmation,
  because CLAUDE.md asks the trial confirmation to say how the meeting link
  arrives (user's choice). The schedule invalidation then refetches while
  the page is still mounted, which would otherwise flip it to the
  existing-trial state; the confirmation must win for this visit.
- **Existing-trial check needs a second student read:** `BookingShell`
  (spec 25/26) watches availability and, when editing, a weekly class. This
  page also needs the schedule, and a 403 from it must replace the page the
  same way. Planning decides whether to extend `BookingShell` or add a
  sibling.
- **Lead time is frontend-only:** the backend accepts any future full hour.
  The Zod check at submit time is a frontend rule (user's choice) on top of
  the picker's window; a direct API call can still book sooner.
- **"One per student" message isn't documented:** CLAUDE.md says one trial
  lesson per student but not the backend's error text or shape. It's shown
  as whatever `applyServerErrors()` produces (form-level for
  `non_field_errors`/`detail`); the spec doesn't match on its wording.

## Open questions
None.
