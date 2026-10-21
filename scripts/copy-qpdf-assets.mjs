import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const qpdfPackageRoot = join(projectRoot, 'node_modules', 'qpdf-run');
const qpdfOutputRoot = join(projectRoot, 'public', 'qpdf');
const pdfjsPackageRoot = join(projectRoot, 'node_modules', 'pdfjs-dist');
const pdfjsOutputRoot = join(projectRoot, 'public', 'pdfjs');
const workerPath = join(qpdfPackageRoot, 'src', 'worker.js');
await mkdir(qpdfOutputRoot, { recursive: true });
await mkdir(pdfjsOutputRoot, { recursive: true });

// Use qpdf-run's supported asset URL options; copy its worker without patching it.
await copyFile(workerPath, join(qpdfOutputRoot, 'worker.js'));
await copyFile(join(qpdfPackageRoot, 'vendor', 'qpdf', 'lib', 'qpdf.js'), join(qpdfOutputRoot, 'qpdf.js'));
await copyFile(join(qpdfPackageRoot, 'vendor', 'qpdf', 'lib', 'qpdf.wasm'), join(qpdfOutputRoot, 'qpdf.wasm'));
await copyFile(join(pdfjsPackageRoot, 'build', 'pdf.worker.min.mjs'), join(pdfjsOutputRoot, 'pdf.worker.min.mjs'));

console.log('Prepared qpdf and PDF.js browser assets for local PDF compression.');
