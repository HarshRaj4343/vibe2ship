import {
  geohashForLocation,
  geohashQueryBounds,
  distanceBetween,
} from 'geofire-common';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { IssueCategory } from './types';

/** Encode a coordinate pair into a geohash for storage on the issue doc. */
export function getGeohash(lat: number, lng: number): string {
  return geohashForLocation([lat, lng]);
}

/**
 * STEP of the agent's deduplication: look for an existing, unresolved issue of
 * the same category within `radiusKm` of the new report. Firestore has no
 * native radius query, so we query by geohash bounds then filter by exact
 * great-circle distance.
 *
 * @returns the id of an existing duplicate issue, or null if none found.
 */
export async function findDuplicateIssue(
  lat: number,
  lng: number,
  category: IssueCategory,
  radiusKm: number = 0.2,
): Promise<string | null> {
  const bounds = geohashQueryBounds([lat, lng], radiusKm * 1000);
  const matchingIssues: Array<{ id: string; lat: number; lng: number }> = [];

  for (const b of bounds) {
    const q = query(
      collection(db, 'issues'),
      where('category', '==', category),
      where('geohash', '>=', b[0]),
      where('geohash', '<=', b[1]),
    );
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as {
        lat: number;
        lng: number;
        status: string;
      };
      // Exclude already-resolved issues from dedupe matching.
      if (data.status !== 'resolved') {
        matchingIssues.push({ id: docSnap.id, lat: data.lat, lng: data.lng });
      }
    });
  }

  // Geohash bounds are approximate — filter to the true radius.
  for (const issue of matchingIssues) {
    const distance = distanceBetween([issue.lat, issue.lng], [lat, lng]);
    if (distance <= radiusKm) {
      return issue.id;
    }
  }

  return null;
}
