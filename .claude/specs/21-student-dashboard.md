# Spec 21: Student Dashboard

- **Status:** Done
- **Created:** 2026-10-28
- **Completed:** 2026-10-28
- **Depends on:** 06-time-zone-helpers.md, 09-query-provider.md, 15-student-access-guard.md

## Summary
The `/dashboard` page shows the student's schedule from `GET /schedule/`:
their trial lesson, their recurring weekly classes with each price, and the
total weekly cost, all in the student's local time. It also says how
meeting links arrive and links to the booking pages. This is the student's
home after logging in, so they can see at a glance when their lessons are
and what they pay each week.

## User stories
- As a student, I want to see my weekly classes in my own time zone so that
  I know when to join each lesson.
- As a student, I want to see what each class costs and my total per week so
  that I know what I'm paying.
- As a student with a trial lesson, I want to see its full date and time so
  that I don't miss it.
- As a student, I want to know how I'll get the meeting link so that I'm not
  waiting for it in the wrong place.
- As a new student with no bookings, I want clear links to book a free trial
  or a weekly class so that I know what to do next.
- As someone logged in with an admin account, I want a friendly message
  rather than an error.
- As a student whose session has expired, I want to be taken to log in and
  brought back to my dashboard.

## Scope
- A new student route `/dashboard`. `proxy.ts` already protects it, the
  header nav links to it, login redirects there by default, and `robots.ts`
  disallows it.
- A schedule query for `GET /schedule/`, fetched in the browser through
  `studentFetch` (`/api/student/schedule`) with TanStack Query, so the
  booking, edit, delete and cancel specs (25–31) can invalidate it. The query
  key and the response type are shared, not private to the page. A runtime
  Zod check of the response shape: a mismatch counts as a failed load.
- **Free trial card** (only when `trial_lesson` isn't null): its own
  eosin-accented card above the weekly schedule, labelled "Free trial",
  showing the subject name, the level name, the full local date and time
  (weekday, date and hour, through `formatTrialDateTime()`), "60 minutes"
  and "Free". It's never placed in the week grid or styled like a weekly
  block. It's shown even when the lesson is past or completed, the same way
  as an upcoming one (the locked display is spec 31).
- **Weekly schedule**, in local time:
  - Desktop: a Monday–Sunday week grid. Each weekly class is a tint block
    with a 3px primary left rule, placed on its local weekday at its local
    start time, sized by its duration, and showing the subject, level, local
    time range and price.
  - Mobile: a list grouped by local weekday (Monday first, only days that
    have classes), each class showing the same details, in local start-time
    order.
  - The grid shows the hours from the earliest local class start to the
    latest local class end, not all 24 hours.
- **Weekly cost:** `weekly_cost` as USD (`formatUsd()`), in tabular figures,
  labelled as the total per week. Each class's `price` is shown the same way.
- **Time zone line:** "Times are in <zone label>" (`formatTimeZoneLabel()`)
  whenever weekly classes or a trial lesson are shown. When
  `observesDaylightSaving()` is true for the student's zone and there's at
  least one weekly class, the note from spec 06 replaces it: "Times are in
  <zone>. Weekly classes are fixed in UTC, so their local time moves by an
  hour when your clocks change."
- **Meeting link note**, whenever the student has any booking: lessons are
  on Zoom or Google Meet, and the tutor sends the link before each lesson
  on WhatsApp to the registered phone number, or by email. No link is
  stored or shown.
- **Booking links:** "Book a weekly class" → `/classes/new` always, and
  "Book a free trial" → `/trial-lesson/new` only when `trial_lesson` is
  null. Neither carries `?subject=`.
- **Empty state** (no weekly classes and no trial lesson): the
  `empty-schedule.webp` illustration (through `SpecimenImage`, `alt=""`,
  lazy, nothing shown if it fails), a short line saying nothing is booked
  yet, and both booking links. When there's a trial lesson but no weekly
  classes, the trial card shows, followed by a short "No weekly classes yet"
  line with the weekly booking link instead of the grid. No weekly cost is
  shown then.
- Loading, error and access states (see Behavior).
- Page metadata: title "Dashboard" (through the root title template) and
  `robots: { index: false }`.
- CLAUDE.md update: a short Architecture note on the dashboard (browser
  query, shared key that later specs invalidate, client-only local times).

## Out of scope
- Availability query and blocked slot sets: spec 22.
- Weekly and trial slot pickers: specs 23 and 24.
- The booking pages themselves (`/classes/new`, `/trial-lesson/new`): specs
  25 and 28. Until they exist, the links lead to the not-found page.
- Edit links on weekly classes or the trial lesson: specs 26 and 29.
- Delete and cancel actions and their confirmation dialogs: specs 27 and 30.
  The layout should leave room for them on each class and on the trial card,
  but this spec adds no buttons.
- Locked, past or completed labels on the trial lesson, and hiding its edit
  and cancel controls: spec 31.
- Showing `day_display` (it's the UTC weekday), meeting links, the tutor's
  contact details, or anything from `/availability/`.
- A time zone picker: the browser's zone is used.
- Changes to the student access guard (spec 15), query defaults (spec 09)
  or the time zone helpers (spec 06), except adding what's missing for
  display if planning finds a gap.
- Tests of any kind (per CLAUDE.md).

## Routes and pages
- `/dashboard` (student; guests are redirected to
  `/login?next=/dashboard` by `proxy.ts`, spec 07): heading "Dashboard",
  then the trial card, the weekly schedule and cost, the notes and booking
  links, or the empty state, or the guard's fallback, or the inline error
  panel.

## Backend contract
- `GET /schedule/` (through `GET /api/student/schedule`, student mode,
  `Authorization: JWT <access>` added by the proxy route)
  - Response: `{ weekly_classes, trial_lesson, weekly_cost }`, sorted by UTC
    day and time.
  - Each weekly class: `id`, `subject` (`{id, name, slug, levels}`),
    `level` (`{code, name}`), `day` (`monday`–`sunday`, UTC), `day_display`
    (not used), `time` (`"HH:MM:SS"`, UTC full hour), `duration` (40 or 60),
    `price` (number, 2 decimal places).
  - `trial_lesson`: `null`, or `id`, `subject` (`{id, name, slug, levels}`),
    `level` (`{code, name}`), `starts_at` (ISO 8601 UTC), `completed`
    (boolean). Shown even when completed or past.
  - `weekly_cost`: number, 2 decimal places, the sum of the prices (`0` with
    no classes).
  - 401: student access guard (session-expired flow, through
    `studentFetch`).
  - 403 `{detail}` (logged-in user with no Student profile): the guard's
    "Student account needed" state.
  - 502/504 from the proxy (network failure, timeout), 5xx, non-JSON
    responses, or a 2xx that fails the Zod check or the time parsers
    (`TimeValueError`): inline error panel. The backend's message and the
    error's own text are never shown.
- No 400 or field errors apply (nothing is sent).

## Behavior
1. **Guest:** `proxy.ts` redirects to `/login?next=/dashboard`. After
   logging in, the user lands back on `/dashboard`.
2. **Loading:** the page heading renders at once (prerendered). The content
   area shows a static placeholder (no pulse or spinner) until the schedule
   has loaded and the component has mounted, since local times need the
   browser's time zone.
3. **Success with bookings:** the trial card (if any), then the weekly
   schedule (grid on desktop, day list on mobile) with prices and the weekly
   cost, the time zone line or daylight-saving note, the meeting link note,
   and the booking links per Scope.
4. **Empty:** the empty state per Scope.
5. **Session gone (401):** `studentFetch` ends the session and loads
   `/login?expired=1&next=/dashboard`. The page stays in its loading state
   meanwhile (no error flash).
6. **Admin account (403):** `StudentAccountNeeded` replaces the page
   content.
7. **Other failures:** an inline panel "Your schedule couldn't be loaded"
   with "Please try again in a moment." and a Try again button that refetches
   the query. The heading stays. A successful retry shows the schedule.
   Retries follow the shared defaults (spec 09).
8. **Freshness:** the shared `staleTime` (30 s) and TanStack Query's
   refetch on window focus apply. Later specs invalidate this query after
   each mutation; this spec makes the key available.
9. **Logout:** the header's logout clears the query cache (spec 12), so the
   next student never sees the previous student's schedule.
10. Nothing on the page is editable in this spec.

## Time handling
- Weekly classes: UTC `day` + `time` → local weekday and time with
  `weeklySlotToLocal()`, using "now" (taken once on mount) as the reference,
  so each class uses the offset at its next occurrence. The end time comes
  from the duration (`formatTimeRange()`).
- Local order: classes are grouped and sorted by local weekday (Monday
  first) and local time, not the backend's UTC order, since a class can move
  to another weekday in local time.
- Half-hour and 45-minute zones (e.g. `Asia/Kolkata`): local times keep
  their minutes (14:30), and grid blocks sit at that offset.
- A class that runs past local midnight stays under its local start day,
  with its time range shown.
- Trial lesson: UTC `starts_at` → full local date and time with
  `formatTrialDateTime()`.
- Weekdays use `formatWeekday()`, never `day_display`.
- The student's zone comes from `getBrowserTimeZone()` after mount. The
  server never renders local times.
- `observesDaylightSaving()` decides whether the daylight-saving note shows.

## UI notes
- Use the frontend-design skill before writing the UI, within the Design
  section: functional page, clarity first, no hex lattice. The only image is
  the empty-state illustration. Theme tokens only.
- Layout: functional page width (max 72rem, 16px mobile gutter), 16–24px
  gaps, heading "Dashboard" in the heading font.
- Trial card: surface card (16px radius, border, no shadow) with an eosin
  accent and a "Free trial" badge (full radius), separate from the grid.
- Week grid (desktop, from `md` up or wherever seven columns fit): weekday
  column headers, an hour axis on the side in local time, and classes as
  secondary tint blocks with a 3px primary left rule. No hatch or "Taken"
  styling here, since this is the student's own schedule. A short 40-minute
  block must still show at least the subject and time.
- Day list (mobile): a weekday heading per group, then a row or card per
  class with subject, level, time range and price.
- Prices, times and weekly cost use `tabular-nums`. The weekly cost sits
  with the weekly schedule, clearly labelled as per week.
- Notes (time zone, daylight saving, meeting link) are muted body text, not
  alerts. The meeting link note can sit next to a small lucide icon.
- Booking links are buttons (`components/ui/button.tsx`), no `→`.
- Error panel: same treatment as the subjects and account error panels
  (icon + heading + text, `role="alert"`, a 44px Try again button), below
  the page heading, with no `h1` of its own.
- No tutor name or photo anywhere.

## Acceptance criteria
- [x] As a guest, opening `/dashboard` redirects to `/login?next=%2Fdashboard`, and logging in returns to `/dashboard` _(verified in code — check in browser)_
- [x] A student with no bookings sees the empty state with the illustration and both "Book a free trial" (`/trial-lesson/new`) and "Book a weekly class" (`/classes/new`) links _(verified in code — check in browser)_
- [x] If `empty-schedule.webp` fails to load, the empty state shows no broken image icon _(verified in code — check in browser)_
- [x] A student with weekly classes sees each one on the correct local weekday and time (checked against the UTC values in the Django admin and the browser's zone) _(verified in code — check in browser)_
- [x] Each weekly class shows its subject, level, local time range and price in USD _(verified in code — check in browser)_
- [x] The weekly cost matches `weekly_cost` from the backend, formatted as USD in tabular figures _(verified in code — check in browser)_
- [x] With the browser zone set to `Asia/Kolkata`, class times show with :30 minutes and blocks sit at the half hour _(verified in code — check in browser)_
- [x] With a class at UTC Sunday 23:00 and the zone set to `Asia/Karachi`, the class shows on Monday at 4:00 _(verified in code — check in browser)_
- [x] A student with a trial lesson sees the "Free trial" card above the weekly schedule, with subject, level and full local weekday, date and time, and the trial lesson isn't in the week grid _(verified in code — check in browser)_
- [x] A past or completed trial lesson still shows on its card _(verified in code — check in browser)_
- [x] With a trial lesson booked, "Book a free trial" isn't shown, and "Book a weekly class" is _(verified in code — check in browser)_
- [x] With a trial lesson but no weekly classes, the trial card shows, followed by "No weekly classes yet" and the weekly booking link, with no grid and no weekly cost _(verified in code — check in browser)_
- [x] At 375px wide, weekly classes show as a list grouped by local weekday, Monday first; on desktop they show as a week grid _(verified in code — check in browser)_
- [x] The meeting link note says links come on WhatsApp to the registered phone number or by email, before each lesson _(verified in code — check in browser)_
- [x] With the zone set to `Europe/London`, the daylight-saving note shows; with `Asia/Karachi`, only "Times are in Asia/Karachi (GMT+5)" shows _(verified in code — check in browser)_
- [x] `day_display` text isn't used anywhere on the page _(verified in code — check in browser)_
- [x] Logged in as an admin account, the page shows "Student account needed" with Log out and Home _(verified in code — check in browser)_
- [x] With a forged `access` cookie that Django rejects, the page ends on `/login?expired=1&next=%2Fdashboard` with the session-expired notice, and both cookies are gone _(verified in code — check in browser)_
- [x] With Django stopped, the page shows the heading and the "Your schedule couldn't be loaded" panel, with no backend message or error text _(verified in code — check in browser)_
- [x] After restarting Django, Try again shows the schedule without a full reload _(verified in code — check in browser)_
- [x] Adding a weekly class in the Django admin and refocusing the tab (after 30 s) shows it without a reload _(verified in code — check in browser)_
- [x] Logging out and logging in as another student never shows the previous student's schedule _(verified in code — check in browser)_
- [x] The page shows no tutor name or photo _(verified in code — check in browser)_
- [x] The page looks right in light and dark themes and at 375px wide _(verified in code — check in browser)_
- [x] The browser tab title is "Dashboard · Science Nest" and the page has a `noindex` robots meta tag _(verified in code — check in browser)_
- [x] CLAUDE.md Architecture describes the dashboard and its shared schedule query
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- **Browser fetch, not a server read like `/account`:** spec 20 reads its
  data in a Server Component. The dashboard fetches in the browser through
  the student API proxy and TanStack Query instead, because local times
  render only in Client Components after mount (CLAUDE.md › Time zones), and
  specs 25–31 refresh the schedule by invalidating a query (roadmap rows).
- **Error handling differs from `/account`:** a failed load shows the inline
  panel from the query's error state, with Try again calling `refetch()`,
  rather than a `catchError` boundary.
- **Trial booking link vs. public pages:** CLAUDE.md shows "Book a free
  trial" to everyone on public pages, because they're static. The dashboard
  knows whether a trial lesson exists, so it hides the link then, matching
  roadmap row 28 ("only offered when the student has no trial lesson").
- **Past trial lessons look like upcoming ones here:** CLAUDE.md says the
  schedule includes the trial lesson even when past, but the locked display
  belongs to spec 31. Until 31, a past or completed trial card has no label.

## Open questions
None.
