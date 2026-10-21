// Compact hand-authored 5×7 bitmap alphabet; no font downloads or runtime assets.
const GLYPHS: Record<string, string> = {
  A: '01110100011000111111100011000110001',
  B: '11110100011000111110100011000111110',
  C: '01111100001000010000100001000001111',
  D: '11110100011000110001100011000111110',
  E: '11111100001000011110100001000011111',
  F: '11111100001000011110100001000010000',
  G: '01111100001000010111100011000101111',
  H: '10001100011000111111100011000110001',
  I: '11111001000010000100001000010011111',
  J: '00111000100001000010000101001001100',
  K: '10001100101010011000101001001010001',
  L: '10000100001000010000100001000011111',
  M: '10001110111010110101100011000110001',
  N: '10001110011010110011100011000110001',
  O: '01110100011000110001100011000101110',
  P: '11110100011000111110100001000010000',
  Q: '01110100011000110001101011001001101',
  R: '11110100011000111110101001001010001',
  S: '01111100001000001110000010000111110',
  T: '11111001000010000100001000010000100',
  U: '10001100011000110001100011000101110',
  V: '10001100011000110001100010101000100',
  W: '10001100011000110101101011101110001',
  X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100',
  Z: '11111000010001000100010001000011111',
  '0': '01110100011001110101110011000101110',
  '1': '00100011000010000100001000010001110',
  '2': '01110100010000100010001000100011111',
  '3': '11110000010000101110000010000111110',
  '4': '00010001100101010010111110001000010',
  '5': '11111100001000011110000010000111110',
  '6': '01110100001000011110100011000101110',
  '7': '11111000010001000100010000100001000',
  '8': '01110100011000101110100011000101110',
  '9': '01110100011000101111000010000101110',
  ' ': '00000000000000000000000000000000000',
  '.': '00000000000000000000000000011000110',
  '-': '00000000000000011111000000000000000',
  _: '00000000000000000000000000000011111',
  '!': '00100001000010000100001000000000100',
  '?': '01110100010000100010001000000000100',
  ':': '00000001100011000000001100011000000',
};
export function textBanner(text: string, ink = '#', scale = 1) {
  if (
    text.length > 80 ||
    !Number.isInteger(scale) ||
    scale < 1 ||
    scale > 3 ||
    [...ink].length !== 1
  )
    throw new Error(
      'Use up to 80 characters, a single ink character and a scale from 1 to 3.',
    );
  const letters = [...text.toUpperCase()];
  if (letters.some((letter) => !GLYPHS[letter]))
    throw new Error('Text banners support A–Z, digits, spaces and . - _ ! ? :');
  const rows: string[] = [];
  for (let y = 0; y < 7; y++) {
    const row = letters
      .map((letter) =>
        GLYPHS[letter]
          .slice(y * 5, y * 5 + 5)
          .split('')
          .map((pixel) => (pixel === '1' ? ink : ' ').repeat(scale))
          .join(''),
      )
      .join(' '.repeat(scale));
    for (let repeat = 0; repeat < scale; repeat++) rows.push(row);
  }
  return rows.join('\n');
}

export function pixelsToAscii(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  charset: string,
  inverted: boolean,
  dither: boolean,
) {
  const chars = [...charset];
  if (chars.length < 2 || chars.length > 80 || /[\r\n\t]/.test(charset))
    throw new Error(
      'Use a character ramp of 2–80 characters without line breaks or tabs.',
    );
  if (width * height > 60000 || pixels.length !== width * height * 4)
    throw new Error('Image sample is too large or incomplete.');
  const values = new Float64Array(width * height);
  for (let i = 0; i < values.length; i++) {
    const alpha = pixels[i * 4 + 3] / 255;
    const gray =
      (0.2126 * pixels[i * 4] +
        0.7152 * pixels[i * 4 + 1] +
        0.0722 * pixels[i * 4 + 2]) /
      255;
    values[i] = (gray * alpha + (1 - alpha)) * (chars.length - 1);
  }
  const output: string[] = [];
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        level = Math.max(0, Math.min(chars.length - 1, Math.round(values[i])));
      row += chars[inverted ? chars.length - 1 - level : level];
      if (dither) {
        const error = values[i] - level;
        if (x + 1 < width) values[i + 1] += (error * 7) / 16;
        if (y + 1 < height) {
          if (x > 0) values[i + width - 1] += (error * 3) / 16;
          values[i + width] += (error * 5) / 16;
          if (x + 1 < width) values[i + width + 1] += error / 16;
        }
      }
    }
    output.push(row);
  }
  return output.join('\n');
}
export function asciiHtml(text: string, dark: boolean) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ASCII artwork</title><style>body{background:${dark ? '#0b1220' : '#fff'};color:${dark ? '#f8fafc' : '#0b1220'};padding:24px}pre{font:12px/1 monospace;white-space:pre;overflow:auto}</style><pre>${escaped}</pre></html>`;
}
