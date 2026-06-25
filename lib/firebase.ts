import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Reuse the existing app during hot-reload / multiple imports to avoid
// "Firebase App named '[DEFAULT]' already exists" errors.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Auth is initialized lazily and only on the client. Constructing it eagerly
// would call getAuth() at module-import time, which validates the API key and
// throws during server builds where NEXT_PUBLIC_* vars may be absent. The API
// routes import `db` from this module, so they must not pull in auth.
let _auth: Auth | undefined;
export function getClientAuth(): Auth {
  if (!_auth) _auth = getAuth(app);
  return _auth;
}

export default app;
