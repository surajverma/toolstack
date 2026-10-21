import { describe, expect, it } from 'vitest';
import { asciiHtml, pixelsToAscii, textBanner } from './ascii';

describe('offline ASCII rendering', () => {
  it('renders a deterministic font and scales rows predictably', () => {
    expect(textBanner('TS')).toEqual(textBanner('ts'));
    expect(textBanner('TS').split('\n')).toHaveLength(7);
    expect(textBanner('TS', '#', 2).split('\n')).toHaveLength(14);
    expect(() => textBanner('unsupported 😅')).toThrow();
  });
  it('maps opaque and transparent pixels, with inversion', () => {
    const pixels = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0,
    ]);
    expect(pixelsToAscii(pixels, 3, 1, '# ', false, false)).toBe('#  ');
    expect(pixelsToAscii(pixels, 3, 1, '# ', true, false)).toBe(' ##');
    expect(asciiHtml('<script>&', false)).not.toContain('<script>');
  });
});
