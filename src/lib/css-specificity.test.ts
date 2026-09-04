import { describe, expect, it } from 'vitest';
import { calculateSpecificity } from './css-specificity';

const score = (selector: string) => calculateSpecificity(selector)[0].specificity;

describe('CSS specificity', () => {
  it('counts basic selectors', () => expect(score('#id .class div')).toEqual([1,1,1]));
  it(':where contributes zero specificity', () => expect(score(':where(#id,.x)')).toEqual([0,0,0]));
  it(':is uses the highest argument specificity', () => expect(score(':is(#id,.x)')).toEqual([1,0,0]));
  it(':has adds the highest argument to the selector around it', () => expect(score('.card:has(> #cta)')).toEqual([1,1,0]));
  it('counts pseudo-elements like elements', () => expect(score('a::before')).toEqual([0,0,2]));
});
