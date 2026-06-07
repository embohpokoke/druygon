// Druygon Service Worker v3 — redesign (replaces all old caches)
// BUMP the cache name on every deploy that changes cached assets.
// Inline this value from build.sh or change manually.
const CACHE = 'druygon-v3';
const PRECACHE = [
  '/',
  '/redesign/app/design-system.css',
  '/redesign/app/app.css',
  '/redesign/app/bundle.js',
  '/redesign/app/assets/js/react.production.min.js',
  '/redesign/app/assets/js/react-dom.production.min.js',
  '/redesign/app/assets/fonts/fonts.css',
  '/manifest.json',
  '/assets/icons/app/icon-192.png',
  '/assets/icons/app/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())   // take over immediately
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        // delete ALL caches except current — kills old druygon-v1 or any legacy cache
        keys.filter(k => k !== CACHE).map(k => {
          console.log('[SW] deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())  // take control of all open tabs now
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never cache: API calls, tutor, parent, sw itself
  if (url.includes('/api/') || url.includes('/tutor') ||
      url.includes('/parent') || url.includes('sw.js')) return;

  // HTML: network-first (always check for new version)
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: cache-first (assets have ?v= cache-busting)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      });
    })
  );
});
