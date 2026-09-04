import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../src/app/', import.meta.url));
const banned = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\s*\(/,
  /\bEventSource\s*\(/,
  /navigator\.sendBeacon\s*\(/,
];
const violations = [];

async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }

    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;

    const text = await readFile(full, 'utf8');
    for (const rule of banned) {
      if (rule.test(text)) violations.push(`${full}: ${rule}`);
    }
  }
}

await walk(root);

if (violations.length) {
  console.error(
    'Privacy check failed. Tool code contains network-capable APIs:\n' + violations.join('\n')
  );
  process.exit(1);
}

console.log('Privacy check passed: no network APIs found in src/app tool code.');
