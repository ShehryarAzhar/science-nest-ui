# Spec 26: Edit Weekly Class

- **Status:** Done
- **Created:** 2026-10-29
- **Completed:** 2026-10-29
- **Depends on:** 09-query-provider.md, 25-book-weekly-class.md

## Summary
The `/classes/[id]/edit` page lets a student change one of their weekly
classes: its subject, level, duration or weekday + hour. It loads the class
from `GET /classes/{id}/`, prefills the same form spec 25 uses for booking,
keeps the class's own slot selectable in the picker (marked "Yours"), and
saves with `PATCH /classes/{id}/`. Students reach it from an Edit link on
each class in their dashboard schedule.

## User stories
- As a student, I want to move my weekly class to another time so that it
  fits a change in my week.
- As a student, I want to change the duration, level or subject of a class
  so that it matches what I need now, without cancelling and rebooking.
- As a student, I want my class's current time shown as mine and still
  selectable so that I can change something else and keep the time.
- As a student, I want to see the weekly price of the edited class before
  saving so that I know what it will cost.
- As a student whose new time was just taken, I want a clear notice and
  fresh availability so that I can pick another one.
- As a student, I want a clear message when the class no longer exists
  (deleted, or not mine) rather than an error.
- As a student, I want an Edit link on each class in my dashboard so that I
  can find this page.

## Scope
- A new student route `/classes/[id]/edit`. `proxy.ts` already protects
  `/classes` and everything under it, and `robots.ts` already disallows it.
- **Loading the class:** `GET /api/student/classes/{id}` through
  `studentFetch`, Zod-checked (the weekly class fields: `id`, `subject`
  `{id, name, slug, levels}`, `level` `{code, name}`, `day`, `time`,
  `duration`; never `day_display`), with `day` and `time` run through the
  `lib/time-zone.ts` parsers like the schedule and availability checks.
- **The form:** spec 25's weekly class form (subject, level, duration, time,
  weekly price summary, form-level alert, submit), reused rather than
  copied, prefilled from the loaded class:
  - subject: the class's subject id, matched against the `getSubjects()`
    list; if that subject is no longer in the list, nothing is preselected
    and the student must choose one;
  - level: the class's level code, if it's one of the subject's current
    levels; otherwise cleared;
  - duration: the class's duration;
  - time: the class's UTC `day` + `time`.
  The same subject and level rules as booking apply after prefill (a single
  level is auto-picked, a level the new subject lacks is cleared). No
  `?subject=` preselection on this page.
- **Own slot:** `useWeeklyAvailability({ ownSlot })` with the class's
  loaded `day` + `time`, so that slot shows "Yours" and stays selectable,
  even after the student picks another slot.
- **Save:** a TanStack mutation through `studentFetch`
  (`PATCH /api/student/classes/{id}`) with `subject` (id), `level` (code),
  `day`, `time` (UTC) and `duration`. Pending state, form disabled, one
  request only (as in spec 25). Saving with nothing changed is allowed and
  behaves like any other save.
- **On success:** invalidate `scheduleQueryKey`, `availabilityQueryKey`
  and this class's own query, show a success toast ("Weekly class
  updated."), go to `/dashboard`.
- **"Slot was just taken" notice and other errors:** exactly as spec 25
  (warning notice + availability refetch for "This timeslot is already
  booked.", `applyServerErrors()` with `day`/`time` renamed onto the time
  field, form-level alert for the rest).
- **Class not found:** a non-numeric `[id]`, or a 404 from
  `GET /classes/{id}/` (deleted, or another student's), shows a "Class not
  found" message with a link to the dashboard instead of the form.
- **Dashboard entry point:** an "Edit" link to `/classes/{id}/edit` for each
  weekly class, in both `WeekGrid` (desktop) and `DayList` (mobile), with an
  accessible name that names the class (subject, local weekday and time).
- Page metadata: title "Edit weekly class" (root title template) and
  `robots: { index: false }`.
- A link back to the dashboard and the heading "Edit weekly class"; submit
  button "Save changes" (pending "Saving…").
- CLAUDE.md update: a short Architecture note on the edit page (load,
  prefill, own slot, PATCH, invalidations, not-found state, dashboard Edit
  links), and roadmap row 26's status when verified.

## Out of scope
- Deleting a weekly class, its confirmation dialog or a delete control on
  the dashboard or this page: spec 27.
- Booking a weekly class: spec 25 (already built; only reused here).
- Booking, editing, cancelling or locking the trial lesson: specs 28–31.
- Changes to the slot picker's layout or states (spec 23) or the
  availability rules (spec 22).
- An "unsaved changes" warning when leaving the page.
- Showing a price difference between the old and new class, or any price
  the backend doesn't return.
- Editing several classes at once.
- A time zone picker.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
- `/classes/[id]/edit` (student only)
  - Guest: `proxy.ts` redirects to `/login?next=/classes/<id>/edit`, and
    the student returns here after logging in.
  - Student, own class: heading "Edit weekly class", the prefilled form and
    a link back to the dashboard.
  - Student, unknown, deleted or someone else's class (or non-numeric id):
    "Class not found" with a link to the dashboard.
  - Admin account (no Student profile): `StudentAccountNeeded` instead of
    the page.
- `/dashboard` (spec 21): gains an "Edit" link on each weekly class.

## Backend contract
- `GET /subjects/` (public, through `getSubjects()`, cached; spec 16)
  - Uses `id`, `name`, `slug`, `levels`, `price_40_min`, `price_60_min`.
  - Failure: the subjects error panel replaces the form, as in spec 25.
- `GET /classes/{id}/` (through `GET /api/student/classes/{id}`)
  - Success (200): `id`, `subject` `{id, name, slug, levels}`, `level`
    `{code, name}`, `day`, `day_display` (never shown), `time`
    (`"HH:MM:SS"`, UTC), `duration`.
  - 404: "Class not found" state.
  - 401: session-expired flow (stays loading, then
    `/login?expired=1&next=/classes/<id>/edit`).
  - 403: `studentAccessFallback()`'s state replaces the page.
  - Other failures (5xx, 502/504, network, invalid response): an inline
    error panel with Try again (refetch) in place of the form.
- `GET /availability/` (through `useWeeklyAvailability({ ownSlot })`;
  spec 22): same handling as spec 25 (401 flow, 403 fallback, inline retry
  where the picker goes).
- `PATCH /classes/{id}/` (through `PATCH /api/student/classes/{id}`)
  - Body: `{ subject: <id>, level: <code>, day: "monday"…"sunday",
    time: "HH:00:00" (UTC), duration: 40 | 60 }`.
  - Success (200): the updated class. Only success matters; nothing from
    the body is shown.
  - 400 field errors `{subject|level|day|time|duration: [msgs]}`: on their
    fields (day and time on the time field).
  - 400 "This timeslot is already booked.": the "slot was just taken" flow.
  - Other 400 `non_field_errors` (clash with an upcoming trial lesson,
    level not offered by the subject): form-level message.
  - 404 (the class was deleted meanwhile): form-level message (the normalized
    `{detail}`, or the generic fallback).
  - 401: session-expired flow; the mutation stays pending.
  - 403 `{detail}`: form-level message.
  - 502/504/5xx/network: the safe `StudentApiError` message at form level.

## Behavior
1. **Guest:** redirected to `/login?next=/classes/<id>/edit`; back here
   after logging in.
2. **Before mount:** the heading and back link render at once; the class
   loads in the browser.
3. **Loading the class:** a static loading state in place of the form (no
   pulse or spinner, per Motion). The form isn't shown half-filled.
4. **Loaded:** the form appears prefilled (see Scope), with the class's
   slot selected and marked "Yours" in the picker once availability loads.
   The picker opens on the selected slot's local day (spec 23's rule).
5. **Editing:** same field rules and Zod validation as spec 25. Picking
   another slot keeps the original slot selectable ("Yours").
6. **Submitting:** button "Saving…", form disabled, one request only.
7. **Success:** schedule, availability and the class query invalidated,
   toast "Weekly class updated.", navigation to `/dashboard`, which shows
   the class with its new details and the weekly cost updated.
8. **Slot taken (400 "already booked") or cleared by a background refetch:**
   the spec 25 notice and behaviour. The original own slot is never cleared
   this way, since it's `own`, not `taken`.
9. **Class not found (404 or non-numeric id):** "Class not found" with a
   dashboard link; no form, no availability errors shown.
10. **Other errors:** per Backend contract; the form stays filled and can be
    submitted again.
11. **Session gone (401)** on any read or the save: the session-expired
    flow, no error flash.
12. **Admin account (403 on the class or availability read):**
    `StudentAccountNeeded` replaces the page (its own `h1`).
13. **Leaving without saving:** nothing changes; no confirmation dialog.

## Time handling
- The loaded class's `day` + `time` are UTC; they go into the picker
  (`value` and `ownSlot`) unconverted. The picker shows them in local time
  per spec 23 (next-occurrence rule, clock-change labels).
- The form sends the picker's UTC `day` + `"HH:00:00"` unchanged.
- The dashboard Edit link's accessible name uses the same local weekday and
  time the schedule already shows. `day_display` is never shown.

## UI notes
- Same layout as `/classes/new`: functional page, no lattice or
  illustrations, max width 72rem, 16px mobile gutter, picker capped at
  `max-w-4xl`.
- Use the frontend-design skill before writing the UI (the edit link on the
  dashboard and the not-found and loading states), within the Design
  section.
- "Class not found": the existing panel style (`SubjectsPanel` frame) with
  a link to the dashboard; it carries no illustration.
- Dashboard Edit link: a quiet primary link per class, at least 44px tall on
  mobile (`DayList`). On the desktop `WeekGrid`, a 40-minute block is
  96 × 40/60 = 64px tall and already holds three lines; how the link fits
  (e.g. the whole block as the link, or a small control) is decided in
  planning, keeping the grid compact (no taller hour rows). Spec 27 will add
  delete next to it, so leave room for a second action.
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] As a guest, opening `/classes/5/edit` redirects to `/login?next=/classes/5/edit` (encoded), and after logging in the edit page opens _(verified in code — check in browser)_
- [x] Each weekly class on the dashboard (week grid on desktop, day list on mobile) has an Edit link to `/classes/<id>/edit`, with an accessible name naming the subject, weekday and time _(verified in code — check in browser)_
- [x] The edit page shows a loading state, then the form prefilled with the class's subject, level, duration and time _(verified in code — check in browser)_
- [x] In the picker, the class's own slot is selected and marked "Yours", and stays selectable after picking another slot _(verified in code — check in browser)_
- [x] The student's other weekly classes and their trial lesson's slot show as "Yours" and can't be selected; other students' slots show as taken _(verified in code — check in browser)_
- [x] Changing only the duration and saving sends `PATCH /api/student/classes/<id>` with all five fields, and Django receives `PATCH /classes/<id>/` _(verified in code — check in browser)_
- [x] Moving the class to a free slot and saving shows "Weekly class updated." and the dashboard shows it at the new local time _(verified in code — check in browser)_
- [x] Changing subject and level follows the booking rules (single level auto-picked, unavailable level cleared), and the weekly price summary updates _(verified in code — check in browser)_
- [x] Saving with nothing changed succeeds and returns to the dashboard _(verified in code — check in browser)_
- [x] While saving, the button shows "Saving…" and double-clicking sends only one request _(verified in code — check in browser)_
- [x] When another student books the new slot first, saving shows the "slot was just taken" notice, refetches availability and clears the selection; the other fields stay filled _(verified in code — check in browser)_
- [x] A clash with the trial lesson or another `non_field_errors` message shows in the form-level alert _(verified in code — check in browser)_
- [x] `/classes/abc/edit`, a deleted class's id and another student's class id show "Class not found" with a dashboard link _(verified in code — check in browser)_
- [x] Deleting the class in Django admin while the edit page is open, then saving, shows a form-level message _(verified in code — check in browser)_
- [x] With Django stopped, loading the page shows an inline error with Try again; saving shows a safe form-level message _(verified in code — check in browser)_
- [x] With a forged `access` cookie Django rejects, the page ends on `/login?expired=1&next=/classes/<id>/edit` with no error flash _(verified in code — check in browser)_
- [x] Logged in as an admin account, the page shows "Student account needed" _(verified in code — check in browser)_
- [x] The tab title is "Edit weekly class" with the site suffix, and the page has `noindex` _(verified in code — check in browser)_
- [x] `/classes/new` still books classes as before _(verified in code — check in browser)_
- [x] The page and the dashboard Edit links work on a 360px-wide screen with no sideways scrolling, and on desktop in light and dark themes; the week grid keeps its 96px hour height _(verified in code — check in browser)_
- [x] The form and Edit links are fully usable with the keyboard, and errors are announced _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture describes the edit page and the dashboard Edit links
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Dynamic `[id]` under Cache Components:** the id is only known per
  request and there's no list to prerender from (`generateStaticParams`
  can't know students' class ids, and an empty list is rejected). The page
  must keep a static shell and read the id where dynamic access is allowed
  (inside `<Suspense>`, or in the browser); planning checks
  `node_modules/next/dist/docs/` for the right pattern.
- **404 isn't documented:** CLAUDE.md lists 401 and 403 for `/classes/`
  but not a 404 for an id that doesn't exist or belongs to another
  student. This spec treats any 404 status from `GET /classes/{id}/` as
  "Class not found", without relying on its body.
- **Form built for booking:** spec 25's form hard-codes the booking
  heading, button text, toast, POST and `?subject=` preselection. Reusing
  it means making those depend on the mode, while keeping `/classes/new`
  unchanged.
- **Week grid space:** a 40-minute block already fits exactly three lines
  at 96px per hour, and the user rejected a taller grid. The Edit control
  must fit without changing the hour height.

## Open questions
None.
