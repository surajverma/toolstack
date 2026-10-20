export type SupportOptions = { aliases: boolean; includeBodies: boolean; literals: string[] };
export type SupportInput = { name: string; text: string };
export type SupportOutput = { name: string; text: string; changes: number; requests?: number };
const SECRET_KEY = /(?:password|passwd|pwd|secret|token|authorization|cookie|api[-_]?key|private[-_]?key|session[-_]?id|signature|credential)/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** One session-wide mapping; original values and the mapping are never exported. */
export function sanitizeSupportFiles(inputs: SupportInput[], options: SupportOptions): SupportOutput[] {
  const mappings = new Map<string, string>();
  const counts = new Map<string, number>();
  let changes = 0;
  const replace = (kind: string, value: string, alias = options.aliases) => {
    changes++;
    if (!alias) return `[REDACTED_${kind}]`;
    const key = `${kind}:${value}`;
    if (!mappings.has(key)) { const next = (counts.get(kind) ?? 0) + 1; counts.set(kind, next); mappings.set(key, `[${kind}_${String(next).padStart(3, '0')}]`); }
    return mappings.get(key)!;
  };
  const scrub = (text: string): string => {
    let result = text;
    for (const literal of [...options.literals].filter(Boolean).sort((a, b) => b.length - a.length)) result = result.split(literal).join(replaceLiteral(literal));
    result = result.replace(/-----BEGIN [^-\r\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\r\n]*PRIVATE KEY-----/g, match => replace('PRIVATE_KEY', match, false));
    result = result.replace(/^(\s*(?:authorization|proxy-authorization|cookie|set-cookie)\s*:\s*)[^\r\n]*/gim, (_, prefix: string) => `${prefix}${replace('CREDENTIAL', '', false)}`);
    result = result.replace(/\b(Bearer|Basic)\s+[^\s"',;]+/gi, (_, scheme: string) => `${scheme} ${replace('CREDENTIAL', '', false)}`);
    result = result.replace(/((?:["']?)[\w.-]*(?:password|passwd|secret|token|api[_-]?key|authorization|cookie|credential)[\w.-]*["']?\s*[:=]\s*)("[^"\r\n]*"|'[^'\r\n]*'|[^\s,;\r\n]+)/gi, (_, prefix: string) => `${prefix}${replace('SECRET', '', false)}`);
    result = result.replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bsk-[A-Za-z0-9_-]{20,}\b/g, match => replace('SECRET', match, false));
    result = result.replace(EMAIL, match => replace('EMAIL', match));
    result = result.replace(UUID, match => replace('UUID', match));
    result = result.replace(IPV4, match => replace('IP', match));
    result = result.replace(/([A-Z]:\\Users\\|\/Users\/|\/home\/)([^\s/\\]+)/gi, (_, prefix: string, name: string) => `${prefix}${replace('USER', name)}`);
    return result;
  };
  function replaceLiteral(value: string) { return `[CUSTOM_${getLiteralIndex(value)}]`; }
  function getLiteralIndex(value: string) { return options.literals.indexOf(value) + 1; }
  const cleanValue = (value: unknown, depth = 0): unknown => {
    if (depth > 80) throw new Error('Data is nested too deeply (maximum 80 levels).');
    if (typeof value === 'string') return scrub(value);
    if (Array.isArray(value)) return value.map(item => cleanValue(item, depth + 1));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [scrub(key), SECRET_KEY.test(key) ? replace('SECRET', '', false) : cleanValue(item, depth + 1)]));
    return value;
  };
  const cleanUrl = (value: unknown): string => {
    try {
      const url = new URL(String(value));
      if (!['http:', 'https:'].includes(url.protocol)) return '[REMOVED_URL]';
      if (url.username || url.password || url.hash) changes++;
      url.username = ''; url.password = ''; url.hash = '';
      for (const key of [...new Set(url.searchParams.keys())]) {
        const values = url.searchParams.getAll(key); url.searchParams.delete(key);
        for (const val of values) url.searchParams.append(key, replace(SECRET_KEY.test(key) ? 'SECRET' : 'QUERY', val, !SECRET_KEY.test(key) && options.aliases));
      }
      if (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
        const marker = replace('IP', url.hostname);
        url.hostname = options.aliases ? `${marker.replace(/[\[\]_]/g, '-').replace(/^-|-$/g, '').toLowerCase()}.invalid` : 'redacted-ip.invalid';
      }
      const cleaned = scrub(url.toString());
      try { return new URL(cleaned).toString(); } catch { return 'https://redacted.invalid/'; }
    } catch { changes++; return '[REMOVED_INVALID_URL]'; }
  };
  const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const safeHeaders = (value: unknown) => Array.isArray(value) ? value.flatMap(header => { const h = record(header); if (String(h.name).toLowerCase() !== 'content-type') { changes++; return []; } return [{ name: 'Content-Type', value: scrub(String(h.value ?? '')) }]; }) : [];
  return inputs.map((input, index) => {
    const before = changes;
    const ext = input.name.toLowerCase().split('.').pop();
    let text: string;
    let requests: number | undefined;
    if (ext === 'har') {
      const parsed = JSON.parse(input.text); const log = record(record(parsed).log);
      if (!Array.isArray(log.entries)) throw new Error(`File ${index + 1}: this is not a HAR with log.entries.`);
      requests = log.entries.length;
      const entries = log.entries.map(raw => {
        const entry = record(raw); const request = record(entry.request); const response = record(entry.response); const content = record(response.content);
        const url = cleanUrl(request.url);
        const cleanContent: Record<string, unknown> = { size: typeof content.size === 'number' ? content.size : 0, mimeType: scrub(String(content.mimeType ?? '')) };
        if (options.includeBodies && content.text !== undefined) {
          if (content.encoding) { changes++; } // Encoded bodies are omitted rather than copied without inspection.
          else { try { cleanContent.text = JSON.stringify(cleanValue(JSON.parse(String(content.text)))); } catch { cleanContent.text = scrub(String(content.text)); } }
        }
        const cleanRequest: Record<string, unknown> = { method: scrub(String(request.method ?? 'GET')), url, httpVersion: 'HTTP/1.1', cookies: [], headers: safeHeaders(request.headers), queryString: [], headersSize: -1, bodySize: -1 };
        if (options.includeBodies && request.postData) {
          const post = record(request.postData); const cleanPost: Record<string, unknown> = { mimeType: scrub(String(post.mimeType ?? '')) };
          if (typeof post.text === 'string') { try { cleanPost.text = JSON.stringify(cleanValue(JSON.parse(post.text))); } catch { cleanPost.text = scrub(post.text); } }
          if (Array.isArray(post.params)) cleanPost.params = post.params.map(item => { const param = record(item); return { name: scrub(String(param.name ?? '')), value: replace('FORM', String(param.value ?? ''), false) }; });
          cleanRequest.postData = cleanPost;
        }
        changes++; // HAR is rebuilt from a limited set of fields, not copied wholesale.
        return { startedDateTime: String(entry.startedDateTime ?? ''), time: typeof entry.time === 'number' ? entry.time : 0, request: cleanRequest, response: { status: typeof response.status === 'number' ? response.status : 0, statusText: scrub(String(response.statusText ?? '')), httpVersion: 'HTTP/1.1', headers: safeHeaders(response.headers), cookies: [], content: cleanContent, redirectURL: '', headersSize: -1, bodySize: -1 }, cache: {}, timings: Object.fromEntries(['blocked','dns','connect','send','wait','receive','ssl'].map(key => [key, typeof record(entry.timings)[key] === 'number' ? record(entry.timings)[key] : -1])) };
      });
      text = JSON.stringify({ log: { version: '1.2', creator: { name: 'ToolStack', version: '1' }, entries } }, null, 2);
    } else if (ext === 'json') text = JSON.stringify(cleanValue(JSON.parse(input.text)), null, 2);
    else text = scrub(input.text);
    // Literal matches are also counted without recording their original values.
    const customChanges = options.literals.filter(Boolean).reduce((n, literal) => n + input.text.split(literal).length - 1, 0);
    return { name: `support-${index + 1}.${ext === 'har' ? 'har' : ext === 'json' ? 'json' : 'txt'}`, text, changes: changes - before + customChanges, requests };
  });
}
