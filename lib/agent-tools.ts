import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { findDuplicateIssue } from '@/lib/geo';
import { draftComplaint, critiqueAnalysis } from '@/lib/gemini';
import { awardPoints, createIssueDoc } from '@/lib/server/issues';
import { POINTS } from '@/lib/points';
import type {
  IssueCategory,
  Severity,
  DispatchState,
  ResolutionEstimate,
} from '@/lib/types';

/**
 * The tools the intake agent (lib/agent.ts) can call and chain on its own. Each
 * tool is a Gemini FunctionDeclaration the model sees, paired with a real
 * server-side executor. The model decides the order; we just run what it asks.
 *
 * Tools read shared state (the reporter, GPS, the stored photo, the issue id
 * once created) from an AgentSession so the model never has to pass image data
 * or ids it shouldn't know about through tool arguments.
 */

export interface AgentSession {
  userId: string;
  profile: { name?: string; email?: string };
  lat: number;
  lng: number;
  imageUrl: string; // compressed data URL, persisted on the issue
  description?: string;
  // Mutated as tools run:
  issueId?: string;
  title?: string;
  category?: IssueCategory;
  severity?: Severity;
  assignedDept?: string;
  deduplicated?: boolean;
  reasoning?: string;
  resolutionEstimate?: ResolutionEstimate;
  complaint?: { referenceId: string; subject: string; body: string };
  dispatch?: DispatchState;
}

/** Split a `data:image/...;base64,...` URL into mime + base64. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:(.+?);base64,(.*)$/s.exec(dataUrl);
  if (!match) return { mimeType: 'image/jpeg', data: dataUrl };
  return { mimeType: match[1], data: match[2] };
}

const CATEGORY_ENUM = [
  'pothole',
  'water_leak',
  'streetlight',
  'waste',
  'other',
];

export const agentToolDeclarations: FunctionDeclaration[] = [
  {
    name: 'find_duplicate_issue',
    description:
      'Check whether an unresolved issue of the same category already exists within 200m of the reporter. Always call this BEFORE creating a new issue. If a duplicate exists it is folded in as a community verification and you must NOT create a new issue — instead award verification points to the reporter.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: CATEGORY_ENUM,
          description: 'The civic issue category you determined from the photo.',
        },
      },
      required: ['category'],
    },
  },
  {
    name: 'critique_analysis',
    description:
      'Skeptically re-examine the photo to challenge your own categorization and severity. Call this when your confidence is below 0.7, BEFORE filing. Returns a possibly-revised verdict you should adopt.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: { type: SchemaType.STRING, format: 'enum', enum: CATEGORY_ENUM },
        severity: { type: SchemaType.NUMBER },
        safetyRisk: { type: SchemaType.BOOLEAN },
        reasoning: { type: SchemaType.STRING },
      },
      required: ['category', 'severity', 'safetyRisk'],
    },
  },
  {
    name: 'lookup_resolution_history',
    description:
      'Recall how past issues of this category were resolved: typical resolution time (days) and which department most often fixed them. Use it to inform routing and to set a resolution estimate. Call this for a new (non-duplicate) issue before routing.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: { type: SchemaType.STRING, format: 'enum', enum: CATEGORY_ENUM },
      },
      required: ['category'],
    },
  },
  {
    name: 'route_to_department',
    description:
      'Determine which government department should handle the issue based on its category, severity and safety risk. Call this before creating a new (non-duplicate) issue.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: CATEGORY_ENUM,
        },
        severity: { type: SchemaType.NUMBER, description: '1 to 5' },
        safetyRisk: { type: SchemaType.BOOLEAN },
      },
      required: ['category', 'severity', 'safetyRisk'],
    },
  },
  {
    name: 'create_issue',
    description:
      'File a new civic issue end to end: it persists the issue, auto-drafts a formal complaint letter to the routed department, and queues that complaint for dispatch (pending human approval) — all in one step. Only call this when find_duplicate_issue returned no duplicate. Include your full analysis of the photo.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: 'Short headline for the issue.' },
        category: { type: SchemaType.STRING, format: 'enum', enum: CATEGORY_ENUM },
        severity: { type: SchemaType.NUMBER, description: '1 (minor) to 5 (critical).' },
        confidence: { type: SchemaType.NUMBER, description: '0.0 to 1.0.' },
        safetyRisk: { type: SchemaType.BOOLEAN },
        reasoning: {
          type: SchemaType.STRING,
          description: 'Why you categorized and scored it this way.',
        },
        assignedDept: {
          type: SchemaType.STRING,
          description: 'The department returned by route_to_department.',
        },
        estResolutionDays: {
          type: SchemaType.NUMBER,
          description:
            'Estimated days to resolution from lookup_resolution_history, if available.',
        },
      },
      required: [
        'title',
        'category',
        'severity',
        'confidence',
        'safetyRisk',
        'reasoning',
        'assignedDept',
      ],
    },
  },
  {
    name: 'award_points',
    description:
      "Award civic points to the reporter. Use kind='report' after creating a brand-new issue, or kind='verify' when find_duplicate_issue folded the report into an existing one.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        kind: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['report', 'verify'],
        },
      },
      required: ['kind'],
    },
  },
];

/** Deterministic department routing — extracted from the original prompt. */
function departmentFor(category: string): string {
  switch (category) {
    case 'pothole':
      return 'Road/PWD Department';
    case 'water_leak':
      return 'Water & Sanitation Dept';
    case 'streetlight':
      return 'Electricity Department';
    case 'waste':
      return 'Waste Management Dept';
    default:
      return 'Municipal Corporation';
  }
}

const VALID_CATEGORIES = CATEGORY_ENUM as IssueCategory[];

function clampSeverity(n: unknown): Severity {
  const v = Math.min(Math.max(Math.round(Number(n) || 1), 1), 5);
  return v as Severity;
}

type ToolArgs = Record<string, unknown>;

/**
 * The executor map. Each returns a JSON-serializable result that is fed back to
 * the model as the tool's functionResponse.
 */
export const agentToolExecutors: Record<
  string,
  (args: ToolArgs, session: AgentSession) => Promise<Record<string, unknown>>
> = {
  async find_duplicate_issue(args, session) {
    const category = (
      VALID_CATEGORIES.includes(args.category as IssueCategory)
        ? args.category
        : 'other'
    ) as IssueCategory;

    const duplicateId = await findDuplicateIssue(
      session.lat,
      session.lng,
      category,
      0.2,
    );

    if (duplicateId) {
      // Mirror the classic route: fold the report in as a verification.
      await updateDoc(doc(db, 'issues', duplicateId), {
        verifiedCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      session.deduplicated = true;
      session.issueId = duplicateId;
      return {
        duplicateFound: true,
        duplicateId,
        instruction:
          "An existing nearby report was found and this report was folded in as a verification. Do NOT create a new issue. Award the reporter points with kind='verify', then finish.",
      };
    }

    return {
      duplicateFound: false,
      instruction:
        'No duplicate found. Proceed to route_to_department, then create_issue.',
    };
  },

  async critique_analysis(args, session) {
    const critique = await critiqueAnalysis(
      parseDataUrl(session.imageUrl).data,
      parseDataUrl(session.imageUrl).mimeType,
      {
        category: String(args.category ?? 'other'),
        severity: Number(args.severity) || 1,
        safetyRisk: Boolean(args.safetyRisk),
        reasoning: typeof args.reasoning === 'string' ? args.reasoning : undefined,
      },
    );
    return {
      revisedCategory: critique.category,
      revisedSeverity: critique.severity,
      safetyRisk: critique.safetyRisk,
      confidence: critique.confidence,
      changed: critique.changed,
      verdict: critique.changed
        ? 'Revised the original analysis.'
        : 'Confirmed the original analysis.',
      reasoning: critique.reasoning,
    };
  },

  async lookup_resolution_history(args, session) {
    const category = (
      VALID_CATEGORIES.includes(args.category as IssueCategory)
        ? args.category
        : 'other'
    ) as IssueCategory;

    // Pull resolved issues and filter by category in memory (resolved set is
    // small; avoids needing a new composite index).
    const snap = await getDocs(
      query(collection(db, 'issues'), where('status', '==', 'resolved')),
    );

    const durationsDays: number[] = [];
    const deptCounts: Record<string, number> = {};
    snap.forEach((d) => {
      const data = d.data() as {
        category?: string;
        assignedDept?: string;
        createdAt?: Timestamp;
        updatedAt?: Timestamp;
      };
      if (data.category !== category) return;
      if (data.assignedDept) {
        deptCounts[data.assignedDept] = (deptCounts[data.assignedDept] ?? 0) + 1;
      }
      const created = data.createdAt?.toMillis?.();
      const updated = data.updatedAt?.toMillis?.();
      if (created && updated && updated > created) {
        durationsDays.push((updated - created) / 86_400_000);
      }
    });

    const sampleSize = durationsDays.length;
    const avgDays =
      sampleSize > 0
        ? Math.max(1, Math.round(durationsDays.reduce((a, b) => a + b, 0) / sampleSize))
        : null;
    const suggestedDept =
      Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    if (avgDays != null) {
      session.resolutionEstimate = {
        etaDays: avgDays,
        sampleSize,
        basis: `avg of ${sampleSize} resolved ${category} issue${sampleSize === 1 ? '' : 's'}`,
      };
    }

    return {
      category,
      resolvedSampleSize: sampleSize,
      avgResolutionDays: avgDays,
      suggestedDept,
      note:
        sampleSize > 0
          ? `Similar ${category} issues took ~${avgDays} day(s); usually handled by ${suggestedDept ?? 'n/a'}.`
          : `No resolved ${category} issues on record yet — no estimate available.`,
    };
  },

  async route_to_department(args, session) {
    const category = String(args.category ?? 'other');
    const department = departmentFor(category);
    session.assignedDept = department;
    return { department };
  },

  async create_issue(args, session) {
    const category = (
      VALID_CATEGORIES.includes(args.category as IssueCategory)
        ? args.category
        : 'other'
    ) as IssueCategory;
    const severity = clampSeverity(args.severity);
    const reasoning = String(args.reasoning ?? '');
    const assignedDept =
      String(args.assignedDept ?? '') ||
      session.assignedDept ||
      departmentFor(category);

    const title = String(args.title ?? 'Reported civic issue');
    session.reasoning = reasoning;
    session.assignedDept = assignedDept;
    session.title = title;
    session.category = category;
    session.severity = severity;

    // Prefer the estimate from lookup_resolution_history (stored on the
    // session); otherwise fall back to a value the model passed directly.
    let resolutionEstimate = session.resolutionEstimate;
    if (!resolutionEstimate && Number(args.estResolutionDays) > 0) {
      resolutionEstimate = {
        etaDays: Math.round(Number(args.estResolutionDays)),
        sampleSize: 0,
        basis: 'agent estimate',
      };
    }

    const issueId = await createIssueDoc({
      title,
      description: session.description ?? '',
      category,
      severity,
      imageUrl: session.imageUrl,
      lat: session.lat,
      lng: session.lng,
      reportedBy: session.userId,
      assignedDept,
      aiAnalysis: {
        isValid: true,
        confidence: Math.min(Math.max(Number(args.confidence) || 0, 0), 1),
        severity,
        safetyRisk: Boolean(args.safetyRisk),
        reasoning,
        routeTo: assignedDept,
      },
    });
    session.issueId = issueId;

    // --- Auto-draft the complaint and queue it for dispatch (server-side, so
    // the whole tail is one model round-trip — keeps us within the free-tier
    // request budget). The agent trace still surfaces these as their own steps.
    const referenceId = `CH-${new Date().getFullYear()}-${issueId
      .slice(0, 4)
      .toUpperCase()}`;
    const drafted = await draftComplaint({
      title,
      description: session.description ?? '',
      category,
      severity,
      assignedDept,
      reasoning,
      referenceId,
    });
    const complaint = {
      referenceId,
      department: assignedDept,
      subject: drafted.subject,
      body: drafted.body,
      generatedAt: Date.now(),
    };
    session.complaint = {
      referenceId,
      subject: drafted.subject,
      body: drafted.body,
    };

    const dispatch: DispatchState = {
      status: 'queued',
      queuedAt: Date.now(),
      complaintRef: referenceId,
    };
    session.dispatch = dispatch;

    await updateDoc(doc(db, 'issues', issueId), {
      complaint,
      dispatch,
      updatedAt: serverTimestamp(),
      ...(resolutionEstimate ? { resolutionEstimate } : {}),
    });

    return {
      issueId,
      assignedDept,
      complaintRef: referenceId,
      complaintSubject: drafted.subject,
      dispatchStatus: 'queued',
      ...(resolutionEstimate ? { estResolutionDays: resolutionEstimate.etaDays } : {}),
    };
  },

  async award_points(args, session) {
    const kind = args.kind === 'verify' ? 'verify' : 'report';
    const base = kind === 'verify' ? POINTS.VERIFY_ISSUE : POINTS.REPORT_ISSUE;
    const result = await awardPoints(session.userId, base, kind, session.profile);
    return {
      pointsAwarded: result.points,
      newBadges: result.newBadges,
    };
  },
};
