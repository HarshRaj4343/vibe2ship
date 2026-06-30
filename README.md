<div align="center">

<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" rx="20" fill="#1c1b2e"/>
  <circle cx="40" cy="32" r="12" fill="#5b6cff" opacity="0.9"/>
  <path d="M40 44 L32 58 Q40 54 48 58 Z" fill="#5b6cff" opacity="0.7"/>
  <circle cx="40" cy="32" r="5" fill="white"/>
  <path d="M20 62 Q40 52 60 62" stroke="#9db4ff" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>

# UrbanPulse

**India's civic resolution agent — report a broken street with one photo, get it triaged, routed, and verified by AI.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-urbanpulse-5b6cff?style=for-the-badge&logo=googlechrome&logoColor=white)](https://urbanpulse-h2uigix6dq-el.a.run.app)
[![Next.js](https://img.shields.io/badge/Next.js%2014-App%20Router-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![Gemini](https://img.shields.io/badge/Gemini%202.5%20Flash-Vision%20Agent-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Cloud Run](https://img.shields.io/badge/Cloud%20Run-Deployed-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

</div>

---

## What it does

Citizens photograph potholes, leaks, broken lights, or waste. A **Gemini Vision agent** triages each report in seconds — validating it, categorizing it, scoring its severity, and routing it to the right municipal department. The system deduplicates nearby reports automatically, drafts formal complaint letters, and refuses to mark anything resolved until AI sees before/after proof.

> Built for the **Vibe2Ship hackathon** (Coding Ninjas × Google for Developers). Powered end-to-end on Google: Gemini · Firestore · Firebase Auth · FCM · Maps · Cloud Translation · Cloud Run · Cloud Build.

---

## The 4-Step AI Pipeline

<div align="center">

<svg width="720" height="110" viewBox="0 0 720 110" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">
  <rect width="720" height="110" rx="12" fill="#f0f0fa"/>
  <!-- Step 1 -->
  <rect x="18" y="18" width="152" height="74" rx="10" fill="#1c1b2e"/>
  <text x="94" y="46" text-anchor="middle" fill="#9db4ff" font-size="10" font-weight="600" letter-spacing="1">STEP 1</text>
  <text x="94" y="66" text-anchor="middle" fill="white" font-size="14" font-weight="700">Validate</text>
  <text x="94" y="82" text-anchor="middle" fill="#9db4ff" font-size="9">Real civic issue?</text>
  <!-- Arrow -->
  <path d="M170 55 L192 55" stroke="#5b6cff" stroke-width="2" stroke-linecap="round"/>
  <polygon points="188,50 198,55 188,60" fill="#5b6cff"/>
  <!-- Step 2 -->
  <rect x="198" y="18" width="152" height="74" rx="10" fill="#5b6cff"/>
  <text x="274" y="46" text-anchor="middle" fill="white" font-size="10" font-weight="600" letter-spacing="1" opacity="0.8">STEP 2</text>
  <text x="274" y="66" text-anchor="middle" fill="white" font-size="14" font-weight="700">Categorize</text>
  <text x="274" y="82" text-anchor="middle" fill="white" font-size="9" opacity="0.85">Pothole · Leak · Light…</text>
  <!-- Arrow -->
  <path d="M350 55 L372 55" stroke="#5b6cff" stroke-width="2" stroke-linecap="round"/>
  <polygon points="368,50 378,55 368,60" fill="#5b6cff"/>
  <!-- Step 3 -->
  <rect x="378" y="18" width="152" height="74" rx="10" fill="#ff6b35"/>
  <text x="454" y="46" text-anchor="middle" fill="white" font-size="10" font-weight="600" letter-spacing="1" opacity="0.85">STEP 3</text>
  <text x="454" y="66" text-anchor="middle" fill="white" font-size="14" font-weight="700">Severity 1–5</text>
  <text x="454" y="82" text-anchor="middle" fill="white" font-size="9" opacity="0.85">+ Safety risk flag</text>
  <!-- Arrow -->
  <path d="M530 55 L552 55" stroke="#5b6cff" stroke-width="2" stroke-linecap="round"/>
  <polygon points="548,50 558,55 548,60" fill="#5b6cff"/>
  <!-- Step 4 -->
  <rect x="558" y="18" width="144" height="74" rx="10" fill="#22c55e"/>
  <text x="630" y="46" text-anchor="middle" fill="white" font-size="10" font-weight="600" letter-spacing="1" opacity="0.85">STEP 4</text>
  <text x="630" y="66" text-anchor="middle" fill="white" font-size="14" font-weight="700">Route</text>
  <text x="630" y="82" text-anchor="middle" fill="white" font-size="9" opacity="0.85">Right department</text>
</svg>

*All four steps happen in **one Gemini Vision call** — `analyzeIssue()` in `lib/gemini.ts`*

</div>

---

## Architecture

<div align="center">

<svg width="720" height="400" viewBox="0 0 720 400" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">
  <rect width="720" height="400" rx="14" fill="#f0f0fa"/>
  <text x="360" y="28" text-anchor="middle" fill="#1c1b2e" font-size="13" font-weight="700" letter-spacing="1">SYSTEM ARCHITECTURE</text>

  <!-- CLIENT LAYER -->
  <rect x="16" y="44" width="688" height="88" rx="10" fill="#1c1b2e" opacity="0.05" stroke="#1c1b2e" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="36" y="64" fill="#1c1b2e" font-size="10" font-weight="700" opacity="0.4" letter-spacing="1.5">CLIENT — Next.js 14 App Router</text>
  <rect x="26" y="72" width="86" height="48" rx="8" fill="#5b6cff"/>
  <text x="69" y="93" text-anchor="middle" fill="white" font-size="9" font-weight="700">📸 Report</text>
  <text x="69" y="108" text-anchor="middle" fill="white" font-size="8" opacity="0.8">/report</text>
  <rect x="122" y="72" width="86" height="48" rx="8" fill="#5b6cff"/>
  <text x="165" y="93" text-anchor="middle" fill="white" font-size="9" font-weight="700">📊 Dashboard</text>
  <text x="165" y="108" text-anchor="middle" fill="white" font-size="8" opacity="0.8">/dashboard</text>
  <rect x="218" y="72" width="86" height="48" rx="8" fill="#5b6cff"/>
  <text x="261" y="93" text-anchor="middle" fill="white" font-size="9" font-weight="700">⚡ Command</text>
  <text x="261" y="108" text-anchor="middle" fill="white" font-size="8" opacity="0.8">/command</text>
  <rect x="314" y="72" width="86" height="48" rx="8" fill="#9db4ff"/>
  <text x="357" y="93" text-anchor="middle" fill="#1c1b2e" font-size="9" font-weight="700">🗺 Map</text>
  <text x="357" y="108" text-anchor="middle" fill="#1c1b2e" font-size="8" opacity="0.7">/map</text>
  <rect x="410" y="72" width="86" height="48" rx="8" fill="#9db4ff"/>
  <text x="453" y="93" text-anchor="middle" fill="#1c1b2e" font-size="9" font-weight="700">💬 WhatsApp</text>
  <text x="453" y="108" text-anchor="middle" fill="#1c1b2e" font-size="8" opacity="0.7">/whatsapp</text>
  <rect x="506" y="72" width="90" height="48" rx="8" fill="#9db4ff"/>
  <text x="551" y="93" text-anchor="middle" fill="#1c1b2e" font-size="9" font-weight="700">🔬 Bulk Triage</text>
  <text x="551" y="108" text-anchor="middle" fill="#1c1b2e" font-size="8" opacity="0.7">/bulk-triage</text>
  <rect x="606" y="72" width="90" height="48" rx="8" fill="#1c1b2e"/>
  <text x="651" y="93" text-anchor="middle" fill="#9db4ff" font-size="9" font-weight="700">👤 Profile</text>
  <text x="651" y="108" text-anchor="middle" fill="#9db4ff" font-size="8" opacity="0.7">/profile</text>

  <!-- Arrow down -->
  <path d="M360 132 L360 158" stroke="#5b6cff" stroke-width="2" stroke-dasharray="4,3"/>
  <polygon points="356,155 360,163 364,155" fill="#5b6cff"/>

  <!-- API LAYER -->
  <rect x="16" y="163" width="688" height="88" rx="10" fill="#ff6b35" opacity="0.07" stroke="#ff6b35" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="36" y="183" fill="#c23b00" font-size="10" font-weight="700" opacity="0.6" letter-spacing="1.5">API ROUTES — app/api/**/route.ts  ·  Node.js runtime</text>
  <rect x="26" y="191" width="96" height="48" rx="8" fill="#ff6b35"/>
  <text x="74" y="210" text-anchor="middle" fill="white" font-size="8" font-weight="700">POST /analyze</text>
  <text x="74" y="226" text-anchor="middle" fill="white" font-size="7" opacity="0.85">Vision triage</text>
  <rect x="132" y="191" width="96" height="48" rx="8" fill="#ff6b35"/>
  <text x="180" y="210" text-anchor="middle" fill="white" font-size="8" font-weight="700">POST /issues</text>
  <text x="180" y="226" text-anchor="middle" fill="white" font-size="7" opacity="0.85">Create + geo-dedup</text>
  <rect x="238" y="191" width="96" height="48" rx="8" fill="#ff6b35"/>
  <text x="286" y="210" text-anchor="middle" fill="white" font-size="8" font-weight="700">GET /briefing</text>
  <text x="286" y="226" text-anchor="middle" fill="white" font-size="7" opacity="0.85">City action plan</text>
  <rect x="344" y="191" width="110" height="48" rx="8" fill="#ff6b35"/>
  <text x="399" y="210" text-anchor="middle" fill="white" font-size="8" font-weight="700">POST /verify-resolution</text>
  <text x="399" y="226" text-anchor="middle" fill="white" font-size="7" opacity="0.85">Before/after check</text>
  <rect x="464" y="191" width="96" height="48" rx="8" fill="#ff6b35"/>
  <text x="512" y="210" text-anchor="middle" fill="white" font-size="8" font-weight="700">POST /complaint</text>
  <text x="512" y="226" text-anchor="middle" fill="white" font-size="7" opacity="0.85">Draft letter</text>
  <rect x="570" y="191" width="130" height="48" rx="8" fill="#ff6b35"/>
  <text x="635" y="210" text-anchor="middle" fill="white" font-size="8" font-weight="700">POST /agent/*</text>
  <text x="635" y="226" text-anchor="middle" fill="white" font-size="7" opacity="0.85">Tool-use agent</text>

  <!-- Arrows to services -->
  <path d="M160 251 L120 291" stroke="#5b6cff" stroke-width="1.5" stroke-dasharray="3,2"/>
  <polygon points="116,288 120,297 124,288" fill="#5b6cff"/>
  <path d="M360 251 L360 291" stroke="#5b6cff" stroke-width="1.5" stroke-dasharray="3,2"/>
  <polygon points="356,288 360,297 364,288" fill="#5b6cff"/>
  <path d="M560 251 L610 291" stroke="#5b6cff" stroke-width="1.5" stroke-dasharray="3,2"/>
  <polygon points="606,288 610,297 614,288" fill="#5b6cff"/>

  <!-- SERVICE LAYER -->
  <rect x="16" y="297" width="214" height="86" rx="10" fill="#22c55e" opacity="0.12" stroke="#22c55e" stroke-width="1.5"/>
  <text x="123" y="318" text-anchor="middle" fill="#166534" font-size="10" font-weight="700">🔥 Firebase Firestore</text>
  <text x="123" y="335" text-anchor="middle" fill="#166534" font-size="9">issues · users · upvotes</text>
  <text x="123" y="351" text-anchor="middle" fill="#166534" font-size="9">geohash index · composite indexes</text>
  <text x="123" y="367" text-anchor="middle" fill="#166534" font-size="9">photos inline as data URLs (Spark plan)</text>

  <rect x="246" y="297" width="228" height="86" rx="10" fill="#4285F4" opacity="0.1" stroke="#4285F4" stroke-width="1.5"/>
  <text x="360" y="318" text-anchor="middle" fill="#1a3a6b" font-size="10" font-weight="700">✨ Gemini 2.5 Flash</text>
  <text x="360" y="335" text-anchor="middle" fill="#1a3a6b" font-size="9">analyzeIssue · verifyResolution</text>
  <text x="360" y="351" text-anchor="middle" fill="#1a3a6b" font-size="9">draftComplaint · generateBriefing</text>
  <text x="360" y="367" text-anchor="middle" fill="#1a3a6b" font-size="9">transcribe (multimodal voice)</text>

  <rect x="490" y="297" width="214" height="86" rx="10" fill="#fbbc04" opacity="0.15" stroke="#fbbc04" stroke-width="1.5"/>
  <text x="597" y="318" text-anchor="middle" fill="#5a3a00" font-size="10" font-weight="700">☁️ Google Cloud</text>
  <text x="597" y="335" text-anchor="middle" fill="#5a3a00" font-size="9">Cloud Run · Docker standalone</text>
  <text x="597" y="351" text-anchor="middle" fill="#5a3a00" font-size="9">Maps JS API · FCM push</text>
  <text x="597" y="367" text-anchor="middle" fill="#5a3a00" font-size="9">Cloud Build CI/CD</text>
</svg>

</div>

---

## Features at a Glance

### 🤖 Four Gemini Calls

| Call | Endpoint | What it does |
|---|---|---|
| `analyzeIssue` | `POST /api/analyze` | Validate → categorize → severity(1–5) + safety risk → route to department |
| `verifyResolution` | `POST /api/verify-resolution` | Skeptically compares before/after photos — refuses to confirm unless genuinely fixed |
| `draftComplaint` | `POST /api/complaint` | Generates a formal, department-addressed complaint letter with tracking ID |
| `generateBriefing` | `GET /api/briefing` | Reasons across ALL open issues → prioritized action plan + hotspot map |

### 📍 Geo-Deduplication

Reports within **200 m** of an existing open issue of the same category are **folded in**, not duplicated. Geohash bounding-box query (Firestore has no radius query) → exact Haversine filter.

```
POST /api/issues
  └─ findDuplicateIssue()       ← geohash bounds → 200m Haversine
       ├─ HIT  → verifiedCount++, +5 pts, return existing issue
       └─ MISS → create new issue → analyzeIssue() → awardPoints()
```

### 🎮 Gamification

<div align="center">

<svg width="680" height="190" viewBox="0 0 680 190" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">
  <rect width="680" height="190" rx="12" fill="#1c1b2e"/>
  <text x="340" y="26" text-anchor="middle" fill="#9db4ff" font-size="11" font-weight="700" letter-spacing="2">POINTS &amp; BADGES</text>

  <rect x="18" y="38" width="116" height="62" rx="8" fill="#5b6cff" opacity="0.2" stroke="#5b6cff" stroke-width="1"/>
  <text x="76" y="58" text-anchor="middle" fill="#9db4ff" font-size="9">Report Issue</text>
  <text x="76" y="80" text-anchor="middle" fill="white" font-size="20" font-weight="700">+10</text>
  <text x="76" y="94" text-anchor="middle" fill="#9db4ff" font-size="8">pts</text>

  <rect x="144" y="38" width="116" height="62" rx="8" fill="#5b6cff" opacity="0.2" stroke="#5b6cff" stroke-width="1"/>
  <text x="202" y="58" text-anchor="middle" fill="#9db4ff" font-size="9">Verify Nearby</text>
  <text x="202" y="80" text-anchor="middle" fill="white" font-size="20" font-weight="700">+5</text>
  <text x="202" y="94" text-anchor="middle" fill="#9db4ff" font-size="8">pts</text>

  <rect x="270" y="38" width="116" height="62" rx="8" fill="#22c55e" opacity="0.2" stroke="#22c55e" stroke-width="1"/>
  <text x="328" y="58" text-anchor="middle" fill="#86efac" font-size="9">Issue Resolved</text>
  <text x="328" y="80" text-anchor="middle" fill="white" font-size="20" font-weight="700">+25</text>
  <text x="328" y="94" text-anchor="middle" fill="#86efac" font-size="8">pts bonus</text>

  <rect x="396" y="38" width="116" height="62" rx="8" fill="#fbbc04" opacity="0.2" stroke="#fbbc04" stroke-width="1"/>
  <text x="454" y="58" text-anchor="middle" fill="#fde68a" font-size="9">First Report</text>
  <text x="454" y="80" text-anchor="middle" fill="white" font-size="20" font-weight="700">+50</text>
  <text x="454" y="94" text-anchor="middle" fill="#fde68a" font-size="8">one-time</text>

  <rect x="522" y="38" width="140" height="62" rx="8" fill="#ff6b35" opacity="0.2" stroke="#ff6b35" stroke-width="1"/>
  <text x="592" y="58" text-anchor="middle" fill="#fdba74" font-size="9">Weekly Streak (3+)</text>
  <text x="592" y="80" text-anchor="middle" fill="white" font-size="20" font-weight="700">+15</text>
  <text x="592" y="94" text-anchor="middle" fill="#fdba74" font-size="8">pts bonus</text>

  <text x="340" y="126" text-anchor="middle" fill="#9db4ff" font-size="9" font-weight="600" letter-spacing="2">BADGES</text>
  <rect x="18" y="136" width="146" height="38" rx="8" fill="#5b6cff" opacity="0.15"/>
  <text x="91" y="160" text-anchor="middle" fill="white" font-size="10">🥇 First Report · 1 issue</text>
  <rect x="174" y="136" width="156" height="38" rx="8" fill="#5b6cff" opacity="0.15"/>
  <text x="252" y="160" text-anchor="middle" fill="white" font-size="10">🦸 Civic Hero · 10 issues</text>
  <rect x="340" y="136" width="168" height="38" rx="8" fill="#5b6cff" opacity="0.15"/>
  <text x="424" y="160" text-anchor="middle" fill="white" font-size="10">🐕 Watchdog · 25 issues</text>
  <rect x="518" y="136" width="144" height="38" rx="8" fill="#5b6cff" opacity="0.15"/>
  <text x="590" y="160" text-anchor="middle" fill="white" font-size="10">✅ Verifier · 10 verified</text>
</svg>

</div>

---

## Pages

<div align="center">

<svg width="700" height="310" viewBox="0 0 700 310" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">
  <rect width="700" height="310" rx="14" fill="#f0f0fa"/>

  <rect x="18" y="18" width="154" height="126" rx="10" fill="#1c1b2e"/>
  <text x="95" y="56" text-anchor="middle" fill="#5b6cff" font-size="24">🏠</text>
  <text x="95" y="80" text-anchor="middle" fill="white" font-size="13" font-weight="700">Home</text>
  <text x="95" y="98" text-anchor="middle" fill="#9db4ff" font-size="9">/</text>
  <text x="95" y="116" text-anchor="middle" fill="#9db4ff" font-size="8">Hero · live stats</text>
  <text x="95" y="130" text-anchor="middle" fill="#9db4ff" font-size="8">pipeline explainer</text>

  <rect x="184" y="18" width="154" height="126" rx="10" fill="#5b6cff"/>
  <text x="261" y="56" text-anchor="middle" fill="white" font-size="24">📸</text>
  <text x="261" y="80" text-anchor="middle" fill="white" font-size="13" font-weight="700">Report</text>
  <text x="261" y="98" text-anchor="middle" fill="white" font-size="9" opacity="0.8">/report</text>
  <text x="261" y="116" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Photo → AI triage</text>
  <text x="261" y="130" text-anchor="middle" fill="white" font-size="8" opacity="0.75">3-step wizard + voice</text>

  <rect x="350" y="18" width="154" height="126" rx="10" fill="#5b6cff"/>
  <text x="427" y="56" text-anchor="middle" fill="white" font-size="24">📊</text>
  <text x="427" y="80" text-anchor="middle" fill="white" font-size="13" font-weight="700">Dashboard</text>
  <text x="427" y="98" text-anchor="middle" fill="white" font-size="9" opacity="0.8">/dashboard</text>
  <text x="427" y="116" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Impact metrics</text>
  <text x="427" y="130" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Predictive outlook</text>

  <rect x="516" y="18" width="166" height="126" rx="10" fill="#22c55e"/>
  <text x="599" y="56" text-anchor="middle" fill="white" font-size="24">🗺</text>
  <text x="599" y="80" text-anchor="middle" fill="white" font-size="13" font-weight="700">Map</text>
  <text x="599" y="98" text-anchor="middle" fill="white" font-size="9" opacity="0.8">/map</text>
  <text x="599" y="116" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Category-filtered pins</text>
  <text x="599" y="130" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Heatmap toggle</text>

  <rect x="18" y="160" width="154" height="130" rx="10" fill="#ff6b35"/>
  <text x="95" y="198" text-anchor="middle" fill="white" font-size="24">⚡</text>
  <text x="95" y="222" text-anchor="middle" fill="white" font-size="13" font-weight="700">Command</text>
  <text x="95" y="240" text-anchor="middle" fill="white" font-size="9" opacity="0.8">/command</text>
  <text x="95" y="258" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Municipal AI briefing</text>
  <text x="95" y="272" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Priority actions + hotspots</text>

  <rect x="184" y="160" width="154" height="130" rx="10" fill="#7c3aed"/>
  <text x="261" y="198" text-anchor="middle" fill="white" font-size="24">🔬</text>
  <text x="261" y="222" text-anchor="middle" fill="white" font-size="13" font-weight="700">Bulk Triage</text>
  <text x="261" y="240" text-anchor="middle" fill="white" font-size="9" opacity="0.8">/bulk-triage</text>
  <text x="261" y="258" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Up to 10 photos at once</text>
  <text x="261" y="272" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Parallel AI triage</text>

  <rect x="350" y="160" width="154" height="130" rx="10" fill="#128C7E"/>
  <text x="427" y="198" text-anchor="middle" fill="white" font-size="24">💬</text>
  <text x="427" y="222" text-anchor="middle" fill="white" font-size="13" font-weight="700">WhatsApp</text>
  <text x="427" y="240" text-anchor="middle" fill="white" font-size="9" opacity="0.8">/whatsapp</text>
  <text x="427" y="258" text-anchor="middle" fill="white" font-size="8" opacity="0.75">No app, no login</text>
  <text x="427" y="272" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Same Gemini pipeline</text>

  <rect x="516" y="160" width="166" height="130" rx="10" fill="#1c1b2e"/>
  <text x="599" y="198" text-anchor="middle" fill="#9db4ff" font-size="24">🏅</text>
  <text x="599" y="222" text-anchor="middle" fill="white" font-size="13" font-weight="700">Profile</text>
  <text x="599" y="240" text-anchor="middle" fill="#9db4ff" font-size="9">/profile</text>
  <text x="599" y="258" text-anchor="middle" fill="#9db4ff" font-size="8" opacity="0.8">Points + badges</text>
  <text x="599" y="272" text-anchor="middle" fill="#9db4ff" font-size="8" opacity="0.8">My reports history</text>
</svg>

</div>

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/issues` | List issues; filter by `?category=` |
| `GET` | `/api/issues/[id]` | Single issue with full AI analysis |
| `POST` | `/api/issues` | Create issue (runs geo-dedup + triage + points) |
| `POST` | `/api/analyze` | Run Gemini Vision triage on a photo |
| `POST` | `/api/upvote` | Upvote an issue (+5 pts, deduped) |
| `POST` | `/api/verify-resolution` | Before/after AI resolution check |
| `POST` | `/api/complaint` | Generate formal complaint letter |
| `GET` | `/api/briefing` | Cached city-wide AI action plan |
| `GET` | `/api/briefing/stream` | Streaming briefing agent (SSE) |
| `POST` | `/api/transcribe` | Gemini multimodal voice → text |
| `POST` | `/api/translate` | Hindi ↔ English translation |
| `POST` | `/api/agent/intake` | Tool-use agent: start session |
| `POST` | `/api/agent/dispatch` | Tool-use agent: run next tool |

---

## Data Model

```typescript
// lib/types.ts — single source of truth
interface Issue {
  id: string;
  category: 'pothole' | 'water_leak' | 'streetlight' | 'waste' | 'other';
  status: 'open' | 'in_progress' | 'resolved';
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
  imageData: string;       // inline data URL (~800px JPEG — no Firebase Storage needed)
  location: GeoPoint;
  geohash: string;         // for geo-dedup bounding queries
  reportedBy: string;      // uid (Firebase auth or anon fallback)
  assignedDept: string;
  upvoteCount: number;
  verifiedCount: number;   // how many nearby reports folded in
  aiAnalysis: StoredAiAnalysis;
  createdAt: Timestamp;
}
```

**Photos are stored inline** as ~800px JPEG data URLs on the Firestore doc. No Firebase Storage dependency — the whole app runs on the free Spark plan. Compression is in `lib/image.ts`.

---

## Deployment

<div align="center">

<svg width="660" height="96" viewBox="0 0 660 96" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">
  <rect width="660" height="96" rx="10" fill="#1c1b2e"/>
  <rect x="16" y="18" width="116" height="60" rx="8" fill="#5b6cff" opacity="0.2" stroke="#5b6cff" stroke-width="1"/>
  <text x="74" y="42" text-anchor="middle" fill="white" font-size="9" font-weight="700">1. docker build</text>
  <text x="74" y="57" text-anchor="middle" fill="#9db4ff" font-size="8">standalone output</text>
  <text x="74" y="69" text-anchor="middle" fill="#9db4ff" font-size="8">port 3080</text>
  <path d="M132 48 L152 48" stroke="#5b6cff" stroke-width="1.5"/>
  <polygon points="148,43 158,48 148,53" fill="#5b6cff"/>
  <rect x="158" y="18" width="130" height="60" rx="8" fill="#5b6cff" opacity="0.2" stroke="#5b6cff" stroke-width="1"/>
  <text x="223" y="42" text-anchor="middle" fill="white" font-size="9" font-weight="700">2. Artifact Registry</text>
  <text x="223" y="57" text-anchor="middle" fill="#9db4ff" font-size="8">NEXT_PUBLIC_* baked</text>
  <text x="223" y="69" text-anchor="middle" fill="#9db4ff" font-size="8">in at build time</text>
  <path d="M288 48 L308 48" stroke="#5b6cff" stroke-width="1.5"/>
  <polygon points="304,43 314,48 304,53" fill="#5b6cff"/>
  <rect x="314" y="18" width="130" height="60" rx="8" fill="#22c55e" opacity="0.2" stroke="#22c55e" stroke-width="1"/>
  <text x="379" y="42" text-anchor="middle" fill="white" font-size="9" font-weight="700">3. Cloud Run deploy</text>
  <text x="379" y="57" text-anchor="middle" fill="#86efac" font-size="8">GEMINI_API_KEY</text>
  <text x="379" y="69" text-anchor="middle" fill="#86efac" font-size="8">as runtime secret</text>
  <path d="M444 48 L464 48" stroke="#5b6cff" stroke-width="1.5"/>
  <polygon points="460,43 470,48 460,53" fill="#5b6cff"/>
  <rect x="470" y="18" width="174" height="60" rx="8" fill="#fbbc04" opacity="0.18" stroke="#fbbc04" stroke-width="1"/>
  <text x="557" y="42" text-anchor="middle" fill="white" font-size="9" font-weight="700">4. Firestore rules + indexes</text>
  <text x="557" y="57" text-anchor="middle" fill="#fde68a" font-size="8">firebase deploy --only firestore</text>
  <text x="557" y="69" text-anchor="middle" fill="#fde68a" font-size="8">geo-dedup + filtered-list indexes</text>
</svg>

</div>

```bash
# One-command deploy (reads .env.deploy)
cp .env.deploy.example .env.deploy   # fill in PROJECT_ID, REGION, SERVICE_ACCOUNT…
./deploy.sh
```

`NEXT_PUBLIC_*` vars are inlined **at build time** (Docker build args / Cloud Build substitutions). `GEMINI_API_KEY` is a **runtime** env var — never baked into the image. After first deploy, add the service URL to Firebase Auth authorized domains and the Maps key referrer allowlist.

---

## Local Setup

```bash
# 1. Clone & install
git clone https://github.com/your-org/urbanpulse
cd urbanpulse && npm install

# 2. Environment
cp .env.local.example .env.local
# Required:
#   GEMINI_API_KEY            (server-side only — never NEXT_PUBLIC_)
#   NEXT_PUBLIC_FIREBASE_*    (apiKey, authDomain, projectId, appId)
#   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# 3. Seed demo data (needs permissive Firestore rules)
npm run seed     # loads ~8 issues + 4 leaderboard users

# 4. Dev
npm run dev      # http://localhost:3000

# 5. Production build check (clean = no type/CSS errors)
npm run build
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 App Router · TypeScript strict |
| AI | Gemini 2.5 Flash — vision, text, multimodal voice |
| Database | Firebase Firestore (free Spark plan) |
| Auth | Firebase Auth (Google popup) + anonymous `getAnonId` fallback |
| Maps | Google Maps JS API |
| Push | Firebase Cloud Messaging (FCM) |
| Styling | Tailwind CSS + Sarvam-inspired design system (`app/globals.css`) |
| Hosting | Google Cloud Run — Docker standalone, port 3080 |
| CI/CD | Cloud Build → `cloudbuild.yaml` |

### Design System

```
ink    #1c1b2e   Deep navy — backgrounds + primary text
blue   #5b6cff   Sarvam blue — CTAs, active states
sky    #9db4ff   Soft blue — secondary labels on dark
orange #ff6b35   Alerts, severity-high, streak bonuses
```

Reusable classes: `.glass-card` `.glass-card-lg` `.glass-card-hover` `.btn-primary` `.btn-ghost` `.skeleton`  
Icons: inline set in `components/icons.tsx` — no external icon library.

---

## Live Stats

| Metric | Value |
|--------|-------|
| Issues reported | 18 |
| AI-verified resolved | 7 |
| Duplicates auto-merged | 81 |
| Staff-hours saved | ~24h |
| Active departments | 5 |
| Categories | Pothole · Water Leak · Streetlight · Waste · Other |

---

<div align="center">

**Built for India's 500M WhatsApp users — one photo is all it takes.**

[Report an issue](https://urbanpulse-h2uigix6dq-el.a.run.app/report) · [Command Center](https://urbanpulse-h2uigix6dq-el.a.run.app/command) · [Dashboard](https://urbanpulse-h2uigix6dq-el.a.run.app/dashboard)

</div>
