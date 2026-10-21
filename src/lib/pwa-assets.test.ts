import { describe, expect, it, vi } from 'vitest';
import { offlineSnapshotUrl } from '../../scripts/pwa-assets.mjs';
import { checkPwa } from '../../scripts/check-pwa.mjs';

describe('host-friendly offline snapshots', () => {
  it('uses opaque filenames even for routes rejected by common host filename rules', () => {
    const version = '0123456789abcdef';
    const routes = [
      '/',
      '/index',
      '/license',
      '/license.txt',
      '/nested/license',
    ];
    const paths = routes.flatMap((route) =>
      ['page', 'flight'].map((type) =>
        offlineSnapshotUrl(version, route, type),
      ),
    );
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths)
      expect(path).toMatch(
        /^\/pwa\/0123456789abcdef\/(?:page|flight)-[a-f0-9]{20}\.(?:html|txt)$/,
      );
    expect(
      offlineSnapshotUrl('fedcba9876543210', '/license', 'flight'),
    ).not.toBe(offlineSnapshotUrl(version, '/license', 'flight'));
    expect(() =>
      offlineSnapshotUrl('../invalid', '/license', 'flight'),
    ).toThrow();
  });
});

describe('deployed offline resource audit', () => {
  const site = 'https://app.example';
  function server(
    entries: { url: string; key: string; type: string }[],
    blocked = false,
  ) {
    return vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === site + '/sw.js')
        return new Response('importScripts("/pwa/sw.js");', {
          headers: { 'cache-control': 'max-age=14400' },
        });
      if (url === site + '/pwa/sw.js')
        return new Response(
          'const CONFIG = ' +
            JSON.stringify({ version: 'test', entries }) +
            ';',
          { headers: { 'cache-control': 'no-store' } },
        );
      if (blocked && url.endsWith('license.txt'))
        return new Response(null, { status: 444 });
      return new Response('app resource', {
        headers: { 'content-type': 'text/plain' },
      });
    });
  }
  it('identifies the failed file and cache key and warns about cached worker scripts', async () => {
    const entry = {
      url: '/pwa/build/license.txt',
      key: '/__toolstack-flight/license',
      type: 'flight',
    };
    const report = await checkPwa(site, server([entry], true));
    expect(report.failures).toEqual([
      { url: entry.url, key: entry.key, reason: 'HTTP 444' },
    ]);
    expect(report.warnings[0]).toContain('/sw.js is cacheable');
  });
  it('downloads opaque snapshots successfully and refuses HTML masquerading as code', async () => {
    const entry = {
      url: '/pwa/build/flight-123.txt',
      key: '/__toolstack-flight/license',
      type: 'flight',
    };
    const request = server([entry]);
    expect((await checkPwa(site, request)).failures).toEqual([]);
    request.mockImplementation(async (url) =>
      url === site + entry.url
        ? new Response('<html>missing</html>', {
            headers: { 'content-type': 'text/html' },
          })
        : server([entry])(url),
    );
    expect((await checkPwa(site, request)).failures[0].reason).toContain(
      'Returned HTML',
    );
  });
  it('validates the allowlist before requesting any external or credential-bearing origin', async () => {
    const request = server([
      { url: '//external.example/private', key: '/bad', type: 'asset' },
    ]);
    await expect(checkPwa(site, request)).rejects.toThrow('app origin');
    expect(request).toHaveBeenCalledTimes(2);
    await expect(
      checkPwa('https://user:password@app.example/', request),
    ).rejects.toThrow('without credentials');
  });
});
