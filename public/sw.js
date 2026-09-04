const CACHE = 'toolstack-v3';
const CORE = ['/', '/offline', '/manifest.webmanifest', '/favicon.svg'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener('fetch', event => {
  const request = event.request; if (request.method !== 'GET') return; const url = new URL(request.url); if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') { event.respondWith(fetch(request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); return response; }).catch(async () => (await caches.match(request)) || (await caches.match('/offline')))); return; }
  if (url.pathname.startsWith('/_next/static/') || url.pathname === '/favicon.svg' || url.pathname === '/manifest.webmanifest') event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); return response; })));
});
