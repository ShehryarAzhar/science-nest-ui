# Spec 06: Time Zone Helpers

- **Status:** Done
- **Created:** 2026-10-25
- **Completed:** 2026-10-25
- **Depends on:** None

## Summary
The backend stores and returns every date and time in UTC. Weekly classes
are a UTC weekday plus a full UTC hour, and the trial lesson is a UTC
`starts_at` instant. Students think in their own local time. This spec adds
one set of pure, shared helpers that convert between the two, handle the day
rolling over (for example Monday 02:00 UTC is Sunday evening in New York),
and format days, times and dates for display. The dashboard (21), the
availability rules (22), the slot pickers (23, 24) and the booking forms
(25–29) all use these helpers, so every screen shows the same local time for
the same booking.

## User stories
- As a student, I want my weekly classes shown on my local weekday and hour,
  so that I turn up at the right time without working out UTC myself.
- As a student, I want my trial lesson shown with its full local weekday,
  date and hour, so that I know exactly when it is.
- As a student, I want the slot I pick in local time saved as the matching
  UTC slot, so that the tutor sees the booking I meant.
- As a student whose local time is a day ahead of or behind UTC, I want a
  late-evening or early-morning slot to show on the right local day.
- As a developer, I want one shared set of conversion and formatting
  helpers, so that the dashboard, pickers and forms never disagree about a
  slot's local time.

## Scope
- **Pure, shared helpers.** No React, no data fetching, no `server-only`
  marker, no reading of cookies or `process.env`. They can be imported from
  Client Components and from the server. Nothing in them reads the current
  time or the time zone implicitly: "now" (where needed) and the IANA time
  zone are always passed in by the caller. A small separate helper returns
  the browser's resolved time zone (from `Intl`) for client code to pass in.
- **No new dependency by default.** Built on the platform `Date` and `Intl`
  APIs. Whether a date library is worth adding is a planning decision; if
  one is added, it must be justified in the plan.
- **Backend value types.** Shared types for the UTC values the API uses:
  - weekday: `monday` … `sunday` (the backend `day` codes)
  - time: `"HH:MM:SS"`, a full hour (`MM` and `SS` are `00`), as returned in
    `/availability/` and sent to `/classes/`
  - `starts_at`: an ISO 8601 UTC string on a full hour
  - parsing helpers that validate these and reject anything else (an unknown
    day code, a time that isn't a full hour, an invalid ISO string) instead
    of producing a wrong slot
- **Weekly slot, UTC → local.** Given a UTC weekday + time, a time zone and a
  reference instant, find the slot's next real occurrence: the first instant
  at or after the reference instant that falls on that UTC weekday and hour.
  Convert using the offset in force at that occurrence, never the offset at
  the reference instant itself. Return the local weekday, local hour and
  local minute (minute is non-zero only in zones with a non-whole-hour
  offset, see Conflicts), applying day rollover in both directions,
  including Sunday ↔ Monday wrap-around.
- **Weekly slot, local → UTC.** The inverse: given a local weekday and local
  time, a time zone and a reference instant, return the UTC `day` and
  `"HH:MM:SS"` `time` to send to the backend, using the same next-occurrence
  rule. Round-tripping a valid UTC slot through local and back gives the
  same UTC slot.
- **The week's slot grid.** A helper that lists all 168 UTC weekly slots
  (7 days × 24 full hours) with their local weekday and time for a given
  time zone and reference instant, ordered by local weekday then local time.
  Each slot is converted using its own next occurrence, as above. Pickers
  (23) and the schedule grid (21) build on it rather than doing their own
  maths.
- **Daylight-saving check.** A helper that says whether a time zone observes
  daylight saving: true when its offset differs between January and July of
  the reference instant's year. Specs 21 and 23 use it to decide whether to
  show the daylight-saving note (see Conflicts).
- **Trial instant, UTC → local.** Given `starts_at` and a time zone, return
  the local calendar date (year, month, day), local weekday, local hour and
  minute.
- **Trial instant, local → UTC.** Given a local calendar date and local time
  and a time zone, return the `starts_at` ISO UTC string. Local times that
  don't exist (skipped by a daylight-saving change) or are ambiguous
  (repeated by one) are reported as such, never silently shifted.
- **Trial slot list.** A helper that lists the future full-UTC-hour
  instants in a window (from a given "now", for a given number of days),
  each with its local date and time, grouped by local date. It starts at
  the next full UTC hour strictly after "now", so past or current hours are
  never offered. Picker 24 builds on it.
- **Instant → UTC weekly key.** Given a `starts_at`, return its UTC weekday
  code and `"HH:MM:SS"`, so spec 22 can match trial lessons against weekly
  slots and weekly slots against trial dates without its own date maths.
- **Display formatting** (using the passed time zone and the student's
  locale through `Intl`, with the locale defaulting to the browser's):
  - weekday name ("Monday")
  - local time of day ("14:00" or "2:00 PM", following the locale)
  - time range for a duration of 40 or 60 minutes ("14:00–14:40")
  - full date and time for the trial lesson: weekday, date and hour
    ("Monday, 3 November 2026, 14:00", following the locale)
  - a short time zone label for the student ("Asia/Karachi (GMT+5)" or the
    locale's equivalent), for pages that need to say which zone times are in
  - all formatted times and ranges are suitable for `tabular-nums` (no
    padding tricks with spaces)
- **Week order.** Local weekdays are ordered Monday to Sunday, matching the
  backend's day order.
- **CLAUDE.md update:** Architecture gets a short note on where the time
  helpers live, that they take the time zone and "now" as arguments, and
  that local times are rendered on the client (see Behavior).

## Out of scope
- The availability query and the blocked-slot sets for the pickers, including
  "exclude my own slot" when editing: spec 22. This spec only provides the
  conversions and the instant → UTC weekly key they need.
- The weekly slot picker UI: spec 23.
- The trial slot picker UI: spec 24.
- The dashboard schedule, week grid, mobile day list and "Free trial" card:
  spec 21.
- Booking, editing, deleting and cancelling: specs 25–30.
- Deciding whether a trial lesson is locked (past or completed): spec 31.
  The trial slot list here only avoids offering past hours.
- Formatting prices and the weekly cost.
- A setting that lets the student choose a time zone other than the
  browser's, or storing a time zone on the server.
- Server-side rendering of local times (the server doesn't know the
  student's time zone).
- Tests of any kind (per CLAUDE.md).

## Routes and pages
None. No routes are added or changed.

## Backend contract
No endpoint is called by this spec. It handles the UTC formats CLAUDE.md
documents:

- `/classes/` and `/classes/{id}/` send and return `day` (`monday`–`sunday`)
  and `time` (full hour, UTC); responses also include `day_display`.
- `/trial-lessons/` and `/trial-lessons/{id}/` send and return `starts_at`
  (ISO 8601 UTC, full hour, future).
- `GET /availability/` returns `weekly_classes: [{day, time "HH:MM:SS",
  mine}]` and `trial_lessons: [{starts_at, day, time, mine}]`.
- `GET /schedule/` returns weekly classes and the trial lesson, sorted by
  UTC day and time.

`day_display` is the backend's UTC weekday label and must not be shown as
the student's local day.

## Behavior
- **Whole-hour zone, same day:** in `Asia/Karachi` (UTC+5), UTC Monday
  09:00:00 → local Monday 14:00, and local Monday 14:00 → UTC `monday`
  `"09:00:00"`.
- **Rollover forward:** in `Asia/Karachi`, UTC Monday 21:00:00 → local
  Tuesday 02:00.
- **Rollover backward:** in `America/New_York` (UTC−5 in winter), UTC Monday
  02:00:00 → local Sunday 21:00.
- **Week wrap-around:** in `Asia/Karachi`, UTC Sunday 22:00:00 → local Monday
  03:00; in `America/New_York`, UTC Monday 01:00:00 → local Sunday 20:00 (or
  21:00 in summer), and the inverse conversions return the original UTC slot.
- **UTC zone:** in `UTC`, every slot is unchanged.
- **Daylight saving:** a weekly slot's local time depends on the offset in
  force, so weekly conversions use the offset at the slot's next occurrence
  at or after the reference instant passed in (normally "now"), never the
  offset at the reference instant itself. For example, UTC Monday 14:00 is
  10:00 in New York in summer and 09:00 in winter. In `Europe/London` with
  "now" on Thursday 2026-10-22 (BST), UTC Monday 14:00 shows local Monday
  14:00, because its next occurrence (Monday 26 October) falls after clocks
  go back on Sunday 25 October.
- **Daylight-saving check:** true for `Europe/London` and
  `America/New_York`; false for `Asia/Karachi`, `Asia/Kolkata` and `UTC`.
- **Trial lesson:** in `Asia/Karachi`, `starts_at` `2026-11-02T20:00:00Z` →
  local Tuesday 3 November 2026, 01:00, formatted with weekday, date and hour.
- **Trial local → UTC:** in `Europe/London`, local 2026-11-03 at 14:00 →
  `2026-11-03T14:00:00Z`; local 2026-07-01 at 14:00 →
  `2026-07-01T13:00:00Z`.
- **Daylight-saving gaps:** a local time skipped in spring (for example 01:30
  on the London spring-forward night) is reported as non-existent; a local
  time repeated in autumn is reported as ambiguous. The pickers avoid both by
  building their choices from UTC instants (the slot grid and trial slot
  list), so students never pick one.
- **Trial slot list:** with "now" at 14:20 UTC, the first offered instant is
  15:00 UTC; with "now" exactly 14:00 UTC, it's 15:00 UTC.
- **Invalid input:** an unknown day code, a time such as `"09:30:00"`, or an
  unparseable `starts_at` is rejected with a clear error from the parsing
  helpers, not converted to a wrong slot.
- **Rendering on the client:** the server doesn't know the student's time
  zone, so any component that shows a local time renders it in the browser
  (a Client Component that reads the time zone after mount, or a skeleton
  first) to avoid hydration mismatches. Under Cache Components, server code
  must not call these helpers with an implicit "now"; they never read it
  themselves.
- **Loading, empty, error states, validation, auth, redirects and cache
  invalidation:** not applicable (no UI, no requests, no mutations).

## Time handling
This spec is the time handling for the app:
- UTC weekday + full hour ↔ local weekday + time, with day and week rollover
- UTC `starts_at` ↔ local date + time, reporting daylight-saving gaps and
  overlaps
- UTC slot grid and future trial slot list with local labels
- `starts_at` → UTC weekday + time key for availability matching
- display formatting of weekdays, times, time ranges, full trial dates and
  the time zone label

## UI notes
No visible UI is added. Later specs show the formatted values with
`tabular-nums` for times, per the Design section. No tutor name or photo is
involved.

## Acceptance criteria
Check these with a temporary Client Component page (reverted afterwards)
that calls the helpers and prints the results, using Chrome DevTools
(Sensors › Location › Timezone override) to switch the browser's time zone.

- [x] The browser time zone helper returns `Asia/Karachi` with that override,
      and `America/New_York` with that one _(verified in code — check in browser)_
- [x] UTC `monday` `"09:00:00"` in `Asia/Karachi` shows local Monday 14:00,
      and converting local Monday 14:00 back gives `monday` `"09:00:00"`
- [x] UTC `monday` `"21:00:00"` in `Asia/Karachi` shows local Tuesday 02:00
- [x] UTC `monday` `"02:00:00"` in `America/New_York` with a winter reference
      date shows local Sunday 21:00
- [x] UTC `sunday` `"22:00:00"` in `Asia/Karachi` shows local Monday 03:00,
      and the inverse gives `sunday` `"22:00:00"`
- [x] UTC `monday` `"14:00:00"` in `America/New_York` shows 10:00 with a July
      reference date and 09:00 with a December one
- [x] In `Europe/London` with "now" on Thursday 2026-10-22 (BST), UTC
      `monday` `"14:00:00"` shows local Monday 14:00, because its next
      occurrence (Monday 26 October) falls after clocks go back on Sunday
      25 October
- [x] The daylight-saving check returns true for `Europe/London` and
      `America/New_York`, and false for `Asia/Karachi`, `Asia/Kolkata` and
      `UTC`
- [x] In `UTC`, every one of the 168 weekly slots is unchanged, and the slot
      grid lists 168 slots ordered Monday to Sunday by local time
- [x] Every one of the 168 UTC weekly slots round-trips (UTC → local → UTC)
      to itself in `Asia/Karachi`, `America/New_York` and `Asia/Kolkata`
- [x] `starts_at` `2026-11-02T20:00:00Z` in `Asia/Karachi` formats as Tuesday,
      3 November 2026, 01:00 (in the locale's format)
- [x] Local 2026-07-01 14:00 in `Europe/London` gives `2026-07-01T13:00:00Z`,
      and local 2026-11-03 14:00 gives `2026-11-03T14:00:00Z`
- [x] A skipped local time on the London spring-forward night is reported as
      non-existent, and a repeated one on the autumn night as ambiguous
- [x] The trial slot list with "now" at 14:20 UTC starts at 15:00 UTC, and
      with "now" at exactly 14:00 UTC also starts at 15:00 UTC
- [x] The trial slot list groups instants under the correct local date when
      a UTC day spans two local dates
- [x] `starts_at` `2026-11-02T20:00:00Z` gives the UTC weekly key `monday`
      `"20:00:00"` in every time zone
- [x] A 40-minute range from local 14:00 formats as 14:00–14:40, and a
      60-minute one as 14:00–15:00 (in the locale's time format)
- [x] The time zone label shows the zone and its current offset
- [x] Parsing `"funday"`, `"09:30:00"` or `"not-a-date"` is rejected with an
      error instead of producing a slot
- [x] The helpers can be imported from a `"use client"` component and from a
      Server Component, and the build has no `server-only` error
- [x] CLAUDE.md's Architecture section describes the time helpers
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Non-whole-hour time zones.** The backend only accepts full UTC hours,
  but roadmap rows 23 and 24 say students pick "a full hour in local time".
  In zones like `Asia/Kolkata` (UTC+5:30) or `Asia/Kathmandu` (UTC+5:45), no
  local full hour is a full UTC hour, so those students could book nothing.
  This spec resolves it by building every choice from full UTC hours and
  showing their local time with minutes where needed (for example 14:30 in
  Kolkata). Rows 23 and 24 should be read as "a full UTC hour shown in local
  time"; their specs must follow this.
- **Weekly classes and daylight saving.** A weekly class is fixed in UTC, so
  its local hour moves by one when the student's clocks change. CLAUDE.md's
  "the frontend converts to the student's local time" doesn't say which
  week's offset to use. This spec converts each slot using the offset at its
  next occurrence at or after a reference instant passed in by the caller
  (normally "now"), never the offset at the reference instant itself. When
  the daylight-saving check returns true for the student's zone, the
  dashboard (21) and weekly picker (23) show this short note, and only then:
  "Times are in <zone>. Weekly classes are fixed in UTC, so their local time
  moves by an hour when your clocks change."
- **Weekly round-trip in clock-change weeks.** Scope says every UTC slot
  round-trips through local time, but under the next-occurrence rule two UTC
  slots share one local time in the week of an autumn clock change (London:
  UTC Sunday 00:00 and 01:00 are both local 01:00), and a spring change
  leaves a local hour with no slot. Resolved in planning: weekly local → UTC
  returns `ok`, `ambiguous` (both slots) or `nonexistent`, like the trial
  conversion, and the round-trip criterion is checked with a reference
  instant outside clock-change weeks. Pickers build from the slot grid, so
  students never meet these cases.
- **Trial local → UTC off the hour.** In a half-hour zone a local time can map
  to a UTC time that isn't a full hour (Kolkata 14:00 → 08:30 UTC), which the
  backend rejects. Resolved in planning: the conversion reports
  `not-full-hour` instead of returning an invalid `starts_at`.
- **`day_display`.** Class responses include the backend's UTC weekday label.
  Showing it would contradict the converted local day whenever a slot rolls
  over, so later specs must use the converted local weekday instead.

## Open questions
None.
