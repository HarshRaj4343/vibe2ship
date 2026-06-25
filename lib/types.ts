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
