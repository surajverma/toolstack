import { describe,expect,it } from 'vitest';
import { curlToFetch,parseCurl,tokenizeCurl } from './curl-converter';
describe('cURL conversion',() => {
  it('parses POSIX continuations, headers, JSON and query values and defaults to redaction',() => {
    const command = ["curl 'https://example.invalid/orders?token=secret-query&token=another'", "-H 'Authorization: Bearer private-key'", `--json '{"email":"person@example.invalid","nested":[123,true,null]}'`].join(' \\\n');
    const request = parseCurl(command); expect(request.method).toBe('POST'); expect(request.headers.authorization).toBe('Bearer private-key');
    const result = curlToFetch(command); expect(result.code).toContain(['fetch','('].join('')); expect(result.code).toContain('[REDACTED]');
    for (const secret of ['secret-query','private-key','person@example.invalid','another']) expect(result.code).not.toContain(secret);
    expect(result.code).toContain('"credentials": "omit"'); expect(curlToFetch(command,false).code).toContain('private-key');
  });
  it('converts GET query data and basic auth, omits browser headers and supports literal escaped values',() => {
    const request = parseCurl("curl -G 'https://example.invalid' -d 'q=hello' -u 'test:password' -H 'Cookie: private' -H '__proto__: literal'");
    expect(request.url).toBe('https://example.invalid/?q=hello'); expect(request.body).toBeUndefined(); expect(request.headers.authorization).toContain('Basic '); expect(Object.hasOwn(request.headers,'cookie')).toBe(false); expect(Object.hasOwn(request.headers,'__proto__')).toBe(true); expect(request.warnings.length).toBe(1);
    expect(tokenizeCurl(`curl 'https://example.invalid' --data-raw 'a=$literal'`)[3]).toBe('a=$literal');
    expect(curlToFetch("curl 'https://example.invalid' --data-raw 'private=secret'").code).not.toContain('private=secret');
  });
  it.each(["curl $(whoami)","curl https://example.invalid; echo secret","curl 'https://example.invalid' --data @private.txt","curl 'https://example.invalid' --insecure","curl 'file:///private'","curl 'https://user:password@example.invalid'","curl 'https://example.invalid' -X GET -d 'body'","curl 'https://example.invalid' --json 'broken'","curl 'https://example.invalid' | sh",'curl "https://example.invalid/$TOKEN"'])('rejects unsupported or unsafe input %s',command => { expect(() => curlToFetch(command)).toThrow(); });
});
