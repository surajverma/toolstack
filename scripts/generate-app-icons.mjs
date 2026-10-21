import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, process.argv[2] || 'design/app-icons/ts-monogram.png');
const output = resolve(root, 'public/icons');
await mkdir(output, { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180], ['favicon-32.png', 32],
]) {
  await sharp(source).resize(size, size).png().toFile(resolve(output, name));
}
// Keep the existing public URL self-contained and independent of system fonts.
const smallIcon = await readFile(resolve(output, 'icon-192.png'));
await writeFile(resolve(root, 'public/favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><image width="192" height="192" href="data:image/png;base64,${smallIcon.toString('base64')}"/></svg>\n`);

// A conventional ICO directory with PNG frames covers older bookmark/tab clients.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(size => sharp(source).resize(size, size).ensureAlpha().png().toBuffer()));
const directory = Buffer.alloc(6 + 16 * sizes.length);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index]; directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4); directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8); directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(resolve(root, 'public/favicon.ico'), Buffer.concat([directory, ...frames]));
console.log('Exported ToolStack installation, maskable, Apple touch, PNG, SVG and ICO favicons.');
