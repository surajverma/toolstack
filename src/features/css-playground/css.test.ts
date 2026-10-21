import { describe, expect, it } from 'vitest';
import {
  gradientCss,
  gridCss,
  parseGradient,
  sampledGradientContrast,
} from './css';

describe('CSS playground output', () => {
  it('imports its own output and rejects arbitrary CSS or remote URLs', () => {
    const input = 'linear-gradient(135deg in oklab, #0284c7 0%, #7c3aed 100%)';
    expect(gradientCss(parseGradient(input))).toBe(input);
    expect(() =>
      parseGradient('url(https://external.invalid/image)'),
    ).toThrow();
    expect(() =>
      parseGradient('linear-gradient(red, blue); color:red'),
    ).toThrow();
  });
  it('samples intermediate gradient colors rather than checking only the ends', () => {
    expect(
      sampledGradientContrast(
        [
          { color: '#000000', position: 0 },
          { color: '#ffffff', position: 100 },
        ],
        '#808080',
      ),
    ).toBeLessThan(1.1);
  });
  it('distributes omitted stops between their explicit neighbors as CSS does', () => {
    expect(
      parseGradient(
        'LINEAR-gradient(90deg, #000000 40%, #444444, #ffffff 100%)',
      ).stops.map((stop) => stop.position),
    ).toEqual([40, 70, 100]);
    expect(
      parseGradient(
        'linear-gradient(#000000 80%, #444444 40%, #ffffff)',
      ).stops.map((stop) => stop.position),
    ).toEqual([80, 80, 100]);
  });
  it('exports named rectangular areas and rejects ambiguous or injected names', () => {
    expect(
      gridCss(['header', 'header', 'aside', 'content'], 2, 2, 16, 160).css,
    ).toContain('"header header"');
    expect(() => gridCss(['a', 'b', 'b', 'a'], 2, 2, 16, 160)).toThrow(
      'rectangle',
    );
    expect(() => gridCss(['x; color:red'], 1, 1, 0, 160)).toThrow();
  });
});
