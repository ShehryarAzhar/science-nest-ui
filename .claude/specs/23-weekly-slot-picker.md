# Spec 23: Weekly Slot Picker

- **Status:** Done
- **Created:** 2026-10-28
- **Completed:** 2026-10-28
- **Depends on:** 22-availability-query.md

## Summary
A reusable control for choosing the weekday and hour of a weekly class. It
shows all 168 weekly UTC slots in the student's local time, greys out the
ones that can't be booked, marks the student's own bookings as "Yours", and
hands the chosen slot back as a UTC `day` + `time` that the booking (spec
25) and edit (spec 26) forms send to the backend. Students see straight
away which times are free in their own time zone and don't have to work out
UTC themselves.

## User stories
- As a student booking a weekly class, I want to see the week in my own
  local time so that I pick a time that suits my day.
- As a student, I want taken slots clearly greyed out and labelled so that
  I only pick a time that can be booked.
- As a student, I want my own classes and trial lesson marked "Yours" so
  that I don't mistake them for someone else's booking.
- As a student editing a weekly class, I want its current slot shown as
  selected and still selectable so that I can keep it or move it.
- As a student on a phone, I want to choose a day first and then an hour so
  that the picker fits my screen.
- As a student in a half-hour time zone, I want every bookable slot offered
  with its real local time (for example 14:30) so that I can still book.

## Scope
- One shared, controlled picker component used by specs 25 and 26:
  - input: the selected UTC slot (`day` + `"HH:00:00"`) or none;
  - output: a change callback with the chosen UTC slot;
  - input: the weekly availability lookup from spec 22
    (`useWeeklyAvailability()`'s `slotAvailability`, `null` while loading).
    The picker doesn't fetch availability itself, so the page that owns the
    query decides how to show 403 and other query errors;
  - optional disabled state (e.g. while the form submits) and the
    attributes a form field needs: an accessible label, `aria-invalid` and
    a description id for field errors (spec 25 renders the error text).
- Offers all 168 UTC weekly slots, built from `weeklySlotGrid()` (spec 06)
  with the browser time zone and "now" as the reference instant, so each
  slot shows its local weekday and time under the next-occurrence rule. No
  hours are hidden: the backend accepts every hour.
- Each slot shows one of the Design section's states, never by colour
  alone:
  - **available** (`free`): surface + border, primary border on hover and
    focus;
  - **taken** (`taken`): muted fill, hatch pattern, "Taken", disabled;
  - **mine** (`mine`): 2px eosin outline + dot + "Yours", disabled;
  - **own** (`own`, the class being edited): styled like mine ("Yours"),
    but selectable;
  - **selected**: primary fill, check icon (an `own` slot that is selected
    shows as selected).
- Every width: seven local-day tabs (Monday first), then that day's slots
  grouped into four parts of the day by the slot's local start hour: Night
  (00:00–05:59), Morning (06:00–11:59), Afternoon (12:00–17:59) and Evening
  (18:00–23:59), each with its name and time range. Night hours are easy to
  find and never hidden.
  - Below `lg`: short weekday names on the tabs, 4 slots per row, the part
    name above its slots.
  - `lg` and up: full weekday names, one row of 6 slots per part with the
    part name and range beside it, so the whole day fits without
    scrolling.
  - It opens on the selected slot's local day, otherwise the student's
    current local weekday.
- A short legend for available, taken, yours and selected.
- The time zone note: "Times are in <zone>." and, when
  `observesDaylightSaving()` is true for the zone, the longer spec 06 note
  ("Times are in <zone>. Weekly classes are fixed in UTC, so their local
  time moves by an hour when your clocks change."), the same wording as the
  dashboard's.
- Accessible single-choice semantics: the slots act as one radio group with
  a visible focus ring, keyboard selection, and an accessible name per slot
  that includes the local weekday, time and state (for example "Monday
  14:00, taken").
- Any shadcn or Base UI component the picker needs (for example toggle
  group or tabs), added with `npx shadcn add` and restyled to the tokens.
- CLAUDE.md update: a short Architecture note on the weekly slot picker
  (where it lives, its inputs and output, the states, desktop and mobile
  layouts).

## Out of scope
- The availability query and the blocked-slot rules: spec 22 (already
  built). The picker uses its lookup and never re-derives the rules.
- The `/classes/new` booking form (subject, level, duration), posting, the
  "This timeslot is already booked." message and the warning "slot was just
  taken" notice, refetching availability after it, and invalidations: spec
  25.
- Loading the class being edited and passing its own slot: spec 26.
- The trial slot picker (dates, `starts_at`): spec 24.
- Showing a 40- or 60-minute block across hours or checking duration: the
  backend books one weekday + hour, and the picker picks only that.
- A time zone selector: the browser's zone is used, as on the dashboard.
- Filtering to the tutor's working hours: the backend has none.
- Any route or page of its own.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
None of its own. Used on `/classes/new` (spec 25) and `/classes/[id]/edit`
(spec 26), both student routes protected by `proxy.ts`.

## Backend contract
The picker calls no endpoint. It reads the weekly lookup derived from
`GET /availability/` (spec 22):
- `weekly_classes: [{day, time "HH:MM:SS", mine}]` and
  `trial_lessons: [{starts_at, day, time, mine}]` (upcoming only).
- Every weekly class's `day` + `time` and every trial lesson's UTC weekday +
  hour is blocked; `mine` decides "Yours" over "Taken"; the own slot (when
  editing) stays selectable.
- 401, 403 and other failures of that query are handled by the page that
  owns it (specs 25 and 26), not by the picker.

The value it hands back matches what `POST /classes/` and
`PATCH /classes/{id}/` expect: `day` (`monday`–`sunday`, UTC) and `time`
(a full UTC hour). Duration, subject and level are sent by the form.

## Behavior
1. **Before mount:** the server doesn't know the student's zone, so the
   picker renders local times only in the browser after mount (the zone
   from `useSyncExternalStore`, `null` on the server; "now" taken once with
   `useState`, never during the prerender). Until then it shows a static
   placeholder of the same size, no pulse or spinner.
2. **Availability loading** (lookup is `null`): the day's slots show
   with every slot disabled and a polite status text ("Checking which times
   are free…"). No slot can be chosen until the lookup arrives.
3. **Loaded:** each slot shows its state from the lookup. Choosing an
   available or own slot calls the change callback with its UTC `day` +
   `time`; choosing the selected slot again keeps it selected (no
   deselect). Taken and mine slots can't be focused into a selection.
4. **Refetch:** while availability refetches (mount, focus, reconnect, or
   after an "already booked" error), the last lookup stays in use. When new
   data marks the selected slot as `taken` or `mine`, the picker clears the
   selection (change callback with none) and shows that slot in its new
   state; spec 25 shows the warning notice.
5. **Editing:** with the class's own slot passed to spec 22's hook and as
   the value, that slot shows as selected (and "Yours" when another slot is
   picked) and stays selectable.
6. **Empty availability:** every slot is available.
7. **Disabled:** every slot is non-interactive; states still show.
8. **Errors:** the picker has no error state of its own. Field errors
   (for example "choose a time") come from the form and are linked through
   the description id.
9. **Clock-change week:** under the next-occurrence rule, when a clock
   change falls within the coming week, two UTC slots can share one local
   time (autumn) or a local hour can have no slot (spring). Both slots are
   offered, each told apart by its zone abbreviation or offset in the label
   and accessible name; a missing local hour simply has no slot. Students
   never type a local time, so nothing is ambiguous or shifted.
10. **Day rollover:** a UTC slot that falls on another local day shows under
    that local day (for example UTC Sunday 23:00 under Monday 04:00 in
    `Asia/Karachi`); the value returned is still the UTC slot.

## Time handling
- Every slot comes from `weeklySlotGrid(timeZone, now)` (spec 06): UTC
  `day` + `"HH:00:00"` with its local weekday, hour and minute, converted
  with the offset at the slot's next occurrence at or after now.
- The value in and out is UTC only; local values are display only. Never
  show `day_display`.
- Half-hour and 45-minute zones (`Asia/Kolkata`, `Asia/Kathmandu`) show
  minutes (14:30, 14:45); every one of the 168 slots is still offered.
- Times are formatted with `formatWeekday()` and `formatTimeOfDay()` and
  the zone label with `formatTimeZoneLabel()` (spec 06), in tabular figures.
- Availability lookups are by UTC slot (spec 22); the picker never converts
  local to UTC itself, so `localToWeeklySlot()` isn't needed.

## UI notes
- Functional UI: clarity first, no hex lattice, no illustrations, no
  decoration.
- Slot cells: 8px radius, 150ms state transitions (instant under
  `prefers-reduced-motion`), text and icon on every non-available state
  ("Taken", dot + "Yours", check icon). Hatch pattern for taken from theme
  tokens only; no new colours.
- Desktop (`lg` and up): the picker is capped at 56rem so 6 slots
  per row stay a readable size. Each part is a row: the part name and its
  range in a narrow label column, then its 6 slots. The day's 24 slots fit
  on screen; no scroll area, jump buttons or week grid. Day tabs show full
  weekday names. Arrow keys follow the visible 6 columns.
- Mobile: 16px gutter, day buttons in one row (short weekday names) above
  that day's slots; the selected day button is clearly marked (not by
  colour alone). The day's slots sit in a compact grid of time cells (four
  per row) under the four part-of-day names and ranges, so all 24 fit in a
  short scroll. Touch targets at least 44px tall.
- Legend and time zone note sit above the slots, muted text, with icons
  from `lucide-react`.
- Use the frontend-design skill before writing the UI code, within the
  Design rules (no new colours, fonts, radii or motion).
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] On desktop, the picker shows seven day tabs with full weekday names, and the chosen day's slots as four rows (Night, Morning, Afternoon, Evening) of 6, with each part's name and time range beside it, all visible without scrolling _(verified in code — check in browser)_
- [x] Resizing across `lg` switches between 4 and 6 per row, and arrow keys follow the visible columns _(verified in code — check in browser)_
- [x] Below `lg`, the picker shows seven day buttons and the chosen day's slots grouped under Night, Morning, Afternoon and Evening; it opens on the selected slot's day, otherwise today's local weekday _(verified in code — check in browser)_
- [x] In `Asia/Karachi`, UTC Monday 09:00 shows as Monday 14:00, and choosing it returns `{ day: "monday", time: "09:00:00" }` _(verified in code — check in browser)_
- [x] In `Asia/Karachi`, UTC Sunday 23:00 shows under Monday at 04:00 and returns `{ day: "sunday", time: "23:00:00" }` _(verified in code — check in browser)_
- [x] In `Asia/Kolkata`, slots show at :30 (for example 14:30) and all 168 slots are offered _(verified in code — check in browser)_
- [x] A slot booked by another student shows hatch, "Taken", and can't be chosen _(verified in code — check in browser)_
- [x] A weekly class or upcoming trial lesson of the student's own shows the eosin outline, dot and "Yours", and can't be chosen _(verified in code — check in browser)_
- [x] With an own slot passed (editing), that slot shows selected, stays selectable after picking another slot, and shows "Yours" when not selected _(verified in code — check in browser)_
- [x] The selected slot shows the primary fill and check icon _(verified in code — check in browser)_
- [x] No state relies on colour alone: each has text or an icon _(verified in code — check in browser)_
- [x] While availability is loading, every slot is disabled and the status text shows; no spinner or pulse _(verified in code — check in browser)_
- [x] Before mount (view source / prerender), no local times are rendered _(verified in code — check in browser)_
- [x] When a refetch marks the selected slot as taken, the selection clears and the slot shows "Taken" _(verified in code — check in browser)_
- [x] With the disabled option set, no slot can be chosen _(verified in code — check in browser)_
- [x] The slots can be reached and chosen with the keyboard, focus is visible, and a screen reader announces weekday, time and state _(verified in code — check in browser)_
- [x] In `Europe/London`, the daylight-saving note shows; in `Asia/Karachi`, only "Times are in <zone>." shows _(verified in code — check in browser)_
- [x] With `prefers-reduced-motion`, state changes are instant _(verified in code — check in browser)_
- [x] Light and dark themes both show every state legibly _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture describes the weekly slot picker
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **No page to check it on yet:** the picker has no route of its own and
  the roadmap gives it none; the first page using it is `/classes/new`
  (spec 25). Until then the browser criteria can only be checked in code,
  as with spec 22, and become fully checkable once spec 25 is built.
- **"Full hour in local time":** roadmap row 23 says students pick "a
  weekday + full hour in local time". As recorded in spec 06, half-hour
  zones have no local full hour that is a full UTC hour; this spec reads the
  row as "a full UTC hour shown in local time" and shows minutes where
  needed.
- **Desktop week grid replaced:** after a browser review the user chose
  the day-tabs layout at every width (6 per row on desktop). The earlier
  7 × 24 desktop grid, its scroll area, 08:00 opening position and jump
  buttons were removed.

## Open questions
None.
