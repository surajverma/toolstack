/* Generated configuration is inserted by scripts/build-pwa.mjs after next build. */
const CONFIG = /* TOOLSTACK_PRECACHE */ null;
const CACHE = 'toolstack-pwa-' + CONFIG.version;
const META = '/__toolstack-offline-ready';
const ENTRIES = new Map(CONFIG.entries.map(entry => [entry.key, entry]));
const PAGES = new Set(CONFIG.pages);
let preparing;

async function announce(status) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage({ type: 'TOOLSTACK_OFFLINE', version: CONFIG.version, ...status }));
}

function prepareOffline() {
  if (preparing) return preparing;
  preparing = (async () => {
    const cache = await caches.open(CACHE);
    await cache.delete(META);
    let completed = 0;
    let next = 0;
    await announce({ state: 'preparing', completed, total: CONFIG.entries.length });
    // Bound concurrency: PDF/WASM assets can be larger than ordinary page chunks.
    const results = await Promise.allSettled(Array.from({ length: 4 }, async () => {
      while (next < CONFIG.entries.length) {
        const entry = CONFIG.entries[next++];
        if (!(await cache.match(entry.key))) {
          const response = await fetch(entry.url, { cache: 'reload', credentials: 'same-origin' });
          if (!response.ok || response.redirected) throw new Error('Offline resource unavailable');
          const headers = new Headers(response.headers);
          headers.delete('content-encoding'); headers.delete('content-length'); headers.delete('vary');
          if (entry.type === 'flight') headers.set('content-type', 'text/x-component');
          if (entry.type === 'page') headers.set('content-type', 'text/html; charset=utf-8');
          if (entry.type === 'manifest') headers.set('content-type', 'application/manifest+json');
          await cache.put(entry.key, new Response(response.body, { headers }));
        }
        completed++;
        if (completed % 5 === 0 || completed === CONFIG.entries.length) {
          await announce({ state: 'preparing', completed, total: CONFIG.entries.length });
        }
      }
    }));
    if (results.some(result => result.status === 'rejected')) throw new Error('Offline download incomplete');
    await cache.put(META, new Response(CONFIG.version));
    await announce({ state: 'ready', completed, total: CONFIG.entries.length });
  })().catch(async error => {
    await announce({ state: 'error' });
    throw error;
  }).finally(() => { preparing = undefined; });
  return preparing;
}

self.addEventListener('install', event => {
  // Activate the new cache atomically; the open UI is kept until an explicit reload.
  // One previous asset cache supports lazy imports in tabs on the earlier build.
  event.waitUntil(prepareOffline().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Retain one previous build for tabs still using its content-hashed chunks.
    const previous = keys.filter(key => key.startsWith('toolstack-pwa-') && key !== CACHE).at(-1);
    await Promise.all(keys.filter(key => /^toolstack-(pwa-|v\d+$)/.test(key) && key !== CACHE && key !== previous).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (!event.source?.url || new URL(event.source.url).origin !== self.location.origin) return;
  if (event.data?.type === 'SKIP_WAITING') { event.waitUntil(self.skipWaiting()); return; }
  if (event.data?.type === 'PREPARE_OFFLINE') { event.waitUntil(prepareOffline().catch(() => undefined)); return; }
  if (event.data?.type === 'OFFLINE_STATUS') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      const complete = await cache.match(META);
      const keys = new Set((await cache.keys()).map(request => new URL(request.url).pathname));
      const ready = !!complete && CONFIG.entries.every(entry => keys.has(entry.key));
      event.source.postMessage({ type: 'TOOLSTACK_OFFLINE', version: CONFIG.version, state: ready ? 'ready' : 'error', completed: ready ? CONFIG.entries.length : 0, total: CONFIG.entries.length });
    })());
  }
});

// Turbopack selects workers with URL fragments. Do not carry a cached Response.url
// belonging to another worker into WorkerLocation (including an old bootstrap).
function preserveWorkerLocation(response, request) {
  return request.destination === 'worker' ? new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers }) : response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : '/';
  const flight = request.headers.get('rsc') === '1';
  const key = flight && PAGES.has(path) ? '/__toolstack-flight/' + (path === '/' ? 'index' : path.slice(1)) : path;
  if ((ENTRIES.has(key) || path.startsWith('/_next/static/')) && (!PAGES.has(path) || request.mode === 'navigate' || flight)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      let response = await cache.match(key);
      // A previous tab may still request the previous build's immutable chunks.
      if (!response && path.startsWith('/_next/static/')) {
        const keys = await caches.keys();
        for (const name of keys.filter(name => name.startsWith('toolstack-pwa-') && name !== CACHE)) {
          response = await (await caches.open(name)).match(key);
          if (response) break;
        }
      }
      return preserveWorkerLocation(response || await fetch(request), request);
    })());
    return;
  }
  // Unknown navigation gets an honest fallback, never HTML in a JS/RSC response.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const fallback = await (await caches.open(CACHE)).match('/offline');
      return fallback || new Response('Reconnect once to prepare ToolStack for offline use.', { status: 503, headers: { 'content-type': 'text/plain' } });
    }));
  }
});
