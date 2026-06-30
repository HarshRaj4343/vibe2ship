# UrbanPulse

> Hyperlocal civic issue reporting built end-to-end on Google: **Gemini** (Vision + function calling), **Firebase Firestore**, **Firebase Auth**, **Firebase Cloud Messaging**, **Google Maps Platform**, **Google Cloud Translation API**, **Cloud Run**, **Cloud Build**, and **Cloud Scheduler**.
> Built for the **Vibe2Ship hackathon** (Coding Ninjas × Google for Developers).

Citizens photograph neighborhood problems (potholes, water leaks, broken streetlights, waste dumps). A 4-step AI agent **validates → categorizes → severity-scores → routes** each report, deduplicates it against nearby reports, and tracks it to resolution — while gamifying participation with points and badges.

## ☁️ Google technologies used

Every layer of UrbanPulse runs on a Google product:

| Product | Where it's used |
|---------|-----------------|
| **Gemini 2.5 Flash — Vision** | The 4-step triage pipeline reads the photo to validate, categorize, severity-score and route ([`lib/gemini.ts`](lib/gemini.ts)). Also: before/after resolution verification, complaint drafting, and the multilingual voice intake (audio → text). |
| **Gemini — function calling** | The autonomous intake agent ([`lib/agent.ts`](lib/agent.ts)) drives a real Gemini tool-use loop: the model itself calls `find_duplicate_issue`, `critique_analysis`, `lookup_resolution_history`, `route_to_department`, `create_issue`, `award_points`. |
| **Firebase Firestore** | Single datastore for issues, users, upvotes (photos stored inline as data URLs). |
| **Firebase Auth** | Google sign-in popup; the app also works signed-out via a stable anonymous browser id that upgrades on login. |
| **Firebase Cloud Messaging** | Push notifications when a citizen's reported issue changes status — wired to a real-time Firestore `onSnapshot` listener so updates land with no refresh ([`lib/messaging.ts`](lib/messaging.ts), [`components/StatusNotifier.tsx`](components/StatusNotifier.tsx)). |
| **Google Maps Platform** | Live map with category-colored pins **and a native `visualization.HeatmapLayer`** weighting hotspots by issue severity ([`components/IssueMap.tsx`](components/IssueMap.tsx)). |
| **Google Cloud Translation API** | Hindi/English bilingual UI — flip the EN/हिं toggle and every `<T>`-wrapped string is translated on demand and cached ([`app/api/translate/route.ts`](app/api/translate/route.ts), [`lib/i18n.tsx`](lib/i18n.tsx)). |
| **geofire-common (geohash)** | Geohash-bounded Firestore queries power the 200m geo-dedup, since Firestore has no native radius query ([`lib/geo.ts`](lib/geo.ts)). |
| **Cloud Run** | Hosts the standalone Next.js container (port 3080). |
| **Cloud Build** | `cloudbuild.yaml` builds → pushes → deploys the image. |
| **Cloud Scheduler** | Recommended to fire the Command Center briefing (`GET /api/briefing`) on a daily cron so the municipal action plan is ready each morning. |

---

## ✨ The core: 4-step Gemini agent pipeline

Implemented in [`lib/gemini.ts`](lib/gemini.ts), exposed at `POST /api/analyze`:

| Step | What the agent does |
|------|---------------------|
| **1 · Validate** | Is this a real, reportable civic issue? Rejects spam, indoor shots, blurry images. |
| **2 · Categorize** | `pothole` · `water_leak` · `streetlight` · `waste` · `other`. |
| **3 · Severity** | 1–5 score + direct **safety-risk** flag. |
| **4 · Route** | Picks the responsible department (PWD, Water & Sanitation, Electricity, Waste Mgmt, Municipal Corp). |

A 5th agent behavior — **geo-deduplication** ([`lib/geo.ts`](lib/geo.ts)) — folds a new report into an existing unresolved issue within 200m of the same category, bumping its verification count instead of creating a duplicate.

### Beyond triage: an autonomous resolution platform

The agent doesn't just classify — it **acts** and **closes the loop**:

| Agent | What it does | Endpoint |
|-------|--------------|----------|
| 🔍 **Resolution Verification** | Compares the original "before" photo with a citizen-uploaded "after" photo and autonomously decides whether the issue is genuinely fixed (only then marks it resolved + pays the bonus). | `POST /api/verify-resolution` |
| 🛰️ **Command Center** | Reasons across *all* open issues to produce a prioritized daily action plan, geo-hotspot clusters, and per-department load — a municipal ops briefing. | `GET /api/briefing` → `/command` |
| 📨 **Complaint Drafting** | Turns a triaged issue into a formal complaint letter to the routed department, with a generated tracking ID. | `POST /api/complaint` |
| 🎙️ **Voice reporting** | Speak the issue; the Web Speech API transcribes it into the AI pipeline (multimodal/accessibility). | report form |

---

## 🧱 Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router, TypeScript) |
| AI | Gemini 2.5 Flash via `@google/generative-ai` (Vision + text + **function calling**) |
| Database | Firebase Firestore (photos stored inline as data URLs) |
| Auth | Firebase Auth (Google sign-in; anonymous fallback) |
| Push / real-time | Firebase Cloud Messaging + Firestore `onSnapshot` |
| Maps | Google Maps Platform via `@vis.gl/react-google-maps` (pins + native `visualization.HeatmapLayer`) |
| Translation | Google Cloud Translation API (Hindi/English UI) |
| Voice | Gemini multimodal (audio → text), in-browser recording |
| Geo | `geofire-common` (geohash radius queries) |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Hosting / CI | Google Cloud Run + Cloud Build (+ Cloud Scheduler for the briefing cron) |

---

## 🚀 Local setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in:

- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com)
- `NEXT_PUBLIC_FIREBASE_*` — Firebase Console → Project Settings → Your apps
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Cloud Console → APIs & Services → Credentials
  - Enable **Maps JavaScript API** + **Maps Visualization** (the hotspot heatmap uses the native `visualization.HeatmapLayer`)
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` — Firebase Console → Project Settings → Cloud Messaging → Web Push certificates (for FCM status-change push)
- `GOOGLE_TRANSLATE_API_KEY` — server-only API key with the **Cloud Translation API** enabled (Hindi/English UI; leave blank to stay English)

### 3. Firebase setup

1. Create a Firestore database (production or test mode).
2. Enable **Authentication → Sign-in method → Google**. Add `localhost` and your
   Cloud Run domain under **Authentication → Settings → Authorized domains**.
3. Create a **Map ID** in Google Cloud (Maps → Map Management) — pins use `mapId="urbanpulse-map"` (Advanced Markers require a Map ID).

> **No Firebase Storage needed.** Firebase now gates Storage behind the paid
> Blaze plan, so photos are compressed client-side (~800px JPEG) and stored
> inline as data URLs on the Firestore issue document. Stays 100% on the free
> Spark plan. The full-res original is still sent to Gemini for analysis.

Sign-in is optional for browsing; reporting/upvoting work signed-out via a stable
anonymous browser id, and "upgrade" to your Google name/avatar once you sign in.

#### Deploy rules + indexes (one command)

```bash
npm i -g firebase-tools && firebase login
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

This pushes [`firestore.rules`](firestore.rules) and [`firestore.indexes.json`](firestore.indexes.json)
(the composite indexes the geo-dedup and filtered queries need) — no more
"create index" console clicks.

#### Required Firestore composite indexes

The geo-dedup query filters by `category` + range on `geohash`. When you first run it, Firestore logs a link to auto-create the index. Or add to `firestore.indexes.json`:

```jsonc
// issues: category (ASC) + geohash (ASC)
// issues: category (ASC) + createdAt (DESC)   <- for /api/issues filtered list
```

#### Suggested dev security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{document=**} { allow read, write: if true; } // hackathon/dev only
  }
}
```
> ⚠️ Tighten these before any real deployment.

### 4. Seed demo data (optional, great for the judging demo)

```bash
npm run seed
```

Loads ~8 realistic issues (potholes, leaks, lights, waste) across categories,
severities and statuses, plus 4 leaderboard citizens. Re-runnable; it clears the
collections it manages first. Requires the dev Firestore rules (writes allowed).

### 5. Run

```bash
npm run dev
# http://localhost:3000
```

---

## 🗺️ App routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/report` | Photo upload → AI analysis → submit |
| `/map` | Live Google Map: category-colored pins, severity sizing, heatmap toggle, filters, side panel |
| `/dashboard` | Metric cards, category bar chart, 30-day line chart, leaderboard, recent activity |
| `/issue/[id]` | Full detail: AI reasoning, **resolution verification**, **complaint drafting**, status timeline, upvote, map |
| `/command` | 🛰️ Municipal Command Center — AI briefing over all open issues |
| `/profile` | Points, counters, badges |

### API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analyze` | POST | Gemini 4-step pipeline (multipart image) |
| `/api/issues` | GET / POST | List (filterable) / create (+ dedup + points) |
| `/api/issues/[id]` | GET / PATCH | Fetch / update status (resolution bonus) |
| `/api/upvote` | POST | Upvote (one per user) + award points |
| `/api/verify-resolution` | POST | Before/after photo comparison → confirm fix |
| `/api/complaint` | POST | Auto-draft formal complaint letter + tracking ID |
| `/api/briefing` | GET | Command Center: prioritized action plan over all issues (wire to **Cloud Scheduler** for a daily cron) |
| `/api/transcribe` | POST | Gemini multimodal voice intake (Hindi/English audio → text) |
| `/api/translate` | POST | Google Cloud Translation proxy for the bilingual UI |

---

## ☁️ Deploy to Cloud Run

The app is configured with `output: 'standalone'` and a multi-stage [`Dockerfile`](Dockerfile) listening on port **3080**.

> `NEXT_PUBLIC_*` values are inlined into the client bundle **at build time**, so they must be passed as Docker build args. `GEMINI_API_KEY` is server-only and is set as a runtime env var.

### One command (recommended)

```bash
cp .env.deploy.example .env.deploy   # fill in GCP_PROJECT_ID + all keys
./deploy.sh
```

`deploy.sh` enables the required APIs, deploys Firestore rules + indexes (if the
`firebase` CLI is present), then runs [`cloudbuild.yaml`](cloudbuild.yaml) which
**builds → pushes → deploys** to Cloud Run with the public vars baked in and
`GEMINI_API_KEY` set as a runtime secret. It prints the live URL at the end —
add that URL to `NEXT_PUBLIC_APP_URL`, your Firebase **Authorized domains**, and
your Maps API key's referrer allowlist, then re-run.

### Manual (equivalent)

```bash
# 1. Build & push (pass public vars as build substitutions)
gcloud builds submit \
  --tag gcr.io/YOUR_GCP_PROJECT_ID/urbanpulse \
  --substitutions=_MAPS_KEY=YOUR_MAPS_KEY   # if using cloudbuild.yaml; otherwise build locally:

# Local build with build args, then push:
docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=... \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=... \
  --build-arg NEXT_PUBLIC_APP_URL=https://your-cloud-run-url \
  -t gcr.io/YOUR_GCP_PROJECT_ID/urbanpulse .
docker push gcr.io/YOUR_GCP_PROJECT_ID/urbanpulse

# 2. Deploy
gcloud run deploy urbanpulse \
  --image gcr.io/YOUR_GCP_PROJECT_ID/urbanpulse \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 3080 \
  --set-env-vars GEMINI_API_KEY=YOUR_GEMINI_KEY
```

After the first deploy, copy the service URL into `NEXT_PUBLIC_APP_URL` and (optionally) rebuild so canonical links are correct.

---

## 🏆 How it maps to the judging criteria

- **Agentic Depth (20%)** — the 4-step Gemini pipeline + autonomous dedup/routing.
- **Google Technologies (15%)** — Gemini (Vision + function calling), Firestore, Firebase Auth, Firebase Cloud Messaging, Google Maps Platform (incl. heatmap layer), Cloud Translation API, geohash geo-queries, Cloud Run, Cloud Build, Cloud Scheduler.
- **Problem Solving & Impact (20%)** — real civic workflow from report to resolution.
- **Innovation (20%)** — AI triage + geohash dedup + gamification loop.
- **Product Experience (10%)** — mobile-first report flow, live map, dashboard.
- **Technical Implementation (10%)** — typed end-to-end, defensive error handling.
- **Completeness (5%)** — every flow wired and deployable.

---

## 📁 Project structure

```
urbanpulse/
├── app/                # App Router pages + API routes
│   ├── api/            # analyze, issues, issues/[id], upvote
│   ├── report/ map/ dashboard/ issue/[id]/ profile/
│   └── layout.tsx page.tsx globals.css
├── components/         # IssueReportForm, IssueMap, IssueCard, badges, charts…
├── lib/                # types, firebase, gemini, geo, points, user
├── Dockerfile
└── README.md
```
