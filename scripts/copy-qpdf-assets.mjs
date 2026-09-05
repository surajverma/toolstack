import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const packageRoot = join(projectRoot, 'node_modules', 'qpdf-run');
const outputRoot = join(projectRoot, 'public', 'qpdf');
const workerPath = join(packageRoot, 'src', 'worker.js');
const marker = 'TOOLSTACK_QPDF_ASSET_FALLBACK';

await mkdir(outputRoot, { recursive: true });

let workerSource = await readFile(workerPath, 'utf8');

// Next 16/Turbopack can turn qpdf-run's companion asset URLs into file:/// URLs
// inside the worker. A browser worker cannot importScripts() from file:// when the
// application is being served over HTTP(S), so fall back to ToolStack's same-origin
// public/qpdf copies when that happens.
if (!workerSource.includes(marker)) {
  const initLine = '    await initQpdf(message.qpdfJsUrl, message.wasmUrl);';
  if (!workerSource.includes(initLine)) {
    throw new Error('qpdf-run worker layout changed; update scripts/copy-qpdf-assets.mjs before continuing.');
  }

  workerSource = workerSource.replace(
    initLine,
    `    // ${marker}\n    await initQpdf(resolveToolStackAsset(message.qpdfJsUrl, 'qpdf.js'), resolveToolStackAsset(message.wasmUrl, 'qpdf.wasm'));`,
  );

  workerSource += `\nfunction resolveToolStackAsset(url, filename) {\n  try {\n    var resolved = new URL(String(url || ''), self.location.href);\n    if (resolved.protocol !== 'file:') return resolved.href;\n  } catch (_) {\n    // Fall through to the same-origin public asset.\n  }\n  return new URL('/qpdf/' + filename, self.location.origin).href;\n}\n`;

  await writeFile(workerPath, workerSource, 'utf8');
}

await writeFile(join(outputRoot, 'worker.js'), workerSource, 'utf8');
await copyFile(join(packageRoot, 'vendor', 'qpdf', 'lib', 'qpdf.js'), join(outputRoot, 'qpdf.js'));
await copyFile(join(packageRoot, 'vendor', 'qpdf', 'lib', 'qpdf.wasm'), join(outputRoot, 'qpdf.wasm'));

console.log('Prepared qpdf browser assets in public/qpdf/ with the Turbopack URL fallback.');
