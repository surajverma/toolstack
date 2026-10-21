import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const next = join(root, '.next');
const publicRoot = join(root, 'public');
const buildId = (await readFile(join(next, 'BUILD_ID'), 'utf8')).trim();
const version = createHash('sha256').update(buildId).digest('hex').slice(0, 16);
const template = await readFile(join(root, 'scripts/service-worker.js'), 'utf8');
const prerender = JSON.parse(await readFile(join(next, 'prerender-manifest.json'), 'utf8'));
const entries = [];
let bytes = 0;

async function addFile(source, url, key = url, type = 'asset') {
  bytes += (await stat(source)).size;
  entries.push({ url, key, type });
}

async function walk(directory, visit) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) await walk(full, visit);
    else await visit(full);
  }
}

// Include lazy imports, shared worker bootstraps, fonts and WASM, not just the
// chunks referenced by the first page. A new tool must also work on its first use offline.
await walk(join(next, 'static'), async file => {
  if (!file.endsWith('.map')) await addFile(file, '/_next/static/' + relative(join(next, 'static'), file).replaceAll('\\', '/'));
});
for (const directory of ['qpdf', 'pdfjs', 'icons']) {
  await walk(join(publicRoot, directory), file => addFile(file, '/' + relative(publicRoot, file).replaceAll('\\', '/')));
}
await addFile(join(publicRoot, 'favicon.svg'), '/favicon.svg');
await addFile(join(publicRoot, 'favicon.ico'), '/favicon.ico');

const pages = [];
for (const [route, info] of Object.entries(prerender.routes)) {
  if (route.startsWith('/_') || !info.dataRoute?.endsWith('.rsc')) continue;
  if (info.initialRevalidateSeconds !== false) throw new Error(`Offline page must be static: ${route}`);
  const stem = route === '/' ? 'index' : route.slice(1);
  for (const [extension, type, key] of [
    ['html', 'page', route],
    ['rsc', 'flight', '/__toolstack-flight/' + stem],
  ]) {
    const source = join(next, 'server/app', stem + '.' + extension);
    const url = `/pwa/${version}/${stem}.${extension === 'rsc' ? 'txt' : extension}`;
    const destination = join(publicRoot, url);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
    await addFile(source, url, key, type);
  }
  pages.push(route);
}
if (!pages.includes('/') || !pages.includes('/offline')) throw new Error('Missing core offline pages.');
const appRoutes = JSON.parse(await readFile(join(next, 'app-path-routes-manifest.json'), 'utf8'));
for (const [appPath, route] of Object.entries(appRoutes)) {
  if (appPath.endsWith('/page') && !route.startsWith('/_') && !pages.includes(route)) {
    throw new Error(`Page missing from offline build: ${route}. All tool pages must be prerendered.`);
  }
}
// Next emits the static manifest as a route response body.
const manifest = join(next, 'server/app/manifest.webmanifest.body');
const manifestUrl = `/pwa/${version}/manifest.json`;
await copyFile(manifest, join(publicRoot, manifestUrl));
await addFile(manifest, manifestUrl, '/manifest.webmanifest', 'manifest');

const config = { version, entries, pages, bytes };
await writeFile(join(publicRoot, 'pwa/sw.js'), template.replace('/* TOOLSTACK_PRECACHE */ null', JSON.stringify(config)));
console.log(`Prepared offline app: ${pages.length} pages, ${entries.length} resources, ${(bytes / 1024 / 1024).toFixed(1)} MB before transfer compression.`);
