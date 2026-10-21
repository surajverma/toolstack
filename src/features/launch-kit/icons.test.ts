import { describe, expect, it } from 'vitest';
import { appManifest, icoFromPngFrames } from './icon-formats';

describe('portable icon formats', () => {
  it('writes a multi-frame ICO directory with intact image payloads and offsets', () => {
    const frames = [16, 32, 48].map((size) => ({
      size,
      bytes: new Uint8Array([137, 80, 78, 71, size]),
    }));
    const result = icoFromPngFrames(frames);
    const view = new DataView(result.buffer);
    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(3);
    for (let index = 0; index < 3; index++) {
      const entry = 6 + index * 16;
      const offset = view.getUint32(entry + 12, true);
      const length = view.getUint32(entry + 8, true);
      expect(result[entry]).toBe(frames[index].size);
      expect(result.slice(offset, offset + length)).toEqual(
        frames[index].bytes,
      );
      expect(offset + length).toBeLessThanOrEqual(result.length);
    }
  });
  it('escapes names as JSON and declares a separate maskable icon', () => {
    const manifest = JSON.parse(appManifest('Project "A"', '#0284c7'));
    expect(manifest.name).toBe('Project "A"');
    expect(
      manifest.icons.find(
        (icon: { purpose: string }) => icon.purpose === 'maskable',
      ).src,
    ).toBe('/icon-maskable-512.png');
  });
});
