/**
 * Seeds Firestore with demo issues + citizens for the judging demo.
 *
 *   npm run seed
 *
 * Loads credentials from .env.local (Node's --env-file, see package.json).
 * Uses the Firebase *client* SDK, so your Firestore rules must allow writes
 * (the dev rules in firestore.rules do). Safe to re-run — it clears the
 * issues/users/upvotes collections it manages first.
 *
 * Locale: Bhagalpur, Bihar — localities and roads are real so the impact
 * numbers on /dashboard and /admin feel plausible for the city.
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error('✗ Missing Firebase config. Did you fill in .env.local?');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Centered on Bhagalpur, Bihar (near Tilkamanjhi / Station Chowk).
const CENTER = { lat: 25.2445, lng: 86.9842 };
const jitter = (d = 0.03) => (Math.random() - 0.5) * d;
const DAY_MS = 86_400_000;
const daysAgo = (n) => Timestamp.fromDate(new Date(Date.now() - n * DAY_MS));
const millisAgo = (n) => Date.now() - n * DAY_MS;

const DEPT_FOR = {
  pothole: 'Road/PWD Department',
  water_leak: 'Water & Sanitation Dept',
  streetlight: 'Electricity Department',
  waste: 'Waste Management Dept',
  other: 'Municipal Corporation',
};

const DEMO_USERS = [
  { id: 'demo_asha', name: 'Asha Verma', points: 165, issuesReported: 11, issuesVerified: 5 },
  { id: 'demo_rohan', name: 'Rohan Kumar', points: 110, issuesReported: 6, issuesVerified: 7 },
  { id: 'demo_priya', name: 'Priya Sinha', points: 80, issuesReported: 4, issuesVerified: 9 },
  { id: 'demo_imran', name: 'Imran Ansari', points: 45, issuesReported: 3, issuesVerified: 2 },
  { id: 'demo_neha', name: 'Neha Choudhary', points: 60, issuesReported: 3, issuesVerified: 6 },
];

const BADGE_FOR = (reported, verified) => {
  const b = [];
  if (reported >= 1) b.push({ id: 'first_report', name: 'First Report', awardedAt: daysAgo(22) });
  if (reported >= 10) b.push({ id: 'civic_hero', name: 'Civic Hero', awardedAt: daysAgo(6) });
  if (verified >= 8) b.push({ id: 'verifier', name: 'Verified Verifier', awardedAt: daysAgo(4) });
  return b;
};

// Topical photos via loremflickr — real keyword-matched images that always
// render and are deterministic (the `lock` makes each URL return a fixed photo).
// `kw` = the problem photo; `afterKw` = the fixed-state photo for resolved issues.
const img = (kw, lock) =>
  `https://loremflickr.com/800/600/${encodeURIComponent(kw)}?lock=${lock}`;

// Default "problem" keyword per category (overridable per issue with `kw`).
const BEFORE_KW = {
  pothole: 'pothole,road',
  water_leak: 'sewage,drain',
  streetlight: 'streetlight',
  waste: 'garbage,trash',
  other: 'road',
};

const DEMO_ISSUES = [
  // --- Open / overdue (drive the SLA board) -------------------------------
  {
    title: 'Large pothole on NH-80 near Zero Mile',
    description: 'Deep crater on the national highway, trucks braking hard and two-wheelers swerving into oncoming lane.',
    category: 'pothole', severity: 5, status: 'open', safetyRisk: true,
    reportedBy: 'demo_asha', created: 9, upvotes: 24, verified: 7, complaint: true,
  },
  {
    title: 'Crater-sized pothole at Tilkamanjhi Chowk',
    description: 'Pothole right at the busy crossing, autos getting stuck during peak hours.',
    category: 'pothole', severity: 4, status: 'open', safetyRisk: true,
    reportedBy: 'demo_rohan', created: 5, upvotes: 16, verified: 5, complaint: true,
  },
  {
    title: 'Sinking road near Sabour bypass',
    description: 'Road surface caving in after the rains, hazardous for cyclists at night.',
    category: 'pothole', severity: 3, status: 'in_progress', safetyRisk: true,
    reportedBy: 'demo_imran', kw: 'damaged,road',
    created: 6, updated: 2, upvotes: 9, verified: 3,
  },
  {
    title: 'Open manhole on Patal Babu Road',
    description: 'Uncovered manhole on a footpath, pedestrians nearly falling in after dark.',
    category: 'other', severity: 4, status: 'open', safetyRisk: true,
    reportedBy: 'demo_priya', kw: 'manhole',
    created: 4, upvotes: 12, verified: 6, complaint: true,
  },
  {
    title: 'Water pipeline burst at Bhikanpur',
    description: 'Drinking-water main ruptured, water gushing onto the road for two days.',
    category: 'water_leak', severity: 4, status: 'open', safetyRisk: false,
    reportedBy: 'demo_neha', kw: 'water,pipe',
    created: 3, upvotes: 14, verified: 8, complaint: true,
  },
  {
    title: 'Sewage overflow near Mayaganj Hospital',
    description: 'Blocked drain overflowing right outside the hospital gate, serious health risk.',
    category: 'water_leak', severity: 5, status: 'in_progress', safetyRisk: true,
    reportedBy: 'demo_asha', kw: 'sewage',
    created: 8, updated: 1, upvotes: 18, verified: 9, complaint: true,
  },
  {
    title: 'Streetlights dark on Jail Road stretch',
    description: 'Entire 300m stretch unlit for over a week, women report feeling unsafe.',
    category: 'streetlight', severity: 3, status: 'open', safetyRisk: false,
    reportedBy: 'demo_rohan', kw: 'streetlight,night',
    created: 7, upvotes: 9, verified: 4,
  },
  {
    title: 'Flickering streetlight at Khalifabag Chowk',
    description: 'Light flickers all night, wiring at the pole base looks exposed.',
    category: 'streetlight', severity: 2, status: 'open', safetyRisk: false,
    reportedBy: 'demo_priya', created: 5, upvotes: 4, verified: 2,
  },
  {
    title: 'Garbage pile-up at Adampur Ghat',
    description: 'Illegal dump growing every day near the ghat, strong stench by the river.',
    category: 'waste', severity: 3, status: 'open', safetyRisk: false,
    reportedBy: 'demo_neha', created: 5, upvotes: 11, verified: 6, complaint: true,
  },
  {
    title: 'Illegal dumping near Champanagar',
    description: 'Construction debris and household waste blocking half the lane.',
    category: 'waste', severity: 2, status: 'in_progress', safetyRisk: false,
    reportedBy: 'demo_imran', kw: 'rubbish,debris',
    created: 10, updated: 3, upvotes: 6, verified: 3,
  },
  {
    title: 'Fallen tree branch near TMBU campus',
    description: 'Large branch down after the storm, blocking one side of the road.',
    category: 'other', severity: 3, status: 'open', safetyRisk: false,
    reportedBy: 'demo_asha', kw: 'fallen,tree',
    created: 3, upvotes: 5, verified: 1,
  },
  {
    title: 'Broken footpath tiles at Lajpat Park',
    description: 'Loose paver tiles near the park entrance, elderly walkers tripping.',
    category: 'other', severity: 2, status: 'open', safetyRisk: false,
    reportedBy: 'demo_priya', kw: 'broken,sidewalk',
    created: 6, upvotes: 3, verified: 1,
  },

  // --- Resolved (before/after gallery + median time-to-resolution) --------
  {
    title: 'Pothole repaired on Station Chowk road',
    description: 'Deep pothole at the chowk patched and resurfaced by PWD.',
    category: 'pothole', severity: 4, status: 'resolved', safetyRisk: true,
    reportedBy: 'demo_asha', kw: 'pothole', afterKw: 'asphalt,road',
    verdict: 'Confirmed fixed',
    reasoning: 'The before photo showed a deep open pothole; the after photo shows the same stretch fully patched and level with fresh asphalt.',
    created: 18, resolved: 14, upvotes: 15, verified: 5, complaint: true,
  },
  {
    title: 'Streetlight restored at Ghantaghar',
    description: 'Dead streetlight at the clock-tower crossing back in service.',
    category: 'streetlight', severity: 3, status: 'resolved', safetyRisk: false,
    reportedBy: 'demo_rohan', kw: 'streetlight', afterKw: 'streetlight,night',
    verdict: 'Confirmed fixed',
    reasoning: 'Before photo showed an unlit pole; after photo shows the lamp working and the crossing well lit at night.',
    created: 21, resolved: 18, upvotes: 7, verified: 3,
  },
  {
    title: 'Drain cleared near Bauna Pokhar',
    description: 'Choked drain causing waterlogging cleared and desilted.',
    category: 'water_leak', severity: 4, status: 'resolved', safetyRisk: true,
    reportedBy: 'demo_neha', kw: 'sewage,drain', afterKw: 'clean,street',
    verdict: 'Confirmed fixed',
    reasoning: 'Before photo showed sewage pooling on the road; after photo shows the drain flowing and the road dry.',
    created: 16, resolved: 12, upvotes: 10, verified: 4, complaint: true,
  },
  {
    title: 'Garbage cleared at Naya Bazar',
    description: 'Market-side waste heap collected and the spot cleaned up.',
    category: 'waste', severity: 3, status: 'resolved', safetyRisk: false,
    reportedBy: 'demo_priya', kw: 'garbage,trash', afterKw: 'clean,street',
    verdict: 'Confirmed fixed',
    reasoning: 'Before photo showed an overflowing garbage pile; after photo shows the area swept clean with a new bin placed.',
    created: 13, resolved: 11, upvotes: 8, verified: 5,
  },
  {
    title: 'Road resurfaced near Barari Path',
    description: 'Badly broken stretch fully resurfaced after repeated reports.',
    category: 'pothole', severity: 5, status: 'resolved', safetyRisk: true,
    reportedBy: 'demo_asha', kw: 'road,construction', afterKw: 'asphalt,highway',
    verdict: 'Confirmed fixed',
    reasoning: 'Before photo showed a rutted, broken road; after photo shows a smooth resurfaced carriageway with fresh lane markings.',
    created: 25, resolved: 23, upvotes: 19, verified: 7, complaint: true,
  },
  {
    title: 'Streetlight pole replaced at Ishakchak',
    description: 'Bent, damaged pole replaced and reconnected.',
    category: 'streetlight', severity: 4, status: 'resolved', safetyRisk: true,
    reportedBy: 'demo_imran', kw: 'streetlight,pole', afterKw: 'streetlight,lamp',
    verdict: 'Confirmed fixed',
    reasoning: 'Before photo showed a fallen pole with exposed wiring; after photo shows a new upright pole with a working lamp.',
    created: 20, resolved: 17, upvotes: 6, verified: 2,
  },
];

async function clearCollection(name) {
  const snap = await getDocs(collection(db, name));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return snap.size;
}

async function main() {
  console.log('▶ Clearing existing demo data…');
  for (const c of ['upvotes', 'issues', 'users']) {
    const n = await clearCollection(c);
    console.log(`  cleared ${n} from ${c}`);
  }

  console.log('▶ Seeding citizens…');
  for (const u of DEMO_USERS) {
    await setDoc(doc(db, 'users', u.id), {
      name: u.name,
      email: `${u.id}@example.com`,
      points: u.points,
      badges: BADGE_FOR(u.issuesReported, u.issuesVerified),
      issuesReported: u.issuesReported,
      issuesVerified: u.issuesVerified,
      createdAt: daysAgo(26),
    });
  }

  console.log('▶ Seeding issues…');
  let complaintSeq = 0;
  let lockSeq = 100; // deterministic, distinct loremflickr photo per image
  for (const i of DEMO_ISSUES) {
    const lat = CENTER.lat + jitter();
    const lng = CENTER.lng + jitter();
    const routeTo = DEPT_FOR[i.category];
    const updated = i.status === 'resolved' ? i.resolved : (i.updated ?? i.created);
    const beforeUrl = img(i.kw ?? BEFORE_KW[i.category], (lockSeq += 1));
    const afterUrl =
      i.status === 'resolved'
        ? img(i.afterKw ?? 'clean,street', (lockSeq += 1))
        : null;

    const docData = {
      title: i.title,
      description: i.description,
      category: i.category,
      severity: i.severity,
      status: i.status,
      imageUrl: beforeUrl,
      lat,
      lng,
      geohash: geohashForLocation([lat, lng]),
      upvoteCount: i.upvotes,
      verifiedCount: i.verified,
      reportedBy: i.reportedBy,
      assignedDept: routeTo,
      aiAnalysis: {
        isValid: true,
        confidence: 0.85 + Math.random() * 0.14,
        severity: i.severity,
        safetyRisk: i.safetyRisk,
        reasoning: `AI assessed this as a ${i.category.replace('_', ' ')} of severity ${i.severity}/5 and routed it to the ${routeTo}.`,
        routeTo,
      },
      createdAt: daysAgo(i.created),
      updatedAt: daysAgo(updated),
    };

    // Drafted complaint letter (feeds the "complaints drafted" impact metric).
    if (i.complaint) {
      complaintSeq += 1;
      const referenceId = `BH-2026-${String(complaintSeq).padStart(4, '0')}`;
      docData.complaint = {
        referenceId,
        department: routeTo,
        subject: `Complaint: ${i.title}`,
        body:
          `To the ${routeTo},\n\n` +
          `This is a formal complaint regarding "${i.title}". ${i.description} ` +
          `The matter has been verified by ${i.verified} nearby resident(s) and is rated severity ${i.severity}/5. ` +
          `We request prompt action and a status update.\n\nReference: ${referenceId}`,
        generatedAt: millisAgo(i.created),
      };
      docData.dispatch = {
        status: i.status === 'resolved' ? 'dispatched' : 'queued',
        complaintRef: referenceId,
        queuedAt: millisAgo(i.created),
        ...(i.status === 'resolved' ? { decidedAt: millisAgo(updated) } : {}),
      };
    }

    // Verified before/after resolution (feeds the proof-of-resolution gallery).
    if (i.status === 'resolved' && afterUrl) {
      docData.resolution = {
        isResolved: true,
        confidence: 0.92,
        verdict: i.verdict ?? 'Confirmed fixed',
        reasoning: i.reasoning ?? '',
        remainingIssues: '',
        afterImageUrl: afterUrl,
        verifiedAt: millisAgo(i.resolved),
      };
    }

    await addDoc(collection(db, 'issues'), docData);
  }

  const resolved = DEMO_ISSUES.filter((i) => i.status === 'resolved').length;
  console.log(
    `✓ Seeded ${DEMO_USERS.length} citizens and ${DEMO_ISSUES.length} issues ` +
      `(${resolved} resolved with before/after, ${complaintSeq} complaints drafted).`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error('✗ Seed failed:', e);
  process.exit(1);
});
