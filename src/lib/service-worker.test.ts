import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe,expect,it,vi } from 'vitest';

const origin = 'https://toolstack.invalid';
const entries = [
  { url: '/pwa/build/index.html', key: '/', type: 'page' },
  { url: '/pwa/build/unused-tool.html', key: '/unused-tool', type: 'page' },
  { url: '/pwa/build/offline.html', key: '/offline', type: 'page' },
  { url: '/pwa/build/unused-tool.txt', key: '/__toolstack-flight/unused-tool', type: 'flight' },
  { url: '/_next/static/lazy.js', key: '/_next/static/lazy.js', type: 'asset' },
  { url: '/_next/static/worker.js', key: '/_next/static/worker.js', type: 'asset' },
  { url: '/qpdf/qpdf.wasm', key: '/qpdf/qpdf.wasm', type: 'asset' },
];
const config = { version: 'test', entries, pages: ['/', '/unused-tool', '/offline'], bytes: 100 };
const workerTemplate = readFileSync(new URL('../../scripts/service-worker.js', import.meta.url),'utf8');
const workerSource = workerTemplate.replace('/* TOOLSTACK_PRECACHE */ null', JSON.stringify(config));
const readyMarker = '/__toolstack-offline-ready';

type WorkerEvent = { request?: Request & { destination: string }; data?: { type: string }; source?: { url: string; postMessage: ReturnType<typeof vi.fn> }; waitUntil(value: Promise<unknown>): void; respondWith(value: Promise<Response>): void };
function setup(version = config.version, stores = new Map<string, Map<string, Response>>()) {
  function store(name: string) {
    if (!stores.has(name)) stores.set(name, new Map());
    const data = stores.get(name)!;
    const key = (input: RequestInfo | URL) => new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, origin).pathname;
    return {
      match: async (input: RequestInfo | URL) => data.get(key(input))?.clone(),
      put: async (input: RequestInfo | URL, response: Response) => { data.set(key(input), response.clone()); },
      delete: async (input: RequestInfo | URL) => data.delete(key(input)),
      keys: async () => [...data.keys()].map(path => new Request(origin + path)),
    };
  }
  const caches = { open: async (name: string) => store(name), keys: async () => [...stores.keys()], delete: async (name: string) => stores.delete(name) };
  const handlers: Record<string,(event: WorkerEvent) => void> = {};
  const client = { url: origin + '/', postMessage: vi.fn() };
  const network = vi.fn(async (input: RequestInfo | URL) => new Response('resource:' + (typeof input === 'string' ? input : String(input)), { headers: { 'content-type': 'text/javascript' } }));
  const skipWaiting = vi.fn(async () => undefined);
  const source = workerTemplate.replace('/* TOOLSTACK_PRECACHE */ null', JSON.stringify({ ...config, version }));
  runInNewContext(source, { URL, Response, Headers, fetch: network, caches, self: {
    location: { origin }, clients: { matchAll: async () => [client], claim: vi.fn() }, skipWaiting,
    addEventListener: (type: string, handler: (event: WorkerEvent) => void) => { handlers[type] = handler; },
  } });
  async function dispatch(type: string, extra: Partial<WorkerEvent> = {}) {
    let pending: Promise<unknown> | undefined;
    handlers[type]({ ...extra, waitUntil: value => { pending = value; }, respondWith: value => { pending = value; } });
    return await pending;
  }
  function request(path: string, options: { mode?: RequestMode; destination?: string; headers?: HeadersInit; method?: string } = {}) {
    const req = new Request(new URL(path, origin), { headers: options.headers, method: options.method });
    Object.defineProperties(req, { mode: { value: options.mode || 'same-origin' }, destination: { value: options.destination || '' } });
    return dispatch('fetch', { request: req as Request & { destination: string } }) as Promise<Response | undefined>;
  }
  return { stores, store, client, network, skipWaiting, dispatch, request };
}

describe('complete offline installation', () => {
  it('downloads unused pages, flight payloads, lazy chunks and WASM before reporting ready', async () => {
    const app = setup();
    await app.dispatch('install');
    expect(app.network).toHaveBeenCalledTimes(entries.length);
    expect(app.client.postMessage.mock.calls.at(-1)?.[0].state).toBe('ready');
    expect(app.skipWaiting).toHaveBeenCalledOnce();
    app.network.mockRejectedValue(new Error('Offline'));
    expect(await (await app.request('/unused-tool?private-query=value', { mode: 'navigate' }))?.text()).toContain('unused-tool.html');
    const flight = await app.request('/unused-tool?_rsc=unique-hash', { headers: { rsc: '1', 'next-router-state-tree': 'different-tree' } });
    expect(flight?.headers.get('content-type')).toBe('text/x-component');
    expect(await flight?.text()).toContain('unused-tool.txt');
    expect(await (await app.request('/qpdf/qpdf.wasm'))?.text()).toContain('qpdf.wasm');
    expect(await (await app.request('/_next/static/lazy.js'))?.text()).toContain('lazy.js');
    expect(app.network).toHaveBeenCalledTimes(entries.length);
  });

  it('never reports ready for a failed or partial download, and can resume it', async () => {
    const app = setup();
    app.network.mockImplementation(async input => new Response(String(input), { status: String(input).includes('wasm') ? 503 : 200 }));
    await expect(app.dispatch('install')).rejects.toThrow('Offline download incomplete');
    expect(app.client.postMessage.mock.calls.some(call => call[0].state === 'ready')).toBe(false);
    expect(app.client.postMessage.mock.calls.at(-1)?.[0].state).toBe('error');
    const count = app.network.mock.calls.length;
    app.network.mockResolvedValue(new Response('WASM ready'));
    await app.dispatch('message', { source: app.client, data: { type: 'PREPARE_OFFLINE' } });
    expect(app.network).toHaveBeenCalledTimes(count + 1);
    expect(app.client.postMessage.mock.calls.at(-1)?.[0].state).toBe('ready');
  });

  it('detects evicted application resources instead of trusting the ready marker', async () => {
    const app = setup();
    await app.dispatch('install');
    await app.store('toolstack-pwa-test').delete('/qpdf/qpdf.wasm');
    await app.dispatch('message', { source: app.client, data: { type: 'OFFLINE_STATUS' } });
    expect(app.client.postMessage.mock.calls.at(-1)?.[0].state).toBe('error');
  });

  it('reports the rejected resource and HTTP status without claiming offline readiness', async () => {
    const app = setup();
    app.network.mockImplementation(async input => new Response('resource', { status: String(input).includes('unused-tool.txt') ? 444 : 200 }));
    await expect(app.dispatch('install')).rejects.toThrow('HTTP 444');
    const failure = app.client.postMessage.mock.calls.at(-1)?.[0];
    expect(failure.state).toBe('error');
    expect(failure.detail).toContain('/pwa/build/unused-tool.txt');
    expect(await app.store('toolstack-pwa-test').match(readyMarker)).toBeUndefined();
  });

  it('rejects an HTML error page returned with HTTP 200 for a navigation payload', async () => {
    const app = setup();
    app.network.mockImplementation(async input => new Response('resource', { headers: { 'content-type': String(input).includes('.txt') ? 'text/html' : 'text/javascript' } }));
    await expect(app.dispatch('install')).rejects.toThrow('received HTML');
    expect(app.skipWaiting).not.toHaveBeenCalled();
  });

  it('does not intercept uploads, external requests or arbitrary same-origin data', async () => {
    const app = setup();
    expect(await app.request('/unused-tool', { method: 'POST' })).toBeUndefined();
    expect(await app.request('https://external.invalid/_next/static/lazy.js')).toBeUndefined();
    expect(await app.request('/user-data.json')).toBeUndefined();
    expect(app.network).not.toHaveBeenCalled();
    expect(app.stores.size).toBe(0);
  });

  it('returns an offline page for unknown navigations without serving HTML as JavaScript', async () => {
    const app = setup();
    await app.dispatch('install');
    app.network.mockRejectedValue(new Error('Offline'));
    expect(await (await app.request('/missing', { mode: 'navigate' }))?.text()).toContain('offline.html');
    expect(await app.request('/missing.js')).toBeUndefined();
  });

  it('keeps another app’s caches and one previous build for open tabs', async () => {
    const app = setup();
    await app.store('other-app').put('/data', new Response('leave alone'));
    await app.store('toolstack-v5').put('/', new Response('legacy'));
    await app.store('toolstack-pwa-older').put('/', new Response('older'));
    await app.store('toolstack-pwa-older').put(readyMarker, new Response('older'));
    await app.store('toolstack-pwa-previous').put('/_next/static/old.js', new Response('old chunk'));
    await app.store('toolstack-pwa-previous').put(readyMarker, new Response('previous'));
    await app.dispatch('install');
    await app.dispatch('activate');
    expect([...app.stores.keys()]).toEqual(['other-app', 'toolstack-pwa-previous', 'toolstack-pwa-test']);
    app.network.mockRejectedValue(new Error('Offline'));
    expect(await (await app.request('/_next/static/old.js'))?.text()).toBe('old chunk');
  });

  it('retains completed A after B fails installation and C activates', async () => {
    const a = setup('a');
    await a.dispatch('install');
    await a.dispatch('activate');
    await a.store('toolstack-pwa-a').put('/_next/static/a-lazy.js', new Response('A lazy chunk'));

    const b = setup('b', a.stores);
    b.network.mockImplementation(async input => new Response(String(input), { status: String(input).includes('wasm') ? 503 : 200 }));
    await expect(b.dispatch('install')).rejects.toThrow('Offline download incomplete');
    expect(await b.store('toolstack-pwa-b').match(readyMarker)).toBeUndefined();

    const c = setup('c', a.stores);
    await c.dispatch('install');
    await c.dispatch('activate');
    expect([...c.stores.keys()]).toEqual(['toolstack-pwa-a', 'toolstack-pwa-c']);
    c.network.mockRejectedValue(new Error('Offline'));
    expect(await (await c.request('/_next/static/a-lazy.js'))?.text()).toBe('A lazy chunk');
  });

  it('removes incomplete caches when there is no completed previous build', async () => {
    const app = setup();
    await app.store('toolstack-pwa-partial').put('/_next/static/partial.js', new Response('partial'));
    await app.dispatch('install');
    await app.dispatch('activate');
    expect([...app.stores.keys()]).toEqual(['toolstack-pwa-test']);
  });

  it('accepts manual activation messages only from a same-origin client', async () => {
    const app = setup();
    await app.dispatch('message', { source: { ...app.client, url: 'https://external.invalid/' }, data: { type: 'SKIP_WAITING' } });
    expect(app.skipWaiting).not.toHaveBeenCalled();
    await app.dispatch('message', { source: app.client, data: { type: 'SKIP_WAITING' } });
    expect(app.skipWaiting).toHaveBeenCalledOnce();
  });
});

describe('offline worker bootstrap caching',() => {
  it.each(['worker','script'])('preserves the requesting location for %s responses',async destination => {
    type Event = { request: { method: string; url: string; destination: string; mode: string; headers: Headers }; respondWith: (value: Promise<Response>) => void };
    const handlers: Record<string,(event: Event) => void> = {};
    const cached = new Response('worker bootstrap',{ headers: { 'Content-Type': 'text/javascript' } });
    Object.defineProperty(cached,'url',{ value: 'https://toolstack.invalid/_next/static/worker.js#params=first-worker' });
    const network = vi.fn(() => { throw new Error('Offline'); });
    runInNewContext(workerSource,{
      URL,Response,Headers,fetch: network,caches: { open: async () => ({ match: async () => cached }) },
      self: { location: { origin: 'https://toolstack.invalid' },addEventListener: (type: string,handler: (event: Event) => void) => { handlers[type] = handler; } },
    });
    let pending: Promise<Response> | undefined;
    handlers['fetch']({ request: { method: 'GET',url: 'https://toolstack.invalid/_next/static/worker.js#params=second-worker',destination,mode: 'same-origin',headers: new Headers() },respondWith: value => { pending = value; } });
    const result = await pending!;
    expect(result.url).toBe(destination === 'worker' ? '' : cached.url);
    expect(result.headers.get('Content-Type')).toBe('text/javascript'); expect(await result.text()).toBe('worker bootstrap'); expect(network).not.toHaveBeenCalled();
  });
});
