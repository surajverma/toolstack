import { describe, expect, it } from 'vitest';
import { clampBox } from './redaction';

describe('pixel redaction bounds', () => {
  it('covers fractional edges outward so a selected border does not leak pixels', () => {
    expect(clampBox({ x: 1.2, y: 2.8, width: 10.1, height: 9.6 }, 100, 100)).toEqual({ x: 1, y: 2, width: 11, height: 11 });
  });
  it('supports reverse dragging and clamps to image boundaries', () => {
    expect(clampBox({ x: 10, y: 20, width: -15, height: -40 }, 100, 100)).toEqual({ x: 0, y: 0, width: 10, height: 20 });
    expect(clampBox({ x: 90, y: 90, width: 20, height: 20 }, 100, 100)).toEqual({ x: 90, y: 90, width: 10, height: 10 });
  });
});
