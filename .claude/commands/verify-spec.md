---
description: Verify a spec's acceptance criteria, run checks, tick criteria and mark the spec Done
argument-hint: <number>
allowed-tools: Read, Glob, Grep, Edit, Bash(ls:*), Bash(git status:*), Bash(git diff:*), Bash(npx tsc --noEmit), Bash(npm run lint), Bash(npm run build)
---

Verify the spec for these arguments: `$ARGUMENTS`

Usage: `/verify-spec <number>`

Example: `/verify-spec 01` verifies `.claude/specs/01-<slug>.md`.

## 1. Find the spec

Take the first word of the arguments. It must be digits only. Zero-pad it to
two digits. Find the file in `.claude/specs/` that starts with `<NN>-`. If
there is no number, no match, or more than one match, stop and say so. If the
spec's Status is already `Done`, say so and ask the user whether to re-verify
it.

## 2. Read the context

Read the whole spec, `CLAUDE.md`, and the specs listed under "Depends on".
Use `git status` and `git diff` to see what was changed for this feature.

## 3. Check each acceptance criterion against the code

For every item:

- Find the code that implements it: routes, components, server actions,
  query hooks, Zod schemas, `proxy.ts`. Note the file paths.
- Decide **Pass** or **Fail**. A criterion passes only if the code clearly
  implements it, including the states it names (loading, empty, error,
  401/403 handling, validation messages, cache invalidation, redirects).
  "Probably" or "partly" counts as Fail.
- If a criterion is about what the user sees or does in the browser, judge
  it from the code. Mark it **Pass (code review)** so the user knows to try
  it in the browser themselves.

Also check that nothing listed under "Out of scope" was built. If something
was, report it as a scope issue.

Check the implementation against CLAUDE.md. If it contradicts anything there
(Design, Backend API, Architecture, Auth flow, Installed but not yet wired up,
or the roadmap row), including a section the spec should have updated but
didn't, report it as a failure with the CLAUDE.md section and file:line.

## 4. Run the checks

Run these in this order and record pass or fail for each:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`

Run all three even if one fails. If one fails, show the first relevant
errors, not the whole output. These checks are the spec's last acceptance
criteria and are ticked from these results.

## 5. Do not change any app code

Don't fix failures and don't refactor. The only files this command edits are
the spec and that spec's Status cell in the CLAUDE.md roadmap. It never
changes app code or any other part of CLAUDE.md.

## 6. Update the spec

- Make the acceptance criteria a task list if they aren't one yet. Turn each
  item into `- [ ] <text>`, keeping the order and wording.
- Change `- [ ]` to `- [x]` for every criterion that passed. Leave failed
  ones unticked.
- After each "Pass (code review)" item, add
  ` _(verified in code — check in browser)_`.
- After each failed item, add one line with the reason, e.g.
  ` — ❌ <short reason, file:line>`. On re-runs, remove an old ❌ note when
  that item now passes.
- **If every criterion passed and there are no scope issues or CLAUDE.md
  contradictions:** set
  `**Status:** Done` and add `- **Completed:** <YYYY-MM-DD>` (today's date)
  under the Created line, or update it if it's already there.
- **Otherwise:** don't change the Status. Never set Done when anything
  failed.
- Don't edit any other part of the spec.

## 7. Update the roadmap

- **If the spec is now Done**, find the row in the CLAUDE.md "Spec roadmap"
  table whose `#` matches the spec number and change only its Status cell to
  `Implemented`. Use Edit on that single row.
  - If the row is already `Implemented`, leave it.
  - If there's no row for that number, or its slug doesn't match the spec
    file name, don't edit CLAUDE.md. Report the mismatch.
- **If the spec isn't Done** (any criterion failed, or a scope issue or
  CLAUDE.md contradiction was found), don't touch the roadmap. If the row is marked `Implemented` but the
  spec now fails, report the mismatch without changing it.

## 8. Report back

Reply briefly in chat with:

- the spec file and its final Status
- criteria passed / total
- a table of failed criteria, scope issues and CLAUDE.md contradictions:
  criterion, reason, file
- the results of the tsc, lint and build checks
- the criteria marked "check in browser", as a short list for the user to try
- one line saying whether the roadmap row was updated, already Implemented,
  or left alone (and why)

Don't repeat the whole spec.
