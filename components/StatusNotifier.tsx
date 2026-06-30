'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import {
  enablePushNotifications,
  notificationsAvailable,
  onForegroundMessage,
} from '@/lib/messaging';
import { STATUS_LABELS, type IssueStatus } from '@/lib/types';
import { Bell } from '@/components/icons';

/**
 * Headless real-time notifier. Uses Firebase Cloud Messaging for the
 * permission/device-token handshake, then a live Firestore `onSnapshot` listener
 * on the citizen's own reported issues. The moment any of them changes status,
 * the reporter gets a browser push notification + an in-app toast — no polling,
 * no refresh. This is the "real-time status updates" loop, end to end.
 *
 * Renders only a small opt-in chip while notification permission is still
 * "default"; otherwise it's invisible and just listens.
 */
export default function StatusNotifier() {
  const { identity } = useAuth();
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  const [permState, setPermState] = useState<NotificationPermission | 'unsupported'>(
    'default',
  );
  const statusesRef = useRef<Map<string, IssueStatus>>(new Map());
  const primedRef = useRef(false);

  // Reflect current permission; register FCM token if already granted.
  useEffect(() => {
    if (!notificationsAvailable()) {
      setPermState('unsupported');
      return;
    }
    setPermState(Notification.permission);
    if (Notification.permission === 'granted') {
      void enablePushNotifications();
      void onForegroundMessage((payload) =>
        setToast({
          title: payload.notification?.title ?? 'UrbanPulse',
          body: payload.notification?.body ?? '',
        }),
      );
    }
  }, []);

  // Live-watch this citizen's reported issues for status transitions.
  useEffect(() => {
    if (!identity.uid || identity.uid === 'anonymous') return;
    statusesRef.current = new Map();
    primedRef.current = false;

    const q = query(
      collection(db, 'issues'),
      where('reportedBy', '==', identity.uid),
    );

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        const data = change.doc.data() as { status: IssueStatus; title: string };
        const prev = statusesRef.current.get(change.doc.id);
        statusesRef.current.set(change.doc.id, data.status);

        // Skip the initial hydration burst — only notify on real transitions.
        if (primedRef.current && prev && prev !== data.status) {
          notify(
            change.doc.id,
            data.title,
            data.status,
          );
        }
      });
      primedRef.current = true;
    });

    return unsub;
  }, [identity.uid]);

  function notify(id: string, title: string, status: IssueStatus) {
    const heading = `Update: ${title}`;
    const body = `Status changed to "${STATUS_LABELS[status]}".`;
    setToast({ title: heading, body });
    if (notificationsAvailable() && Notification.permission === 'granted') {
      try {
        new Notification(heading, {
          body,
          icon: '/logo.png',
          data: { url: `/issue/${id}` },
        });
      } catch {
        /* foreground Notification may throw on some browsers — toast covers it */
      }
    }
  }

  async function optIn() {
    const token = await enablePushNotifications();
    setPermState(
      notificationsAvailable() ? Notification.permission : 'unsupported',
    );
    if (token) console.info('[fcm] push token registered');
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      {permState === 'default' && identity.uid !== 'anonymous' && (
        <button
          onClick={optIn}
          className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-ink shadow-[0_8px_30px_-12px_rgba(28,27,46,0.3)] backdrop-blur-xl transition hover:-translate-y-0.5 md:bottom-6"
        >
          <Bell className="h-4 w-4 text-sarvam-blue" /> Enable status alerts
        </button>
      )}

      {toast && (
        <div className="glass-card-lg fixed bottom-24 right-4 z-50 flex max-w-xs items-start gap-3 p-4 shadow-xl md:bottom-6">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sarvam-sky/30 text-sarvam-blue">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{toast.title}</p>
            <p className="mt-0.5 text-xs text-ink/65">{toast.body}</p>
          </div>
        </div>
      )}
    </>
  );
}
