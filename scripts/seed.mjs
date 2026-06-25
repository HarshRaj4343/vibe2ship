/**
 * Seeds Firestore with demo issues + citizens for the judging demo.
 *
 *   npm run seed
 *
 * Loads credentials from .env.local (Node's --env-file, see package.json).
 * Uses the Firebase *client* SDK, so your Firestore rules must allow writes
 * (the dev rules in firestore.rules do). Safe to re-run — it clears the
 * issues/users/upvotes collections it manages first.
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

// Centered on Connaught Place, New Delhi. Tweak to your demo city.
const CENTER = { lat: 28.6315, lng: 77.2167 };
const jitter = (d = 0.02) => (Math.random() - 0.5) * d;
const daysAgo = (n) => Timestamp.fromDate(new Date(Date.now() - n * 86400000));

const DEMO_USERS = [
  { id: 'demo_asha', name: 'Asha Verma', points: 145, issuesReported: 9, issuesVerified: 4 },
  { id: 'demo_rohan', name: 'Rohan Mehta', points: 95, issuesReported: 5, issuesVerified: 6 },
  { id: 'demo_priya', name: 'Priya Nair', points: 70, issuesReported: 3, issuesVerified: 8 },
  { id: 'demo_imran', name: 'Imran Khan', points: 30, issuesReported: 2, issuesVerified: 1 },
];

const BADGE_FOR = (reported, verified) => {
  const b = [];
  if (reported >= 1) b.push({ id: 'first_report', name: 'First Report', awardedAt: daysAgo(20) });
  if (reported >= 10) b.push({ id: 'civic_hero', name: 'Civic Hero', awardedAt: daysAgo(5) });
  if (verified >= 10) b.push({ id: 'verifier', name: 'Verified Verifier', awardedAt: daysAgo(3) });
  return b;
};

const DEMO_ISSUES = [
  {
    title: 'Large pothole on Barakhamba Road',
    description: 'Deep pothole near the metro gate, two-wheelers swerving around it.',
    category: 'pothole', severity: 4, status: 'open', safetyRisk: true,
    routeTo: 'Road/PWD Department', reportedBy: 'demo_asha',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    age: 2, upvotes: 12, verified: 5,
  },
  {
    title: 'Water main leaking on Kasturba Gandhi Marg',
    description: 'Clean water gushing onto the road for two days.',
    category: 'water_leak', severity: 3, status: 'in_progress', safetyRisk: false,
    routeTo: 'Water & Sanitation Dept', reportedBy: 'demo_rohan',
    image: 'https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=800',
    age: 6, upvotes: 8, verified: 3,
  },
  {
    title: 'Streetlight out near Janpath market',
    description: 'Whole stretch dark at night, feels unsafe.',
    category: 'streetlight', severity: 2, status: 'open', safetyRisk: false,
    routeTo: 'Electricity Department', reportedBy: 'demo_priya',
    image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800',
    age: 9, upvotes: 5, verified: 2,
  },
  {
    title: 'Garbage dumped beside Tolstoy Marg',
    description: 'Illegal dump growing every day, strong smell.',
    category: 'waste', severity: 3, status: 'open', safetyRisk: false,
    routeTo: 'Waste Management Dept', reportedBy: 'demo_asha',
    image: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800',
    age: 4, upvotes: 9, verified: 4,
  },
  {
    title: 'Sunken road & broken kerb at Mandi House',
    description: 'Road caved in after the rains, hazardous for cyclists.',
    category: 'pothole', severity: 5, status: 'open', safetyRisk: true,
    routeTo: 'Road/PWD Department', reportedBy: 'demo_imran',
    image: 'https://images.unsplash.com/photo-1574610409244-9b0a48e35c95?w=800',
    age: 1, upvotes: 18, verified: 7,
  },
  {
    title: 'Overflowing drain near Bengali Market',
    description: 'Drain blocked, sewage on the footpath.',
    category: 'water_leak', severity: 4, status: 'resolved', safetyRisk: true,
    routeTo: 'Water & Sanitation Dept', reportedBy: 'demo_rohan',
    image: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=800',
    age: 14, upvotes: 6, verified: 5,
  },
  {
    title: 'Flickering streetlight on Sansad Marg',
    description: 'Light flickers all night, wiring looks exposed.',
    category: 'streetlight', severity: 2, status: 'resolved', safetyRisk: false,
    routeTo: 'Electricity Department', reportedBy: 'demo_priya',
    image: 'https://images.unsplash.com/photo-1470093851219-69951fcbb533?w=800',
    age: 21, upvotes: 3, verified: 2,
  },
  {
    title: 'Fallen tree branch blocking lane',
    description: 'Branch down after the storm, half the lane blocked.',
    category: 'other', severity: 3, status: 'in_progress', safetyRisk: false,
    routeTo: 'Municipal Corporation', reportedBy: 'demo_asha',
    image: 'https://images.unsplash.com/photo-1597495843536-31c0a4c4f1f3?w=800',
    age: 3, upvotes: 7, verified: 3,
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
      createdAt: daysAgo(25),
    });
  }

  console.log('▶ Seeding issues…');
  for (const i of DEMO_ISSUES) {
    const lat = CENTER.lat + jitter();
    const lng = CENTER.lng + jitter();
    await addDoc(collection(db, 'issues'), {
      title: i.title,
      description: i.description,
      category: i.category,
      severity: i.severity,
      status: i.status,
      imageUrl: i.image,
      lat,
      lng,
      geohash: geohashForLocation([lat, lng]),
      upvoteCount: i.upvotes,
      verifiedCount: i.verified,
      reportedBy: i.reportedBy,
      assignedDept: i.routeTo,
      aiAnalysis: {
        isValid: true,
        confidence: 0.85 + Math.random() * 0.14,
        severity: i.severity,
        safetyRisk: i.safetyRisk,
        reasoning: `AI assessed this as a ${i.category.replace('_', ' ')} of severity ${i.severity}/5 and routed it to the ${i.routeTo}.`,
        routeTo: i.routeTo,
      },
      createdAt: daysAgo(i.age),
      updatedAt: daysAgo(Math.max(0, i.age - 1)),
    });
  }

  console.log(`✓ Seeded ${DEMO_USERS.length} citizens and ${DEMO_ISSUES.length} issues.`);
  process.exit(0);
}

main().catch((e) => {
  console.error('✗ Seed failed:', e);
  process.exit(1);
});
