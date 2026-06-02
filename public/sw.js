// public/sw.js
// ─── Cache version ── Bump on every deploy to bust ALL stale client caches ───
const CACHE_VERSION = 'v20260602-1';
const CACHE_NAME = `goalforge-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {

  // Skip waiting immediately — do not wait for old SW to be unregistered
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // 1. Delete all old caches
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Purging stale cache:', name);
              return caches.delete(name);
            })
        )
      )
      .then(() => {
        // 2. Immediately claim ALL open browser tabs/windows
        return self.clients.claim();
      })
      .then(() => {
        // 3. Tell every open client to hard-reload so they get fresh assets
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED' });
          });
        });
      })
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
