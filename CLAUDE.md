# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**UrbanPulse** (package name `urbanpulse`) — hyperlocal civic issue reporting. Citizens photograph problems (potholes, leaks, broken lights, waste); a Gemini Vision agent triages each report, deduplicates it against nearby reports, routes it to a department, and tracks it to resolution with a points/badges gamification loop. Next.js 14 App Router + TypeScript.

## Commands

```bash
npm run dev      # dev server on http://localhost:3000
npm run build    # production build (output: 'standalone', for the Docker image)
npm run start    # serve the production build
npm run lint     # next lint
npm run seed     # node --env-file=.env.local scripts/seed.mjs — loads ~8 demo issues + 4 leaderboard users
```

There is **no test suite**. Verify changes with `npm run build` (clean build = no type/CSS errors) and manual checks via `npm run dev`.

Env: copy `.env.local.example` → `.env.local`. Requires `GEMINI_API_KEY` (server-only), `NEXT_PUBLIC_FIREBASE_*`, and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. `seed` needs permissive Firestore rules (writes allowed).

## Architecture

### The agent pipeline (`lib/gemini.ts`) is the core
Four distinct Gemini calls, all using `GEMINI_MODEL` (default `gemini-2.5-flash`) and the same defensive JSON-parsing pattern (strip ``` fences → `JSON.parse` → clamp/normalize so an off-spec model response never reaches Firestore):

1. **`analyzeIssue`** — one vision call doing validate → categorize → severity(1–5)+safetyRisk → route-to-department. Backs `POST /api/analyze`.
2. **`verifyResolution`** — compares a "before" + "after" photo, skeptically decides if genuinely fixed. Backs `POST /api/verify-resolution`.
3. **`draftComplaint`** — generates a formal complaint letter for the routed department. Backs `POST /api/complaint`.
4. **`generateBriefing`** — reasons across ALL open issues for a prioritized municipal action plan + hotspots + per-dept load. Backs `GET /api/briefing` → `/command`.

When changing model output shapes, update the prompt's literal JSON example, the matching `interface` in `lib/types.ts`, **and** the normalizer (`normalizeAnalysis` / inline clamps) together.

### Data flow & where logic lives
- **`lib/types.ts` is the single source of truth.** `Issue` (Firestore shape, with `Timestamp`) vs `SerializedIssue` (timestamps → epoch millis for client transport) — API routes do this conversion. `CATEGORY_*` / `STATUS_*` label+color maps live here; reuse them, don't redefine.
- **Server logic lives in API routes** (`app/api/**/route.ts`, all `runtime = 'nodejs'`), not in `lib`. `lib/gemini.ts`, `lib/geo.ts`, `lib/points.ts` are pure helpers the routes orchestrate.
- **Geo-dedup is part of issue creation.** `POST /api/issues` calls `findDuplicateIssue` (`lib/geo.ts`) first: geohash-bounds query (Firestore has no radius query) then exact great-circle filter within 200m, same category, unresolved. A hit folds the report into the existing issue (`verifiedCount++`, +5 pts) instead of creating a duplicate.
- **Points/badges** (`lib/points.ts` + `awardPoints` in `app/api/issues/route.ts`): the `users/{uid}` doc is created on first activity; counters increment; `eligibleBadges()` is re-evaluated each award. Badge icons are paths under `/public/badges`.

### Auth & identity (`lib/auth.tsx`)
The app works **signed-out**. `useAuth().identity` returns a stable `uid` that is either the Firebase user id (signed in via Google popup) or an anonymous browser id (`getAnonId`, `lib/user.ts`). Reporting/upvoting always send `identity.uid`; signing in later backfills the user's display name/email onto their existing doc. Always read the current user via `useAuth()`, never call Firebase auth directly.

### Firebase init quirk (`lib/firebase.ts`)
`db` is exported eagerly, but **auth is lazy** via `getClientAuth()`. Eager `getAuth()` at import time validates the API key and breaks server builds (where `NEXT_PUBLIC_*` may be absent) and the API routes that import `db`. Do not export an eager `auth` const.

### Storage decision: no Firebase Storage
Photos are compressed client-side (~800px JPEG, `lib/image.ts`) and stored **inline as data URLs** on the Firestore issue doc — keeps the app on Firebase's free Spark plan. Don't reintroduce a Storage dependency.

## UI conventions

"Sarvam-inspired" design system — keep within it unless asked otherwise:
- **Reusable classes in `app/globals.css` `@layer components`:** `.glass-card`, `.glass-card-lg`, `.glass-card-hover`, `.btn-primary`, `.btn-ghost`, `.skeleton`. Use these instead of re-pasting the `rounded-3xl border-white/60 bg-white/60 shadow-[...] backdrop-blur` literal. Padding/sizing stay inline at the call site.
- Palette + fonts in `tailwind.config.ts`: `ink` navy + `sarvam.{blue,sky,orange,peach}` + per-`category` colors; Inter body, Newsreader serif (`font-serif`) for headings.
- Icons are a local inline set in `components/icons.tsx` (Lucide-derived, `currentColor`). Add new icons there rather than pulling an icon library.
- Empty states use `components/EmptyState.tsx`; loading states use `.skeleton` blocks matching the real layout.

## Deployment (Cloud Run)

`output: 'standalone'`; the multi-stage `Dockerfile` listens on **port 3080**. `NEXT_PUBLIC_*` vars are inlined **at build time** (passed as Docker build args / Cloud Build substitutions), while `GEMINI_API_KEY` is a **runtime** env var. `./deploy.sh` reads `.env.deploy` (gitignored; mirrors `.env.deploy.example`), enables APIs, deploys Firestore rules+indexes (`firebase.json`), then runs `cloudbuild.yaml` (build → push → `gcloud run deploy`). After the first deploy, put the service URL in `NEXT_PUBLIC_APP_URL`, Firebase Auth authorized domains, and the Maps key referrer allowlist.

Firestore composite indexes (`firestore.indexes.json`) are required for the geo-dedup (`category` + `geohash`) and filtered list (`category` + `createdAt desc`) queries.
