# Spec 24: Trial Slot Picker

- **Status:** Done
- **Created:** 2026-10-28
- **Completed:** 2026-10-28
- **Depends on:** 22-availability-query.md

## Summary
A reusable control for choosing the date and hour of the free 60-minute
trial lesson. It offers every full UTC hour from 24 hours ahead to 14 days
after that, shown in the student's local time and grouped by local date. It
greys out hours that clash with a weekly class or another trial lesson, marks
the student's own bookings as "Yours", and returns the chosen hour as a UTC
`starts_at` for the trial booking (spec 28) and edit (spec 29) forms.
Students pick a real date in their own time zone and never work out UTC
themselves.

## User stories
- As a student booking a trial lesson, I want to see the coming two weeks
  in my own local time so that I pick a date and hour that suit me.
- As a student, I want hours that are already taken greyed out and labelled
  so that I only pick a time that can be booked.
- As a student, I want my own weekly classes marked "Yours" on the dates
  they fall on so that I don't mistake them for someone else's booking.
- As a student editing my trial lesson, I want its current date and hour
  shown as selected and still selectable so that I can keep it or move it.
- As a student on a phone, I want to choose a date first and then an hour
  so that the picker fits my screen.
- As a student in a half-hour time zone, I want every bookable hour offered
  with its real local time (for example 14:30) so that I can still book.

## Scope
- One shared, controlled picker component used by specs 28 and 29:
  - input: the selected UTC `starts_at` (ISO 8601) or none;
  - output: a change callback with the chosen `starts_at`, or none when a
    refetch shows the selected hour as `taken` or `mine`;
  - input: the trial availability lookup from spec 22
    (`useTrialAvailability()`'s `slotAvailability`, `null` while loading).
    The picker doesn't fetch availability itself, so the page that owns the
    query decides how to show 403 and other query errors;
  - optional own `starts_at` (editing, spec 29), so that hour is offered even
    when it falls inside the 24-hour lead time (see Behavior 5);
  - optional disabled state (e.g. while the form submits) and the
    attributes a form field needs: an accessible label, `aria-invalid` and
    a description id for field errors (spec 28 renders the error text).
- **Booking window** (a frontend rule; the backend only needs a future full
  hour):
  - the earliest offered hour is the first full UTC hour at or after
    "now" + 24 hours (the 24-hour lead time gives the tutor time to send the
    meeting link);
  - the latest is under 14 days after that earliest hour, so the student
    always gets 14 full days of choice;
  - every full UTC hour in that range is offered, built from
    `trialSlotList()` (spec 06), grouped by the student's local date. No
    hours are hidden: there are no working hours on the backend.
- Each hour shows one of the Design section's states, never by colour
  alone, the same cell styles as the weekly picker (spec 23):
  - **available** (`free`): surface + border, primary border on hover and
    focus;
  - **taken** (`taken`): muted fill, hatch pattern, "Taken", disabled;
  - **mine** (`mine`, a weekly class of the student's on that UTC weekday +
    hour): 2px eosin outline + dot + "Yours", disabled;
  - **own** (`own`, the trial lesson being edited): styled like mine
    ("Yours"), but selectable;
  - **selected**: primary fill, check icon.
- Layout follows spec 23's at every width: a row of local-date tabs, then
  that date's hours grouped into Night (00:00–05:59), Morning
  (06:00–11:59), Afternoon (12:00–17:59) and Evening (18:00–23:59) by local
  start hour, each part with its name and range. Below `lg` 4 per row with
  the part name above; from `lg` one row of 6 per part with the part name
  beside it, picker capped at the same width as the weekly picker.
  - Date tabs show a short weekday, day and month in local time (for
    example "Thu 29 Oct"). The window spans about 15 local dates, so the
    tabs must stay usable on a 360px screen (for example scrolling or paged
    by week); every date is reachable by mouse, touch and keyboard.
  - The first and last dates can be partial (only the hours inside the
    window); a part of the day with no hours in the window is left out.
  - It opens on the selected hour's local date, otherwise the first date
    with a free hour, otherwise the first date.
  - The date holding the selection is marked on its tab (check icon).
- A line under the hours with the selected hour's full local date and time
  ("Thursday 29 October 2026, 14:00", `formatTrialDateTime()`), so the
  student sees exactly what they're booking.
- The same legend as the weekly picker (available, taken, yours, selected)
  and a time zone note: "Times are in <zone>." with `formatTimeZoneLabel()`.
  No daylight-saving sentence: a trial lesson is one instant, not a weekly
  slot.
- Accessible single-choice semantics and keyboard model as spec 23: one
  radio group, one cell in the tab order, arrows move focus following the
  visible columns, Space, Enter or a click selects, taken and mine cells
  focusable but `aria-disabled`. Each cell's accessible name holds the local
  date, time (and offset where needed) and state (for example "Thursday 29
  October, 14:00, taken").
- Shared pieces of spec 23 (slot cell, legend, parts of day, roving focus,
  wide-layout hook) are reused rather than copied; moving or generalising
  them is in scope as long as the weekly picker looks and behaves the same.
- CLAUDE.md update: a short Architecture note on the trial slot picker
  (where it lives, its inputs and output, the window and lead time, the
  layout), and any spec 23 note that changes if shared pieces move.

## Out of scope
- The availability query and the trial blocked rule: spec 22 (already
  built). The picker uses its lookup and never re-derives the rules.
- The `/trial-lesson/new` form (subject, level), posting, the "This
  timeslot is already booked." message and the "slot was just taken"
  notice, refetching availability after it, invalidations, and showing an
  existing trial lesson instead of the form: spec 28.
- Whether the booking forms' Zod checks also enforce the 24-hour lead time:
  specs 28 and 29 (see Conflicts).
- Loading the trial lesson being edited and passing its own `starts_at`:
  spec 29.
- Cancelling the trial lesson: spec 30. Locked (past or completed) trial
  lessons and hiding the picker for them: spec 31.
- The weekly slot picker: spec 23 (already built), beyond reusing its parts.
- A month calendar or date input, a time zone selector, or working hours.
- Any route or page of its own.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
None of its own. Used on `/trial-lesson/new` (spec 28) and the trial edit
page (spec 29), both student routes protected by `proxy.ts`.

## Backend contract
The picker calls no endpoint. It reads the trial lookup derived from
`GET /availability/` (spec 22):
- `weekly_classes: [{day, time "HH:MM:SS", mine}]` and
  `trial_lessons: [{starts_at, day, time, mine}]` (upcoming only).
- A candidate hour is blocked when its UTC weekday + hour matches a weekly
  class, or when it equals a trial lesson's `starts_at`; `mine` decides
  "Yours" over "Taken"; the own `starts_at` (when editing) stays selectable.
- 401, 403 and other failures of that query are handled by the page that
  owns it (specs 28 and 29), not by the picker.

The value it hands back matches what `POST /trial-lessons/` and
`PATCH /trial-lessons/{id}/` expect: `starts_at`, ISO 8601 UTC, a full hour
in the future (e.g. `"2026-11-02T14:00:00Z"`). Subject and level are sent by
the form. The backend may still return 400 (for example "This timeslot is
already booked." or a past `starts_at`); the form shows it (spec 28).

## Behavior
1. **Before mount:** local times render only in the browser after mount
   (zone from `useSyncExternalStore`, `null` on the server; "now" taken once
   with `useState`, never during the prerender). Until then a static
   placeholder of the same size, no pulse or spinner.
2. **Availability loading** (lookup is `null`): the date's hours show with
   every cell disabled and a polite status text ("Checking which times are
   free…"). Date tabs can still be switched.
3. **Loaded:** each hour shows its state. Choosing a free or own hour calls
   the change callback with its UTC `starts_at`; choosing the selected hour
   again keeps it (no deselect).
4. **Refetch:** while availability refetches, the last lookup stays in use.
   When new data marks the selected hour as `taken` or `mine`, the picker
   clears the selection (change callback with none) and shows the hour in
   its new state; spec 28 shows the warning notice.
5. **Editing:** with the own `starts_at` passed (to spec 22's hook and the
   picker) and as the value, that hour shows selected (and "Yours" when
   another is picked) and stays selectable, even if it's now less than 24
   hours away. If it falls outside the window it's still offered on its
   own local date. If it's already past, the trial lesson is locked and the
   page doesn't show the picker (spec 31).
6. **Value outside the window** (not the own hour, e.g. a stale form
   value): nothing shows as selected and the picker opens on the first date
   with a free hour. It doesn't call the change callback for this; the
   form's validation decides.
7. **Time passing:** "now" is fixed at mount, so the window doesn't move
   while the page is open. A booking made very late can still be refused by
   the backend; the form shows that error.
8. **Empty availability:** every hour in the window is available.
9. **No free hour at all** (every hour blocked): the hours still show with
   their states, and a short muted note says no times are free in the next
   two weeks.
10. **Disabled:** every cell non-interactive; states still show.
11. **Errors:** no error state of its own. Field errors come from the form
    and are linked through the description id.
12. **Clock changes in the window:** in autumn a local hour repeats, so two
    UTC hours share a local date and time: both are offered, each labelled
    with `formatUtcOffset()` in its cell and accessible name. In spring a
    local hour doesn't exist and simply has no cell. Students never type a
    local time, so nothing is ambiguous or shifted.
13. **Date rollover:** hours are grouped by local date, so a UTC hour late
    on one UTC date can sit on the next local date (or the previous one in
    zones behind UTC); the value is still the UTC instant.

## Time handling
- Candidates come from `trialSlotList(timeZone, start, days)` (spec 06),
  which starts strictly after `start`. So `start` is 1 ms before the first
  full UTC hour at or after "now" + 24 hours, and `days` is 14: exactly 336
  hours, from that hour to 14 days after it minus one hour. Each candidate's local date
  and time use the offset in force at that instant.
- Value in and out is a UTC `starts_at` only; compared as instants, never
  as strings (`"…Z"` and `"…+00:00"` match).
- Half-hour and 45-minute zones (`Asia/Kolkata`, `Asia/Kathmandu`) show
  minutes (14:30, 14:45); every full UTC hour is still offered. The picker
  never converts local to UTC, so `localToStartsAt()` isn't needed.
- Formatting: `formatTimeOfDay()` for cells, `formatTrialDateTime()` for the
  selected summary and accessible names (or an equivalent local date
  format), `formatTimeZoneLabel()` for the zone note, tabular figures.

## UI notes
- Functional UI: clarity first, no hex lattice, no illustrations, no
  decoration.
- Must look like a sibling of the weekly picker: same cells, legend, part
  labels, tab style (`components/ui/tabs.tsx`), spacing and widths.
- Cells: 8px radius, 150ms state transitions (instant under
  `prefers-reduced-motion`), touch targets at least 44px tall, text or icon
  on every non-available state. No eosin "Free trial" accent inside the
  picker; eosin stays for "Yours".
- Mobile: 16px gutter, the date tabs fit the width without squeezing
  labels (scroll or week paging), then the date's hours in a short scroll.
- Legend, zone note and status text sit above the hours in muted text; the
  selected-hour summary sits below them, in `tabular-nums`.
- Use the frontend-design skill before writing the UI code, within the
  Design rules (no new colours, fonts, radii or motion).
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] When not editing, the first offered hour is the first full UTC hour at least 24 hours after the page opened (opened at 14:20 UTC → first hour 15:00 UTC tomorrow), and no hour before it shows _(verified in code — check in browser)_
- [x] The last offered hour is under 14 days after the first, and the date tabs cover every local date in between _(verified in code — check in browser)_
- [x] Every date tab is reachable on a 360px-wide screen and with the keyboard, and the tab holding the selection shows a check _(verified in code — check in browser)_
- [x] A date's hours show under Night, Morning, Afternoon and Evening; parts with no hours in the window are left out on the first and last dates _(verified in code — check in browser)_
- [x] Below `lg` hours show 4 per row with the part above; from `lg` 6 per row with the part beside; arrow keys follow the visible columns _(verified in code — check in browser)_
- [x] In `Asia/Karachi`, UTC `2026-11-02T09:00:00Z` shows on Monday 2 November at 14:00, and choosing it returns that `starts_at` _(verified in code — check in browser)_
- [x] In `Asia/Karachi`, UTC `2026-11-01T22:00:00Z` shows under Monday 2 November at 03:00 (local date rollover) _(verified in code — check in browser)_
- [x] In `Asia/Kolkata`, hours show at :30 and every full UTC hour in the window is offered _(verified in code — check in browser)_
- [x] With a weekly class held by another student at UTC Monday 14:00, every Monday 14:00 UTC in the window shows hatch and "Taken" and can't be chosen _(verified in code — check in browser)_
- [x] With the student's own weekly class at UTC Tuesday 09:00, every Tuesday 09:00 UTC in the window shows the eosin outline, dot and "Yours" and can't be chosen _(verified in code — check in browser)_
- [x] Another student's upcoming trial lesson at an hour in the window shows "Taken" at that exact hour only _(verified in code — check in browser)_
- [x] With an own `starts_at` passed (editing), that hour shows selected, stays selectable after picking another, and shows "Yours" when not selected; an own hour under 24 hours away is still offered _(verified in code — check in browser)_
- [x] The selected hour shows the primary fill and check icon, and its full local date and time appear below the hours _(verified in code — check in browser)_
- [x] No state relies on colour alone: each has text or an icon _(verified in code — check in browser)_
- [x] While availability is loading, every hour is disabled and the status text shows; no spinner or pulse _(verified in code — check in browser)_
- [x] Before mount (view source / prerender), no local dates or times are rendered _(verified in code — check in browser)_
- [x] When a refetch marks the selected hour as taken, the selection clears and the hour shows "Taken" _(verified in code — check in browser)_
- [x] With the disabled option set, no hour can be chosen _(verified in code — check in browser)_
- [x] The hours can be reached and chosen with the keyboard, focus is visible, and a screen reader announces date, time and state _(verified in code — check in browser)_
- [x] The zone note reads "Times are in <zone> (<offset>)." with no daylight-saving sentence _(verified in code — check in browser)_
- [x] In `America/New_York` (clocks go back on Sunday 1 November 2026, inside the window when the page is opened up to 31 October, 05:00 UTC), the repeated local hour 01:00 on 1 November shows twice, each with its offset (GMT-4 and GMT-5), and they return different `starts_at` values (`2026-11-01T05:00:00Z` and `2026-11-01T06:00:00Z`) _(verified in code — check in browser)_
- [x] The weekly slot picker still looks and behaves as before after any shared pieces move _(verified in code — check in browser)_
- [x] With `prefers-reduced-motion`, state changes are instant _(verified in code — check in browser)_
- [x] Light and dark themes both show every state legibly _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture describes the trial slot picker, its window and lead time
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **No page to check it on yet:** the picker has no route of its own; the
  first page using it is `/trial-lesson/new` (spec 28). Until then the
  browser criteria are checked in code, as with specs 22 and 23.
- **24-hour lead time is frontend-only:** the backend accepts any future
  full hour (CLAUDE.md › Trial lesson). The picker never offers an hour
  under 24 hours away (except the own hour when editing), but a direct API
  call can still book one. Specs 28 and 29 decide whether their Zod checks
  enforce the same rule; CLAUDE.md should mention the lead time once this
  spec is built.
- **"Full hour in local time":** roadmap row 24 says "a future date + full
  hour in local time". As in specs 06 and 23, half-hour zones have no local
  full hour that is a full UTC hour; this spec reads it as "a full UTC hour
  shown in local time" and shows minutes where needed.
- **Window wider than 14 calendar dates:** 14 days of hours starting at an
  arbitrary hour cover 15 local dates, partial at both ends, so the date
  tabs need more room than the weekly picker's seven.

## Open questions
None.
