# Spec 27: Delete Weekly Class

- **Status:** Done
- **Created:** 2026-10-29
- **Completed:** 2026-10-29
- **Depends on:** 09-query-provider.md, 21-student-dashboard.md

## Summary
Students can delete one of their weekly classes from the dashboard. Each
class in the schedule gets a Delete control that opens a confirmation
dialog naming the class. Confirming sends `DELETE /classes/{id}/`, after
which the schedule, the weekly cost and the availability are refreshed, so
the freed slot can be booked again.

## User stories
- As a student, I want to delete a weekly class I no longer need so that I
  stop being booked (and charged) for it.
- As a student, I want to confirm before a class is deleted, with the class
  named in the dialog, so that I don't delete the wrong one by mistake.
- As a student, I want my schedule and weekly cost to update straight after
  deleting so that I can see the change.
- As a student, I want a clear message when the delete fails so that I know
  the class is still booked.

## Scope
- **Dashboard Delete control** for every weekly class, in both layouts:
  - `DayList` (below `lg`): a visible "Delete" control beside the existing
    "Edit" link in the row's right column, at least 44px tall.
  - `WeekGrid` (`lg` and up): a small trash icon button in the block's
    top-right corner, layered above the stretched Edit link (spec 26), so
    clicking the icon never opens the edit page and clicking the rest of
    the block still does. The subject line truncates to make room. The
    hour height stays 96px.
  - Accessible name naming the class the way the Edit link does: "Delete
    <subject>, <local weekday> <time>".
- **Confirmation dialog** (one at a time): title "Delete weekly class?",
  the class's subject, level, local weekday and time range and weekly
  price, a sentence saying the slot is released and can't be restored
  (rebooking is possible only if it's still free), and two buttons:
  "Keep class" (closes, nothing sent) and a solid destructive "Delete
  class" (pending "Deleting…").
- **The delete:** a TanStack mutation through `studentFetch`
  (`DELETE /api/student/classes/{id}`), one request only (a guard against
  double clicks), the dialog's buttons disabled and the dialog kept open
  while pending.
- **On success (204):** close the dialog, invalidate `scheduleQueryKey`
  (refetched at once, since the dashboard is mounted),
  `availabilityQueryKey` and that class's `weeklyClassQueryKey(id)`; show
  a success toast "Weekly class deleted."; focus moves to a sensible place
  (the schedule's heading, or the next class's control).
- **On failure:** the dialog stays open with a `role="alert"` message
  above its buttons; the class stays in the schedule.
- A new `components/ui/` dialog component added with shadcn (base-vega,
  Base UI), restyled to the Design tokens (16px radius, the single
  elevation, 180ms fade and scale, instant under reduced motion).
- CLAUDE.md update: a short Architecture note under Student dashboard (the
  Delete controls, dialog, mutation, invalidations, error handling), the UI
  stack line for the dialog component, and roadmap row 27's status when
  verified.

## Out of scope
- A Delete button on the edit page (`/classes/[id]/edit`): delete stays on
  the dashboard only (decided with the user).
- Editing a weekly class: spec 26 (already built; its Edit links are only
  kept working here).
- Booking a weekly class: spec 25.
- Cancelling the trial lesson, its dialog or its locked state: specs 30
  and 31. The dialog component added here is reused there, but no trial
  lesson control is added.
- Booking or editing the trial lesson: specs 28 and 29.
- Undo after deleting, deleting several classes at once, or a "delete all".
- Any refund, billing or price message beyond the class's weekly price.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
- `/dashboard` (student only, spec 21): gains a Delete control on each
  weekly class and the confirmation dialog. Guests are already redirected
  by `proxy.ts` to `/login?next=/dashboard`; admin accounts already see
  `StudentAccountNeeded` (no schedule, so no Delete controls).
- No new routes.

## Backend contract
- `DELETE /classes/{id}/` (through `DELETE /api/student/classes/{id}`)
  - No request body.
  - Success: 2xx with no body (`studentFetch` resolves `undefined`).
  - 404 (deleted meanwhile, e.g. in Django admin or another tab): see
    Behavior step 6 and Conflicts.
  - 401: session-expired flow (`studentFetch` never settles, the mutation
    stays pending, then `/login?expired=1&next=/dashboard`).
  - 403 `{detail}`: a mutation error, shown in the dialog like any other
    error (not `StudentAccountNeeded`; that's for reads only).
  - 502/504/5xx/network: the safe `StudentApiError` message in the dialog.
- `GET /schedule/` (spec 21, through `scheduleQueryOptions()`): refetched
  after the delete; its rules are unchanged.
- `GET /availability/`: not read on the dashboard; its query is only
  invalidated so the next picker mount shows the freed slot.

## Behavior
1. **Opening:** clicking (or Enter/Space on) a class's Delete control opens
   the dialog for that class. On the week grid it doesn't navigate to the
   edit page. Focus moves into the dialog ("Keep class" first, so Enter
   never deletes by accident).
2. **Keeping:** "Keep class", Escape or clicking outside closes the dialog
   with no request, and focus returns to the Delete control that opened it.
   While a delete is pending, closing is disabled.
3. **Deleting:** "Delete class" sends one `DELETE`; the button shows
   "Deleting…" and both buttons are disabled.
4. **Success:** the dialog closes, the toast "Weekly class deleted." shows,
   and the schedule refetches: the class disappears from both layouts and
   the weekly cost drops by its price. Deleting the last class shows the
   dashboard's empty state (spec 21). The freed slot is free in the weekly
   and trial pickers the next time they mount.
5. **Failure (403, 5xx, 502/504, network):** the dialog stays open with the
   error message (`role="alert"`, via the normalized error's form message),
   and "Delete class" can be pressed again.
6. **Already gone (404):** treated as done: the dialog closes, the schedule
   refetches (the class is gone), and an info toast says "This class was
   already deleted." No error.
7. **Session gone (401):** the session-expired flow; no error flash.
8. **Background schedule refetch while the dialog is open:** if the class
   is no longer in the schedule, the dialog closes (no request).
9. **Hidden pages (Activity):** an `/classes/{id}/edit` page left hidden
   for the deleted class shows "Class not found" when it's shown again,
   because its query was invalidated (spec 26's 404 state).

## Time handling
- The dialog and the control's accessible name show the class's local
  weekday and time range exactly as the schedule shows them (the values
  `app/dashboard/local-schedule.ts` already computes, spec 21's
  next-occurrence rule). No new conversion; `day_display` is never shown.

## UI notes
- Use the frontend-design skill before writing the UI (the Delete
  controls and the dialog), within the Design section. Functional page: no
  lattice or illustrations in the dialog.
- Dialog: surface fill, 16px radius, the one popover/dialog elevation,
  180ms fade and scale (instant under `prefers-reduced-motion`), max width
  about 28rem, full width minus the 16px gutter on mobile. Title in Source
  Serif 4; the class details with `tabular-nums` for time and price. The
  confirm button uses the destructive fill with on-destructive text; the
  error message uses destructive text (never eosin). No `→` in buttons.
- Day list: "Delete" as a quiet control next to "Edit" (destructive text
  colour with a trash icon, or a muted control that's clearly separate from
  Edit), each at least 44px tall, no sideways scrolling at 360px.
- Week grid: a trash icon button about 24–28px in the block's top-right
  corner, on the block's tint, with a visible focus ring; it must stay
  usable in the narrow side-by-side lanes of an autumn clock-change week.
  The block's focus ring (spec 26) applies to the Edit link only; the icon
  has its own.
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] On mobile widths, each class in the day list has a "Delete" control next to "Edit", at least 44px tall, with an accessible name naming subject, weekday and time _(verified in code — check in browser)_
- [x] On desktop, each week-grid block has a trash icon button in its corner; clicking it opens the dialog, and clicking elsewhere on the block still opens the edit page _(verified in code — check in browser)_
- [x] The week grid keeps its 96px hour height, and a 40-minute block still shows subject, time, level and price _(verified in code — check in browser)_
- [x] The dialog names the class (subject, level, local weekday and time range, price) and focus starts on "Keep class" _(verified in code — check in browser)_
- [x] "Keep class", Escape and clicking outside close the dialog without a request, and focus returns to the Delete control _(verified in code — check in browser)_
- [x] "Delete class" sends `DELETE /api/student/classes/<id>`, and Django receives `DELETE /classes/<id>/` _(verified in code — check in browser)_
- [x] While deleting, the button shows "Deleting…", the dialog can't be closed, and double-clicking sends only one request _(verified in code — check in browser)_
- [x] After deleting, "Weekly class deleted." shows, the class is gone from the schedule and the weekly cost drops by its price _(verified in code — check in browser)_
- [x] Deleting the last class shows the dashboard's empty state _(verified in code — check in browser)_
- [x] After deleting, `/classes/new` shows the freed slot as free _(verified in code — check in browser)_
- [x] Deleting a class already removed in Django admin closes the dialog, shows "This class was already deleted." and the class disappears _(verified in code — check in browser)_
- [x] With Django stopped, deleting shows a safe error in the dialog and the class stays _(verified in code — check in browser)_
- [x] With a forged `access` cookie Django rejects, deleting ends on `/login?expired=1&next=/dashboard` with no error flash _(verified in code — check in browser)_
- [x] The dialog works on a 360px-wide screen and in light and dark themes, with the 180ms fade and scale (instant under reduced motion) _(verified in code — check in browser)_
- [x] The Delete controls and the dialog are fully usable with the keyboard, and the error is announced _(verified in code — check in browser)_
- [x] The Edit links (spec 26) and booking pages still work as before _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture describes the Delete controls, the dialog and the delete flow
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **No dialog component yet:** `components/ui/` has no dialog or alert
  dialog. One must be added with `npx shadcn add` (base-vega, Base UI) and
  restyled to the tokens; spec 30 reuses it.
- **Week grid space:** the whole block is already the Edit link (a
  stretched `::after`), and a 40-minute block's three lines just fit at
  96px per hour; the user rejected a taller grid. The corner button must be
  layered above the stretched link and the subject line must leave room
  for it, without adding a line.
- **404 isn't documented:** CLAUDE.md lists 401 and 403 for `/classes/`
  but no 404 for a class that's already gone. This spec treats a 404 from
  the delete as "already deleted", without relying on its body.
- **Invalidation differs from booking and editing:** specs 25 and 26
  invalidate with `refetchType: "none"` because the picker is still
  mounted. Here the dashboard is the mounted page, so the schedule must
  refetch at once; availability and the class query can stay
  `refetchType: "none"`.

## Open questions
None.
