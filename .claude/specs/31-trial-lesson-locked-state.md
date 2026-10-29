# Spec 31: Trial Lesson Locked State

- **Status:** Done
- **Created:** 2026-10-29
- **Completed:** 2026-10-30
- **Depends on:** 09-query-provider.md, 29-edit-trial-lesson.md, 30-cancel-trial-lesson.md

## Summary
A trial lesson is locked once it's marked completed in Django admin or its
start time has passed. The backend then refuses edits and cancellation with a
403. Specs 29 and 30 already hide Edit and Cancel for a locked trial. This
spec adds a clear locked display: a badge and status line on the Free trial
card, the card on the edit page's locked state, and a calm lock notice in
place of the red error when the backend refuses an edit or cancellation.

## User stories
- As a student, I want to see at a glance that my trial lesson is completed
  or has started so that I know why I can't change or cancel it.
- As a student, I want a clear explanation, not an error, when my edit or
  cancellation is refused because the trial is locked.

## Scope
- **Lock reason**, from the trial and "now" (taken once after mount, as
  now):
  - `completed` true → "completed" (wins over started).
  - Otherwise `starts_at` at or before "now" and less than 60 minutes ago
    (a trial lesson is always 60 minutes) → "started".
  - Otherwise `starts_at` 60 minutes or more before "now" → "past". It
    doesn't claim the lesson took place: only the tutor marks that.
  - Otherwise not locked: Edit and Cancel stay as specs 29 and 30 built them.
- **Free trial card (`TrialLessonCard`), locked:**
  - Next to the eosin "Free trial" badge, a full-radius badge in the warning
    fill with on-warning text and a lock icon: "Completed", "Started" or
    "Past".
  - A short muted status line below the date and time:
    - completed: "This trial lesson is complete, so it can no longer be
      changed or cancelled."
    - started: "This trial lesson has started, so it can no longer be
      changed or cancelled."
    - past: "This trial lesson's time has passed, so it can no longer be
      changed or cancelled."
  - No Edit or Cancel controls and no empty actions row.
  - The rest of the card is unchanged (eosin rule, subject, level, local
    date and hour, length, price).
  - Shown this way wherever the card shows a locked trial: the dashboard and
    `/trial-lesson/new`'s "You've already had your free trial." state (see
    Conflicts).
- **Edit page locked state (`TrialLocked`, `/trial-lesson/[id]/edit`):** the
  existing panel ("This trial lesson can no longer be changed", lock icon,
  "Go to dashboard"), with the Free trial card below it, showing its badge
  and status line when the loaded data shows the lock.
- **Lock notice:** one frontend wording, never the backend's 403 text:
  "This trial lesson has started or been completed, so it can no longer be
  changed or cancelled." Warning fill, on-warning text and a lock icon,
  styled like `SlotTakenNotice`.
- **403 from PATCH (edit page save):** not shown in the red form-level alert.
  The page switches to its locked state with the lock notice, and its heading
  is focused. `trialLessonQueryKey(id)` and `scheduleQueryKey` are
  invalidated.
- **403 from DELETE (dashboard cancel dialog):** the dialog shows the lock
  notice in place of the red alert. The solid destructive "Cancel trial
  lesson" button is removed, and "Keep trial lesson" becomes "Close" and
  takes focus; the dialog then closes as usual (Escape, outside click,
  Close). The description (the hour is released, this can't be undone) is
  hidden while the notice shows, so the dialog doesn't contradict itself. `scheduleQueryKey` is refetched now (the dashboard is mounted) and
  `trialLessonQueryKey(id)` is invalidated with `refetchType: "none"`. When
  the dialog closes, focus goes to the card's heading if the Cancel control
  is gone.
- **CLAUDE.md:** update Architecture (Student access guard, Student
  dashboard, Edit trial lesson, Cancel trial lesson) for the locked display
  and the 403 handling, and replace the "spec 31 owns…" notes. Update the
  comments in `TrialLessonCard`, `TrialLocked`, `TrialStatus` and
  `isTrialLessonLocked()` that point to this spec.

## Out of scope
- Hiding Edit and Cancel for a locked trial: already done by specs 29 and 30
  (see Conflicts).
- Switching a page to locked at the trial's start time while it's open.
  "Now" stays fixed per page load; acting after the start gets the 403
  handling above.
- Editing the trial lesson's form, fields or validation: spec 29.
- Cancelling an upcoming trial, its dialog and its success path: spec 30.
- Booking a trial lesson, or `/trial-lesson/new`'s headings, copy and
  actions: spec 28. Only the card inside its "past" state changes here.
- Weekly class edits and deletes: specs 26 and 27. Weekly classes have no
  lock.
- Marking a trial completed: Django admin only.

## Routes and pages
- `/dashboard` (student): the Free trial card's locked display and the cancel
  dialog's lock notice.
- `/trial-lesson/[id]/edit` (student): the locked state with the card, and the
  switch to it on a 403 from PATCH.
- `/trial-lesson/new` (student): unchanged, except that the "past" state's
  card shows the badge and status line.
- Guests are sent to `/login?next=…` by the proxy and admin accounts see
  `StudentAccountNeeded`, as now.

## Backend contract
- `GET /schedule/` and `GET /trial-lessons/{id}/` (through
  `/api/student/…`): the trial lesson's `id`, `subject {id, name, slug,
  levels}`, `level {code, name}`, `starts_at` (ISO 8601 UTC) and
  `completed`. Already loaded by the pages.
- `PATCH /trial-lessons/{id}/` and `DELETE /trial-lessons/{id}/`: 403 with a
  message when the trial is completed or `starts_at` is at or before now.
  The message isn't shown; the frontend wording is used. Other responses are
  handled as specs 29 and 30 do now.
- A 403 from these mutations means the lock. The admin-account 403 only
  happens on reads, which `studentAccessFallback()` already handles.
- No other endpoint, no new fields.

## Behavior
1. **Dashboard, completed trial:** the card shows the "Completed" badge and
   line, no Edit or Cancel.
2. **Dashboard, started trial (not completed, within its 60 minutes):** the
   "Started" badge and line, no Edit or Cancel.
3. **Dashboard, past trial (not completed, its 60 minutes over):** the "Past"
   badge and line, no Edit or Cancel.
4. **Dashboard, upcoming trial:** unchanged.
5. **Cancel refused (403):** the dialog shows the lock notice with only
   "Close". The schedule refetches; if it now shows the lock, the card
   behind shows its badge and line. Closing returns focus to the opener if
   it's still there, else to the card's heading.
6. **Edit page, lesson locked on load:** the locked state with the card. No
   form.
7. **Save refused (403):** the edit page switches to the locked state with
   the lock notice, heading focused. The form is gone, so no "Saving…" is
   left behind. Coming back to the page later (`<Activity>`) shows what the
   refreshed lesson data says.
8. **`/trial-lesson/new`, past trial:** the existing "past" state, with the
   badge and line on the card.
9. **Loading, empty and error states:** unchanged from specs 21, 28 and 29.
10. **Session gone (401)** during a mutation: the session-expired flow, as
   now, with no lock notice.

## Time handling
- The lock check compares `starts_at` (parsed with `parseStartsAt()`) with
  "now" as instants, as `isTrialLessonLocked()` does. "Now" is taken once
  after mount, never during the prerender.
- The card's date and hour stay in local time through
  `formatTrialDateTime()`.

## UI notes
- Use the frontend-design skill before writing the UI (the badge, status
  line, edit page locked state and lock notice), within the Design section.
  No new colours, radius values or motion.
- Warning only as a fill with on-warning text, always with the lock icon
  (Design › Colours). The badge matches the "Free trial" badge's size and
  full radius; the badges wrap on narrow screens.
- Eosin stays the card's accent. No destructive colours for the locked
  state: it isn't an error.
- The edit page's locked state stays within `max-w-4xl`.
- No tutor name or photo, no illustrations, no lattice.

## Acceptance criteria
- [x] A completed trial on the dashboard shows the "Completed" warning badge with a lock icon and the completed line, and no Edit or Cancel _(verified in code — check in browser)_
- [x] A started, not completed trial on the dashboard shows the "Started" badge and line, and no Edit or Cancel _(verified in code — check in browser)_
- [x] A trial whose 60 minutes are over and that isn't marked completed shows the "Past" badge and line, not "Started" _(verified in code — check in browser)_
- [x] An upcoming trial on the dashboard looks as before, with Edit and Cancel and no badge _(verified in code — check in browser)_
- [x] The badge uses the warning fill with on-warning text and an icon, in light and dark mode _(verified in code — check in browser)_
- [x] Marking the trial completed in Django admin, then confirming Cancel on the open dashboard, shows the lock notice in the dialog (frontend wording, not a red alert) _(verified in code — check in browser)_
- [x] After that 403 the confirm button is gone, "Close" closes the dialog, and the card shows "Completed" once the schedule refetches _(verified in code — check in browser)_
- [x] Opening the edit page for a completed or started trial shows the locked state with the card and its badge, and no form _(verified in code — check in browser)_
- [x] Marking the trial completed in Django admin while the edit form is open, then saving, switches to the locked state with the lock notice and focuses its heading _(verified in code — check in browser)_
- [x] After a refused save, the dashboard shows the trial as locked _(verified in code — check in browser)_
- [x] `/trial-lesson/new` with a past trial shows the existing "past" state, with the badge and line on the card _(verified in code — check in browser)_
- [x] Screen readers announce the badge text and status line on the card, and the lock notice _(verified in code — check in browser)_
- [x] No tutor name or photo appears
- [x] CLAUDE.md describes the locked display and the 403 handling
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Roadmap row 31** says this spec hides edit and cancel for a locked
  trial. Specs 29 and 30 already do that; this spec keeps it and adds the
  locked display and the 403 notice.
- **Spec 28's "past" state** shows a past trial with no warning styling,
  while Design › Colours lists warning for the locked trial lesson. Decided
  with the user: the card shows the warning badge wherever it shows a locked
  trial, including there. Spec 28's heading, copy and actions are unchanged.
- **CLAUDE.md › Student access guard** says a 403 from PATCH or DELETE goes
  to the form like any other error. This spec replaces that with the lock
  notice, and CLAUDE.md is updated to match.

## Open questions
None.
