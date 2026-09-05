import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const packageRoot = join(projectRoot, 'node_modules', 'qpdf-run');
const outputRoot = join(projectRoot, 'public', 'qpdf');

const assets = [
  ['src/worker.js', 'worker.js'],
  ['vendor/qpdf/lib/qpdf.js', 'qpdf.js'],
  ['vendor/qpdf/lib/qpdf.wasm', 'qpdf.wasm'],
];

await mkdir(outputRoot, { recursive: true });

for (const [source, destination] of assets) {
  await copyFile(join(packageRoot, source), join(outputRoot, destination));
}

console.log('Prepared qpdf browser assets in public/qpdf/.');
