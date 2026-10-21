import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prepareSvg, SVG_SAMPLE, DEFAULT_SVG_OPTIONS } from './svg';

beforeAll(() => {
  vi.stubGlobal(
    'DOMParser',
    class {
      parseFromString(source: string) {
        return new DOMParser({
          onError: (level, message) => {
            if (level !== 'warning') throw new Error(message);
          },
        }).parseFromString(source, 'image/svg+xml');
      }
    },
  );
  vi.stubGlobal('XMLSerializer', XMLSerializer);
});
afterAll(() => vi.unstubAllGlobals());

describe('static SVG preparation', () => {
  it('keeps geometry, accessibility text and local gradients while prefixing references', () => {
    const result = prepareSvg(SVG_SAMPLE);
    expect(result.svg).toContain('id="icon-paint"');
    expect(result.svg).toContain('url(#icon-paint)');
    expect(result.svg).toContain('<title>Stacked tools</title>');
    expect(result.jsx).toContain('strokeWidth={"8"}');
    expect(result.viewBox).toEqual([0, 0, 120, 120]);
  });
  it('removes active content, links, style and external references', () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" onload="alert(1)"><script>alert(1)</script><foreignObject><div>unsafe</div></foreignObject><image href="https://external.invalid/a"/><style>path{fill:url(https://external.invalid)}</style><path d="M0 0" style="fill:red" fill="url(https://external.invalid)"/><use href="https://external.invalid/icon.svg#a"/><!-- private --></svg>';
    const result = prepareSvg(source);
    expect(result.svg).not.toMatch(
      /onload|alert|foreignObject|<image|<style|style=|external|private/,
    );
    expect(result.changes.length).toBeGreaterThan(4);
    expect(result.svg).toContain('viewBox="0 0 10 10"');
  });
  it('blocks entities, duplicate IDs, broken dimensions and unbounded input', () => {
    expect(() => prepareSvg('<!DOCTYPE svg>' + SVG_SAMPLE)).toThrow('DOCTYPE');
    expect(() =>
      prepareSvg(SVG_SAMPLE.replace('<title>', '<title id="paint">')),
    ).toThrow('Duplicate');
    expect(() =>
      prepareSvg('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    ).toThrow('viewBox');
    expect(() => prepareSvg('x'.repeat(512001))).toThrow('512');
    expect(
      prepareSvg(SVG_SAMPLE, { ...DEFAULT_SVG_OPTIONS, currentColor: true })
        .svg,
    ).toContain('currentColor');
  });
});
