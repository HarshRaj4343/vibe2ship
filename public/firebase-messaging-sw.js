/* eslint-disable */
/**
 * Firebase Cloud Messaging service worker — handles UrbanPulse push
 * notifications (e.g. "Your pothole report was marked resolved") when the tab
 * is in the background or closed.
 *
 * The public Firebase config is passed as query params when the worker is
 * registered (see lib/messaging.ts), so this static file needs no build-time
 * templating. All values are NEXT_PUBLIC_* and already client-visible.
 */
importScripts(
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js',
);

const params = new URL(self.location).searchParams;

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'UrbanPulse';
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

// Focus/open the issue when the notification is clicked.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(self.clients.openWindow(url));
});
