import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe,expect,it,vi } from 'vitest';

describe('offline worker bootstrap caching',() => {
  it.each(['worker','script'])('preserves the requesting location for %s responses',async destination => {
    type Event = { request: { method: string; url: string; destination: string; mode: string }; respondWith: (value: Promise<Response>) => void };
    const handlers: Record<string,(event: Event) => void> = {};
    const cached = new Response('worker bootstrap',{ headers: { 'Content-Type': 'text/javascript' } });
    Object.defineProperty(cached,'url',{ value: 'https://toolstack.invalid/_next/static/worker.js#params=first-worker' });
    const network = vi.fn(() => { throw new Error('Offline'); });
    runInNewContext(readFileSync(new URL('../../public/sw.js',import.meta.url),'utf8'),{
      URL,Response,fetch: network,caches: { match: async () => cached },
      self: { location: { origin: 'https://toolstack.invalid' },addEventListener: (type: string,handler: (event: Event) => void) => { handlers[type] = handler; } },
    });
    let pending: Promise<Response> | undefined;
    handlers['fetch']({ request: { method: 'GET',url: 'https://toolstack.invalid/_next/static/worker.js#params=second-worker',destination,mode: 'same-origin' },respondWith: value => { pending = value; } });
    const result = await pending!;
    expect(result.url).toBe(destination === 'worker' ? '' : cached.url);
    expect(result.headers.get('Content-Type')).toBe('text/javascript'); expect(await result.text()).toBe('worker bootstrap'); expect(network).not.toHaveBeenCalled();
  });
});
