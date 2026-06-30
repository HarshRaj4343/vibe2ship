import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type GenerateContentResult,
} from '@google/generative-ai';
import type {
  IssueAnalysis,
  ResolutionVerification,
  ComplaintDraft,
  CityBriefing,
  VoiceTranscription,
} from './types';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  // Surface the misconfiguration loudly during server start / first call.
  console.warn('[gemini] GEMINI_API_KEY is not set — analysis calls will fail.');
}

const genAI = new GoogleGenerativeAI(apiKey ?? '');

/**
 * A model call failed because we hit Gemini's free-tier quota / rate limit.
 * Carries an optional `retryAfterMs` (from the server's RetryInfo) so the API
 * route can tell the user how long to wait. Routes map this to HTTP 429 rather
 * than a generic 500, so "judges hammering the demo" degrades gracefully.
 */
export class GeminiQuotaError extends Error {
  retryAfterMs?: number;
  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'GeminiQuotaError';
    this.retryAfterMs = retryAfterMs;
  }
}

/** True for transient overload / rate-limit / quota responses worth retrying. */
function isTransient(msg: string): boolean {
  return /\b(503|429|500)\b|overload|high demand|unavailable|rate|quota/i.test(msg);
}

function isQuota(msg: string): boolean {
  return /\b429\b|quota|rate.?limit|resource.?exhausted/i.test(msg);
}

function suggestedDelayMs(msg: string): number {
  const m = msg.match(/retry(?:Delay)?["':\s]+(\d+(?:\.\d+)?)s/i);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) : 0;
}

/**
 * Wraps a single `model.generateContent(...)` with bounded exponential backoff.
 * Gemini Flash intermittently returns 503/429 under load; without this a single
 * blip would surface as a broken UI. After exhausting retries on a quota error,
 * throws a typed `GeminiQuotaError` so routes can respond with 429 + Retry-After.
 */
async function generateWithRetry(
  model: GenerativeModel,
  parts: Parameters<GenerativeModel['generateContent']>[0],
  maxRetries = 3,
): Promise<GenerateContentResult> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(parts);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!isTransient(msg) || attempt === maxRetries) {
        if (isQuota(msg)) {
          throw new GeminiQuotaError(
            'The AI is busy right now (free-tier limit). Try again in a few seconds.',
            suggestedDelayMs(msg) || undefined,
          );
        }
        throw err;
      }
      const backoff = Math.min(
        Math.max(suggestedDelayMs(msg), 700 * 2 ** attempt),
        20_000,
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}

/**
 * Runs the 4-step civic-issue agent pipeline over a single uploaded photo.
 *
 *   STEP 1 — VALIDATE    is this a real, reportable civic issue?
 *   STEP 2 — CATEGORIZE  pothole / water_leak / streetlight / waste / other
 *   STEP 3 — SEVERITY    1–5 + direct safety-risk flag
 *   STEP 4 — ROUTING     which government department should handle it
 *
 * Returns a strongly-typed IssueAnalysis. Throws on network / parse failure so
 * the calling API route can convert it into a user-friendly error.
 */
// gemini-1.5-flash was retired by Google (returns 404). Default to a current
// vision-capable Flash model; override with GEMINI_MODEL if needed.
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function analyzeIssue(
  imageBase64: string,
  mimeType: string,
  userDescription?: string,
): Promise<IssueAnalysis> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
You are an AI agent for a civic issue reporting system. A citizen has uploaded a photo of a potential community problem.

Analyze this image and perform ALL FOUR steps. Return ONLY valid JSON — no markdown, no explanation outside the JSON.

STEP 1 — VALIDATE: Is this a real, reportable civic infrastructure issue visible in the image?
- Valid issues: potholes, road damage, water leaks/flooding, broken streetlights, illegal waste dumps, damaged public property
- Invalid: personal disputes, indoor problems, unclear/blurry images with no visible issue, spam

STEP 2 — CATEGORIZE: What type of civic issue is this?
- Categories: pothole, water_leak, streetlight, waste, other
- Include which government department should handle it

STEP 3 — SEVERITY: How severe is this issue on a scale of 1–5?
- 1: Minor inconvenience, no immediate danger
- 2: Moderate issue, needs attention within weeks
- 3: Significant issue, needs attention within days
- 4: Serious issue, needs urgent attention within 24h
- 5: Critical safety hazard, immediate action required
- Also flag if there is a direct safety risk to people

STEP 4 — ROUTING: Which specific department should handle this?
- Road/PWD Department → potholes, road damage
- Water & Sanitation Dept → water leaks, drainage
- Electricity Department → streetlights, power issues
- Waste Management Dept → garbage, illegal dumping
- Municipal Corporation → other infrastructure

${userDescription ? `Citizen's description: "${userDescription}"` : ''}

Return this exact JSON structure:
{
  "isValid": true,
  "category": "pothole",
  "confidence": 0.95,
  "severity": 4,
  "safetyRisk": false,
  "routeTo": "Road/PWD Department",
  "reasoning": "Large pothole approximately 2 feet wide visible in the center of the road. Poses risk to vehicle tires and cyclists. Requires urgent repair.",
  "suggestedTitle": "Large pothole on main road",
  "rejectionReason": null
}

If isValid is false, still return the full JSON but set category to "other", severity to 1, and explain the rejection in rejectionReason.
`;

  const result = await generateWithRetry(model, [
    prompt,
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const text = result.response.text();
  const clean = text.replace(/```json|```/g, '').trim();

  let parsed: IssueAnalysis;
  try {
    parsed = JSON.parse(clean) as IssueAnalysis;
  } catch {
    throw new Error(
      `Gemini returned non-JSON output that could not be parsed: ${clean.slice(0, 200)}`,
    );
  }

  return normalizeAnalysis(parsed);
}

/**
 * Defensive clamping/normalization so a slightly off-spec model response never
 * propagates invalid values (e.g. severity 7, confidence 1.4) into Firestore.
 */
function normalizeAnalysis(a: IssueAnalysis): IssueAnalysis {
  const validCategories: IssueAnalysis['category'][] = [
    'pothole',
    'water_leak',
    'streetlight',
    'waste',
    'other',
  ];

  return {
    isValid: Boolean(a.isValid),
    category: validCategories.includes(a.category) ? a.category : 'other',
    confidence: clamp(Number(a.confidence) || 0, 0, 1),
    severity: clamp(Math.round(Number(a.severity) || 1), 1, 5),
    safetyRisk: Boolean(a.safetyRisk),
    routeTo: a.routeTo || 'Municipal Corporation',
    reasoning: a.reasoning || '',
    suggestedTitle: a.suggestedTitle || 'Reported civic issue',
    rejectionReason: a.rejectionReason ?? null,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Split a `data:image/jpeg;base64,...` URL into its mime + base64 parts. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:(.+?);base64,(.*)$/s.exec(dataUrl);
  if (!match) {
    // Assume it's already raw base64 JPEG.
    return { mimeType: 'image/jpeg', data: dataUrl };
  }
  return { mimeType: match[1], data: match[2] };
}

function parseJson<T>(text: string): T {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    throw new Error(
      `Gemini returned non-JSON output that could not be parsed: ${clean.slice(0, 200)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// SELF-CORRECTION — critique a low-confidence categorization
// Re-examines the photo and skeptically challenges the agent's own category /
// severity, returning a possibly-revised verdict. Used by the intake agent's
// critique_analysis tool when its confidence is low.
// ---------------------------------------------------------------------------
export interface AnalysisCritique {
  category: IssueAnalysis['category'];
  severity: number;
  safetyRisk: boolean;
  confidence: number;
  reasoning: string;
  changed: boolean; // did the critique revise the original verdict?
}

export async function critiqueAnalysis(
  imageBase64: string,
  mimeType: string,
  current: {
    category: string;
    severity: number;
    safetyRisk: boolean;
    reasoning?: string;
  },
): Promise<AnalysisCritique> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
You are a skeptical reviewer auditing another AI's analysis of a civic-issue photo.
The first-pass analysis was:
- category: ${current.category}
- severity (1-5): ${current.severity}
- safetyRisk: ${current.safetyRisk}
- reasoning: ${current.reasoning ?? 'n/a'}

Re-examine the photo independently. Challenge the categorization and severity.
Could it be a different category? Is the severity over- or under-stated? Decide
the most defensible verdict.

Categories: pothole, water_leak, streetlight, waste, other.

Return ONLY valid JSON, no markdown:
{
  "category": "pothole",
  "severity": 4,
  "safetyRisk": true,
  "confidence": 0.9,
  "reasoning": "what you concluded and why it differs from or confirms the first pass",
  "changed": false
}`;

  const result = await generateWithRetry(model, [
    prompt,
    { inlineData: { mimeType, data: imageBase64 } },
  ]);

  const validCategories: IssueAnalysis['category'][] = [
    'pothole',
    'water_leak',
    'streetlight',
    'waste',
    'other',
  ];
  const p = parseJson<AnalysisCritique>(result.response.text());
  return {
    category: validCategories.includes(p.category) ? p.category : 'other',
    severity: clamp(Math.round(Number(p.severity) || current.severity), 1, 5),
    safetyRisk: Boolean(p.safetyRisk),
    confidence: clamp(Number(p.confidence) || 0, 0, 1),
    reasoning: p.reasoning || '',
    changed: Boolean(p.changed),
  };
}

// ---------------------------------------------------------------------------
// AGENT 2 — Resolution Verification
// Compares the original "before" photo with a citizen-uploaded "after" photo
// and autonomously decides whether the civic issue has actually been fixed.
// ---------------------------------------------------------------------------
export async function verifyResolution(
  beforeImage: string, // data URL
  afterImage: string, // data URL
  issueTitle: string,
  category: string,
): Promise<Omit<ResolutionVerification, 'afterImageUrl' | 'verifiedAt'>> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const before = parseDataUrl(beforeImage);
  const after = parseDataUrl(afterImage);

  const prompt = `
You are a civic resolution-verification agent. You are given TWO photos of the
same location: the FIRST is the originally reported problem ("before"), the
SECOND is a follow-up photo claiming the problem is now fixed ("after").

The reported issue was: "${issueTitle}" (category: ${category}).

Carefully compare the two images. Decide whether the issue has genuinely been
resolved. Be skeptical — a different angle, lighting, or an unrelated photo does
NOT count as resolved. Only confirm if the specific problem is clearly gone.

Return ONLY valid JSON, no markdown:
{
  "isResolved": true,
  "confidence": 0.9,
  "verdict": "Confirmed fixed",
  "reasoning": "The pothole visible in the before image has been filled and the road surface is now even in the after image.",
  "remainingIssues": "none"
}`;

  const result = await generateWithRetry(model, [
    prompt,
    { inlineData: { mimeType: before.mimeType, data: before.data } },
    { inlineData: { mimeType: after.mimeType, data: after.data } },
  ]);

  const p = parseJson<ResolutionVerification>(result.response.text());
  return {
    isResolved: Boolean(p.isResolved),
    confidence: clamp(Number(p.confidence) || 0, 0, 1),
    verdict: p.verdict || (p.isResolved ? 'Confirmed fixed' : 'Not yet resolved'),
    reasoning: p.reasoning || '',
    remainingIssues: p.remainingIssues || 'none',
  };
}

// ---------------------------------------------------------------------------
// AGENT 3 — Official Complaint Drafting
// Turns a triaged issue into a formal complaint letter addressed to the routed
// department, ready to send.
// ---------------------------------------------------------------------------
export async function draftComplaint(issue: {
  title: string;
  description: string;
  category: string;
  severity: number;
  assignedDept: string;
  reasoning: string;
  referenceId: string;
}): Promise<Pick<ComplaintDraft, 'subject' | 'body'>> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
You are drafting a formal civic complaint on behalf of a concerned citizen, to be
sent to a government department.

Issue details:
- Title: ${issue.title}
- Category: ${issue.category}
- Severity (1-5): ${issue.severity}
- Department: ${issue.assignedDept}
- AI assessment: ${issue.reasoning}
- Citizen notes: ${issue.description || 'none'}
- Reference ID: ${issue.referenceId}

Write a concise, professional complaint letter (120–180 words). It must be
polite but firm, state the problem and its public-safety impact, request action
within a reasonable timeframe based on severity, and cite the reference ID.

Return ONLY valid JSON, no markdown:
{
  "subject": "Complaint: <short subject line>",
  "body": "<the full letter, with line breaks as \\n>"
}`;

  const result = await generateWithRetry(model, prompt);
  const p = parseJson<{ subject: string; body: string }>(result.response.text());
  return {
    subject: p.subject || `Civic complaint: ${issue.title}`,
    body: p.body || '',
  };
}

// ---------------------------------------------------------------------------
// AGENT 4 — City Command Center Briefing
// Reasons over ALL currently-open issues and produces a prioritized municipal
// action plan, hotspot clusters, and per-department load.
// ---------------------------------------------------------------------------
export async function generateBriefing(
  issues: Array<{
    id: string;
    title: string;
    category: string;
    severity: number;
    status: string;
    upvoteCount: number;
    safetyRisk: boolean;
    assignedDept: string;
    area: string;
  }>,
): Promise<Omit<CityBriefing, 'generatedAt'>> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const compact = issues
    .map(
      (i) =>
        `- id=${i.id} | ${i.title} | ${i.category} | sev ${i.severity} | ${i.status} | ${i.upvoteCount} upvotes${i.safetyRisk ? ' | SAFETY RISK' : ''} | dept=${i.assignedDept} | area=${i.area}`,
    )
    .join('\n');

  const prompt = `
You are the AI operations chief for a city's civic maintenance command center.
Below is the full list of currently open civic issues. Reason across ALL of them
and produce a prioritized action plan for today.

Prioritize by: direct safety risk first, then severity, then community demand
(upvotes), then clustering (multiple issues in the same area = escalate).

Issues:
${compact}

Return ONLY valid JSON, no markdown:
{
  "summary": "2-3 sentence situational overview for the city manager.",
  "topActions": [
    { "issueId": "<id>", "title": "<title>", "priority": 1, "reason": "<why this first>" }
  ],
  "hotspots": [
    { "area": "<area>", "count": 3, "note": "<why this cluster matters>" }
  ],
  "departmentLoad": [
    { "department": "<dept>", "open": 4 }
  ]
}
Limit topActions to the 5 most urgent.`;

  const result = await generateWithRetry(model, prompt);
  const p = parseJson<CityBriefing>(result.response.text());
  return {
    summary: p.summary || 'No open issues to brief on.',
    topActions: Array.isArray(p.topActions) ? p.topActions.slice(0, 5) : [],
    hotspots: Array.isArray(p.hotspots) ? p.hotspots : [],
    departmentLoad: Array.isArray(p.departmentLoad) ? p.departmentLoad : [],
  };
}

// ---------------------------------------------------------------------------
// VOICE / MULTIMODAL — transcribe a spoken civic report (audio in → text out)
// Uses Gemini's native audio understanding so a citizen can *speak* the issue
// (in Hindi or English). Returns the verbatim transcript plus an English
// rendering the rest of the pipeline (analyze / draftComplaint) can consume.
// ---------------------------------------------------------------------------
export async function transcribeVoiceReport(
  audioBase64: string,
  mimeType: string,
): Promise<VoiceTranscription> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
You are the voice intake for a civic issue reporting app used in India. The
attached audio is a citizen describing a community problem (pothole, water leak,
broken streetlight, garbage, etc.), most likely in Hindi or English.

Transcribe it, then return ONLY valid JSON — no markdown, no commentary:
{
  "transcript": "<verbatim transcription in the language actually spoken>",
  "english": "<a clean English version of what they said; if already English, repeat the transcript>",
  "language": "<the language spoken, e.g. Hindi, English, Hinglish>"
}

Keep "english" concise and report-like (what the issue is and where), suitable
for filing. If the audio is empty or unintelligible, return empty strings and
language "unknown".`;

  const result = await generateWithRetry(model, [
    { text: prompt },
    { inlineData: { mimeType, data: audioBase64 } },
  ]);

  const p = parseJson<VoiceTranscription>(result.response.text());
  const transcript = (p.transcript || '').trim();
  const english = (p.english || transcript).trim();
  return {
    transcript,
    english,
    language: (p.language || 'unknown').trim(),
  };
}
