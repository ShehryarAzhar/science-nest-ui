# Science Nest

Science Nest is the booking frontend for a science tutor. Students register,
browse subjects (Biology, Chemistry, Physics, Science, Biochemistry and
Molecular Biology), book a free 60-minute trial lesson and book recurring
weekly classes. It's a Next.js App Router app that talks to a separate Django
REST backend. Teacher and admin work happens in the Django admin.

## Prerequisites

- Node.js 20.9 or later
- A running Science Nest Django backend (by default at `http://127.0.0.1:8000`)

## Setup

```bash
npm install
cp .env.example .env
```

Then edit `.env` if your backend or site URL differs from the defaults. Both
variables are required. If one is missing or invalid, the app stops with an
error naming it.

## Environment variables

| Name | Purpose | Example |
|---|---|---|
| `API_BASE_URL` | Base URL of the Django REST backend. Every backend path is appended to it. | `http://127.0.0.1:8000` |
| `SITE_URL` | Public base URL of this frontend, used for absolute URLs (sitemap, Open Graph, metadata). | `http://localhost:3000` |

Both must be absolute `http` or `https` URLs without a trailing slash. They're
read on the server only. Restart `npm run dev` after changing `.env`.

## Run

```bash
npm run dev      # development server on http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

`npm run build` needs the backend running at `API_BASE_URL`: public pages such
as `/subjects` are prerendered from it, and the build fails with "Couldn't
fetch subjects from API_BASE_URL. Is the backend running?" when it can't be
reached.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Project docs

Architecture, backend API, design rules and the feature roadmap are in
[`CLAUDE.md`](CLAUDE.md). Feature specs live in [`.claude/specs/`](.claude/specs/).
