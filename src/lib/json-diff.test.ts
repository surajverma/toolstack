import { describe, expect, it } from 'vitest';
import { diffJson } from './json-diff';

describe('diffJson', () => {
  it('reports changed, added and removed paths', () => {
    const result = diffJson({ a: 1, b: 2, nested: { x: true } }, { a: 3, c: 4, nested: { x: true } });
    expect(result).toEqual(expect.arrayContaining([
      { path: '$.a', kind: 'changed', before: 1, after: 3 },
      { path: '$.b', kind: 'removed', before: 2 },
      { path: '$.c', kind: 'added', after: 4 },
    ]));
  });
  it('uses array indexes in paths', () => expect(diffJson([1,2],[1,3])).toEqual([{ path: '$[1]', kind: 'changed', before: 2, after: 3 }]));
});
