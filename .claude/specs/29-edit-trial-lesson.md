# Spec 29: Edit Trial Lesson

- **Status:** Done
- **Created:** 2026-10-29
- **Completed:** 2026-10-29
- **Depends on:** 09-query-provider.md, 28-book-trial-lesson.md

## Summary
The `/trial-lesson/[id]/edit` page lets a student change their upcoming free
trial lesson: its subject, level or date and hour. It loads the lesson from
`GET /trial-lessons/{id}/`, prefills the same form spec 28 uses for booking,
keeps the lesson's own hour selectable in the trial picker (marked "Yours"),
and saves with `PATCH /trial-lessons/{id}/`. Students reach it from an Edit
link on the dashboard's Free trial card and on the trial booking page's
"Your free trial is booked." state.

## User stories
- As a student, I want to move my free trial to another date or hour so
  that it fits my week, without cancelling and rebooking.
- As a student, I want to change the subject or level of my free trial so
  that it covers what I actually need help with.
- As a student, I want my trial's current hour shown as mine and still
  selectable so that I can change the subject or level and keep the time,
  even when the lesson is less than 24 hours away.
- As a student whose new hour was just taken, I want a clear notice and
  fresh availability so that I can pick another one.
- As a student, I want a clear message when the trial lesson no longer
  exists or can no longer be changed, rather than an error.
- As a student, I want an Edit link next to my trial lesson so that I can
  find this page.

## Scope
- A new student route `/trial-lesson/[id]/edit`. `proxy.ts` already
  protects `/trial-lesson` and everything under it, and `robots.ts` already
  disallows it.
- **Loading the trial lesson:** `GET /api/student/trial-lessons/{id}`
  through `studentFetch`, Zod-checked with the trial lesson fields (`id`,
  `subject` `{id, name, slug, levels}`, `level` `{code, name}`, `starts_at`,
  `completed`; the same shape as `trialLessonSchema` in `lib/schedule.ts`),
  with `starts_at` run through the `lib/time-zone.ts` parser. It has its own
  query, keyed by id.
- **Minimal locked guard:** the lesson is locked when `completed` is true or
  `starts_at` is at or before "now" (taken once after mount), the same test
  as the backend's lock and spec 28's "past" state. A locked lesson opened
  on this page shows a plain message that it can no longer be changed, with
  a link to the dashboard, instead of the form. No picker, no availability
  errors. The fuller locked display is spec 31.
- **The form:** spec 28's trial lesson form (subject, level, trial picker,
  slot-taken notice, form-level alert, submit), reused rather than copied,
  prefilled from the loaded lesson:
  - subject: the lesson's subject id, matched against the `getSubjects()`
    list; if that subject is no longer listed, nothing is preselected and
    the student must choose one;
  - level: the lesson's level code, if it's one of the subject's current
    levels; otherwise cleared (or the subject's single level picked);
  - time: the lesson's UTC `starts_at`.
  The same subject and level rules as booking apply after prefill. No
  `?subject=` preselection on this page.
- **Own hour:** `useTrialAvailability({ ownStartsAt })` and the picker's
  `ownStartsAt` get the lesson's loaded `starts_at`, so that hour shows
  "Yours" and stays selectable after another is picked, even when it's less
  than 24 hours away (spec 24 already offers it).
- **Lead time when editing:** any new hour must be at least 24 hours ahead,
  checked by the picker's window and by the Zod schema at submit, as when
  booking. Keeping the lesson's own hour is allowed inside the 24 hours, as
  long as it's still in the future.
- **Save:** a TanStack mutation through `studentFetch`
  (`PATCH /api/student/trial-lessons/{id}`) with `subject` (id), `level`
  (code) and `starts_at` (UTC). Button "Save changes" (pending "Saving…"),
  form disabled, one request only (as in spec 28). Saving with nothing
  changed is allowed and behaves like any other save.
- **On success:** invalidate `scheduleQueryKey`, `availabilityQueryKey` and
  this lesson's own query (as spec 26, without an immediate refetch that
  would flash the slot-taken notice in the still-mounted picker), show a
  success toast ("Trial lesson updated."), go to `/dashboard`.
- **"Slot was just taken" notice and other errors:** exactly as spec 28
  (warning notice + availability refetch for "This timeslot is already
  booked.", `applyServerErrors()` with no rename, form-level alert for the
  rest, including a 403 if the lesson became locked meanwhile).
- **Trial lesson not found:** an `[id]` that isn't a positive integer (the
  student API proxy's rule), or a 404 from `GET /trial-lessons/{id}/`
  (cancelled, or another student's), shows "Trial lesson not found" with a
  link to the dashboard instead of the form.
- **Entry points:** an "Edit" link to `/trial-lesson/{id}/edit`, shown only
  for an upcoming, not-completed trial lesson:
  - on the dashboard's Free trial card (spec 21);
  - on `/trial-lesson/new`'s "Your free trial is booked." state, both the
    existing upcoming trial and the one just booked (spec 28).
  Its accessible name names the trial lesson (subject and local date and
  hour). Past or completed trials get no Edit link.
- **Pages kept in `<Activity>`:** returning to the page after a save must
  not find it "Saving…" or with stale values (CLAUDE.md › Book weekly
  class); unsaved drafts are kept, as in specs 25–28.
- Page metadata: title "Edit trial lesson" (root title template) and
  `robots: { index: false }`.
- A link back to the dashboard and the heading "Edit trial lesson".
- CLAUDE.md update: an Architecture note on the edit page (load, locked
  guard, prefill, own hour and lead time, PATCH, invalidations, not-found
  state, Edit links), and roadmap row 29's status when verified.

## Out of scope
- Cancelling the trial lesson, its confirmation dialog or a cancel control
  on the dashboard, the trial booking page or this page: spec 30.
- The full locked display for a past or completed trial (dashboard card
  styling, a lock notice, warning styling) and special display of the
  backend's 403 message: spec 31. Here a locked lesson only gets no Edit
  link and the plain message above, and a 403 from PATCH lands in the
  normal form-level alert.
- Booking the trial lesson: spec 28 (already built; only reused here).
- Booking, editing or deleting weekly classes: specs 25–27.
- Changes to the trial picker's window, layout or states (spec 24) or the
  availability rules (spec 22).
- Blocking edits inside the 24-hour lead time, or any "contact your tutor"
  message.
- An "unsaved changes" warning when leaving the page.
- Storing or showing a meeting link, or a time zone picker.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
- `/trial-lesson/[id]/edit` (student only)
  - Guest: `proxy.ts` redirects to `/login?next=/trial-lesson/<id>/edit`,
    and the student returns here after logging in.
  - Student, own upcoming trial: heading "Edit trial lesson", the
    prefilled form and a link back to the dashboard.
  - Student, own trial that's completed or already started: the "can no
    longer be changed" message with a dashboard link.
  - Student, unknown, cancelled or someone else's trial (or a malformed
    id): "Trial lesson not found" with a dashboard link.
  - Admin account (no Student profile): `StudentAccountNeeded` instead of
    the page.
- `/dashboard` (spec 21): the Free trial card gains an Edit link when the
  trial is upcoming and not completed.
- `/trial-lesson/new` (spec 28): the "Your free trial is booked." state
  (upcoming and just booked) gains an Edit link.

## Backend contract
- `GET /subjects/` (public, through `getSubjects()`, cached; spec 16)
  - Uses `id`, `name`, `slug`, `levels`.
  - Failure: the subjects error panel replaces the form, as in spec 28.
- `GET /trial-lessons/{id}/` (through `GET /api/student/trial-lessons/{id}`)
  - Success (200): `id`, `subject` `{id, name, slug, levels}`, `level`
    `{code, name}`, `starts_at` (ISO 8601 UTC), `completed`. A locked lesson
    can still be read.
  - 404: "Trial lesson not found" state.
  - 401: session-expired flow (stays loading, then
    `/login?expired=1&next=/trial-lesson/<id>/edit`).
  - 403: `studentAccessFallback()`'s state replaces the page.
  - Other failures (5xx, 502/504, network, invalid response): an inline
    error panel with Try again (refetch) in place of the form.
- `GET /availability/` (through `useTrialAvailability({ ownStartsAt })`;
  spec 22): same handling as spec 28 (401 flow, 403 fallback, inline retry
  where the picker goes).
- `GET /schedule/` (spec 21): already read by the dashboard and
  `/trial-lesson/new`; its `trial_lesson.id` gives the Edit link's target.
- `PATCH /trial-lessons/{id}/` (through `PATCH /api/student/trial-lessons/{id}`)
  - Body: `{ subject: <id>, level: <code>, starts_at: "<ISO 8601 UTC, full hour, future>" }`.
  - Success (200): the updated trial lesson. Only success matters; nothing
    from the body is shown.
  - 400 field errors `{subject|level|starts_at: [msgs]}`: on their fields.
  - 400 "This timeslot is already booked.": the "slot was just taken" flow.
  - Other 400 `non_field_errors` (clash with a weekly class, level not
    offered by the subject): form-level message.
  - 403 `{detail}` (locked: completed, or started meanwhile): form-level
    message with the backend's text.
  - 404 (cancelled meanwhile): form-level message (the normalized
    `{detail}`, or the generic fallback).
  - 401: session-expired flow; the mutation stays pending.
  - 502/504/5xx/network: the safe `StudentApiError` message at form level.

## Behavior
1. **Guest:** redirected to `/login?next=/trial-lesson/<id>/edit`; back
   here after logging in.
2. **Before mount:** the heading and back link render at once; the lesson
   loads in the browser.
3. **Loading the lesson:** a static loading state in place of the form (no
   pulse or spinner, per Motion). The form isn't shown half-filled.
4. **Loaded, locked** (`completed`, or `starts_at` at or before now): the
   "can no longer be changed" message with a dashboard link; no form.
5. **Loaded, upcoming:** the form appears prefilled (see Scope), with the
   lesson's hour selected and marked "Yours" in the picker once
   availability loads. The picker opens on that hour's local date.
6. **Editing:** same field rules as spec 28. Picking another hour keeps the
   original hour selectable ("Yours"). New hours follow the 24-hour lead
   time; the original hour is exempt while it's in the future.
7. **Submitting:** Zod checks the values against the moment of submitting:
   a new hour that's now under 24 hours away gets the spec 28 lead-time
   message on the time field; the own hour is accepted if still in the
   future. Then "Saving…", form disabled, one request only.
8. **Success:** schedule, availability and the lesson's query invalidated,
   toast "Trial lesson updated.", navigation to `/dashboard`, which shows
   the Free trial card with the new details.
9. **Slot taken (400 "already booked") or cleared by a background
   refetch:** the spec 28 notice and behaviour. The own hour is never
   cleared this way, since it's `own`, not `taken`.
10. **Locked meanwhile (403 from PATCH):** the backend's message in the
    form-level alert; the form stays filled.
11. **Not found (404 on load, or a malformed id):** "Trial lesson not
    found" with a dashboard link; no form, no availability errors shown.
12. **Other errors:** per Backend contract; the form stays filled and can
    be submitted again.
13. **Session gone (401)** on any read or the save: the session-expired
    flow, no error flash.
14. **Admin account (403 on the lesson or availability read):**
    `StudentAccountNeeded` replaces the page (its own `h1`).
15. **Leaving without saving:** nothing changes; no confirmation dialog.

## Time handling
- The loaded `starts_at` is UTC; it goes into the picker (`value` and
  `ownStartsAt`) and the availability hook unconverted. The picker shows it
  in local time per spec 24 (local date tabs, clock-change labels).
- The form sends the picker's UTC `starts_at` unchanged.
- The locked test compares `starts_at` with "now" as instants, with "now"
  taken once after mount (never in the prerender).
- The 24-hour lead time is measured from the moment of submitting, as in
  spec 28; the own hour is exempt while it's in the future.
- The Edit links' accessible names use the same local date and hour the
  Free trial card shows (`formatTrialDateTime()`).

## UI notes
- Same layout as `/trial-lesson/new`: functional page, no lattice or
  illustrations, max width 72rem, 16px mobile gutter, picker capped at
  `max-w-4xl`.
- Use the frontend-design skill before writing the UI (the Edit links, the
  not-found, locked and loading states), within the Design section.
- "Trial lesson not found" and the locked message: the existing panel style
  (`SubjectsPanel` frame, as spec 26's "Class not found") with a link to the
  dashboard; no illustration, and the locked message uses no warning fill
  (spec 31 owns the locked styling).
- Edit link on the Free trial card: a quiet primary link, at least 44px
  tall on mobile, that keeps the card's eosin "Free trial" look. Spec 30
  will add Cancel next to it, so leave room for a second action.
- On `/trial-lesson/new`'s booked state, Edit sits with the existing
  actions ("Go to dashboard") without displacing them as the primary
  action.
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] As a guest, opening `/trial-lesson/5/edit` redirects to `/login?next=/trial-lesson/5/edit` (encoded), and after logging in the edit page opens _(verified in code — check in browser)_
- [x] With an upcoming trial, the dashboard's Free trial card has an Edit link to `/trial-lesson/<id>/edit`, with an accessible name naming the subject and local date and hour _(verified in code — check in browser)_
- [x] `/trial-lesson/new` with an existing upcoming trial, and right after booking one, shows an Edit link to that trial's edit page _(verified in code — check in browser)_
- [x] A completed or past trial has no Edit link on the dashboard or `/trial-lesson/new` _(verified in code — check in browser)_
- [x] The edit page shows a loading state, then the form prefilled with the lesson's subject, level and hour _(verified in code — check in browser)_
- [x] In the picker, the lesson's own hour is selected and marked "Yours", and stays selectable after picking another hour _(verified in code — check in browser)_
- [x] The student's weekly class hours show as "Yours" and can't be selected; other students' bookings show as taken _(verified in code — check in browser)_
- [x] With the trial less than 24 hours away, the form still loads, its own hour is selected, and changing only the level saves successfully _(verified in code — check in browser)_
- [x] A new hour less than 24 hours away can't be picked, and one that becomes less than 24 hours away while the page is open is refused at submit with the lead-time message _(verified in code — check in browser)_
- [x] Changing only the subject and level and saving sends `PATCH /api/student/trial-lessons/<id>` with `subject`, `level` and `starts_at`, and Django receives `PATCH /trial-lessons/<id>/` _(verified in code — check in browser)_
- [x] Moving the trial to a free hour and saving shows "Trial lesson updated." and the dashboard shows it at the new local date and hour _(verified in code — check in browser)_
- [x] Changing the subject follows the booking rules (single level auto-picked, unavailable level cleared) _(verified in code — check in browser)_
- [x] Saving with nothing changed succeeds and returns to the dashboard _(verified in code — check in browser)_
- [x] While saving, the button shows "Saving…" and double-clicking sends only one request _(verified in code — check in browser)_
- [x] When another student books the new hour first, saving shows the "slot was just taken" notice, refetches availability and clears the selection; the other fields stay filled _(verified in code — check in browser)_
- [x] A clash with a weekly class or another `non_field_errors` message shows in the form-level alert _(verified in code — check in browser)_
- [x] Marking the trial completed in Django admin while the edit page is open, then saving, shows the backend's 403 message in the form-level alert _(verified in code — check in browser)_
- [x] Opening the edit page for a completed or already-started trial shows the "can no longer be changed" message with a dashboard link and no form _(verified in code — check in browser)_
- [x] `/trial-lesson/abc/edit`, a deleted trial's id and another student's trial id show "Trial lesson not found" with a dashboard link _(verified in code — check in browser)_
- [x] With Django stopped, loading the page shows an inline error with Try again; saving shows a safe form-level message _(verified in code — check in browser)_
- [x] With a forged `access` cookie Django rejects, the page ends on `/login?expired=1&next=/trial-lesson/<id>/edit` with no error flash _(verified in code — check in browser)_
- [x] Logged in as an admin account, the page shows "Student account needed" _(verified in code — check in browser)_
- [x] After saving, going back to the edit page doesn't show "Saving…" or the old values _(verified in code — check in browser)_
- [x] The tab title is "Edit trial lesson" with the site suffix, and the page has `noindex` _(verified in code — check in browser)_
- [x] `/trial-lesson/new` still books a trial lesson as before _(verified in code — check in browser)_
- [x] The page and the Edit links work on a 360px-wide screen with no sideways scrolling, and on desktop in light and dark themes _(verified in code — check in browser)_
- [x] The form and Edit links are fully usable with the keyboard, and errors are announced _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture describes the trial edit page and its Edit links
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Dynamic `[id]` under Cache Components:** as in spec 26, trial ids are
  only known per request, so the page keeps a static shell and reads the id
  inside `<Suspense>` (spec 26's pattern in `app/classes/[id]/edit/`).
- **404 isn't documented:** CLAUDE.md lists 401 and 403 for
  `/trial-lessons/` but no 404 for an id that doesn't exist or belongs to
  another student. As in spec 26, any 404 status from
  `GET /trial-lessons/{id}/` is "Trial lesson not found", without relying on
  its body.
- **Lead-time check built for booking:** `trialLessonFormSchema()`
  (`app/trial-lesson/schema.ts`) refuses any `starts_at` under 24 hours
  away. Editing must exempt the lesson's own hour (while it's in the
  future), keeping booking unchanged.
- **Form built for booking:** spec 28's form hard-codes the button text,
  toast, POST, `?subject=` preselection and the `onBooked` context from
  `TrialLessonBooking`. Reusing it means making those depend on the mode,
  while keeping `/trial-lesson/new` unchanged.
- **The just-booked summary has no id:** spec 28 builds the "booked"
  confirmation from the values sent (`TrialLessonSummary` holds no `id`);
  the 201 body, when it passes `trialLessonSchema`, does. The Edit link on
  that state needs the id from the 201 body (or the refreshed schedule).
- **Boundary with spec 31:** roadmap row 31 says it hides edit and cancel
  for a locked trial and shows the 403 message. This spec already hides the
  Edit link for a locked trial, guards the edit page, and shows a PATCH 403
  in the normal form-level alert (CLAUDE.md › Student access guard). Spec 31
  is left with the locked display itself and any special styling of the 403
  message; its roadmap wording may need adjusting when it's written.
- **`TrialLessonCard` comment:** it says spec 31 adds the locked display;
  this spec adds only the Edit link, so that stays true.

## Open questions
None.
