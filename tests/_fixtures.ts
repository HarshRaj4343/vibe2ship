import type { SerializedIssue } from '@/lib/types';

const DAY_MS = 86_400_000;

/**
 * Build a SerializedIssue with sensible defaults, overridable per field. Lets
 * each test state only the fields it cares about (severity, status, ages…).
 */
export function makeIssue(over: Partial<SerializedIssue> = {}): SerializedIssue {
  const created = over.createdAt ?? Date.now() - DAY_MS;
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Test issue',
    description: 'A test civic issue',
    category: 'pothole',
    status: 'open',
    severity: 3,
    lat: 25.24,
    lng: 86.99,
    geohash: 'tumze2gt8j',
    imageUrl: '',
    reportedBy: 'test_user',
    assignedDept: 'Road/PWD Department',
    upvoteCount: 0,
    verifiedCount: 0,
    createdAt: created,
    updatedAt: over.updatedAt ?? created,
    // aiAnalysis is optional in most pure-logic paths; cast keeps the fixture lean.
    ...over,
  } as SerializedIssue;
}

/** Helper: a timestamp `days` in the past from `now`. */
export function daysAgo(days: number, now = Date.now()): number {
  return now - days * DAY_MS;
}
