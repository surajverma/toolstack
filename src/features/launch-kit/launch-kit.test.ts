import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SITE,
  inspectMetadata,
  metadataOutput,
  sitemapXml,
} from './metadata';
import { testRobots } from './robots';

describe('launch metadata and sitemap', () => {
  it('escapes hostile strings and imports metadata without rendering HTML', () => {
    const result = metadataOutput({
      ...DEFAULT_SITE,
      title: '"><script>alert(1)</script>',
      description: 'A & B',
    });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('A &amp; B');
    const inspected = inspectMetadata(
      '<script>"<meta name=description content=wrong>"</script><title>A &amp; B</title><meta name="description" content="First"><meta name="description" content="Second"><img src="https://external.invalid/a">',
    );
    expect(inspected.values.title).toBe('A & B');
    expect(inspected.values.description).toBe('First');
    expect(inspected.warnings).toHaveLength(1);
  });
  it('rejects credentials and foreign origins and deduplicates sitemap entries', () => {
    expect(() =>
      metadataOutput({
        ...DEFAULT_SITE,
        url: 'https://user:secret@example.com/',
      }),
    ).toThrow('credentials');
    expect(() =>
      sitemapXml(DEFAULT_SITE.url, 'https://another.invalid/'),
    ).toThrow('same origin');
    const xml = sitemapXml(DEFAULT_SITE.url, '/\n/#fragment\n/search?q=a&b=c');
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml).toContain('&amp;');
  });
  it('imports the first page title without appending duplicate or SVG titles', () => {
    const result = inspectMetadata(
      '<head><title>First</title><title>Second</title></head><body><svg><title>Icon title</title></svg><meta name="description" content="body tag"></body>',
    );
    expect(result.values.title).toBe('First');
    expect(result.values.description).toBe('');
    expect(result.warnings).toContain('Multiple title tags were found.');
    expect(metadataOutput(DEFAULT_SITE, true).next).toContain(
      '"manifest": "/site.webmanifest"',
    );
  });
});
describe('local robots rules', () => {
  const rules =
    'User-agent: *\nDisallow: /private\nAllow: /private/public\nDisallow: /*.pdf$\nUser-agent: Googlebot\nDisallow: /draft\nUser-agent: Googlebot\nAllow: /draft/public';
  it('selects specific groups, merges equal groups and uses longest paths', () => {
    expect(testRobots(rules, 'Examplebot', '/private/data').allowed).toBe(
      false,
    );
    expect(testRobots(rules, 'Examplebot', '/private/public').allowed).toBe(
      true,
    );
    expect(testRobots(rules, 'Googlebot', '/private/data').allowed).toBe(true);
    expect(testRobots(rules, 'Googlebot', '/draft/public').allowed).toBe(true);
    expect(testRobots(rules, 'Googlebot', '/draft').winner?.line).toBe(6);
  });
  it('handles terminal wildcards, encoded octets and allow ties', () => {
    expect(testRobots(rules, 'Examplebot', '/a.pdf').allowed).toBe(false);
    expect(testRobots(rules, 'Examplebot', '/a.pdf?q=1').allowed).toBe(true);
    expect(
      testRobots(
        'User-agent: *\nDisallow: /%70rivate\nAllow: /private',
        'Anybot',
        '/private',
      ).allowed,
    ).toBe(true);
    expect(
      testRobots('User-agent: *\nDisallow: /café', 'Anybot', '/caf%C3%A9')
        .allowed,
    ).toBe(false);
    expect(testRobots('User-agent: *\nDisallow:', 'Anybot', '/').allowed).toBe(
      true,
    );
  });
});
