import type { Timestamp } from 'firebase/firestore';

export type IssueCategory =
  | 'pothole'
  | 'water_leak'
  | 'streetlight'
  | 'waste'
  | 'other';

export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export type Severity = 1 | 2 | 3 | 4 | 5;

/**
 * The structured result returned by the Gemini 4-step agent pipeline.
 * This is the raw shape parsed directly from the model's JSON output.
 */
export interface IssueAnalysis {
  isValid: boolean;
  category: IssueCategory;
  confidence: number; // 0.0 – 1.0
  severity: number; // 1 – 5
  safetyRisk: boolean;
  routeTo: string;
  reasoning: string;
  suggestedTitle: string;
  rejectionReason: string | null;
}

/**
 * The aiAnalysis sub-document persisted onto each issue in Firestore.
 */
export interface StoredAiAnalysis {
  isValid: boolean;
  confidence: number;
  severity: number;
  safetyRisk: boolean;
  reasoning: string;
  routeTo: string;
  rejectionReason?: string;
}

/**
 * Result of the Resolution Verification Agent comparing a before/after photo
 * to confirm an issue was actually fixed.
 */
export interface ResolutionVerification {
  isResolved: boolean;
  confidence: number; // 0.0 – 1.0
  verdict: string; // short headline, e.g. "Confirmed fixed"
  reasoning: string; // what changed between before and after
  remainingIssues: string; // anything still not addressed
  afterImageUrl: string; // the uploaded "after" photo (data URL)
  verifiedAt: number; // epoch millis
}

/** A formal complaint letter auto-drafted by the agent for the routed dept. */
export interface ComplaintDraft {
  referenceId: string; // e.g. CH-2026-0042
  department: string;
  subject: string;
  body: string; // the full letter text
  generatedAt: number;
}

/** One ranked action in the Command Center daily briefing. */
export interface BriefingAction {
  issueId: string;
  title: string;
  priority: number; // 1 = highest
  reason: string;
}

/** The agent's reasoning over ALL open issues, for the municipal command center. */
export interface CityBriefing {
  summary: string;
  topActions: BriefingAction[];
  hotspots: Array<{ area: string; count: number; note: string }>;
  departmentLoad: Array<{ department: string; open: number }>;
  generatedAt: number;
}

/**
 * One entry in the agent's reasoning trace. The intake agent (lib/agent.ts)
 * emits these as it thinks, calls a tool, and reads the result, so the chain of
 * reasoning can be streamed live and persisted onto the issue for later replay.
 */
export type AgentStepKind =
  | 'thought' // the model reasoning before/after an action
  | 'tool_call' // the model decided to invoke a tool
  | 'tool_result' // the result returned to the model
  | 'decision' // a branch the agent took (e.g. duplicate vs new)
  | 'final' // the agent's closing summary
  | 'error'; // a step that failed

export interface AgentStep {
  id: string;
  kind: AgentStepKind;
  title: string;
  detail?: string;
  tool?: string; // tool name for tool_call / tool_result
  args?: unknown; // arguments the model passed to the tool
  result?: unknown; // value the tool returned
  status: 'running' | 'done' | 'error';
  at: number; // epoch millis
}

/**
 * The human-in-the-loop dispatch checkpoint. The autonomous loop drafts a
 * complaint and queues it; a human approves before it is "dispatched" to the
 * department.
 */
/**
 * Lightweight agent "memory": an estimate of how long this issue will take to
 * resolve, derived from past resolved issues of the same category.
 */
export interface ResolutionEstimate {
  etaDays: number;
  basis: string; // human-readable explanation, e.g. "avg of 4 resolved potholes"
  sampleSize: number;
}

export interface DispatchState {
  status: 'queued' | 'approved' | 'rejected' | 'dispatched';
  complaintRef?: string; // the complaint reference id
  queuedAt: number;
  decidedAt?: number;
  decidedBy?: string; // uid of the approver
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: Severity;
  status: IssueStatus;
  imageUrl: string;
  lat: number;
  lng: number;
  geohash: string; // for geo-radius queries via geofire-common
  upvoteCount: number;
  verifiedCount: number;
  reportedBy: string; // userId
  assignedDept: string; // auto-assigned by AI
  aiAnalysis: StoredAiAnalysis;
  resolution?: ResolutionVerification; // set when AI-verified as fixed
  complaint?: ComplaintDraft; // set when a complaint letter is drafted
  agentTrace?: AgentStep[]; // set when created via the autonomous agent (/agent)
  dispatch?: DispatchState; // human-approval checkpoint for complaint dispatch
  resolutionEstimate?: ResolutionEstimate; // agent memory: ETA from past issues
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Issue shape after serialization for client transport (Timestamps -> millis).
 */
export interface SerializedIssue extends Omit<Issue, 'createdAt' | 'updatedAt'> {
  createdAt: number;
  updatedAt: number;
}

export interface Badge {
  id: string;
  name: string; // e.g. "First Report", "Civic Champion"
  awardedAt: Timestamp;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  points: number;
  badges: Badge[];
  issuesReported: number;
  issuesVerified: number;
  createdAt: Timestamp;
}

export interface Upvote {
  id: string;
  issueId: string;
  userId: string;
  createdAt: Timestamp;
}

/** Payload accepted by POST /api/issues when creating a new issue. */
export interface CreateIssuePayload {
  title: string;
  description: string;
  category: IssueCategory;
  severity: Severity;
  imageUrl: string;
  lat: number;
  lng: number;
  reportedBy: string;
  reporterName?: string;
  reporterEmail?: string;
  assignedDept: string;
  aiAnalysis: StoredAiAnalysis;
}

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  pothole: 'Pothole',
  water_leak: 'Water Leak',
  streetlight: 'Streetlight',
  waste: 'Waste',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<IssueCategory, string> = {
  pothole: '#F97316', // orange
  water_leak: '#3B82F6', // blue
  streetlight: '#EAB308', // yellow
  waste: '#22C55E', // green
  other: '#6B7280', // gray
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};
