import { describe, expect, it } from 'vitest';
import { escapeXml, xmlName } from './xml';

describe('XML helpers', () => {
  it('escapes XML special characters', () => expect(escapeXml(`<tag a="1">Tom & Jerry's</tag>`)).toBe('&lt;tag a=&quot;1&quot;&gt;Tom &amp; Jerry&apos;s&lt;/tag&gt;'));
  it('normalizes invalid element names', () => {
    expect(xmlName('123 full name', 0)).toBe('full_name');
    expect(xmlName('***', 2)).toBe('field_3');
  });
});
