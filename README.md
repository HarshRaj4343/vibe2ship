<div align="center">

<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" rx="20" fill="#1c1b2e"/>
  <circle cx="40" cy="32" r="12" fill="#5b6cff" opacity="0.9"/>
  <path d="M40 44 L32 58 Q40 54 48 58 Z" fill="#5b6cff" opacity="0.7"/>
  <circle cx="40" cy="32" r="5" fill="white"/>
  <path d="M20 62 Q40 52 60 62" stroke="#9db4ff" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>

# UrbanPulse

**India's civic resolution agent — one photo, fully triaged, routed, and AI-verified.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-urbanpulse-5b6cff?style=for-the-badge&logo=googlechrome&logoColor=white)](https://urbanpulse-h2uigix6dq-el.a.run.app)
[![Next.js](https://img.shields.io/badge/Next.js%2014-App%20Router-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![Gemini](https://img.shields.io/badge/Gemini%202.5%20Flash-Vision%20Agent-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Cloud Run](https://img.shields.io/badge/Cloud%20Run-Deployed-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tests](https://img.shields.io/badge/Vitest-27%20passing-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](#testing)

### **[▶ Try the live app](https://urbanpulse-h2uigix6dq-el.a.run.app)**  ·  Citizens photograph a civic problem → a Gemini agent triages, routes, and *verifies the fix* — closing the loop no government portal does.

</div>

---

<div align="center">

|  🦾 Not a chatbot — a real agent  |  🔁 Closes the loop  |  ☁️ 9 Google products  |  📊 Quantified impact  |
|:---|:---|:---|:---|
| Gemini **function-calling agent** chains 6 tools, **self-corrects** when confidence < 0.7, and **remembers** past sessions | AI **skeptically** compares before/after photos and **refuses to rubber-stamp** a fix that didn't happen | Gemini · Firestore · Auth · FCM · Maps · Translation · Cloud Run · Cloud Build · Artifact Registry | **81** duplicate reports auto-folded into **18** issues · **~24 staff-hours** saved |

</div>

> **Built for the Vibe2Ship hackathon** (Coding Ninjas × Google for Developers). Live on Cloud Run, fully working end-to-end — report a real pothole and watch the agent triage and route it in seconds.

### 🎯 Why this is *agentically deep*, not just an AI wrapper

Most "AI" civic apps make **one** model call and display the output. UrbanPulse runs a genuine agentic system:

- **🛠️ Autonomous tool-use agent** (`lib/agent.ts`) — Gemini decides its *own* order across 6 tools: validate → critique → dedup → history-lookup → route → create. [See the flow ↓](#-autonomous-tool-use-agent-agent)
- **🔍 Self-correction** — when the model's confidence in a category drops below 0.7, it calls `critique_analysis` to challenge itself *before* acting, then adopts the critique's verdict.
- **🧠 Persistent memory** (`lib/agent-memory.ts`) — the agent writes insights to Firestore after each session and reads them back next time, so routing gets smarter over time.
- **📡 Streaming reasoning** — the Municipal Command Center streams the agent's plan step-by-step over SSE as it reasons across *every* open issue. [/command ↓](#pages)
- **🚫 Verification with teeth** — `verifyResolution` is prompted to be *skeptical*; an "after" photo that doesn't clearly show the fix gets rejected, so issues can't be falsely closed.

<details>
<summary><b>📖 Table of Contents</b></summary>

- [What it does](#what-it-does)
- [The 4-Step AI Pipeline](#the-4-step-ai-pipeline)
- [Architecture](#architecture)
- [Features](#features)
  - [Gemini Vision Calls](#-four-gemini-calls)
  - [Tool-Use Agent](#-autonomous-tool-use-agent-agent)
  - [Geo-Deduplication](#-geo-deduplication)
  - [Gamification](#-gamification)
  - [Predictive Analytics](#-predictive-analytics--sla-tracking)
  - [Hindi/English i18n](#-hinglish-bilingual-ui)
  - [FCM Push Notifications](#-fcm-push-notifications)
  - [Bulk Triage](#-bulk-triage)
  - [WhatsApp Channel](#-whatsapp-channel)
  - [Admin / Dept. Accountability](#-admin--department-accountability-board)
- [Issue Lifecycle](#issue-lifecycle)
- [Pages](#pages)
- [API Reference](#api-reference)
- [Data Model](#data-model)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Deployment](#deployment)
- [Tech Stack & Design System](#tech-stack--design-system)
- [Live Stats](#live-stats)

</details>

---

## What it does

Citizens photograph potholes, leaks, broken lights, or waste. A **Gemini Vision agent** triages each report in seconds — validating it, categorizing it, scoring its severity, and routing it to the right municipal department. The system deduplicates nearby reports, drafts formal complaint letters, and refuses to mark anything resolved until AI sees before/after proof.

> Powered end-to-end on Google: Gemini · Firestore · Firebase Auth · FCM · Maps · Cloud Translation · Cloud Run · Cloud Build.

---

## The 4-Step AI Pipeline

<div align="center">

<svg width="720" height="110" viewBox="0 0 720 110" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">
  <rect width="720" height="110" rx="12" fill="#f0f0fa"/>
  <rect x="18" y="18" width="152" height="74" rx="10" fill="#1c1b2e"/>
  <text x="94" y="46" text-anchor="middle" fill="#9db4ff" font-size="10" font-weight="600" letter-spacing="1">STEP 1</text>
  <text x="94" y="66" text-anchor="middle" fill="white" font-size="14" font-weight="700">Validate</text>
  <text x="94" y="82" text-anchor="middle" fill="#9db4ff" font-size="9">Real civic issue?</text>
  <path d="M170 55 L192 55" stroke="#5b6cff" stroke-width="2" stroke-linecap="round"/>
  <polygon points="188,50 198,55 188,60" fill="#5b6cff"/>
  <rect x="198" y="18" width="152" height="74" rx="10" fill="#5b6cff"/>
  <text x="274" y="46" text-anchor="middle" fill="white" font-size="10" font-weight="600" letter-spacing="1" opacity="0.8">STEP 2</text>
  <text x="274" y="66" text-anchor="middle" fill="white" font-size="14" font-weight="700">Categorize</text>
  <text x="274" y="82" text-anchor="middle" fill="white" font-size="9" opacity="0.85">Pothole · Leak · Light…</text>
  <path d="M350 55 L372 55" stroke="#5b6cff" stroke-width="2" stroke-linecap="round"/>
  <polygon points="368,50 378,55 368,60" fill="#5b6cff"/>
  <rect x="378" y="18" width="152" height="74" rx="10" fill="#ff6b35"/>
  <text x="454" y="46" text-anchor="middle" fill="white" font-size="10" font-weight="600" letter-spacing="1" opacity="0.85">STEP 3</text>
  <text x="454" y="66" text-anchor="middle" fill="white" font-size="14" font-weight="700">Severity 1–5</text>
  <text x="454" y="82" text-anchor="middle" fill="white" font-size="9" opacity="0.85">+ Safety risk flag</text>
  <path d="M530 55 L552 55" stroke="#5b6cff" stroke-width="2" stroke-linecap="round"/>
  <polygon points="548,50 558,55 548,60" fill="#5b6cff"/>
  <rect x="558" y="18" width="144" height="74" rx="10" fill="#22c55e"/>
  <text x="630" y="46" text-anchor="middle" fill="white" font-size="10" font-weight="600" letter-spacing="1" opacity="0.85">STEP 4</text>
  <text x="630" y="66" text-anchor="middle" fill="white" font-size="14" font-weight="700">Route</text>
  <text x="630" y="82" text-anchor="middle" fill="white" font-size="9" opacity="0.85">Right department</text>
</svg>

*All four steps happen in **one Gemini Vision call** — `analyzeIssue()` in `lib/gemini.ts`. The model returns a single JSON blob; a defensive normalizer clamps every field before it touches Firestore.*

</div>

---

## Architecture

<div align="center">

<svg width="720" height="400" viewBox="0 0 720 400" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">
  <rect width="720" height="400" rx="14" fill="#f0f0fa"/>
  <text x="360" y="28" text-anchor="middle" fill="#1c1b2e" font-size="13" font-weight="700" letter-spacing="1">SYSTEM ARCHITECTURE</text>
  <rect x="16" y="44" width="688" height="88" rx="10" fill="#1c1b2e" opacity="0.05" stroke="#1c1b2e" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="36" y="64" fill="#1c1b2e" font-size="10" font-weight="700" opacity="0.4" letter-spacing="1.5">CLIENT — Next.js 14 App Router (RSC + Client Components)</text>
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
  <text x="651" y="93" text-anchor="middle" fill="#9db4ff" font-size="9" font-weight="700">🏛 Admin</text>
  <text x="651" y="108" text-anchor="middle" fill="#9db4ff" font-size="8" opacity="0.7">/admin</text>
  <path d="M360 132 L360 158" stroke="#5b6cff" stroke-width="2" stroke-dasharray="4,3"/>
  <polygon points="356,155 360,163 364,155" fill="#5b6cff"/>
  <rect x="16" y="163" width="688" height="88" rx="10" fill="#ff6b35" opacity="0.07" stroke="#ff6b35" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="36" y="183" fill="#c23b00" font-size="10" font-weight="700" opacity="0.6" letter-spacing="1.5">API ROUTES — app/api/**/route.ts · Node.js runtime</text>
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
  <path d="M160 251 L120 291" stroke="#5b6cff" stroke-width="1.5" stroke-dasharray="3,2"/>
  <polygon points="116,288 120,297 124,288" fill="#5b6cff"/>
  <path d="M360 251 L360 291" stroke="#5b6cff" stroke-width="1.5" stroke-dasharray="3,2"/>
  <polygon points="356,288 360,297 364,288" fill="#5b6cff"/>
  <path d="M560 251 L610 291" stroke="#5b6cff" stroke-width="1.5" stroke-dasharray="3,2"/>
  <polygon points="606,288 610,297 614,288" fill="#5b6cff"/>
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
  <text x="597" y="367" text-anchor="middle" fill="#5a3a00" font-size="9">Cloud Build CI/CD · Translation API</text>
</svg>

</div>

---

## Features

### 🤖 Four Gemini Calls

All live in `lib/gemini.ts`. Every call uses the same defensive JSON-parsing pattern: strip markdown fences → `JSON.parse` → normalizer clamps off-spec values so a bad model response never reaches Firestore.

| Call | Endpoint | What it does |
|---|---|---|
| `analyzeIssue` | `POST /api/analyze` | Validate → categorize → severity(1–5) + safety risk → route to department |
| `verifyResolution` | `POST /api/verify-resolution` | Skeptically compares before/after photos — refuses to confirm unless genuinely fixed |
| `draftComplaint` | `POST /api/complaint` | Generates a formal, department-addressed complaint letter with tracking ID |
| `generateBriefing` | `GET /api/briefing` | Reasons across ALL open issues → prioritized action plan + hotspot detection |

---

### 🦾 Autonomous Tool-Use Agent (`/agent`)

A second, deeper pipeline backed by Gemini **function calling** (not a single prompt). The agent has a system instruction and a set of tools it calls in sequence, deciding its own order:

<div align="center">

<svg width="720" height="200" viewBox="0 0 720 200" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">
  <rect width="720" height="200" rx="12" fill="#1c1b2e"/>
  <text x="360" y="26" text-anchor="middle" fill="#9db4ff" font-size="11" font-weight="700" letter-spacing="2">TOOL-USE AGENT FLOW  ·  lib/agent.ts  ·  MAX 10 TURNS</text>

  <rect x="16" y="40" width="100" height="56" rx="8" fill="#5b6cff" opacity="0.25" stroke="#5b6cff" stroke-width="1"/>
  <text x="66" y="63" text-anchor="middle" fill="white" font-size="8" font-weight="700">1. Look at photo</text>
  <text x="66" y="78" text-anchor="middle" fill="#9db4ff" font-size="7">Is it a real</text>
  <text x="66" y="89" text-anchor="middle" fill="#9db4ff" font-size="7">civic issue?</text>

  <path d="M116 68 L132 68" stroke="#5b6cff" stroke-width="1.5"/>
  <polygon points="129,63 137,68 129,73" fill="#5b6cff"/>

  <rect x="138" y="40" width="108" height="56" rx="8" fill="#5b6cff" opacity="0.25" stroke="#5b6cff" stroke-width="1"/>
  <text x="192" y="60" text-anchor="middle" fill="white" font-size="8" font-weight="700">2. Self-check</text>
  <text x="192" y="75" text-anchor="middle" fill="#9db4ff" font-size="7">If confidence &lt; 0.7</text>
  <text x="192" y="86" text-anchor="middle" fill="#9db4ff" font-size="7">→ critique_analysis()</text>

  <path d="M246 68 L262 68" stroke="#5b6cff" stroke-width="1.5"/>
  <polygon points="259,63 267,68 259,73" fill="#5b6cff"/>

  <rect x="268" y="40" width="108" height="56" rx="8" fill="#5b6cff" opacity="0.25" stroke="#5b6cff" stroke-width="1"/>
  <text x="322" y="60" text-anchor="middle" fill="white" font-size="8" font-weight="700">3. Geo-dedup</text>
  <text x="322" y="75" text-anchor="middle" fill="#9db4ff" font-size="7">find_duplicate_issue()</text>
  <text x="322" y="86" text-anchor="middle" fill="#9db4ff" font-size="7">200m radius</text>

  <path d="M376 68 L392 68" stroke="#5b6cff" stroke-width="1.5"/>
  <polygon points="389,63 397,68 389,73" fill="#5b6cff"/>

  <rect x="398" y="40" width="118" height="56" rx="8" fill="#5b6cff" opacity="0.25" stroke="#5b6cff" stroke-width="1"/>
  <text x="457" y="60" text-anchor="middle" fill="white" font-size="8" font-weight="700">4. History lookup</text>
  <text x="457" y="75" text-anchor="middle" fill="#9db4ff" font-size="7">lookup_resolution_history()</text>
  <text x="457" y="86" text-anchor="middle" fill="#9db4ff" font-size="7">informs routing + ETA</text>

  <path d="M516 68 L532 68" stroke="#5b6cff" stroke-width="1.5"/>
  <polygon points="529,63 537,68 529,73" fill="#5b6cff"/>

  <rect x="538" y="40" width="166" height="56" rx="8" fill="#22c55e" opacity="0.2" stroke="#22c55e" stroke-width="1"/>
  <text x="621" y="60" text-anchor="middle" fill="white" font-size="8" font-weight="700">5. Route → Create → Award</text>
  <text x="621" y="75" text-anchor="middle" fill="#86efac" font-size="7">route_to_department()</text>
  <text x="621" y="86" text-anchor="middle" fill="#86efac" font-size="7">create_issue() · award_points()</text>

  <text x="360" y="130" text-anchor="middle" fill="#9db4ff" font-size="10" font-weight="600" letter-spacing="1">AGENT TOOLS  ·  lib/agent-tools.ts</text>

  <rect x="16" y="142" width="110" height="44" rx="8" fill="#5b6cff" opacity="0.15"/>
  <text x="71" y="168" text-anchor="middle" fill="white" font-size="9">critique_analysis</text>

  <rect x="136" y="142" width="118" height="44" rx="8" fill="#5b6cff" opacity="0.15"/>
  <text x="195" y="168" text-anchor="middle" fill="white" font-size="9">find_duplicate_issue</text>

  <rect x="264" y="142" width="138" height="44" rx="8" fill="#5b6cff" opacity="0.15"/>
  <text x="333" y="168" text-anchor="middle" fill="white" font-size="9">lookup_resolution_history</text>

  <rect x="412" y="142" width="118" height="44" rx="8" fill="#5b6cff" opacity="0.15"/>
  <text x="471" y="168" text-anchor="middle" fill="white" font-size="9">route_to_department</text>

  <rect x="540" y="142" width="84" height="44" rx="8" fill="#22c55e" opacity="0.15"/>
  <text x="582" y="161" text-anchor="middle" fill="white" font-size="9">create_issue</text>
  <rect x="634" y="142" width="70" height="44" rx="8" fill="#22c55e" opacity="0.15"/>
  <text x="669" y="161" text-anchor="middle" fill="white" font-size="9">award_points</text>
</svg>

</div>

The agent also uses **persistent memory** (`lib/agent-memory.ts`): it writes insights to Firestore after each session (category trends, resolution patterns) and reads them back at the start of the next session to improve routing decisions over time.

---

### 📍 Geo-Deduplication

Reports within **200 m** of an existing open issue of the same category are **folded in**, not duplicated. Firestore has no native radius query, so we use a geohash bounding-box pre-filter then an exact Haversine distance check (`lib/geo.ts`).

```
POST /api/issues
  └─ findDuplicateIssue()       ← geohash bounds → 200m Haversine
       ├─ HIT  → verifiedCount++, +5 pts, no new doc created
       └─ MISS → create new doc → analyzeIssue() → awardPoints()
```

Firestore composite indexes (`firestore.indexes.json`) are **required** for this query:
- `category` + `geohash` — geo-dedup
- `category` + `createdAt desc` — filtered issue list

---

### 🎮 Gamification

<div align="center">

<svg width="680" height="190" viewBox="0 0 680 190" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">
  <rect width="680" height="190" rx="12" fill="#1c1b2e"/>
  <text x="340" y="26" text-anchor="middle" fill="#9db4ff" font-size="11" font-weight="700" letter-spacing="2">POINTS &amp; BADGES  ·  lib/points.ts</text>
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

Points and badge eligibility are recomputed by `eligibleBadges()` in `lib/points.ts` on every `awardPoints` call. The `users/{uid}` Firestore doc is created automatically on first activity — no sign-up gate.

---

### 📈 Predictive Analytics & SLA Tracking

**`lib/predict.ts`** — three forward-looking signals, all computed deterministically from the issue list (no extra Gemini call):

| Signal | How |
|---|---|
| Time-to-fix forecast | Historical median resolution time per category + severity, projected onto each open issue |
| Recurrence risk | Geohash-bucketed (6-char ≈ 1.2 km × 0.6 km) repeat-offender detection |
| Emerging hotspot | Report-rate acceleration: compares last 14 days vs prior 14 days per area |

**`lib/sla.ts`** — resolution targets per severity, used by the `/admin` accountability board:

| Severity | SLA target |
|---|---|
| 5 (critical) | 1 day |
| 4 (high) | 2 days |
| 3 (medium) | 4 days |
| 2 (low) | 7 days |
| 1 (minimal) | 10 days |

**`lib/civic.ts`** — grades each neighbourhood A–F based on issue density, resolution rate, and repeat-offender history. Shown on `/admin`.

---

### 🌐 Hindi/English Bilingual UI

**`lib/i18n.tsx`** — a lightweight React context (`useI18n`) powered by the **Google Cloud Translation API** (`/api/translate`). Source strings stay in English in the JSX; when the user flips the `EN / हि` toggle, `t(text)` lazily fetches the Devanagari translation and re-renders. Translations are memoized in `localStorage` — each unique string costs at most one API call per language.

Requires: `GOOGLE_TRANSLATE_API_KEY` (server-only). If unset, the UI stays English with no error.

---

### 🔔 FCM Push Notifications

When an issue is resolved, the reporter gets a browser push notification.

```
Issue status → 'resolved'
  └─ POST /api/issues/[id] (status update)
       └─ Firebase Admin SDK → FCM send to reporter's device token
            └─ Browser receives push → StatusNotifier.tsx shows toast
```

**`lib/messaging.ts`** — lazy FCM init (avoids SSR breakage), requests permission, stores the device token on `users/{uid}.fcmToken`. `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is required for the Web Push subscription. The service worker (`public/firebase-messaging-sw.js`) handles background delivery.

If `FIREBASE_SERVICE_ACCOUNT_JSON` is unset, the app falls back to a real-time Firestore listener in `StatusNotifier.tsx` — in-app toasts still work.

---

### 🔬 Bulk Triage

`/bulk-triage` — field inspectors upload up to 10 photos at once. The Gemini agent triages all of them **in parallel** (Promise.all), deduplicates same-category issues in the batch, and produces a consolidated action report. No sequential waiting.

---

### 💬 WhatsApp Channel

`/whatsapp` — a mocked WhatsApp Business UI backed by the **same live Gemini pipeline**. A citizen sends a photo; the bot replies with the triage result, assigned department, and tracking ID. In production this would connect to the WhatsApp Business API; the mock runs over `POST /api/analyze` directly. No app, no login — just a photo message.

---

### 🏛 Admin / Department Accountability Board

`/admin` — a read-only board for municipal officers showing:
- Per-department SLA compliance (issues resolved within target vs overdue)
- Per-neighbourhood civic grade (A–F from `lib/civic.ts`)
- Overdue issue list sorted by severity
- City-wide civic score

Computed entirely client-side from the Firestore issue list — no extra API call.

---

## Issue Lifecycle

<div align="center">

<svg width="680" height="150" viewBox="0 0 680 150" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">
  <rect width="680" height="150" rx="12" fill="#f0f0fa"/>
  <text x="340" y="24" text-anchor="middle" fill="#1c1b2e" font-size="11" font-weight="700" letter-spacing="1">ISSUE STATUS LIFECYCLE</text>

  <!-- Citizen reports -->
  <rect x="20" y="40" width="130" height="80" rx="10" fill="#5b6cff"/>
  <text x="85" y="70" text-anchor="middle" fill="white" font-size="11" font-weight="700">📸 Reported</text>
  <text x="85" y="88" text-anchor="middle" fill="white" font-size="8" opacity="0.85">Photo uploaded</text>
  <text x="85" y="102" text-anchor="middle" fill="white" font-size="8" opacity="0.85">Gemini triages</text>
  <text x="85" y="114" text-anchor="middle" fill="white" font-size="8" opacity="0.85">status = open</text>

  <path d="M150 80 L178 80" stroke="#5b6cff" stroke-width="2"/>
  <polygon points="174,75 184,80 174,85" fill="#5b6cff"/>
  <text x="165" y="72" text-anchor="middle" fill="#5b6cff" font-size="7">dept picks up</text>

  <!-- In progress -->
  <rect x="184" y="40" width="140" height="80" rx="10" fill="#ff6b35"/>
  <text x="254" y="70" text-anchor="middle" fill="white" font-size="11" font-weight="700">🔧 In Progress</text>
  <text x="254" y="88" text-anchor="middle" fill="white" font-size="8" opacity="0.85">Department working</text>
  <text x="254" y="102" text-anchor="middle" fill="white" font-size="8" opacity="0.85">SLA clock running</text>
  <text x="254" y="114" text-anchor="middle" fill="white" font-size="8" opacity="0.85">status = in_progress</text>

  <path d="M324 80 L352 80" stroke="#22c55e" stroke-width="2"/>
  <polygon points="348,75 358,80 348,85" fill="#22c55e"/>
  <text x="338" y="72" text-anchor="middle" fill="#22c55e" font-size="7">after photo</text>

  <!-- Verify -->
  <rect x="358" y="40" width="150" height="80" rx="10" fill="#7c3aed"/>
  <text x="433" y="65" text-anchor="middle" fill="white" font-size="11" font-weight="700">🔍 AI Verification</text>
  <text x="433" y="83" text-anchor="middle" fill="white" font-size="8" opacity="0.85">verifyResolution()</text>
  <text x="433" y="97" text-anchor="middle" fill="white" font-size="8" opacity="0.85">Skeptical before/after</text>
  <text x="433" y="111" text-anchor="middle" fill="white" font-size="8" opacity="0.85">comparison</text>

  <path d="M508 80 L536 80" stroke="#22c55e" stroke-width="2"/>
  <polygon points="532,75 542,80 532,85" fill="#22c55e"/>
  <text x="521" y="72" text-anchor="middle" fill="#22c55e" font-size="7">confirmed</text>

  <!-- Resolved -->
  <rect x="542" y="40" width="120" height="80" rx="10" fill="#22c55e"/>
  <text x="602" y="70" text-anchor="middle" fill="white" font-size="11" font-weight="700">✅ Resolved</text>
  <text x="602" y="88" text-anchor="middle" fill="white" font-size="8" opacity="0.85">+25 pts to reporter</text>
  <text x="602" y="102" text-anchor="middle" fill="white" font-size="8" opacity="0.85">FCM push sent</text>
  <text x="602" y="114" text-anchor="middle" fill="white" font-size="8" opacity="0.85">status = resolved</text>
</svg>

</div>

The system **never auto-resolves** an issue. A human (dept officer or citizen) must upload an "after" photo, then `verifyResolution()` compares it against the original and must return `fixed: true` before `status` moves to `resolved`.

---

## Pages

<div align="center">

<svg width="700" height="420" viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,-apple-system,sans-serif">
  <rect width="700" height="420" rx="14" fill="#f0f0fa"/>

  <!-- Row 1 -->
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

  <!-- Row 2 -->
  <rect x="18" y="160" width="154" height="126" rx="10" fill="#ff6b35"/>
  <text x="95" y="198" text-anchor="middle" fill="white" font-size="24">⚡</text>
  <text x="95" y="222" text-anchor="middle" fill="white" font-size="13" font-weight="700">Command</text>
  <text x="95" y="240" text-anchor="middle" fill="white" font-size="9" opacity="0.8">/command</text>
  <text x="95" y="258" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Municipal AI briefing</text>
  <text x="95" y="272" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Priority actions + hotspots</text>

  <rect x="184" y="160" width="154" height="126" rx="10" fill="#7c3aed"/>
  <text x="261" y="198" text-anchor="middle" fill="white" font-size="24">🦾</text>
  <text x="261" y="222" text-anchor="middle" fill="white" font-size="13" font-weight="700">Agent</text>
  <text x="261" y="240" text-anchor="middle" fill="white" font-size="9" opacity="0.8">/agent</text>
  <text x="261" y="258" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Tool-use pipeline</text>
  <text x="261" y="272" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Streamed steps UI</text>

  <rect x="350" y="160" width="154" height="126" rx="10" fill="#7c3aed" opacity="0.7"/>
  <text x="427" y="198" text-anchor="middle" fill="white" font-size="24">🔬</text>
  <text x="427" y="222" text-anchor="middle" fill="white" font-size="13" font-weight="700">Bulk Triage</text>
  <text x="427" y="240" text-anchor="middle" fill="white" font-size="9" opacity="0.8">/bulk-triage</text>
  <text x="427" y="258" text-anchor="middle" fill="white" font-size="8" opacity="0.75">10 photos in parallel</text>
  <text x="427" y="272" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Consolidated report</text>

  <rect x="516" y="160" width="166" height="126" rx="10" fill="#128C7E"/>
  <text x="599" y="198" text-anchor="middle" fill="white" font-size="24">💬</text>
  <text x="599" y="222" text-anchor="middle" fill="white" font-size="13" font-weight="700">WhatsApp</text>
  <text x="599" y="240" text-anchor="middle" fill="white" font-size="9" opacity="0.8">/whatsapp</text>
  <text x="599" y="258" text-anchor="middle" fill="white" font-size="8" opacity="0.75">No app, no login</text>
  <text x="599" y="272" text-anchor="middle" fill="white" font-size="8" opacity="0.75">Same Gemini pipeline</text>

  <!-- Row 3 -->
  <rect x="18" y="302" width="154" height="100" rx="10" fill="#1c1b2e"/>
  <text x="95" y="336" text-anchor="middle" fill="#9db4ff" font-size="24">🏛</text>
  <text x="95" y="360" text-anchor="middle" fill="white" font-size="13" font-weight="700">Admin</text>
  <text x="95" y="378" text-anchor="middle" fill="#9db4ff" font-size="9">/admin</text>
  <text x="95" y="392" text-anchor="middle" fill="#9db4ff" font-size="8">Dept SLA · Civic grades</text>

  <rect x="184" y="302" width="154" height="100" rx="10" fill="#1c1b2e"/>
  <text x="261" y="336" text-anchor="middle" fill="#9db4ff" font-size="24">👤</text>
  <text x="261" y="360" text-anchor="middle" fill="white" font-size="13" font-weight="700">Profile</text>
  <text x="261" y="378" text-anchor="middle" fill="#9db4ff" font-size="9">/profile</text>
  <text x="261" y="392" text-anchor="middle" fill="#9db4ff" font-size="8">Points · badges · my reports</text>

  <rect x="350" y="302" width="332" height="100" rx="10" fill="#5b6cff" opacity="0.1" stroke="#5b6cff" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="516" y="342" text-anchor="middle" fill="#5b6cff" font-size="11" font-weight="700">Issue Detail  ·  /issue/[id]</text>
  <text x="516" y="362" text-anchor="middle" fill="#1c1b2e" font-size="9">Full AI analysis · upvote · before/after verify</text>
  <text x="516" y="380" text-anchor="middle" fill="#1c1b2e" font-size="9">Complaint letter drafter · resolution tracker</text>
</svg>

</div>

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/issues` | — | List issues; optional `?category=` filter |
| `GET` | `/api/issues/[id]` | — | Single issue with full AI analysis |
| `POST` | `/api/issues` | uid | Create issue — runs geo-dedup, triage, complaint draft, points |
| `PATCH` | `/api/issues/[id]` | — | Update status (triggers FCM push on resolve) |
| `POST` | `/api/analyze` | — | Run Gemini Vision triage on a base64 photo |
| `POST` | `/api/upvote` | uid | Upvote an issue; deduped per user |
| `POST` | `/api/verify-resolution` | uid | Before/after AI resolution check |
| `POST` | `/api/complaint` | — | Generate formal complaint letter (cached per issue) |
| `GET` | `/api/briefing` | — | Cached city-wide AI action plan |
| `GET` | `/api/briefing/stream` | — | Streaming briefing agent — SSE (`data:` events) |
| `POST` | `/api/transcribe` | — | Gemini multimodal voice → English text |
| `POST` | `/api/translate` | — | Hindi ↔ English via Cloud Translation API |
| `POST` | `/api/agent/intake` | uid | Tool-use agent: start a session, return `sessionId` |
| `POST` | `/api/agent/dispatch` | uid | Tool-use agent: run next tool turn, return steps |

---

## Data Model

```typescript
// lib/types.ts — single source of truth for all shapes

interface Issue {
  id: string;
  category: 'pothole' | 'water_leak' | 'streetlight' | 'waste' | 'other';
  status: 'open' | 'in_progress' | 'resolved';
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
  imageData: string;        // inline ~800px JPEG data URL (lib/image.ts compresses)
  location: GeoPoint;
  geohash: string;          // for geo-dedup bounding queries (lib/geo.ts)
  reportedBy: string;       // uid (Firebase auth OR anonymous getAnonId())
  assignedDept: string;
  upvoteCount: number;
  verifiedCount: number;    // how many duplicate reports folded in
  aiAnalysis: StoredAiAnalysis;
  estResolutionDays?: number; // agent lookup_resolution_history result
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// API routes convert Timestamp → epoch millis for client transport:
interface SerializedIssue extends Omit<Issue, 'createdAt' | 'updatedAt'> {
  createdAt: number;
  updatedAt: number;
}

interface User {
  uid: string;
  displayName?: string;
  email?: string;
  points: number;
  issuesReported: number;
  issuesVerified: number;
  badges: Badge[];
  fcmToken?: string;        // FCM device token for push
  lastReportAt?: Timestamp; // streak tracking
  streakCount?: number;
}
```

**Key design decisions:**
- **No Firebase Storage** — photos are stored inline as data URLs on the Firestore doc, keeping the whole app on Firebase's free Spark plan.
- **`SerializedIssue` is the client contract** — API routes always convert before sending. Never pass raw `Timestamp` to the client.
- **`CATEGORY_LABELS` and `STATUS_LABELS`** in `lib/types.ts` are the single source of truth for display strings — reuse them everywhere.

---

## Project Structure

```
.
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout (Navbar, MobileNav, auth context)
│   ├── globals.css               # Design system — @layer components
│   ├── dashboard/page.tsx        # Community impact + predictive dashboard
│   ├── map/page.tsx              # Google Maps view with category/heatmap filters
│   ├── report/page.tsx           # 3-step issue reporting wizard
│   ├── command/page.tsx          # Municipal Command Center (streaming briefing)
│   ├── agent/page.tsx            # Tool-use agent UI (streamed step trace)
│   ├── bulk-triage/page.tsx      # Parallel AI triage for up to 10 photos
│   ├── whatsapp/page.tsx         # WhatsApp mock UI over live Gemini pipeline
│   ├── profile/page.tsx          # User points, badges, report history
│   ├── admin/page.tsx            # Department SLA board + civic grades
│   ├── issue/[id]/page.tsx       # Issue detail — verify, upvote, complaint letter
│   └── api/
│       ├── issues/route.ts       # GET list, POST create (geo-dedup + triage)
│       ├── issues/[id]/route.ts  # GET detail, PATCH status
│       ├── analyze/route.ts      # POST Gemini vision triage
│       ├── upvote/route.ts       # POST upvote
│       ├── verify-resolution/route.ts
│       ├── complaint/route.ts
│       ├── briefing/route.ts
│       ├── briefing/stream/route.ts  # SSE streaming briefing
│       ├── transcribe/route.ts
│       ├── translate/route.ts
│       └── agent/
│           ├── intake/route.ts   # Start tool-use session
│           └── dispatch/route.ts # Run next agent turn
│
├── components/
│   ├── icons.tsx                 # Inline icon set (Lucide-derived, currentColor)
│   ├── IssueReportForm.tsx       # 3-step wizard (photo → triage → confirm)
│   ├── IssueCard.tsx             # Issue card with category/status/severity
│   ├── IssueMap.tsx              # Google Maps wrapper with pins + heatmap
│   ├── AgentIntake.tsx           # Tool-use agent submission UI
│   ├── AgentTrace.tsx            # Streaming step visualizer
│   ├── ComplaintDrafter.tsx      # One-tap complaint letter generator
│   ├── ResolutionVerifier.tsx    # Before/after photo uploader + AI check
│   ├── StatusNotifier.tsx        # Real-time Firestore listener → FCM toast
│   ├── LeaderboardTable.tsx      # Points leaderboard
│   ├── VoiceInput.tsx            # Hindi/English voice → transcribed text
│   ├── PredictiveBand.tsx        # Dashboard forecast band
│   ├── StatsGrid.tsx             # Impact metric cards
│   └── EmptyState.tsx            # Consistent empty state component
│
├── lib/
│   ├── gemini.ts                 # All 4 Gemini calls + defensive JSON parsers
│   ├── agent.ts                  # Tool-use agent loop (max 10 turns)
│   ├── agent-tools.ts            # 6 tool declarations + server-side executors
│   ├── agent-memory.ts           # Persistent Firestore agent memory
│   ├── agent-step.ts             # AgentStep factory
│   ├── types.ts                  # Single source of truth (Issue, User, etc.)
│   ├── geo.ts                    # Geohash bounds + Haversine dedup
│   ├── points.ts                 # Points constants + eligibleBadges()
│   ├── sla.ts                    # SLA targets per severity + overdue calc
│   ├── predict.ts                # Predictive analytics (3 signals)
│   ├── civic.ts                  # Neighbourhood civic scoring (A–F)
│   ├── impact.ts                 # Impact metric helpers (median, etc.)
│   ├── image.ts                  # Client-side photo compression (~800px JPEG)
│   ├── i18n.tsx                  # Hindi/English context + lazy translation
│   ├── messaging.ts              # FCM client helpers (lazy, client-only)
│   ├── auth.tsx                  # useAuth() — Firebase + anon identity
│   ├── firebase.ts               # Firestore eager init; auth lazy via getClientAuth()
│   ├── api.ts                    # Typed fetch helpers for API routes
│   └── server/
│       └── issues.ts             # Server-only helpers (createIssueDoc, awardPoints)
│
├── scripts/
│   └── seed.mjs                  # Demo data loader (node --env-file=.env.local)
│
├── public/
│   ├── badges/                   # Badge PNG icons
│   └── firebase-messaging-sw.js  # FCM service worker (background push)
│
├── firestore.indexes.json        # Composite indexes (geo-dedup + filtered list)
├── firestore.rules               # Firestore security rules
├── firebase.json                 # Firebase project config
├── Dockerfile                    # Multi-stage, standalone output, port 3080
├── cloudbuild.yaml               # Cloud Build CI/CD pipeline
├── deploy.sh                     # One-command Cloud Run deploy
├── tailwind.config.ts            # Palette + fonts (ink, sarvam.*)
└── .env.local.example            # All required environment variables
```

---

## Environment Variables

Copy `.env.local.example` → `.env.local` for local dev. All variables with `NEXT_PUBLIC_` are inlined at **build time**; others are server-only runtime secrets.

| Variable | Where to get it | Required |
|---|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) | ✅ |
| `GEMINI_MODEL` | Override model name (default: `gemini-2.5-flash`) | optional |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings | ✅ |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Console → Project Settings | ✅ |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console → Project Settings | ✅ |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Console → Project Settings | ✅ |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Project Settings | ✅ |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Console → Project Settings | ✅ |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Firebase Console → Cloud Messaging → Web Push key pair | FCM only |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Console → Service Accounts → Generate key (full JSON) | FCM push only |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud Console → Maps JS API | ✅ |
| `GOOGLE_TRANSLATE_API_KEY` | Google Cloud Console → Cloud Translation API | Hindi UI only |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL (e.g. `https://urbanpulse-...run.app`) | deploy only |

> **Security note:** `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, and `GOOGLE_TRANSLATE_API_KEY` are **server-side only** — never prefix them with `NEXT_PUBLIC_`. The Firebase auth init in `lib/firebase.ts` is **lazy** (`getClientAuth()`) for exactly this reason: eager `getAuth()` at import time would validate `NEXT_PUBLIC_*` keys and break server builds where they're absent.

---

## Local Setup

```bash
# 1. Clone & install
git clone https://github.com/HarshRaj4343/vibe2ship
cd vibe2ship && npm install

# 2. Environment
cp .env.local.example .env.local
# Fill in all required values — minimum: GEMINI_API_KEY + NEXT_PUBLIC_FIREBASE_* + NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# 3. Firestore rules — temporarily set to allow all writes for seeding
#    (Firebase Console → Firestore → Rules → allow read, write: if true)

# 4. Seed demo data
npm run seed     # loads ~8 issues + 4 leaderboard users into Firestore

# 5. Restore your Firestore rules to the checked-in firestore.rules

# 6. Dev server
npm run dev      # http://localhost:3000

# 7. Production build check — clean build = no type or CSS errors
npm run build
```

Available commands:

| Command | Description |
|---|---|
| `npm run dev` | Dev server on `http://localhost:3000` |
| `npm run build` | Production build (`output: 'standalone'`) |
| `npm run start` | Serve the production build |
| `npm run lint` | Next.js ESLint |
| `npm test` | Run the Vitest unit suite (27 tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run seed` | Load demo issues + users into Firestore |

### Testing

The pure business logic — gamification, SLA, impact, and predictive analytics — is covered by a **27-test Vitest suite** in `tests/`. These are the functions that produce the numbers users actually see on the dashboard and admin board, so locking their behaviour down catches silent regressions.

```bash
npm test
#  ✓ tests/points.test.ts   (6)   points & badge thresholds
#  ✓ tests/sla.test.ts      (7)   SLA targets, overdue detection, dept aggregation
#  ✓ tests/impact.test.ts   (8)   median, dedup counting, staff-hours saved
#  ✓ tests/predict.test.ts  (6)   fix forecasts, severity weighting, determinism
#  Test Files  4 passed (4)  ·  Tests  27 passed (27)
```

Firebase/Next-coupled modules (API routes, `lib/gemini.ts`, `lib/geo.ts`) are intentionally out of scope for these unit tests — they're exercised end-to-end against the live deployment instead.

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
  <text x="379" y="57" text-anchor="middle" fill="#86efac" font-size="8">GEMINI_API_KEY runtime</text>
  <text x="379" y="69" text-anchor="middle" fill="#86efac" font-size="8">never baked in image</text>
  <path d="M444 48 L464 48" stroke="#5b6cff" stroke-width="1.5"/>
  <polygon points="460,43 470,48 460,53" fill="#5b6cff"/>
  <rect x="470" y="18" width="174" height="60" rx="8" fill="#fbbc04" opacity="0.18" stroke="#fbbc04" stroke-width="1"/>
  <text x="557" y="42" text-anchor="middle" fill="white" font-size="9" font-weight="700">4. Firestore rules + indexes</text>
  <text x="557" y="57" text-anchor="middle" fill="#fde68a" font-size="8">firebase deploy --only firestore</text>
  <text x="557" y="69" text-anchor="middle" fill="#fde68a" font-size="8">geo-dedup + filtered-list indexes</text>
</svg>

</div>

```bash
# One-command deploy — reads .env.deploy (gitignored)
cp .env.deploy.example .env.deploy
# Fill in: PROJECT_ID, REGION, SERVICE_ACCOUNT, image name, all NEXT_PUBLIC_* vars
./deploy.sh
```

`deploy.sh` enables required GCP APIs, deploys Firestore rules + indexes, then runs `cloudbuild.yaml` which builds the Docker image, pushes to Artifact Registry, and calls `gcloud run deploy`.

**After first deploy:**
1. Put the service URL in `NEXT_PUBLIC_APP_URL` in `.env.deploy`
2. Add it to **Firebase Auth → Authorized domains**
3. Add it to your **Maps API key → HTTP referrer allowlist**

---

## Tech Stack & Design System

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 App Router, TypeScript strict mode |
| AI | Gemini 2.5 Flash — vision, text, multimodal voice, function calling |
| Database | Firebase Firestore (free Spark plan) |
| Auth | Firebase Auth (Google popup) + anonymous `getAnonId()` fallback |
| Maps | Google Maps JS API + Visualization library (heatmap) |
| Push | Firebase Cloud Messaging (FCM) + VAPID Web Push |
| Translation | Google Cloud Translation API (Hindi/English) |
| Styling | Tailwind CSS + custom Sarvam-inspired design system |
| Hosting | Google Cloud Run — Docker standalone, port 3080 |
| CI/CD | Cloud Build → `cloudbuild.yaml` |

### Palette

```
ink    #1c1b2e   Deep navy — backgrounds + primary text
blue   #5b6cff   Sarvam blue — CTAs, active states, primary actions
sky    #9db4ff   Soft blue — secondary labels on dark backgrounds
orange #ff6b35   Alerts, severity-high, streak bonuses
peach  #ffb347   Accent warm
```

### Reusable Classes (`app/globals.css @layer components`)

```css
.glass-card          /* frosted glass panel */
.glass-card-lg       /* larger glass panel */
.glass-card-hover    /* glass with hover lift */
.btn-primary         /* ink background, white text, rounded-full */
.btn-ghost           /* transparent with border */
.skeleton            /* animated loading placeholder */
```

Icons are a **local inline set** in `components/icons.tsx` (Lucide-derived, `currentColor`). No external icon library is imported — keeps the bundle lean and the icon style consistent.

---

## Live Stats

| Metric | Value |
|--------|-------|
| Issues reported | 18 |
| AI-verified resolved | 7 (39%) |
| Duplicates auto-merged | 81 |
| Staff-hours saved | ~24h (15m/triage + 12m/dedup + 20m/complaint) |
| Active departments | 5 |
| SLA breaches predicted | 5 |
| Categories | Pothole · Water Leak · Streetlight · Waste · Other |
| Severity breakdown | Sev 5: 3 · Sev 4: 6 · Sev 3: 6 · Sev 2: 3 |

---

<div align="center">

**Built for India's 500M WhatsApp users — one photo is all it takes.**

[Report an issue](https://urbanpulse-h2uigix6dq-el.a.run.app/report) · [Command Center](https://urbanpulse-h2uigix6dq-el.a.run.app/command) · [Dashboard](https://urbanpulse-h2uigix6dq-el.a.run.app/dashboard) · [Admin Board](https://urbanpulse-h2uigix6dq-el.a.run.app/admin)

</div>
