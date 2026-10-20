export type CurlRequest = { url: string; method: string; headers: Record<string,string>; body?: string; warnings: string[] };
const FORBIDDEN = /^(?:accept-charset|accept-encoding|access-control-request-headers|access-control-request-method|connection|content-length|cookie|cookie2|date|dnt|expect|host|keep-alive|origin|permissions-policy|referer|set-cookie|te|trailer|transfer-encoding|upgrade|user-agent|via|proxy-.*|sec-.*)$/i;

/** Tokenize a limited POSIX command as data. Nothing is evaluated or executed. */
export function tokenizeCurl(input: string): string[] {
  if (input.length > 100000) throw new Error('Use a cURL command up to 100 KB.');
  const tokens: string[] = []; let word = ''; let started = false; let quote = '';
  const flush = () => { if (started) tokens.push(word); word = ''; started = false; };
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quote === "'") { if (char === "'") quote = ''; else word += char; continue; }
    if (char === '\\') {
      if (i + 1 >= input.length) throw new Error('The command ends with an incomplete escape.');
      if (input[i + 1] === '\n') { i++; continue; }
      if (input[i + 1] === '\r' && input[i + 2] === '\n') { i += 2; continue; }
      const next = input[++i];
      if (quote === '"' && !['"','\\','$','`'].includes(next)) word += '\\';
      word += next; started = true; continue;
    }
    if (char === '$' || char === '`') throw new Error('Shell variables and command substitutions are unsupported. Paste literal values in single quotes.');
    if (quote === '"') { if (char === '"') quote = ''; else word += char; continue; }
    if (char === "'" || char === '"') { quote = char; started = true; continue; }
    if (/\s/.test(char)) { flush(); continue; }
    if (/[|&;<>()[\]^]/.test(char) || (!started && char === '#')) throw new Error('Use one POSIX cURL command without shell operators. Quote URLs containing &, brackets or parentheses.');
    word += char; started = true;
  }
  if (quote) throw new Error('A quoted argument is not closed.');
  flush(); return tokens;
}

export function parseCurl(input: string): CurlRequest {
  const tokens = tokenizeCurl(input);
  if (!/^(?:curl|curl\.exe)$/.test(tokens.shift() ?? '')) throw new Error('Start with curl followed by an HTTP or HTTPS URL.');
  let url = ''; let method = ''; let get = false; let head = false; let json = false; const bodies: string[] = []; const headers: Record<string,string> = Object.create(null); const warnings: string[] = [];
  const addHeader = (name: string, value: string) => {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || /[\r\n]/.test(value)) throw new Error('A header has an invalid name or a line break.');
    const key = name.toLowerCase();
    if (FORBIDDEN.test(key)) { warnings.push(`${name} is controlled by the browser and is omitted.`); return; }
    headers[key] = Object.hasOwn(headers,key) ? `${headers[key]}, ${value}` : value;
  };
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i]; let inline: string | undefined;
    if (token.startsWith('--') && token.includes('=')) { const split = token.indexOf('='); inline = token.slice(split + 1); token = token.slice(0,split); }
    else if (/^-[XHdubAe].+/.test(token)) { inline = token.slice(2); token = token.slice(0,2); }
    const argument = () => { const value = inline ?? tokens[++i]; if (value === undefined) throw new Error(`${token} needs a value.`); return value; };
    if (token === '-X' || token === '--request') { method = argument().toUpperCase(); if (!/^[A-Z]+$/.test(method) || ['CONNECT','TRACE','TRACK'].includes(method)) throw new Error('Use a method supported by browser requests, such as GET, POST, PUT, PATCH or DELETE.'); }
    else if (token === '--url') { if (url) throw new Error('Use one URL per conversion.'); url = argument(); }
    else if (token === '-H' || token === '--header') { const value = argument(); const split = value.indexOf(':'); if (split <= 0) throw new Error('Headers must use Name: value. Header-file references are unsupported.'); addHeader(value.slice(0,split).trim(),value.slice(split + 1).trim()); }
    else if (['-d','--data','--data-raw','--data-binary','--json'].includes(token)) {
      const value = argument(); if (value.startsWith('@') && token !== '--data-raw') throw new Error('File references are unsupported. Paste the request body directly.');
      if (token === '--json') { if (bodies.length && !json) throw new Error('Do not mix --json and other body flags.'); json = true; }
      else if (json) throw new Error('Do not mix --json and other body flags.');
      bodies.push(value);
    } else if (token === '-u' || token === '--user') {
      const auth = argument(); if (!auth.includes(':')) throw new Error('Provide user:password as a literal value; interactive password prompts are unsupported.');
      const bytes = new TextEncoder().encode(auth); let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); addHeader('Authorization',`Basic ${btoa(binary)}`);
    } else if (token === '-b' || token === '--cookie' || token === '-A' || token === '--user-agent' || token === '-e' || token === '--referer') { argument(); warnings.push(`${token} is omitted because browsers control cookies, user agents and referrers.`); }
    else if (token === '-G' || token === '--get') get = true;
    else if (token === '-I' || token === '--head') head = true;
    else if (token === '-L' || token === '--location') { /* Browser requests follow redirects by default. */ }
    else if (['--compressed','--silent','--show-error','--fail','--http1.1','--http2','--http3'].includes(token) || /^-[sSfL]+$/.test(token)) warnings.push(`${token} is a cURL transport/output option; it has no direct effect in the generated code.`);
    else if (token.startsWith('-')) throw new Error(`Unsupported option: ${token}. File uploads, shell expansion, TLS overrides and output flags are not converted.`);
    else { if (url) throw new Error('Use one URL per conversion.'); url = token; }
    if (inline !== undefined && !['-X','--request','--url','-H','--header','-d','--data','--data-raw','--data-binary','--json','-u','--user','-b','--cookie','-A','--user-agent','-e','--referer'].includes(token)) throw new Error(`${token} does not accept an inline value.`);
  }
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error('Provide a valid HTTP or HTTPS URL.'); }
  if (!['http:','https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
  if (parsed.username || parsed.password) throw new Error('URLs with embedded credentials are unsupported. Use an Authorization header instead.');
  if (/[{}]/.test(parsed.pathname)) throw new Error('cURL URL globbing is unsupported. Use a single expanded URL.');
  parsed.hash = '';
  const body = bodies.length ? bodies.join(json ? '' : '&') : undefined;
  if (get && json) throw new Error('Do not combine --get with --json.');
  if (get && body !== undefined) parsed.search += `${parsed.search ? '&' : '?'}${body}`;
  const resolvedMethod = method || (head ? 'HEAD' : get ? 'GET' : body !== undefined ? 'POST' : 'GET');
  if (body !== undefined && !get && ['GET','HEAD'].includes(resolvedMethod)) throw new Error('Browser GET/HEAD requests cannot have a body. Use --get for query parameters or a body-capable method.');
  if (body !== undefined && !get) {
    if (!Object.hasOwn(headers,'content-type')) headers['content-type'] = json ? 'application/json' : 'application/x-www-form-urlencoded';
    if (json && !Object.hasOwn(headers,'accept')) headers.accept = 'application/json';
  }
  return { url: parsed.toString(), method: resolvedMethod, headers, ...(body !== undefined && !get ? { body } : {}), warnings: [...new Set(warnings)] };
}

export function curlToFetch(input: string, redact = true) {
  const request = parseCurl(input); const url = new URL(request.url);
  const hideValues = (value: unknown, depth = 0): unknown => {
    if (depth > 35) throw new Error('The JSON body is nested too deeply.');
    if (Array.isArray(value)) return value.map(item => hideValues(item,depth + 1));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,hideValues(item,depth + 1)]));
    return '[REDACTED]';
  };
  if (redact) for (const name of [...new Set(url.searchParams.keys())]) { const values = url.searchParams.getAll(name); url.searchParams.delete(name); values.forEach(() => url.searchParams.append(name,'[REDACTED]')); }
  const headers = redact ? Object.fromEntries(Object.entries(request.headers).map(([name,value]) => [name, ['content-type','accept'].includes(name) ? value : '[REDACTED]'])) : request.headers;
  let body = request.body;
  if (redact && body !== undefined) {
    if (/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(request.headers['content-type'] ?? '')) {
      let value: unknown; try { value = JSON.parse(body); } catch { throw new Error('The body is marked as JSON but is invalid. Fix it before producing a redacted example.'); }
      body = JSON.stringify(hideValues(value));
    } else body = '[REDACTED_BODY]';
  }
  const init = { method: request.method, ...(Object.keys(headers).length ? { headers } : {}), ...(body !== undefined ? { body } : {}), credentials: 'omit' };
  const call = ['fetch','('].join('');
  return { code: `const response = await ${call}${JSON.stringify(url.toString())}, ${JSON.stringify(init,null,2)});\n`, warnings: request.warnings };
}
