# Spec 22: Availability Query

- **Status:** Done
- **Created:** 2026-10-28
- **Completed:** 2026-10-28
- **Depends on:** 05-student-api-proxy.md, 06-time-zone-helpers.md, 09-query-provider.md

## Summary
A shared TanStack Query for `GET /availability/` plus the rules that turn
its response into blocked slots for the weekly picker (spec 23) and the
trial picker (spec 24). The rules from CLAUDE.md live here, in one place:
the pickers and booking forms never work them out again. When a student
edits a booking, its own slot stays selectable. Students can then see which
times are already taken before they pick one, instead of only finding out
from a "This timeslot is already booked." error.

## User stories
- As a student booking a weekly class, I want slots that are already taken
  (by any weekly class or upcoming trial lesson) greyed out so that I only
  pick a time that can be booked.
- As a student booking a trial lesson, I want dates and hours that clash
  with a weekly class or another trial lesson greyed out so that my booking
  isn't refused.
- As a student, I want my own bookings marked as mine rather than just
  "Taken" so that I recognise them.
- As a student editing a booking, I want its current slot to stay
  selectable so that I can save other changes without moving it.
- As a student, I want availability to be fresh when I open a picker so that
  I'm not shown a slot that someone else took a minute ago.

## Scope
- A browser query for `GET /availability/`, fetched through `studentFetch`
  (`/api/student/availability`), with a shared, exported query key and
  query options, the same way as the schedule query (`lib/schedule.ts`), so
  the booking, edit, delete and cancel specs (25–31) can invalidate it and
  refetch it after an "already booked" error.
- A runtime Zod check of the response. `day`, `time` and `starts_at` go
  through the `lib/time-zone.ts` parsers inside the check (as the schedule
  query does), so a bad value fails the query with a `StudentApiError`
  (`invalid_response`, generic message) instead of throwing
  `TimeValueError` during render.
- The query overrides the shared 30 s `staleTime` (spec 09) so that every
  picker mount refetches availability. Refetch on window focus and
  reconnect stay on (shared defaults). Retry follows the shared rule.
- **Weekly blocked set** (for spec 23), keyed by UTC weekday + `"HH:00:00"`:
  - every `weekly_classes` entry's `day` + `time`;
  - every `trial_lessons` entry's UTC weekday + hour, taken from its
    `starts_at` with `startsAtToUtcWeeklyKey()` (spec 06).
  - Each blocked slot records whether it's the student's own (`mine`), so
    the picker can show "Yours" rather than "Taken".
- **Trial blocked rule** (for spec 24), for any candidate `starts_at`:
  - blocked when its UTC weekday + hour matches any `weekly_classes` entry
    (so every date that falls on a weekly class's slot is blocked);
  - blocked when it equals any `trial_lessons` entry's `starts_at` exactly
    (compared as instants, not strings).
  - Each block records `mine` the same way.
- **Exclude my own slot** option for edits:
  - editing a weekly class (spec 26): the class's own UTC `day` + `time` is
    left out of the weekly blocked set, but reported as the student's own
    so the picker shows it as "Yours" and selectable;
  - editing the trial lesson (spec 29): its own `starts_at` is left out of
    the trial blocked rule the same way.
  - Only the given slot is excluded. Everything else, including the
    student's other bookings, stays blocked.
- A small hook (or hooks) the pickers can call with the student's options
  (which picker, and the optional own slot to exclude) that returns the
  query state and the derived lookups, recomputed only when the data or the
  options change.
- Exported types for the availability response and the derived lookups.
- CLAUDE.md update: a short Architecture note on the availability query (its
  module, key, `staleTime` override, blocked-slot rules, own-slot option),
  and the "Installed but not yet wired up" / Student dashboard references
  adjusted if they mention availability.

## Out of scope
- The weekly slot picker UI and its available / taken / mine / selected
  styling: spec 23.
- The trial slot picker UI, its date window and its local date grouping:
  spec 24.
- Booking forms, showing the "This timeslot is already booked." message,
  and calling the refetch after it: specs 25 and 28 (this spec only exports
  the key and options they use).
- Editing a weekly class or the trial lesson, and loading the booking being
  edited: specs 26 and 29.
- Delete and cancel actions and their invalidations: specs 27 and 30.
- Locked trial lesson handling: spec 31.
- Any page, route or visible UI.
- Changes to the student API proxy (spec 05), the time zone helpers (spec
  06) beyond filling a gap found in planning, or the shared query defaults
  (spec 09) other than this query's own `staleTime`.
- Local-time conversion of blocked slots: the pickers convert from UTC with
  the spec 06 helpers. This spec works only in UTC keys.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
None. The query and hooks are used by the pickers (specs 23 and 24) on
`/classes/new`, `/classes/[id]/edit`, `/trial-lesson/new` and the trial
edit page (specs 25, 26, 28, 29), all student routes already protected by
`proxy.ts`.

## Backend contract
- `GET /availability/` (through `GET /api/student/availability`, student
  mode, `Authorization: JWT <access>` added by the proxy route)
  - Response:
    - `weekly_classes: [{ day, time, mine }]`: `day` is `monday`–`sunday`
      (UTC), `time` is `"HH:MM:SS"` (UTC full hour), `mine` is a boolean.
    - `trial_lessons: [{ starts_at, day, time, mine }]`: upcoming only,
      `starts_at` is ISO 8601 UTC, `day` and `time` are its UTC weekday and
      time, `mine` is a boolean.
    - Never includes ids, subjects, levels or who booked.
  - 401: student access guard (session-expired flow, through
    `studentFetch`); the query stays loading.
  - 403 `{detail}` (logged-in user with no Student profile): the query
    fails with a `StudentApiError` whose status is 403; the page shows
    `studentAccessFallback()`'s state (specs 25, 26, 28, 29 decide where).
  - 502/504 from the proxy, 5xx, non-JSON responses, or a 2xx that fails
    the Zod check or the time parsers: the query fails with a
    `StudentApiError`. The backend's message and the error's own text are
    never shown.
- No request body, no 400 or field errors (nothing is sent).
- Related, handled by later specs: booking routes can return 400 "This
  timeslot is already booked."; the form shows it and refetches this query.

## Behavior
1. **Fetch:** a picker mounting with this query starts a fetch (the
   `staleTime` override makes cached data count as stale). While a refetch
   runs, previously loaded availability stays usable.
2. **Loading:** the hook reports loading and returns no blocked lookups;
   the pickers decide what to show (specs 23 and 24).
3. **Success:** the hook returns the weekly blocked lookup or the trial
   blocked rule per Scope, each with `mine` per blocked slot, and with the
   own slot excluded when one is given.
4. **Empty response** (no weekly classes, no trial lessons): nothing is
   blocked.
5. **Session gone (401):** `studentFetch` ends the session and redirects to
   `/login?expired=1&next=…`; the query stays loading (no error flash).
6. **Admin account (403):** the query fails with status 403; no retry (4xx
   rule from spec 09).
7. **Other failures:** the query fails with a `StudentApiError` carrying a
   safe message; retries follow the shared defaults. A failed background
   refetch keeps the last loaded availability.
8. **Freshness and invalidation:** refetch on picker mount, window focus
   and reconnect. Specs 25–31 invalidate the availability key after every
   booking, edit, delete or cancel, and after a "This timeslot is already
   booked." error.
9. **Logout:** the header's logout and the session guard clear the query
   cache (specs 12 and 15), so one student's `mine` flags never show for
   the next student.
10. **Own slot when editing:** if the own slot isn't in the response (e.g.
    the trial lesson already started and `trial_lessons` is upcoming only),
    the option is a no-op.
11. Availability only greys out slots; it never replaces the backend's
    validation. A slot shown as free can still be refused on booking.

## Time handling
- All lookups are in UTC: weekly slots by UTC weekday + `"HH:00:00"`, trial
  candidates by UTC instant.
- Trial lessons map onto weekly slots with `startsAtToUtcWeeklyKey()` from
  their `starts_at`. The response's own `day` and `time` for trial lessons
  aren't relied on for that mapping.
- A trial candidate's weekly clash is checked with the same
  `startsAtToUtcWeeklyKey()` on the candidate.
- Exact trial matches compare instants (parsed with `parseStartsAt()`), so
  `"…Z"` and `"…+00:00"` spellings of the same time match.
- No local times here. The pickers convert to the student's zone with
  `weeklySlotGrid()` and `trialSlotList()` (spec 06), which already follow
  the next-occurrence rule.

## UI notes
No UI. The `mine` flag on each blocked slot and the excluded own slot exist
so the pickers can show the Design section's taken / mine states (specs 23
and 24). No tutor name or photo anywhere.

## Acceptance criteria
- [x] Opening a page that uses the availability query sends `GET /api/student/availability` (visible in the browser's network tab) and Django receives `GET /availability/` with the student's JWT _(verified in code — check in browser)_
- [x] Opening a picker again (after leaving and returning, within 30 s) sends a new availability request _(verified in code — check in browser)_
- [x] Refocusing the tab while a picker is open refetches availability _(verified in code — check in browser)_
- [x] With a weekly class booked by another student at UTC Monday 14:00, that slot is blocked in the weekly lookup with `mine` false _(verified in code — check in browser)_
- [x] With the student's own weekly class at UTC Tuesday 09:00, that slot is blocked in the weekly lookup with `mine` true _(verified in code — check in browser)_
- [x] With an upcoming trial lesson at `2026-11-04T16:00:00Z` (a Wednesday), UTC Wednesday 16:00 is blocked in the weekly lookup _(verified in code — check in browser)_
- [x] With a weekly class at UTC Monday 14:00, every Monday 14:00 UTC trial candidate is blocked, and Monday 15:00 UTC isn't _(verified in code — check in browser)_
- [x] With an upcoming trial lesson at `2026-11-04T16:00:00Z`, that exact instant is blocked for trial candidates, and `2026-11-11T16:00:00Z` isn't (unless a weekly class holds that slot) _(verified in code — check in browser)_
- [x] With the own-slot option set to the student's weekly class (UTC Tuesday 09:00), that slot isn't blocked but is reported as the student's own; their other bookings stay blocked _(verified in code — check in browser)_
- [x] With the own-slot option set to the student's trial `starts_at`, that instant isn't blocked for trial candidates but is reported as the student's own _(verified in code — check in browser)_
- [x] With no bookings anywhere, nothing is blocked _(verified in code — check in browser)_
- [x] With a forged `access` cookie that Django rejects, the page ends on `/login?expired=1&next=…` with no error flash _(verified in code — check in browser)_
- [x] Logged in as an admin account, the query fails with status 403 and isn't retried _(verified in code — check in browser)_
- [x] With Django stopped, the query fails with a safe message (no backend text) after the shared retries _(verified in code — check in browser)_
- [x] A malformed availability response (e.g. `time` of `"14:30:00"`) fails the query with the generic message instead of crashing the page _(verified in code — check in browser)_
- [x] Logging out and in as another student never shows the previous student's `mine` slots _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture describes the availability query, its key, its `staleTime` override and the blocked-slot rules
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **No visible UI to check in the browser:** this spec ships a query and
  derived lookups only. Until the pickers (specs 23 and 24) use them, the
  acceptance criteria about blocked slots are checked in code and the
  network tab; they become fully browser-checkable once spec 23 or 24 is
  built.
- **Two sources for a trial lesson's weekday + hour:** `/availability/`
  returns `day` and `time` for each trial lesson as well as `starts_at`.
  Spec 06 added `startsAtToUtcWeeklyKey()` so spec 22 derives them from
  `starts_at`; this spec does that and ignores the duplicates for the
  mapping, so the two can never disagree in the UI.

## Open questions
None.
