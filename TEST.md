# UrbanPulse — Complete Manual Test Plan

> Run every test first on **localhost** (`npm run dev` → `http://localhost:3000`), then repeat on the **deployed Cloud Run URL**.  
> Mark each item ✅ pass · ❌ fail · ⚠️ partial.

---

## 0. Pre-flight Setup

### Localhost
- [ ] `cp .env.local.example .env.local` — fill in all keys
- [ ] `npm install` — zero dependency errors
- [ ] `npm run dev` — server starts on port 3000, no terminal errors
- [ ] `npm run seed` — prints success, Firestore seeded (open Firestore console and confirm `issues`, `users`, `upvotes` collections exist with data)
- [ ] `npm run build` — clean build, zero TypeScript or CSS errors
- [ ] Open `http://localhost:3000` — page loads without console errors

### Deployed
- [ ] Cloud Run service URL is reachable and returns HTTP 200
- [ ] `NEXT_PUBLIC_*` vars baked in correctly (Maps loads, Firebase connects)
- [ ] `GEMINI_API_KEY` runtime var set (test by submitting a report)
- [ ] Firestore rules deployed (`firebase deploy --only firestore`)
- [ ] Firestore indexes deployed and in `READY` state (check Firebase console → Indexes)

---

## 1. Landing Page (`/`)

### Hero Section
- [ ] Page loads with animated SVG flourish (slow floating loop, 5 s period)
- [ ] Headline and subtitle render correctly in English
- [ ] "Report an issue" CTA navigates to `/report`
- [ ] "Command Center" CTA navigates to `/command`
- [ ] "Or report on WhatsApp — no app needed" link navigates to `/whatsapp`

### Live Stats Band
- [ ] Three stat cards render (Total Issues, AI-Verified Resolved, Departments Routed)
- [ ] Numbers count up from 0 when scrolled into view (`CountUp` animation)
- [ ] Values reflect actual Firestore data (seed data: ~18 issues, ~6 resolved)
- [ ] Stat cards do NOT animate again on scroll-back (once: true)
- [ ] On mobile: stat cards stack vertically

### Tech Strip
- [ ] "Gemini 2.5 Flash, Firestore, Google Maps, Cloud Run, Gemini multimodal voice" text is visible

### 4-Step Agent Pipeline Cards
- [ ] Four cards (Validate, Categorize, Severity, Route) visible
- [ ] Cards animate in (`fade-up`) with staggered delays when scrolled into view
- [ ] Cards do not re-animate on scroll-back

### Feature Cards Grid
- [ ] 6 feature cards present: Before/after AI, Geo-dedup, Command Center, Complaint letters, Predictive outlook, Hindi voice
- [ ] Cards scroll-reveal on intersection

### Bilingual Toggle (see §11 for full i18n tests)
- [ ] LanguageToggle button visible in desktop header
- [ ] Switching to Hindi changes hero headline text

### Reduced-Motion
- [ ] With OS "Reduce Motion" enabled: `CountUp` shows final number immediately, `Reveal` transitions are skipped

---

## 2. Issue Report Form (`/report`)

### Step Indicator
- [ ] "1 Photo", "2 AI triage", "3 Confirm" steps visible at top
- [ ] Active step highlighted; completed steps show tick or different style

### Photo Capture
- [ ] "Take a photo" button opens rear camera (`capture="environment"`)
- [ ] Selecting a photo shows preview immediately
- [ ] "Upload" button opens gallery file picker
- [ ] Drag-and-drop a JPEG/PNG onto preview zone — image accepted and shown
- [ ] Clicking the preview image re-opens camera

### GPS
- [ ] On page load, browser requests geolocation permission
- [ ] After granting: `(lat, lng)` coordinates displayed
- [ ] After denying: friendly error message shown (not a crash)

### Description
- [ ] Optional textarea accepts free text
- [ ] Submitting without description still works

### Voice Input
- [ ] Microphone icon button visible next to description
- [ ] Tap once → "Recording…" state with active indicator
- [ ] Tap again → stops recording, shows spinner
- [ ] Successful transcription fills description textarea with English text
- [ ] Hindi speech → "Heard (Hindi): …" label shown + English translation filled in
- [ ] Voice button absent/disabled on browsers without `MediaRecorder` support

### AI Analysis (Step 2)
- [ ] "Analyze with AI" button disabled until photo is selected
- [ ] Clicking it shows 4-step live indicator: Validate · Categorize · Severity · Route (each pulses in turn)
- [ ] Valid civic photo → AI result card appears with:
  - [ ] Category badge (Pothole / Water Leak / Streetlight / Waste / Other)
  - [ ] Safety risk pill (if applicable)
  - [ ] 5-segment SeverityBar colored correctly (1=green → 5=red)
  - [ ] AI-suggested title text
  - [ ] Reasoning text
  - [ ] "Routing to: [Dept]" text
  - [ ] Confidence % displayed
- [ ] Non-civic photo (e.g. a selfie) → rejection state shown with reason, "Try a different photo" link
- [ ] Network error during analysis → user-friendly error message (not a white crash)
- [ ] Gemini quota exceeded → HTTP 429 message shown (not a generic 500)

### Submit (Step 3)
- [ ] "Confirm & Submit" button visible after valid AI result
- [ ] Click submit → spinner / loading state while creating
- [ ] **New issue path**: toast "+10 points · Issue reported!" appears, then redirect to `/issue/[id]`
- [ ] **Duplicate path**: test by submitting two reports with the same photo in the same area → toast "+5 points · Existing nearby report verified!" appears
- [ ] `PointsToast` pill is visible, auto-dismisses after ~3 s
- [ ] After submit, new issue appears in Firestore `issues` collection with `imageUrl` as a data URL ≤1 MB
- [ ] Image compression: submit a 5 MB photo — check Firestore doc size is ≤1 MB

---

## 3. Autonomous Agent Console (`/agent`)

### Header
- [ ] "AUTONOMOUS · TOOL USE" chip with pulsing blue dot visible
- [ ] Page title and description render

### Intake Form
- [ ] Drag-and-drop / camera / upload works same as `/report`
- [ ] GPS auto-captured
- [ ] Description + voice input available (same behavior as `/report`)

### Agent Run
- [ ] "Run the autonomous agent" button enabled only after photo selected
- [ ] Click → "Agent is thinking…" spinner shows
- [ ] Live `AgentTrace` renders steps as they stream in:
  - [ ] `thought` step → Sparkles icon + italic text
  - [ ] `tool_call` step → Wrench icon + `toolName(arg: val)` code line
  - [ ] `tool_result` step → Check icon + result summary
  - [ ] `decision` step → ArrowRight icon
  - [ ] `final` step → Bot icon
  - [ ] `error` step → AlertTriangle icon (red)
- [ ] Steps appear one by one (SSE streaming), not all at once

### Agent Outcomes
- [ ] **Rejection**: Red card with reason shown
- [ ] **Deduplication**: "Verified an existing report" card + "View the report" button → navigates to `/issue/[id]`
- [ ] **New issue**: Drafted complaint letter shown (Ref ID, subject, full body text)
  - [ ] "Approve & dispatch" button → calls `/api/agent/dispatch` → dispatch state updates
  - [ ] "Reject" button → dispatch marked rejected
  - [ ] After approve: navigates to `/issue/[id]`
- [ ] Agent trace stored on Firestore issue doc (visible in `agentTrace` field)

### Edge Cases
- [ ] Non-civic photo → rejection (not a JS crash)
- [ ] Submit while agent is running → button disabled / spinner

---

## 4. Live Map (`/map`)

### Initial Load
- [ ] Google Map renders (not a grey box / API error)
- [ ] All seeded issues appear as colored pins
- [ ] Loading spinner shows briefly before pins appear

### Category Filter
- [ ] "All" pill selected by default, all pins visible
- [ ] Click "Pothole" → only pothole pins visible, others hidden
- [ ] Click "Water Leak" → only water-leak pins
- [ ] Click "Streetlight", "Waste", "Other" → each filters correctly
- [ ] Click "All" again → all pins reappear
- [ ] Active pill highlighted vs inactive

### Heatmap
- [ ] "Heatmap On" button visible
- [ ] Click → heatmap layer overlays pins with Sarvam color gradient
- [ ] More severe issues show brighter/larger heat spots
- [ ] "Heatmap Off" click → heatmap removed, pins visible

### Pins
- [ ] Each pin is category-colored (matches legend)
- [ ] Higher-severity issues have proportionally larger pin radius
- [ ] Pins drop in with `animate-pin-drop` stagger on page load
- [ ] Clicking a pin opens the side panel

### Side Panel
- [ ] Slides in from right (or appears) on pin click
- [ ] Shows: issue thumbnail photo, category badge, status badge
- [ ] AI reasoning / description text
- [ ] "Assigned dept" text
- [ ] Upvote button with current count
  - [ ] Click → count increments + `PointsToast` "+5 points!"
  - [ ] Click again on same issue → toast "Already verified by you" or no double-count
- [ ] "Open" link → navigates to `/issue/[id]`
- [ ] X button closes panel, map usable again

### Map Legend
- [ ] Legend overlay shows 5 category colors with labels

### Real-time
- [ ] In a second browser tab, submit a new report
- [ ] Without refreshing the map tab, new pin appears on map within ~2 s

---

## 5. Issue Detail Page (`/issue/[id]`)

### Loading & Not-Found
- [ ] Navigating to `/issue/[id]` with a valid ID shows the issue
- [ ] Three skeleton blocks visible while loading
- [ ] Navigating to `/issue/nonexistent-id` → EmptyState component with HelpCircle icon

### Content
- [ ] Hero image renders (full-width, rounded, h-72)
- [ ] Category badge displayed
- [ ] Status badge displayed (open / verified / in-progress / resolved)
- [ ] Safety risk pill visible if `safetyRisk: true`
- [ ] `DispatchBadge` shows correct state: awaiting approval / approved / dispatched / rejected
- [ ] Resolution ETA chip ("Est. ~Nd to fix") visible when `resolutionEstimate` exists
- [ ] Serif title rendered
- [ ] SeverityBar shows 5 segments, correct color
- [ ] Description text shown
- [ ] "N community verifications" shown with check icon

### Upvote
- [ ] Upvote button shows current count
- [ ] Click → count increments instantly (optimistic or live), PointsToast "+5 points!"
- [ ] Click again → "Already verified by you" (or count doesn't change)

### AI Analysis Accordion
- [ ] "AI Analysis" section is collapsible — click to expand/collapse
- [ ] Shows: reasoning text, confidence %, "Routed to [dept]", estimated resolution from history
- [ ] For issues created via `/agent`: `AgentTrace` renders all stored steps

### Resolution Verifier
- [ ] "Upload after photo" button visible
- [ ] Upload a photo showing fix → spinner → verdict badge (confirmed / not yet)
- [ ] Confirmed verdict: confidence %, reasoning, remaining issues text
- [ ] Not-yet verdict: explains why it's not fully fixed
- [ ] After confirmed resolution: issue status flips to `resolved` automatically + reporter gets +25 pts

### Complaint Drafter
- [ ] "Generate complaint letter" button visible
- [ ] Click → spinner while Gemini drafts
- [ ] Letter shown: Ref ID, Department, Subject, full body text
- [ ] "Copy" button → copies letter text to clipboard
- [ ] "Download .txt" → downloads file containing the letter
- [ ] Second click on already-drafted issue → shows cached draft instantly (no Gemini call)

### Status Tracker
- [ ] 4 stages visible: Reported · Verified · In progress · Resolved
- [ ] Active stage highlighted
- [ ] Click a later stage → status updates in Firestore, badge on page updates
- [ ] Transitioning to "Resolved" → reporter's points +25 (check `/profile`)
- [ ] Bilingual: switching to Hindi shows stage labels in Hindi

### Mini Location Map
- [ ] Small `IssueMap` renders below the main content showing one pin at the issue's lat/lng

### Real-time Updates
- [ ] In another tab, click Upvote on same issue → upvote count on this tab updates without refresh
- [ ] In another tab, change status → status badge on this tab updates

---

## 6. Community Dashboard (`/dashboard`)

### Impact Band
- [ ] 4 metric cards: Issues Resolved, Median Time-to-Resolution, Duplicates Auto-Merged, Staff-Hours Saved
- [ ] Values computed correctly from seeded data (resolved count ≥ 1)

### Predictive Band
- [ ] 3 headline numbers: Open Issues with forecast, Predicted SLA Breaches, Chronic-Risk Areas
- [ ] Forecast resolution list (up to 4 items, sorted by soonest ETA)
- [ ] Emerging hotspots list (up to 3 items, with growth factor)
- [ ] Recurrence risk list (up to 3 items, with risk score)

### Stats Grid
- [ ] 4 cards: Total Issues, Resolved/week, Active Citizens, Avg Resolution (hours)

### Department SLA Link
- [ ] Card with link to `/admin` renders and navigates correctly

### Charts
- [ ] Bar chart: Issues by category — 5 colored bars, each labeled
- [ ] Line chart: Reports per day (last 30 days) — gradient line, dates on X axis
- [ ] Both charts render without JS errors (Recharts loaded correctly)

### Resolved Gallery
- [ ] Up to 6 before/after image pairs shown
- [ ] Each pair has a "Before" and "After" label
- [ ] Only AI-verified resolved issues appear here

### Leaderboard
- [ ] Top citizens listed
- [ ] Rank 1 = gold badge, Rank 2 = silver, Rank 3 = bronze
- [ ] Columns: Citizen name, Reports, Badges count, Points
- [ ] Seeded users (Asha Verma, Rohan Kumar, etc.) visible

### Recent Activity
- [ ] Up to 10 `IssueCard` components shown
- [ ] Each card: image thumbnail, category badge, status badge, title, dept, upvote count, date

### Loading State
- [ ] Refresh with slow network → skeleton shimmer blocks match real layout

---

## 7. Municipal Command Center (`/command`)

### Header
- [ ] "AI AGENT · LIVE" chip with animated ping dot
- [ ] "Re-run agent" button visible

### Briefing Stream
- [ ] On page load (or after clicking Re-run), agent stream starts
- [ ] Skeleton shown while waiting for first step
- [ ] Live `AgentTrace` shows 3-phase steps:
  1. Dept load assessment steps
  2. Hotspot scan steps (Gemini)
  3. Prioritization + summary steps (Gemini)
- [ ] Steps appear progressively (SSE), not all at once

### Briefing Output
- [ ] Situational overview card: summary paragraph + generation timestamp
- [ ] Top priority actions: up to 5 numbered items, each with:
  - [ ] Priority number bubble
  - [ ] Reason text
  - [ ] Link to `/issue/[id]`
- [ ] Hotspots panel: area name + count badge + note
- [ ] Department load panel: dept name + open issue count

### Error State
- [ ] Disconnect network mid-stream → red error card shown (not a crash)

---

## 8. Department SLA Board (`/admin`)

### City Civic Score
- [ ] Letter grade (A–F) displayed prominently
- [ ] Numeric score /100 shown
- [ ] Grade computed from seeded data

### Stat Cards
- [ ] 4 cards: Open Issues, Overdue (SLA breached), Resolved on Time %, Departments Tracked

### SLA Legend
- [ ] Table/legend showing SLA targets: Sev 5 = 1d, Sev 4 = 2d, Sev 3 = 4d, Sev 2 = 7d, Sev 1 = 10d

### Department Table
- [ ] All departments listed
- [ ] Columns: Department, Open, Overdue (red pill if >0), Resolved, On-time %, Oldest open (days)
- [ ] Sorted worst-offenders first

### Neighborhood Scores
- [ ] Up to 6 neighborhood cards
- [ ] Each: area label, total/resolved counts, score bar (gradient), grade (A–F), overdue count

### Overdue Issues
- [ ] List of issues past their SLA deadline
- [ ] Each item shows days past SLA + link to `/issue/[id]`

### Loading
- [ ] Skeleton blocks while Firestore data loads

---

## 9. User Profile (`/profile`)

### Header
- [ ] Avatar (UserCircle icon) + name + UID displayed
- [ ] Total points shown with gradient styling

### Stats
- [ ] Issues Reported count
- [ ] Issues Verified count

### Badges Grid (4 badges)
- [ ] **First Report** (`first_report.png`): earned if ≥1 issue reported — colored + `animate-badge-pop`
- [ ] **Civic Hero** (`civic_hero.png`): earned at ≥10 issues — colored or greyscale + "Locked"
- [ ] **Community Watchdog** (`watchdog.png`): earned at ≥25 issues
- [ ] **Verified Verifier** (`verifier.png`): earned at ≥10 verifications
- [ ] Locked badges shown greyscale with "Locked" label

### Empty State
- [ ] Navigate to `/profile` without any account activity → `EmptyState` component shown

---

## 10. WhatsApp Mock (`/whatsapp`)

### UI
- [ ] Phone frame renders with green WhatsApp-style header bar
- [ ] Chat wallpaper background visible
- [ ] Bot greeting messages appear on load (3 bubbles)

### Photo Flow
- [ ] Green camera button opens file picker (`capture="environment"`)
- [ ] Selected photo appears as a right-aligned green bubble (user message)
- [ ] Three animated dots appear (typing indicator, ~1 s)
- [ ] Bot calls `POST /api/analyze` and replies with:
  - [ ] Category
  - [ ] Severity bar (emoji representation)
  - [ ] Safety risk flag (if applicable)
  - [ ] Department routed
  - [ ] Tracking ID `UP-2026-XXXX`
- [ ] Invalid photo → bot replies with rejection explanation

### Link
- [ ] "Prefer the full web report?" link → `/report`

---

## 11. Bilingual / i18n System

- [ ] `LanguageToggle` button in header visible on desktop
- [ ] Click → all `<T>`-wrapped text switches to Hindi
- [ ] Landing page hero headline in Hindi looks correct
- [ ] Navigation labels in Hindi (MobileNav hardcoded labels visible)
- [ ] StatusTracker stage labels show Hindi on issue detail page
- [ ] MobileNav labels (Map, Agent, Report, Command, Profile) in Hindi
- [ ] Language preference persists on page refresh (stored in `localStorage` key `urbanpulse_lang`)
- [ ] Translation cache in `localStorage` key `urbanpulse_hi_cache` — second visit uses cache, no extra API call
- [ ] Switch back to English → all text reverts
- [ ] Without `GOOGLE_TRANSLATE_API_KEY` → `/api/translate` echoes source text, app never crashes

---

## 12. Auth & Identity

### Anonymous Mode
- [ ] All pages accessible without signing in
- [ ] Submitting a report without sign-in assigns a stable anon UID
- [ ] Same browser session: UID consistent across page reloads
- [ ] Anon UID visible in Firestore `users/{uid}` after first report

### Google Sign-In
- [ ] "Sign in with Google" button in header/AuthNav
- [ ] Click → Google popup appears
- [ ] Sign in → avatar/name appears in header, popup closes
- [ ] Firestore `users/{uid}` doc created or updated with name/email
- [ ] Sign-out button appears → click → avatar removed, back to anon state

### No Gate
- [ ] `/report`, `/agent`, `/map`, `/issue/[id]`, `/dashboard`, `/command`, `/admin`, `/profile` all load without sign-in

---

## 13. Gamification & Points

### Point Events (check Firestore `users/{uid}.points` after each)
- [ ] **+10 pts** — submit a new issue via `/report`
- [ ] **+5 pts** — upvote an issue via map side panel or issue detail
- [ ] **+5 pts** — duplicate report folded into existing issue
- [ ] **+25 pts** — transition issue status to "Resolved" via StatusTracker
- [ ] **+25 pts** — confirm resolution via ResolutionVerifier
- [ ] **+50 pts bonus** — first-ever report by a new user (check total is 60 on first report)

### PointsToast
- [ ] Floating "+N points!" pill appears on each point event
- [ ] Auto-dismisses after ~3 s
- [ ] Does not stack/overlap if events fire quickly

### Badge Awarding
- [ ] **First Report** badge: submit first issue → check `/profile` → badge earned
- [ ] **Civic Hero** badge: user with 10 issues → badge shown (test with seeded user Asha Verma via direct Firestore)
- [ ] Badges stored in `users/{uid}.badges[]` array in Firestore

---

## 14. Real-time & Notifications

### Live Map (§4 covers this)
- [ ] New issue submitted in another tab appears on map without refresh

### Live Issue Detail
- [ ] Upvote count updates in real time across tabs (§5)
- [ ] Status change propagates in real time (§5)

### StatusNotifier (In-App Toast)
- [ ] Sign in with Google
- [ ] Have another device/tab change the status of an issue you reported
- [ ] Toast appears in the notifier within ~2 s (no page refresh)

### Push Notifications (FCM)
- [ ] "Enable status alerts" chip appears for signed-in users when `Notification.permission === 'default'`
- [ ] Click chip → browser permission dialog appears
- [ ] Grant permission → chip disappears
- [ ] Status change on your issue → native browser push notification appears (system tray / notification center)
- [ ] Service worker `/firebase-messaging-sw.js` is registered (check DevTools → Application → Service Workers)

---

## 15. Navigation & Layout

### Header (Desktop)
- [ ] UrbanPulse logo/name visible
- [ ] Nav links: Map, Agent, Report, Dashboard, Command
- [ ] LanguageToggle button
- [ ] AuthNav (sign-in button or avatar)

### MobileNav (Mobile, ≤640px viewport)
- [ ] Fixed bottom bar visible with 5 icons: Map · Agent · Report(+) · Command · Profile
- [ ] Each icon tappable and navigates correctly
- [ ] Active route highlighted
- [ ] Labels shown in Hindi when i18n set to Hindi
- [ ] Report button (center +) takes user to `/report`

### Onboarding Modal
- [ ] On first visit (clear `localStorage` to reset), 4-step modal appears
- [ ] "Snap → AI triage → Track → Confirm & earn" steps, progress dots
- [ ] Skip button dismisses immediately
- [ ] Next button advances through steps
- [ ] After completing or skipping, modal doesn't appear again on next visit
- [ ] Bilingual: modal text switches when language toggled

### EmptyState
- [ ] At least one flow reaches `EmptyState` (e.g. `/issue/bad-id`)
- [ ] Icon, title, hint text visible

### Skeleton Loading
- [ ] Rapid refresh on dashboard → skeleton shimmer blocks appear before data
- [ ] Skeleton shape matches real content layout

---

## 16. API Routes — Direct Tests

Use `curl` or browser DevTools Network tab to verify each endpoint directly.

### `POST /api/analyze`
```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "image=@/path/to/pothole.jpg" \
  -F "description=Road damage"
```
- [ ] Returns `{ analysis: { isValid, category, severity, safetyRisk, title, reasoning, department, confidence } }`
- [ ] Invalid image returns `{ analysis: { isValid: false, reason: "..." } }`
- [ ] Missing image returns 400

### `GET /api/issues`
- [ ] Returns array of serialized issues
- [ ] `?category=pothole` filters correctly
- [ ] `?status=open` filters correctly
- [ ] Timestamps are epoch millis (not Firestore Timestamp objects)

### `POST /api/issues`
- [ ] Creates new issue, returns `{ id, deduplicated: false }` with 201
- [ ] Duplicate submission returns `{ id, deduplicated: true }` with 200

### `GET /api/issues/[id]`
- [ ] Returns single issue or 404

### `PATCH /api/issues/[id]`
- [ ] Body `{ status: "in-progress" }` updates issue status
- [ ] Transition to `resolved` awards 25 pts to reporter

### `POST /api/upvote`
- [ ] `{ issueId, userId }` → increments upvoteCount, awards 5 pts
- [ ] Second call with same issueId+userId → returns 409 or no double-count

### `POST /api/verify-resolution`
- [ ] `multipart/form-data` with `before` (data URL or file), `after` file, `issueId`
- [ ] Returns `{ verified: true/false, confidence, reasoning, remainingIssues }`

### `POST /api/complaint`
- [ ] `{ issueId }` → returns `{ draft: { refId, department, subject, body } }`
- [ ] Second call on same issue → returns cached draft

### `GET /api/briefing`
- [ ] Returns full briefing JSON (non-streaming): `{ summary, actions[], hotspots[], departmentLoad[] }`

### `GET /api/briefing/stream`
- [ ] Returns SSE stream; check with `curl -N`
- [ ] Emits `data: {"type":"step",...}` lines followed by `data: {"type":"result",...}`

### `POST /api/agent/intake`
- [ ] SSE stream with `AgentStep` events
- [ ] Final event `{"type":"result"}` contains issue data or rejection

### `POST /api/agent/dispatch`
- [ ] `{ issueId, action: "approve" }` → updates `dispatch.status` to `dispatched`
- [ ] `{ issueId, action: "reject" }` → updates `dispatch.status` to `rejected`

### `POST /api/transcribe`
- [ ] `multipart/form-data` with `audio` WAV/WebM file ≤8 MB
- [ ] Returns `{ transcription: { transcript, english, language } }`
- [ ] File >8 MB → 400 error (not a crash)

### `POST /api/translate`
- [ ] `{ texts: ["Hello"], target: "hi" }` → returns `{ translations: ["नमस्ते"] }` (if key set)
- [ ] Without `GOOGLE_TRANSLATE_API_KEY` → echoes input texts (graceful fallback)

---

## 17. Image Compression

- [ ] Submit a 5 MB JPEG via `/report` → Firestore issue doc size ≤1 MB
- [ ] Submit a 15 MB JPEG → still succeeds (retry at 640px/q0.5 triggers)
- [ ] Check `imageUrl` field on Firestore doc is a data URL starting with `data:image/jpeg;base64,`
- [ ] Image renders clearly in issue detail page (not visibly broken)

---

## 18. Geo-Deduplication

- [ ] Submit issue at a specific location (note the lat/lng)
- [ ] Submit another issue within 200m of first, same category
- [ ] Second submission returns `deduplicated: true`, `verifiedCount` on original issue increments in Firestore
- [ ] Submit another issue >200m away or different category → creates new issue
- [ ] Resolved issues are not dedup targets (test by resolving first issue, then submitting nearby → new issue created)

---

## 19. Design System & Visual Checks

### Glass Cards
- [ ] `.glass-card` visible on landing feature cards — rounded corners, translucent white, backdrop blur
- [ ] `.glass-card-hover` cards lift slightly on hover (desktop)
- [ ] `.btn-primary` — dark rounded-full button on report form
- [ ] `.btn-ghost` — bordered glass button visible (e.g. "Heatmap" toggle)
- [ ] `.skeleton` shimmer has animated gradient sweep (not a static grey box)

### Animations
- [ ] `animate-float` on landing SVG flourish (slow loop, no jank)
- [ ] `toast-in` on PointsToast (pop from below, scale up)
- [ ] `animate-pin-drop` on map pins (staggered drop on load)
- [ ] `animate-badge-pop` on earned badges in `/profile`
- [ ] `animate-fade-up` on landing hero elements (staggered)

### Typography
- [ ] Body text uses Inter (sans-serif)
- [ ] Page headings use Newsreader (serif) — e.g. issue title on detail page
- [ ] Palette: navy `ink` background accents, `sarvam.blue` primary buttons, `sarvam.orange` accents visible

### Responsive Layout
- [ ] Desktop (≥1024px): header nav visible, MobileNav hidden
- [ ] Mobile (≤640px): header nav hidden or collapsed, MobileNav visible at bottom
- [ ] Report form: single column on mobile, comfortable on desktop
- [ ] Dashboard charts: scroll or reflow on narrow screens (no horizontal overflow)

---

## 20. Error & Edge Cases

### Network Errors
- [ ] Disconnect WiFi mid-analysis (`/report`) → error state shown, not a white crash
- [ ] Disconnect mid-stream (`/command`, `/agent`) → red error card appears

### Gemini Quota / Rate Limit
- [ ] If Gemini returns 503 → `generateWithRetry` retries (check server logs for retry attempts)
- [ ] After retries exhausted → HTTP 429 returned to client with `Retry-After` header
- [ ] UI shows "quota exceeded" message, not a generic error

### Empty Firestore
- [ ] Point `npm run dev` at an empty Firestore project (or clear collections)
- [ ] Landing page stats show 0 (not NaN or crash)
- [ ] Dashboard shows empty charts + empty leaderboard + empty gallery
- [ ] Command center briefing with no issues → graceful summary ("No open issues")
- [ ] Admin SLA board with no issues → all zeros, A grade

### Anonymous + No History
- [ ] Fresh browser (clear all localStorage and cookies)
- [ ] Onboarding modal appears
- [ ] `/profile` shows EmptyState
- [ ] Upvoting works without sign-in

---

## 21. Seed Script Verification (`npm run seed`)

- [ ] After seed, Firestore `issues` collection has ~18 docs
- [ ] At least 6 issues have status `resolved` with `resolution.verified: true`
- [ ] `users` collection has 5 demo users (Asha Verma, Rohan Kumar, Priya Sinha, Imran Ansari, Neha Choudhary)
- [ ] Leaderboard on `/dashboard` shows these 5 users ranked by points
- [ ] `ResolvedGallery` on `/dashboard` shows before/after image pairs from seeded issues
- [ ] `/admin` SLA board shows realistic data (some overdue issues among the 12 open ones)
- [ ] `/map` shows pins clustered around Bhagalpur, Bihar (lat ~25.24, lng ~86.97)
- [ ] Geohashes on seeded issues are populated (check Firestore docs)

---

## 22. Deployment-Specific Checks (Cloud Run Only)

- [ ] App served over HTTPS (padlock in browser)
- [ ] No mixed-content warnings in console
- [ ] `NEXT_PUBLIC_*` values match production Firebase project (not dev project)
- [ ] Firebase Auth authorized domains includes Cloud Run URL
- [ ] Google Maps API key referrer allowlist includes Cloud Run URL
- [ ] FCM push notifications work (test on mobile Chrome / Safari if VAPID set)
- [ ] Cloud Run service URL in `NEXT_PUBLIC_APP_URL` env var
- [ ] Docker port is 3080 (confirm via Cloud Run → Container → Port)
- [ ] Cold start time < 10 s (test by scaling to 0 and re-hitting)
- [ ] Build completed with zero errors in Cloud Build logs
- [ ] Firestore composite indexes in `READY` state in Firebase console
- [ ] No `NEXT_PUBLIC_*` keys hardcoded in repo (all injected at build time)

---

## 23. Performance & Accessibility (Optional but Recommended)

- [ ] Lighthouse score on landing page: Performance ≥80, Accessibility ≥85
- [ ] All images have `alt` attributes (check DevTools Accessibility tree)
- [ ] Buttons have accessible labels (no icon-only buttons without `aria-label`)
- [ ] Tab-key navigation reaches all interactive elements on report form
- [ ] No horizontal scroll on any page at 375px (iPhone SE) viewport
- [ ] Core Web Vitals in DevTools: LCP < 2.5 s, CLS < 0.1

---

## Quick Regression Checklist After Any Code Change

Before merging/deploying, verify at minimum:

- [ ] `npm run build` — zero errors
- [ ] Landing page loads, stats counted, CTAs work
- [ ] Submit a report → AI analysis → issue created → appears on map + detail page
- [ ] Upvote on map → PointsToast
- [ ] Command center briefing streams to completion
- [ ] Language toggle (EN → Hindi) on at least 2 pages
- [ ] Profile page shows points and badges
