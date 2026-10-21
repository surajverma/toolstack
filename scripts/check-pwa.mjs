import { pathToFileURL } from 'node:url';

function resourceUrl(origin, path) {
  if (typeof path !== 'string' || !path.startsWith('/'))
    throw new Error('Invalid offline resource URL.');
  const url = new URL(path, origin);
  if (url.origin !== origin)
    throw new Error('Offline resources must belong to the app origin.');
  return url;
}

/** Read-only audit of the deployed app, including bodies rather than only HEAD responses. */
export async function checkPwa(site, request = fetch) {
  const base = new URL(site);
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username ||
    base.password
  )
    throw new Error('Use an HTTP(S) app URL without credentials.');
  const origin = base.origin;
  const options = () => ({
    redirect: 'manual',
    signal: AbortSignal.timeout(30000),
  });
  const warnings = [];
  for (const path of ['/sw.js', '/pwa/sw.js']) {
    const response = await request(origin + path, options());
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    if (
      !/(?:no-cache|no-store|max-age=0)(?:\b|,)/i.test(
        response.headers.get('cache-control') || '',
      )
    ) {
      warnings.push(
        `${path} is cacheable (${response.headers.get('cache-control') || 'no Cache-Control header'}). Bypass caching for worker scripts at the host/CDN.`,
      );
    }
    const source = await response.text();
    if (path === '/sw.js') continue;
    const match = source.match(/^const CONFIG = (\{.*\});$/m);
    if (!match)
      throw new Error(
        'The deployed offline worker has no generated configuration. Run npm run build and deploy public/pwa/.',
      );
    const config = JSON.parse(match[1]);
    if (
      typeof config.version !== 'string' ||
      !Array.isArray(config.entries) ||
      !config.entries.length ||
      config.entries.length > 5000
    )
      throw new Error('Invalid offline resource manifest.');
    // Validate the entire allowlist before issuing any requests from it.
    const resources = config.entries.map((entry) => ({
      ...entry,
      address: resourceUrl(origin, entry.url),
    }));
    const failures = [];
    let next = 0;
    let downloaded = 0;
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (next < resources.length) {
          const entry = resources[next++];
          try {
            const result = await request(entry.address.href, options());
            if (!result.ok || result.redirected) {
              await result.body?.cancel();
              throw new Error(
                `HTTP ${result.status}${result.redirected ? ', redirected' : ''}`,
              );
            }
            if (
              entry.type !== 'page' &&
              result.headers.get('content-type')?.includes('text/html')
            ) {
              await result.body?.cancel();
              throw new Error('Returned HTML instead of an app resource');
            }
            const body = await result.arrayBuffer();
            if (!body.byteLength) throw new Error('Empty response body');
            downloaded += body.byteLength;
          } catch (error) {
            failures.push({
              url: entry.url,
              key: entry.key,
              reason: error.message,
            });
          }
        }
      }),
    );
    return {
      version: config.version,
      total: resources.length,
      downloaded,
      warnings,
      failures,
    };
  }
  throw new Error('Missing offline worker configuration.');
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  try {
    const report = await checkPwa(process.argv[2] || 'http://localhost:3000');
    console.log(
      `Offline build ${report.version}: ${report.total - report.failures.length}/${report.total} resources downloaded (${(report.downloaded / 1024 / 1024).toFixed(1)} MB).`,
    );
    report.warnings.forEach((warning) => console.warn('Warning:', warning));
    report.failures.forEach((failure) =>
      console.error(
        `Failed: ${failure.url} (${failure.reason}; cache key ${failure.key})`,
      ),
    );
    if (report.failures.length) process.exitCode = 1;
  } catch (error) {
    console.error('Offline deployment check failed:', error.message);
    process.exitCode = 1;
  }
}
