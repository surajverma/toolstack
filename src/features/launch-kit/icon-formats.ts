export function icoFromPngFrames(
  frames: { size: number; bytes: Uint8Array }[],
) {
  const header = new Uint8Array(6 + frames.length * 16);
  const view = new DataView(header.buffer);
  view.setUint16(2, 1, true);
  view.setUint16(4, frames.length, true);
  let offset = header.length;
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16;
    header[entry] = frame.size === 256 ? 0 : frame.size;
    header[entry + 1] = header[entry];
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, frame.bytes.length, true);
    view.setUint32(entry + 12, offset, true);
    offset += frame.bytes.length;
  });
  const bytes = new Uint8Array(offset);
  bytes.set(header);
  let cursor = header.length;
  frames.forEach((frame) => {
    bytes.set(frame.bytes, cursor);
    cursor += frame.bytes.length;
  });
  return bytes;
}

export function appManifest(name: string, theme: string) {
  return JSON.stringify(
    {
      id: '/',
      name,
      short_name: name.slice(0, 24),
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: theme,
      background_color: theme,
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    null,
    2,
  );
}

export const ICON_HTML =
  '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">';
