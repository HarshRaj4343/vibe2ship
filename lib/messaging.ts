'use client';

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
} from 'firebase/messaging';
import app from './firebase';

/**
 * Firebase Cloud Messaging (FCM) client helpers. Kept lazy and client-only:
 * `getMessaging()` touches `navigator`/`ServiceWorker`, which don't exist during
 * SSR or in the Node API routes that import `db` from lib/firebase.
 *
 * FCM gives us the permission + device-token plumbing for push notifications on
 * civic-issue status changes. Delivery itself is driven by a real-time Firestore
 * listener (see components/StatusNotifier.tsx) so the loop works end-to-end even
 * without an Admin-SDK push backend.
 */

let _messaging: Messaging | null = null;

const FIREBASE_PARAMS = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

async function getClientMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (_messaging) return _messaging;
  try {
    if (!(await isSupported())) return null;
    _messaging = getMessaging(app);
    return _messaging;
  } catch {
    return null;
  }
}

/** True when the browser supports Notifications + permission isn't blocked. */
export function notificationsAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

/**
 * Request notification permission and register the FCM service worker, returning
 * the device token (or null if unsupported / denied). Safe to call repeatedly.
 */
export async function enablePushNotifications(): Promise<string | null> {
  if (!notificationsAvailable()) return null;

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
  if (permission !== 'granted') return null;

  // Pass the public Firebase config to the SW via query string (see
  // public/firebase-messaging-sw.js) so the static worker needs no templating.
  const swUrl = `/firebase-messaging-sw.js?${new URLSearchParams(
    FIREBASE_PARAMS,
  ).toString()}`;

  try {
    const registration = await navigator.serviceWorker.register(swUrl);
    const messaging = await getClientMessaging();
    if (!messaging) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    return token ?? null;
  } catch (err) {
    console.warn('[fcm] could not register for push:', err);
    return null;
  }
}

/** Subscribe to foreground FCM messages (tab focused). Returns an unsubscribe. */
export async function onForegroundMessage(
  cb: (payload: MessagePayload) => void,
): Promise<() => void> {
  const messaging = await getClientMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, cb);
}
