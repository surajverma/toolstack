import { describe, expect, it } from 'vitest';
import { sanitizeSupportFiles } from './support-sanitizer';

const options = { aliases: true, includeBodies: false, literals: [] };
describe('support sanitization', () => {
  it('uses the same alias across logs and structured files while removing credentials', () => {
    const output = sanitizeSupportFiles([{ name: 'private.log', text: 'alex@example.com\nAuthorization: Bearer do-not-share\n/home/alex/server' }, { name: 'private.json', text: JSON.stringify({ email: 'alex@example.com', password: 'hidden', nested: { apiKey: 'secret' }, status: 500 }) }], options);
    const data = JSON.parse(output[1].text);
    expect(data.email).toBe('[EMAIL_001]'); expect(output[0].text).toContain(data.email);
    expect(output.map(item => item.text).join('')).not.toMatch(/alex@example.com|do-not-share|hidden|"secret"|\/home\/alex/);
    expect(data.status).toBe(500); expect(output[0].name).toBe('support-1.txt');
  });
  const har = () => ({ log: { pages: [{ title: 'private page' }], entries: [{ startedDateTime: '2026-01-01T00:00:00Z', time: 42, request: { method: 'POST', url: 'https://user:pass@example.com/users?token=secret&id=123#private', headers: [{ name: 'Authorization', value: 'Bearer hidden' }], cookies: [{ value: 'cookie-secret' }], postData: { text: 'private body' } }, response: { status: 500, statusText: 'Error', content: { size: 100, mimeType: 'application/json', text: '{"secret":"private-response"}' } }, timings: { wait: 12, receive: 30 }, _private: 'private extension' }] } });
  it('rebuilds HAR files without bodies, credentials or unrecognized extension fields', () => {
    const output = sanitizeSupportFiles([{ name: 'capture.har', text: JSON.stringify(har()) }], options)[0];
    expect(output.text).not.toMatch(/private|cookie-secret|Bearer|user:pass|token=secret|id=123/);
    const entry = JSON.parse(output.text).log.entries[0];
    expect(entry.response.status).toBe(500); expect(entry.time).toBe(42); expect(entry.timings.wait).toBe(12);
    expect(entry.request.postData).toBeUndefined(); expect(output.requests).toBe(1);
  });
  it('does not copy encoded response bodies even when retaining bodies', () => {
    const data = har(); Object.assign(data.log.entries[0].response.content, { encoding: 'base64', text: 'c2VjcmV0' });
    const result = sanitizeSupportFiles([{ name: 'capture.har', text: JSON.stringify(data) }], { ...options, includeBodies: true })[0];
    expect(JSON.parse(result.text).log.entries[0].response.content.text).toBeUndefined();
  });
  it('removes exact custom values and PEM private keys', () => {
    const result = sanitizeSupportFiles([{ name: 'config.txt', text: 'Internal Acme\n-----BEGIN PRIVATE KEY-----\nsecretdata\n-----END PRIVATE KEY-----' }], { ...options, literals: ['Internal Acme'] })[0];
    expect(result.text).not.toMatch(/Internal Acme|secretdata/);
  });
  it('stops on malformed JSON rather than silently copying the file', () => {
    expect(() => sanitizeSupportFiles([{ name: 'data.json', text: '{bad' }], options)).toThrow();
    expect(() => sanitizeSupportFiles([{ name: 'data.har', text: '{}' }], options)).toThrow(/log.entries/);
  });
  it('keeps HAR URLs parseable when replacing IP hosts and custom hostnames', () => {
    for (const url of ['http://192.168.1.20/resource', 'https://internal.example.com/resource']) {
      const source = har(); source.log.entries[0].request.url = url;
      const output = sanitizeSupportFiles([{ name: 'capture.har', text: JSON.stringify(source) }], { ...options, literals: ['internal.example.com'] })[0];
      const cleaned = JSON.parse(output.text).log.entries[0].request.url;
      expect(() => new URL(cleaned)).not.toThrow(); expect(cleaned).not.toMatch(/192\.168\.1\.20|internal\.example\.com/);
    }
  });
});
