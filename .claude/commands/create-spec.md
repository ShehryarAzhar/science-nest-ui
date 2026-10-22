---
description: Create a numbered feature spec in .claude/specs/
argument-hint: <number> <spec name>
allowed-tools: Read, Glob, Grep, Write, Bash(ls:*), Bash(mkdir:*)
---

Create a feature spec from these arguments: `$ARGUMENTS`

Usage: `/create-spec <number> <spec name>`

Examples:
- `/create-spec 01 auth login register` → `.claude/specs/01-auth-login-register.md`
- `/create-spec 3 Trial Lesson Booking` → `.claude/specs/03-trial-lesson-booking.md`

## 1. Parse the arguments

1. The first word of the arguments is the spec number. It must be digits only.
   Zero-pad it to two digits (`1` → `01`). If it's missing or not a number,
   stop and show the usage line.
2. Everything after the first word is the spec name. Make it a slug:
   lowercase, trim it, replace spaces and underscores with `-`, remove
   anything that isn't `a-z`, `0-9` or `-`, collapse repeated `-`, and strip
   `-` from both ends. If the name is empty, stop and show the usage line.
3. The output path is `.claude/specs/<NN>-<slug>.md`. Create `.claude/specs/`
   if it doesn't exist.
4. If any file in `.claude/specs/` already starts with `<NN>-`, stop. Tell the
   user which file it is and ask whether to overwrite it or pick another
   number. Never overwrite without their confirmation.

## 2. Gather context before writing

1. Read `CLAUDE.md` (and `AGENTS.md`) for the app description, the backend
   API, the auth flow, the stack, the Next.js 16 caveats, and the no-tests
   rule.
2. Read every existing spec in `.claude/specs/` to see what's already
   specified. Don't duplicate their scope, and list them as dependencies
   where they apply.
3. Look at the current code (`app/`, `components/`, `lib/`, `proxy.ts`,
   `package.json`) so the spec matches what exists: routes, providers,
   helpers, installed libraries.
4. Work out the feature from the spec name, CLAUDE.md and the code. If the
   scope is still unclear or could reasonably go more than one way, ask the
   user up to 5 short questions first, then write the spec. Don't guess on
   scope.

## 3. Rules for the spec

- The spec describes **what** to build and **why**: behavior, scope, the
  backend contract and acceptance criteria. Don't write an implementation
  plan, file-by-file steps or code. The plan is made later in Plan Mode from
  this spec.
- Use only the backend endpoints and fields documented in CLAUDE.md. Never
  invent endpoints, fields or error formats. If the feature needs something
  the backend doesn't provide, put it under Open questions.
- Keep each spec to one feature that can be built and reviewed on its own.
  If the name implies too much, say so and suggest a split.
- No tests. Acceptance criteria are checked manually in the browser, plus
  `npx tsc --noEmit`, `npm run lint` and `npm run build`.
- If something in CLAUDE.md or the current code conflicts with what the
  feature needs, record it under "Conflicts" instead of quietly working
  around it.
- Use today's date for **Created**.

## 4. Spec template

Write the file in exactly this structure:

```markdown
# Spec <NN>: <Title Case Name>

- **Status:** Draft
- **Created:** <YYYY-MM-DD>
- **Depends on:** <earlier spec files, or "None">

## Summary
2–4 sentences: what the feature is and why the student needs it.

## User stories
- As a <guest/student>, I want … so that …

## Scope
Exactly what this spec delivers, as a bulleted list. Be specific.

## Out of scope
What this spec does NOT deliver, including nearby things a developer might
be tempted to add, and features left for later specs (name them if known).

## Routes and pages
Each route, who can access it (public / guests only / student), and what it
shows.

## Backend contract
Every endpoint used: method, path (with trailing slash), request body,
response fields used, and the error responses to handle (400 field errors,
non_field_errors, 401, 403 detail). Copied from CLAUDE.md, never invented.

## Behavior
Step-by-step behavior, including:
- loading, empty, success and error states
- validation rules (client side with Zod, matching the backend)
- auth and redirects (logged out, logged in, admin account with no Student
  profile → friendly message)
- cache invalidation after mutations (which TanStack Query data to refresh)

## Time handling
Only when the feature shows or picks dates or times. The API is all UTC. List
which conversions apply. Write "Not applicable" otherwise.

## UI notes
Layout, key components, shadcn/ui components to use, and mobile behavior.
No tutor name or photo anywhere.

## Acceptance criteria
A checklist using `- [ ]` items, one criterion per line, each checkable by
hand in the browser. The last items are always:
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

## Conflicts
Anything in CLAUDE.md or the current code that conflicts with this spec, or
"None found".

## Open questions
Decisions still needed from the user, or "None".
```

## 5. Reply

When done, reply with only the file path and a 2–3 line summary. Don't repeat
the spec in chat.
