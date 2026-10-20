const CACHE = 'toolstack-v5';
const CORE = ['/', '/offline', '/manifest.webmanifest', '/favicon.svg'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener('fetch', event => {
  const request = event.request; if (request.method !== 'GET') return; const url = new URL(request.url); if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') { event.respondWith(fetch(request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); return response; }).catch(async () => (await caches.match(request)) || (await caches.match('/offline')))); return; }
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/qpdf/') || url.pathname.startsWith('/pdfjs/') || url.pathname === '/favicon.svg' || url.pathname === '/manifest.webmanifest') {
    // Turbopack shares a worker bootstrap URL and selects the worker via its fragment.
    // A cached Response.url can carry another worker's fragment into WorkerLocation.
    const preserveWorkerLocation = response => request.destination === 'worker' ? new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers }) : response;
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); } return response; })).then(preserveWorkerLocation));
  }
});
