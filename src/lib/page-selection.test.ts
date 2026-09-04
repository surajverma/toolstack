import { describe, expect, it } from 'vitest';
import { parsePageSelection } from './page-selection';

describe('parsePageSelection', () => {
  it('selects every page when input is empty', () => expect(parsePageSelection('', 4)).toEqual([0,1,2,3]));
  it('preserves explicit order and ranges', () => expect(parsePageSelection('1-3,5', 5)).toEqual([0,1,2,4]));
  it('supports descending ranges for reordering', () => expect(parsePageSelection('4-2,1', 4)).toEqual([3,2,1,0]));
  it('rejects pages outside the document', () => expect(() => parsePageSelection('1,6', 5)).toThrow(/outside 1-5/));
  it('rejects invalid tokens', () => expect(() => parsePageSelection('1-three', 5)).toThrow(/Invalid page token/));
});
