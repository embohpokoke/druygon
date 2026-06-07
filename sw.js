// Druygon Service Worker v2.0 — redesign
const CACHE = 'druygon-v2';
const PRECACHE = [
  '/',
  '/redesign/app/bundle.js',
  '/redesign/app/design-system.css',
  '/redesign/app/app.css',
  '/redesign/app/assets/js/react.production.min.js',
  '/redesign/app/assets/js/react-dom.production.min.js',
  '/redesign/app/assets/fonts/fonts.css',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Pass-through API, tutor, parent — never cache
  if (e.request.url.includes('/api/') ||
      e.request.url.includes('/tutor') ||
      e.request.url.includes('/parent')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => cached);
    })
  );
});
