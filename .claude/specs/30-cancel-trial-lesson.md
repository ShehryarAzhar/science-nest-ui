# Spec 30: Cancel Trial Lesson

- **Status:** Done
- **Created:** 2026-10-29
- **Completed:** 2026-10-29
- **Depends on:** 09-query-provider.md, 21-student-dashboard.md

## Summary
Students can cancel their upcoming free trial lesson from the dashboard. The
Free trial card gets a Cancel control next to its Edit link, which opens a
confirmation dialog that names the lesson. Confirming sends
`DELETE /trial-lessons/{id}/`. The schedule and availability are then
refreshed, the hour is freed, and the student can book a new trial later.

## User stories
- As a student, I want to cancel my free trial if I can't make it so that
  the tutor isn't waiting for me and the hour is freed.
- As a student, I want to confirm before the trial is cancelled, with the
  lesson named in the dialog, so that I don't cancel by mistake.
- As a student, I want the dashboard to update straight after cancelling so
  that I can see the trial is gone and book another one if I want.
- As a student, I want a clear message when cancelling fails so that I know
  the trial is still booked.

## Scope
- **Dashboard Cancel control** on the Free trial card (`TrialLessonCard`),
  in its `actions` row next to the existing Edit link (spec 29):
  - Shown only when the trial is upcoming and not completed (the same test
    as the Edit link, `isTrialLessonLocked()`). A locked trial gets neither
    control.
  - At least 44px tall, a quiet text-style control like the Edit link, with
    a trash or X icon. Not a solid destructive button: the solid
    destructive style is kept for the dialog's confirm button (Design ›
    Colours).
  - Its accessible name names the lesson the way the Edit link does:
    "Cancel free trial, <subject>, <local date and hour>".
- **Confirmation dialog**, using the existing `components/ui/dialog.tsx`
  (spec 27):
  - Title "Cancel free trial?".
  - Shows the lesson's subject, level and full local date and hour (as the
    card shows them).
  - Says that the hour is released and the booking can't be restored, and
    that the student can book a new free trial later (at least 24 hours
    ahead, if the hour is still free).
  - Two buttons: "Keep trial lesson" (closes, nothing sent; it gets initial
    focus) and a solid destructive "Cancel trial lesson" ("Cancelling…"
    while pending).
- **The cancel:** a TanStack mutation through `studentFetch`
  (`DELETE /api/student/trial-lessons/{id}`). It sends only one request
  (guarded against double clicks). While it's pending, the buttons are
  disabled and the dialog can't be closed (no Escape, no outside click, no
  Keep).
- **On success (2xx):**
  - The trial lesson is removed from the cached schedule at once, and
    `scheduleQueryKey` is refetched now (the dashboard is mounted).
  - `availabilityQueryKey` is invalidated with `refetchType: "none"`, and
    `trialLessonQueryKey(id)` is removed from the cache (see Conflicts).
  - The dialog closes and the success toast "Trial lesson cancelled."
    shows.
  - Focus moves to a sensible place (see Behavior).
- **Already gone (404):** treated as done, with the same cache updates as
  success and the info toast "This trial lesson was already cancelled."
- **On other failures:** the dialog stays open with a `role="alert"`
  message above its buttons, and the trial stays on the card.
- CLAUDE.md update: a short Architecture note (under Student dashboard or
  Edit trial lesson) on the Cancel control, dialog, mutation, invalidations
  and error handling. Also update the spec 29 note that leaves "room for
  spec 30's Cancel", and roadmap row 30's status once verified.

## Out of scope
- A Cancel control on `/trial-lesson/new`'s "Your free trial is booked."
  state or on `/trial-lesson/[id]/edit`. Cancelling is dashboard only
  (decided with the user).
- The fuller locked display for a past or completed trial: dashboard card
  styling, a lock notice, warning styling, and special display of the
  backend's 403 message: spec 31. Here a locked trial only gets no Cancel
  control, and a 403 from DELETE shows in the dialog like any other error.
- Editing the trial lesson: spec 29 (already built; only kept working).
- Booking a trial lesson: spec 28 (already built). After cancelling, the
  dashboard's existing "Book a free trial" link (spec 21's `BookingLinks`)
  is all that's offered.
- Deleting weekly classes: spec 27.
- Blocking a cancel inside the 24-hour lead time, a cancellation reason,
  messaging the tutor, or undo.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
- `/dashboard` (student only, spec 21): the Free trial card gains a Cancel
  control for an upcoming, not-completed trial, plus the confirmation
  dialog.
  - Guests are already redirected by `proxy.ts` to `/login?next=/dashboard`.
  - Admin accounts already see `StudentAccountNeeded`, with no schedule and
    so no Cancel control.
- No new routes.

## Backend contract
- `DELETE /trial-lessons/{id}/` (through
  `DELETE /api/student/trial-lessons/{id}`)
  - No request body.
  - Success: 2xx with no body (`studentFetch` resolves `undefined`).
  - 404 (cancelled meanwhile, e.g. in Django admin or another tab):
    treated as done (see Behavior step 6 and Conflicts).
  - 403 `{detail}`: the trial is locked (it started or was marked completed
    since the dashboard loaded). Shown in the dialog as a mutation error,
    not as `StudentAccountNeeded` (that's for reads only).
  - 401: the session-expired flow (`studentFetch` never settles, the
    mutation stays pending, then `/login?expired=1&next=/dashboard`).
  - 502/504/5xx/network: the safe `StudentApiError` message in the dialog.
- `GET /schedule/` (spec 21, through `scheduleQueryOptions()`): refetched
  after the cancel. Afterwards `trial_lesson` is `null`.
- `GET /availability/`: not read on the dashboard. Its query is only
  invalidated, so the next picker mount shows the freed hour.
- `GET /trial-lessons/{id}/`: not called here. Its query
  (`trialLessonQueryKey(id)`) is only removed from the cache.

## Behavior
1. **Opening:** clicking (or pressing Enter or Space on) the card's Cancel
   control opens the dialog. Focus moves into the dialog, on "Keep trial
   lesson", so Enter never cancels by accident.
2. **Keeping:** "Keep trial lesson", Escape or a click outside closes the
   dialog without a request, and focus returns to the Cancel control.
3. **Cancelling:** "Cancel trial lesson" sends one `DELETE`. The button
   shows "Cancelling…", both buttons are disabled, and the dialog can't be
   closed until the request settles.
4. **Success:**
   - The dialog closes and the toast "Trial lesson cancelled." shows.
   - The Free trial card disappears, and the booking links show "Book a
     free trial" again.
   - With no weekly classes, the dashboard shows its empty state (spec 21).
   - Focus moves to the "Weekly classes" heading, or to the empty state's
     heading.
   - The freed hour is free in the weekly and trial pickers the next time
     they mount.
5. **Failure (403, 5xx, 502/504, network):** the dialog stays open with the
   normalized error's form message (`role="alert"`). "Cancel trial lesson"
   can be pressed again. A 403 shows the backend's `detail` (e.g. the trial
   has already started). Spec 31 decides any special handling.
6. **Already gone (404):** treated as done. The dialog closes, the schedule
   refetches (the trial is gone), and the info toast "This trial lesson was
   already cancelled." shows instead of an error.
7. **Session gone (401):** the session-expired flow. The dialog stays
   pending until the redirect, with no error flash.
8. **Background schedule refetch while the dialog is open:** if the
   schedule no longer holds that trial lesson (or holds a different one),
   the dialog closes without a request.
9. **Becoming locked while the dashboard is open:** the Cancel control
   follows the dashboard's single "now" (taken once on mount, as the Edit
   link does), so it may still show after the start time. The backend's
   403 then appears in the dialog (step 5).
10. **Hidden pages (Activity):**
    - A `/trial-lesson/{id}/edit` page left hidden for the cancelled lesson
      shows "Trial lesson not found" (spec 29) when it's shown again,
      because its query was removed.
    - A hidden `/trial-lesson/new` shows the booking form again once its
      schedule refetches, since `trial_lesson` is now `null`.

## Time handling
- The dialog and the control's accessible name show the trial's
  `starts_at` in the student's local time with `formatTrialDateTime()`
  (`lib/time-zone.ts`). This is the same full local weekday, date and hour
  as the card, rendered only in the browser once the zone is known (the
  dashboard already works this way).
- The "upcoming" test compares `starts_at` with the dashboard's "now" as
  instants (`isTrialLessonLocked()`).
- No local → UTC conversion. Nothing is sent but the id.

## UI notes
- The Cancel control sits in the card's existing bordered `actions` row,
  after Edit, with the same 44px height and spacing. On narrow screens the
  row wraps, and both stay at least 44px.
- The dialog follows spec 27's `DeleteClassDialog` layout and tokens:
  - 16px radius, the one elevation, 180ms fade and scale (instant under
    reduced motion).
  - The lesson's details sit in a quiet block (eosin accent allowed, since
    it's the trial lesson; no warning fill).
  - Buttons in the footer: "Keep trial lesson" as outline, "Cancel trial
    lesson" as solid destructive. They stack full width on mobile.
- Use the shadcn components already in `components/ui/` (`dialog`,
  `button`, `sonner`'s `toast` from `@/components/ui/sonner`). No new
  components need adding.
- No hex lattice or illustration on the card or the dialog. No tutor name
  or photo.

## Acceptance criteria
- [x] On `/dashboard`, an upcoming, not-completed trial lesson's Free trial
      card shows a Cancel control after the Edit link, at least 44px tall. _(verified in code — check in browser)_
- [x] A past or completed trial lesson's card shows neither Edit nor Cancel. _(verified in code — check in browser)_
- [x] The Cancel control's accessible name is "Cancel free trial,
      <subject>, <local date and hour>". _(verified in code — check in browser)_
- [x] Clicking Cancel opens a dialog titled "Cancel free trial?" showing the
      subject, level and local date and hour, with "Keep trial lesson"
      focused. _(verified in code — check in browser)_
- [x] "Keep trial lesson", Escape and an outside click close the dialog
      without a network request, and focus returns to the Cancel control. _(verified in code — check in browser)_
- [x] "Cancel trial lesson" sends exactly one
      `DELETE /api/student/trial-lessons/{id}`, even on a double click, and
      shows "Cancelling…" with both buttons disabled. _(verified in code — check in browser)_
- [x] While the request is pending, Escape and an outside click don't close
      the dialog. _(verified in code — check in browser)_
- [x] On success the dialog closes, "Trial lesson cancelled." toasts, the
      Free trial card disappears, and "Book a free trial" appears in the
      booking links. _(verified in code — check in browser)_
- [x] With no weekly classes, cancelling shows the dashboard's empty state. _(verified in code — check in browser)_
- [x] After cancelling, focus lands on the "Weekly classes" heading, or on
      the empty state's heading. _(verified in code — check in browser)_
- [x] After cancelling, `/trial-lesson/new` shows the booking form, and the
      cancelled hour is free in its trial picker. _(verified in code — check in browser)_
- [x] After cancelling, the cancelled hour's weekly slot is free in
      `/classes/new`'s picker. _(verified in code — check in browser)_
- [x] Opening the old `/trial-lesson/{id}/edit` URL afterwards shows "Trial
      lesson not found". _(verified in code — check in browser)_
- [x] A trial already cancelled elsewhere (e.g. in Django admin) gives a
      404 on confirm. The dialog closes, "This trial lesson was already
      cancelled." toasts, and the card disappears. _(verified in code — check in browser)_
- [x] A trial marked completed in Django admin after the dashboard loaded
      returns 403 on confirm. The backend's message shows in the dialog
      (`role="alert"`) and the card stays. _(verified in code — check in browser)_
- [x] A backend outage shows the error in the dialog, and pressing "Cancel
      trial lesson" again retries. _(verified in code — check in browser)_
- [x] With the session expired (both cookies removed), confirming
      redirects to `/login?expired=1&next=/dashboard` with no error flash. _(verified in code — check in browser)_
- [x] The dialog and the Cancel control work in both light and dark themes
      and on a 360px-wide screen. _(verified in code — check in browser)_
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- CLAUDE.md documents no 404 body for `DELETE /trial-lessons/{id}/`.
  Treating any 404 as "already cancelled" follows spec 27's handling of
  `DELETE /classes/{id}/`.
- Roadmap row 31 says spec 31 hides edit and cancel for a locked trial.
  The Edit link already hides for a locked trial (spec 29), so this spec
  hides Cancel the same way. Spec 31 is left with the locked display and
  the 403 message presentation.

- Invalidating `trialLessonQueryKey(id)` isn't enough. The edit page
  (spec 29) shows the form whenever its query has data, and TanStack keeps
  the old data when a refetch returns 404, so a previously visited edit
  page would never show "Trial lesson not found". Decided with the user:
  the query is removed instead. Spec 27's class edit page has the same
  latent issue; it's out of scope here.

## Open questions
None.
