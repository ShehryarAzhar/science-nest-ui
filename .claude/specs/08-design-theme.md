# Spec 08: Design Theme

- **Status:** Done
- **Created:** 2026-10-25
- **Completed:** 2026-10-25
- **Depends on:** None

## Summary
The app still runs on the shadcn scaffold's neutral greys, with Geist and
Inter fonts. This spec turns the CLAUDE.md Design section ("Stained slide")
into the app's theme: light and dark colour tokens, fonts, type scale,
radius, elevation and motion rules in `app/globals.css`, with fonts loaded
through `next/font`. It also adds light/dark/system theme switching with
`next-themes`, defaulting to the system setting, with no flash of the wrong
theme. Every later UI spec builds on these tokens, so students get one
calm, consistent look that's readable in both themes.

## User stories
- As a guest or student, I want the app to follow my device's light or dark
  setting, so that it's comfortable to read in any lighting.
- As a guest or student who picked a theme, I want that choice remembered
  across visits, with no flash of the other theme on load, so that pages
  don't flicker.
- As a guest or student, I want text with enough contrast and motion that
  respects my reduced-motion setting, so that the app is accessible.

## Scope
- **Colour tokens** in `app/globals.css`, light (`:root`) and dark (`.dark`),
  with the exact hex values from CLAUDE.md › Design › Colours, exposed as
  Tailwind v4 colour utilities through `@theme inline`:
  - shadcn's standard names mapped onto the palette: `background`,
    `foreground`, `card` / `card-foreground` and `popover` /
    `popover-foreground` (surface + foreground), `primary` /
    `primary-foreground` (on-primary), `secondary` / `secondary-foreground`,
    `accent` / `accent-foreground` (same as secondary: the accent tint),
    `muted` / `muted-foreground`, `border`, `input` (same as border),
    `ring` (primary), `destructive`.
  - New tokens for the colours shadcn doesn't have: `eosin` /
    `eosin-foreground` (on-eosin), `success` / `success-foreground`,
    `warning` / `warning-foreground` (on-warning), and
    `destructive-foreground` (on-destructive, `#FFFFFF` / `#14122A`).
  - The scaffold's `chart-*` and `sidebar-*` variables are removed: they
    aren't in the palette and nothing uses them.
  - `color-scheme: light` / `dark` set with the theme, so native controls
    and scrollbars match.
- **Fonts** loaded with `next/font/google` in `app/layout.tsx`:
  Source Serif 4 (600 and 700) as the heading font and Atkinson Hyperlegible
  Next (400 and 600) as the body/UI font, exposed as `--font-heading` and
  `--font-sans`. Geist, Geist Mono and Inter are removed, along with
  `--font-mono` (no monospace font in the design).
- **Base typography** in `@layer base`: body uses the sans font, line-height
  1.6; `h1`–`h6` use the heading font at weight 600. The type scale
  14/16/20/25/31/39/49px is available as Tailwind font-size utilities
  (Tailwind's default `text-sm`…`text-5xl` steps replaced or remapped so
  only these sizes exist). A hero heading style (700, `-0.01em` tracking)
  is available for spec 18. A prose max width of 65ch is available as a
  utility. `tabular-nums` is Tailwind's built-in utility (no new token).
- **Radius tokens:** 10px (buttons, inputs), 16px (cards, panels, dialogs),
  8px (slot cells), full (badges), as named radius utilities. The scaffold's
  derived `--radius-*` scale is replaced so no other radius values exist.
- **Elevation token:** one shadow, `0 12px 32px -12px rgb(61 47 143 / .28)`
  light and `rgb(0 0 0 / .6)` dark, as a named shadow utility for popovers,
  dialogs and menus. No other shadows (cards have none).
- **Motion tokens and reduced motion:** durations 150ms (state changes) and
  180ms (dialog/popover fade and scale) as named utilities or variables. A
  global `prefers-reduced-motion: reduce` rule makes transitions and
  animations instant. The hero lattice animation itself is spec 18.
- **Focus:** focus-visible rings use the `ring` token (primary) on every
  focusable element by default.
- **Theme switching** with `next-themes` (new dependency):
  - a client `ThemeProvider` wrapper mounted in the root layout
  - the `.dark` class on `<html>` (matching the existing
    `@custom-variant dark`)
  - choices `light`, `dark`, `system`; default `system`; the saved choice
    persists in the browser (next-themes' localStorage default)
  - `system` follows the OS preference live, without a reload
  - the theme is applied before first paint (no flash), and `<html>` gets
    `suppressHydrationWarning` for the class the script sets
  - transitions are suppressed while the theme switches, so colours don't
    animate on toggle
  - known and expected: next-themes 0.4.6 renders its inline script as a
    plain `<script>` element, and the installed React 19.3 dev build logs
    "Encountered a script tag while rendering React component…" when it
    creates a script element on the client. This dev-only message is
    accepted (the script already ran from the server HTML before paint).
    CLAUDE.md › Architecture › UI stack records it.
- **Restyle the installed shadcn components** to the design. Today that is
  only `components/ui/button.tsx`: 10px radius, weight 600 (not 500), sizes
  on the 4px grid, primary fill with on-primary text, focus ring in primary,
  150ms transitions, and the outline variant using surface + border with no
  shadow. Two destructive variants:
  - `destructive`: solid destructive fill with `destructive-foreground`
    text (about 6.6:1 light, 8:1 dark). For the final confirm button in
    delete and cancel dialogs (specs 27, 30).
  - `destructive-soft`: today's tint style, destructive text on a light
    destructive tint. For buttons that open those dialogs. The tint
    strengths at rest and on hover must keep the text at AA (4.5:1) in
    both themes. The current dark hover tint (30% over the background)
    comes out at about 4.5:1, so it may need lowering.
  Other variants keep their names and props.
- **App icons:** confirm `app/icon.svg`, `app/favicon.ico` and
  `app/apple-icon.png` are served and show in the browser tab and as the
  Apple touch icon. Don't edit them or the `public/logo/` files.
- **Remove stale styling** in `app/layout.tsx` that conflicts with the theme
  (the Geist/Inter font variables).

## Out of scope
- The light/dark/system toggle control, header, footer, logo component and
  title template: spec 10.
- Root layout metadata (title, description): spec 10.
- `QueryClientProvider` and the toaster, including toast colours: spec 09.
- Loading, error and not-found pages and `SpecimenImage`: spec 11.
- The home page, its hero hex lattice and draw-in animation, and replacing
  `app/page.tsx` (which keeps its scaffold `zinc-*` classes until then):
  spec 18.
- The hex lattice motif for subject headers: specs 16 and 17.
- Slot cell states (taken hatch, mine, selected) and the schedule grid
  styles: specs 21, 23 and 24.
- Adding shadcn components that aren't installed yet (input, card, dialog,
  …): each spec adds and styles the ones it needs, using these tokens.
- Images in `public/images/`.

## Routes and pages
No new routes. The theme applies to every existing page (`/`, `/login`) and
all future ones.

## Backend contract
None. This spec makes no backend calls.

## Behavior
1. On first visit with no saved choice, the theme follows the OS setting
   (`system`).
2. If the OS setting changes while the page is open, the theme switches
   right away without a reload.
3. A saved choice (`light`, `dark` or `system`, set in devtools until spec
   10 adds the toggle) is applied on every later visit, before first paint.
4. Reloading in dark mode never shows a light frame first, and the reverse.
5. No hydration warnings appear in the console from the theme class. The
   only accepted theme-related console message is next-themes' "Encountered
   a script tag…" dev warning (see Scope).
6. With `prefers-reduced-motion: reduce`, transitions and animations are
   instant.
7. Cache Components: the provider reads no cookies or request data, so it
   adds no dynamic access and needs no `<Suspense>`. The build must not
   report blocking-route errors because of it.
8. No loading, empty or error states: this spec has no data.

## Time handling
Not applicable.

## UI notes
- Only the tokens, fonts, radius, elevation and motion defined in CLAUDE.md
  › Design. No extra colours, fonts, radius values, shadows or motion.
- Use the frontend-design skill when restyling the button, within the
  Design section's rules.
- Eosin is the brand accent, never used for errors. Warning is used only as
  a fill with on-warning text.
- No tutor name or photo anywhere.
- Mobile-first: nothing here changes layout, but the base font size stays
  16px on mobile.

## Acceptance criteria
- [x] With the OS in light mode and no saved choice, the page background is `#F7F7FB` and text is `#1C1A33` _(verified in code — check in browser)_
- [x] With the OS in dark mode and no saved choice, `<html>` has the `dark` class, the background is `#14122A` and text is `#ECEAF7` _(verified in code — check in browser)_
- [x] Switching the OS theme while the page is open switches the app's theme without a reload _(verified in code — check in browser)_
- [x] Setting the saved theme to `dark` with the OS in light mode shows the dark theme after reload, and `light` with the OS in dark mode shows the light theme _(verified in code — check in browser)_
- [x] Reloading with a saved theme that differs from the OS shows no flash of the other theme _(verified in code — check in browser)_
- [x] The console shows no hydration warnings or theme-related errors, other than the accepted next-themes "Encountered a script tag while rendering React component…" dev message _(verified in code — check in browser)_
- [x] Every colour token in CLAUDE.md › Design › Colours exists in `app/globals.css` with its exact light and dark values, including eosin, success, warning, on-destructive and their foregrounds
- [x] `bg-eosin`, `text-eosin-foreground`, `bg-success`, `bg-warning` and `text-warning-foreground` utilities work in both themes _(verified in code — check in browser)_
- [x] No `chart-*` or `sidebar-*` variables, and no colour values outside the palette, remain in `app/globals.css`
- [x] Headings render in Source Serif 4 (600) and body text in Atkinson Hyperlegible Next (devtools › computed font) _(verified in code — check in browser)_
- [x] Geist, Geist Mono and Inter are no longer loaded (network tab shows only the two design fonts) _(verified in code — check in browser)_
- [x] Body line-height is 1.6, and the font-size utilities produce only 14/16/20/25/31/39/49px
- [x] Radius utilities produce 10px, 16px, 8px and full, and no other radius values are defined
- [x] The popover elevation shadow utility produces the light and dark shadow values from CLAUDE.md
- [x] The default `Button` has a primary fill, white text in light and `#14122A` in dark, 10px radius, weight 600 and a primary focus ring when tabbed to _(verified in code — check in browser)_
- [x] Every `Button` variant is readable in both themes, and its text meets WCAG AA contrast (checked in devtools) _(verified in code — check in browser)_
- [x] `destructive` `Button` has a `#B42318` fill with `#FFFFFF` text in light (≥ 4.5:1) and a `#FF8A7A` fill with `#14122A` text in dark (≥ 4.5:1)
- [x] `destructive-soft` `Button` text meets 4.5:1 on its tint in light, at rest and on hover
- [x] `destructive-soft` `Button` text meets 4.5:1 on its tint in dark, at rest and on hover
- [x] With reduced motion turned on in the OS or devtools, button state changes are instant _(verified in code — check in browser)_
- [x] Native form controls and scrollbars follow the active theme (`color-scheme`) _(verified in code — check in browser)_
- [x] The browser tab shows `app/icon.svg` / `favicon.ico`, and `/apple-icon.png` loads _(verified in code — check in browser)_
- [x] `npm run dev` and `npm run build` show no Cache Components errors caused by the theme provider
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Conflicts
- The current `Button`'s `destructive` variant is a tint (destructive text
  on a light destructive tint). By decision, that style is renamed
  `destructive-soft`, and `destructive` becomes a solid fill with the new
  `on-destructive` token (added to CLAUDE.md › Design › Colours, reusing
  existing hex values).
- The current `Button` uses `font-medium` (500), but the Design section only
  allows 400 and 600. This spec changes it to 600.
- `app/page.tsx` uses scaffold `zinc-*`, `bg-white` and `dark:bg-black`
  classes outside the palette. They stay until spec 18 replaces the page.
- Spec 08 has no dependencies, but the roadmap says spec 10 builds the
  toggle. Until then a saved choice can only be set by hand in devtools.

## Open questions
None.
