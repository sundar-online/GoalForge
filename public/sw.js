// public/sw.js
// ─── Cache version ── Bump this string on every deploy to bust stale caches ──
const CACHE_VERSION = 'v20260512';
const CACHE_NAME = `goalforge-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  // Take control immediately without waiting for old SW to be dismissed
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete ALL caches that don't match the current version
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting stale cache:', name);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim()) // Claim all open tabs immediately
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'GoalForge Reminder';
  const options = {
    body: data.body || "Time to crush your goals!",
    icon: '/favicon-96x96.png',
    badge: '/favicon-96x96.png',
    data: data.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data || '/', self.location.origin).href;
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
