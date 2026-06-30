import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Server-side FCM push delivery via Firebase Admin SDK.
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string of the service
 * account key from Firebase Console → Project Settings → Service Accounts).
 * If missing, push is silently skipped — the Firestore real-time listener in
 * StatusNotifier.tsx still delivers in-app toasts as a fallback.
 */

let _adminApp: App | null = null;

function getAdminApp(): App | null {
  if (_adminApp) return _adminApp;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const credential = cert(JSON.parse(raw));
    // Reuse existing admin app if already initialized (hot reload safety).
    _adminApp =
      getApps().find((a) => a.name === 'admin') ??
      initializeApp({ credential }, 'admin');
    return _adminApp;
  } catch (e) {
    console.warn('[fcm-admin] Failed to init Firebase Admin SDK:', e);
    return null;
  }
}

/**
 * Send a push notification to a specific FCM device token.
 * Returns true on success, false on any failure (caller never throws).
 */
export async function sendPush(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> {
  const app = getAdminApp();
  if (!app) return false;
  try {
    await getMessaging(app).send({
      token: fcmToken,
      notification: { title, body },
      webpush: {
        notification: { icon: '/logo.png', badge: '/logo.png' },
        fcmOptions: { link: data?.url ?? '/' },
      },
      data,
    });
    return true;
  } catch (e) {
    console.warn('[fcm-admin] Push failed:', e);
    return false;
  }
}
