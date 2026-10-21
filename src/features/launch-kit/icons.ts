import { icoFromPngFrames } from './icon-formats';
export { appManifest, ICON_HTML } from './icon-formats';
import { canvasBlob, makeCanvas } from '@/lib/image-canvas';
import { hexColor } from '@/features/css-playground/css';

export type IconDesign = {
  image: HTMLImageElement | null;
  text: string;
  background: string;
  foreground: string;
  padding: number;
  transparent: boolean;
};
export type IconPack = Map<string, Blob>;

export function drawIcon(design: IconDesign, size: number, maskable = false) {
  if (
    !Number.isInteger(size) ||
    size < 16 ||
    size > 1024 ||
    !Number.isFinite(design.padding) ||
    design.padding < 0 ||
    design.padding > 35
  )
    throw new Error('Invalid icon dimensions or padding.');
  hexColor(design.background);
  hexColor(design.foreground);
  const { canvas, context } = makeCanvas(size);
  if (!design.transparent || maskable) {
    context.fillStyle = design.background;
    context.fillRect(0, 0, size, size);
  }
  // A 52% square fits inside the central safe circle of a maskable icon.
  const inset = (size * Math.max(maskable ? 24 : 0, design.padding)) / 100;
  const available = size - inset * 2;
  if (design.image) {
    const scale =
      available /
      Math.max(design.image.naturalWidth, design.image.naturalHeight);
    const width = design.image.naturalWidth * scale,
      height = design.image.naturalHeight * scale;
    context.drawImage(
      design.image,
      (size - width) / 2,
      (size - height) / 2,
      width,
      height,
    );
  } else {
    const text = [...design.text.trim()].slice(0, 4).join('');
    if (!text)
      throw new Error('Enter up to four characters or choose an image.');
    context.fillStyle = design.foreground;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `800 ${available * 0.8}px "Inter Variable", system-ui, sans-serif`;
    const width = context.measureText(text).width;
    if (width > available)
      context.font = `800 ${(available * 0.8 * available) / width}px "Inter Variable", system-ui, sans-serif`;
    context.fillText(text, size / 2, size / 2 + size * 0.025);
  }
  return canvas;
}

export async function createIconPack(design: IconDesign): Promise<IconPack> {
  await document.fonts.ready;
  const files: IconPack = new Map();
  for (const size of [16, 32, 48, 180, 192, 512]) {
    files.set(
      size === 180
        ? 'apple-touch-icon.png'
        : size === 192 || size === 512
          ? `icon-${size}.png`
          : `favicon-${size}.png`,
      await canvasBlob(drawIcon(design, size)),
    );
  }
  files.set(
    'icon-maskable-512.png',
    await canvasBlob(drawIcon(design, 512, true)),
  );
  const frames = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      bytes: new Uint8Array(
        await files.get(`favicon-${size}.png`)!.arrayBuffer(),
      ),
    })),
  );
  files.set(
    'favicon.ico',
    new Blob([icoFromPngFrames(frames)], { type: 'image/x-icon' }),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><image width="192" height="192" href="${drawIcon(design, 192).toDataURL('image/png')}"/></svg>`;
  files.set('favicon.svg', new Blob([svg], { type: 'image/svg+xml' }));
  return files;
}
