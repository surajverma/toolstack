import { describe, expect, it } from 'vitest';
import { detectFileSignature, extensionMatches } from './file-signatures';

const bytes = (values: number[]) => new Uint8Array(values);

describe('file signature detection', () => {
  it('detects a PDF header', () => expect(detectFileSignature(bytes([0x25,0x50,0x44,0x46,0x2d]))?.mime).toBe('application/pdf'));
  it('detects a PNG header', () => expect(detectFileSignature(bytes([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))?.mime).toBe('image/png'));
  it('marks ZIP as a container format', () => expect(detectFileSignature(bytes([0x50,0x4b,0x03,0x04]))?.container).toBe(true));
  it('checks filename consistency', () => {
    const info = detectFileSignature(bytes([0x25,0x50,0x44,0x46,0x2d]));
    expect(extensionMatches(info, 'report.pdf')).toBe(true);
    expect(extensionMatches(info, 'report.jpg')).toBe(false);
  });
});
