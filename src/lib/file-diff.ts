import { diffArrays,createTwoFilesPatch } from 'diff';
import Papa from 'papaparse';
import { parseTree,printParseErrorCode,type ParseError,type Node } from 'jsonc-parser';
import { checkDiffInput,type CompareEntry,type CompareOptions,type CompareResult,type TextInfo } from './file-diff-types';
import { createDiffRedactor,sensitiveDiffKey } from './diff-redaction';

const STAMP = /\b\d{4}-\d{2}-\d{2}[T ][0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const pointer = (value: string) => value.replace(/~/g,'~0').replace(/\//g,'~1');
const pathOf = (parts: string[]) => '/' + parts.map(pointer).join('/');
const own = (value: unknown): value is Record<string,unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function matchesDiffPath(path: string,pattern: string): boolean {
  const source = pattern.startsWith('/') ? pattern : '/' + pattern;
  const expression = source.split('**').map(part => part.split('*').map(value => value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[^/]*')).join('.*');
  return new RegExp(`^${expression}$`).test(path);
}
function validateOptions(options: CompareOptions) {
  if (!['text','json','csv','env'].includes(options.mode)) throw new Error('Choose a supported comparison mode.');
  if (!Number.isFinite(options.numericTolerance) || options.numericTolerance < 0) throw new Error('Numeric tolerance must be zero or a positive finite number.');
  for (const values of [options.ignoreLiterals,options.ignorePaths,options.expectedPaths,options.keys,options.redactions]) if (values.length > 100 || values.some(value => value.length > 1000)) throw new Error('Use at most 100 rules per list, up to 1,000 characters each.');
  if (!Number.isInteger(options.context) || options.context < 0 || options.context > 5) throw new Error('Context must be between 0 and 5 lines.');
  if (options.mode === 'text' && (options.ignorePaths.length || options.expectedPaths.length || options.keys.length)) throw new Error('Field rules and record keys require JSON, CSV or .env mode.');
}
type Line = { raw: string; content: string; eol: string; index: number; normalized: string };
function linesOf(text: string): Line[] {
  const lines: Line[] = []; const regex = /([^\r\n]*)(\r\n|\r|\n|$)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) && match[0]) lines.push({ raw: match[0],content: match[1],eol: match[2],index: lines.length,normalized: match[0] });
  return lines;
}
function normalize(value: string,options: CompareOptions) {
  let output = value;
  if (options.timestamps) output = output.replace(STAMP,'[TIMESTAMP]');
  if (options.uuids) output = output.replace(UUID,'[UUID]');
  for (const literal of [...options.ignoreLiterals].filter(Boolean).sort((a,b) => b.length - a.length)) output = output.split(literal).join('[IGNORED]');
  if (options.whitespace === 'trim') output = output.replace(/^[ \t]+|[ \t]+$/g,'');
  if (options.whitespace === 'all') output = output.replace(/[ \t]+/g,'');
  if (options.ignoreCase) output = output.toLowerCase();
  return output;
}
export function diffTextInfo(text: string): TextInfo {
  const names: Record<number,string> = { 9: 'Tab',0xa0: 'Non-breaking space',0x200b: 'Zero-width space',0x200c: 'Zero-width non-joiner',0x200d: 'Zero-width joiner',0x200e: 'Left-to-right mark',0x200f: 'Right-to-left mark',0x202a: 'Left-to-right embedding',0x202b: 'Right-to-left embedding',0x202c: 'Pop directional formatting',0x202d: 'Left-to-right override',0x202e: 'Right-to-left override',0x2060: 'Word joiner',0x2066: 'Left-to-right isolate',0x2067: 'Right-to-left isolate',0x2068: 'First-strong isolate',0x2069: 'Pop directional isolate',0xfeff: 'BOM / zero-width no-break space' };
  const lookalikes: Record<string,string> = { 'а': 'Cyrillic a', 'е': 'Cyrillic e','о': 'Cyrillic o','р': 'Cyrillic p','с': 'Cyrillic c','х': 'Cyrillic x','А': 'Cyrillic A','В': 'Cyrillic B','Е': 'Cyrillic E','О': 'Cyrillic O','Р': 'Cyrillic P','С': 'Cyrillic C','Х': 'Cyrillic X','ο': 'Greek omicron' };
  const found = new Map<number,TextInfo['unusual'][number]>(); let line = 1; let column = 1; let previousCR = false;
  for (const char of text) {
    const code = char.codePointAt(0)!; const name = names[code] || lookalikes[char] || (code < 32 && ![10,13].includes(code) ? 'Control character' : '');
    if (name) { const item = found.get(code); if (item) item.count++; else found.set(code,{ code: `U+${code.toString(16).toUpperCase().padStart(4,'0')}`,name,count: 1,line,column }); }
    if (char === '\r') { line++; column = 1; } else if (char === '\n') { if (!previousCR) line++; column = 1; } else column++;
    previousCR = char === '\r';
  }
  const crlf = (text.match(/\r\n/g) ?? []).length;
  return { characters: text.length,lines: linesOf(text).length,lf: (text.match(/\n/g) ?? []).length - crlf,crlf,cr: (text.match(/\r/g) ?? []).length - crlf,finalNewline: /[\r\n]$/.test(text),bom: text.startsWith('\uFEFF'),unusual: [...found.values()] };
}
export function visibleDiffText(value: string) {
  return value.replace(/[\u0000-\u0009\u000b-\u001f\u007f\u00a0\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g,char => char === '\t' ? '⇥' : char === '\r' ? '⟦CR⟧' : `⟦U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4,'0')}⟧`);
}
function parseJson(text: string) {
  const errors: ParseError[] = []; const source = text.replace(/^\uFEFF/,'');
  const tree = parseTree(source,errors,{ disallowComments: true,allowTrailingComma: false,allowEmptyContent: false });
  if (errors.length || !tree) throw new Error(`Invalid JSON: ${errors.length ? printParseErrorCode(errors[0].error) : 'empty input'}.`);
  let nodes = 0;
  const inspect = (node: Node,depth: number) => {
    if (depth > 50 || ++nodes > 50000) throw new Error('Use JSON with at most 50 nesting levels and 50,000 values.');
    if (node.type === 'object') { const keys = new Set<string>(); for (const property of node.children ?? []) { const key = property.children![0].value as string; if (keys.has(key)) throw new Error('Duplicate JSON object keys are ambiguous. Remove them before comparing.'); keys.add(key); inspect(property.children![1],depth + 1); } }
    else if (node.type === 'array') for (const item of node.children ?? []) inspect(item,depth + 1);
    else if (node.type === 'number' && (!Number.isFinite(node.value) || (Number.isInteger(node.value) && !Number.isSafeInteger(node.value)))) throw new Error('A number exceeds safe JavaScript precision. Use Text mode to compare the exact numeric text.');
  };
  inspect(tree,0); return JSON.parse(source) as unknown;
}
function parseEnv(text: string) {
  const result: Record<string,string> = Object.create(null);
  for (const [index,line] of text.replace(/^\uFEFF/,'').split(/\r\n|\r|\n/).entries()) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) throw new Error(`.env line ${index + 1}: use one KEY=value per line. Shell expressions are never evaluated.`);
    if (Object.hasOwn(result,match[1])) throw new Error(`Duplicate .env key on line ${index + 1}.`);
    let value = match[2];
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0]; let end = -1; let escaped = false;
      for (let i = 1; i < value.length; i++) { if (value[i] === quote && !escaped) { end = i; break; } escaped = value[i] === '\\' && !escaped; }
      if (end < 1 || !/^\s*(?:#.*)?$/.test(value.slice(end + 1))) throw new Error(`.env line ${index + 1}: close the quoted value on the same line.`); value = value.slice(1,end);
    }
    else value = value.replace(/\s+#.*$/,'').trimEnd();
    result[match[1]] = value;
  }
  return result;
}
function parseCsv(text: string) {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/,''),{ skipEmptyLines: true });
  if (parsed.errors.some(error => error.code !== 'UndetectableDelimiter')) throw new Error('Invalid CSV: check quoting and delimiters.');
  const [headers,...rows] = parsed.data;
  if (!headers?.length || headers.some(header => !header.trim()) || new Set(headers).size !== headers.length) throw new Error('CSV needs a header row with unique, nonempty column names.');
  if (rows.length > 10000 || headers.length > 200) throw new Error('Use at most 10,000 CSV records and 200 columns.');
  return rows.map((row,index) => { if (row.length !== headers.length) throw new Error(`CSV record ${index + 1}: the field count differs from the header.`); return Object.fromEntries(headers.map((header,i) => [header,row[i]])); });
}
type Leaf = { parts: string[]; value: unknown; key: string };
function flatten(value: unknown,keys: string[]) {
  const leaves = new Map<string,Leaf>(); const orders = new Map<string,string[]>(); let budget = 0;
  const visit = (item: unknown,parts: string[],key: string,depth: number) => {
    if (depth > 50 || ++budget > 50000) throw new Error('Use at most 50 nesting levels and 50,000 values.');
    if (Array.isArray(item) && item.length) {
      const keyed = keys.length > 0 && item.some(own); const used = new Set<string>(); const order: string[] = [];
      item.forEach((child,index) => {
        let identity = String(index);
        if (keyed) {
          if (!own(child) || keys.some(name => !Object.hasOwn(child,name) || child[name] === null || !['string','number','boolean'].includes(typeof child[name]) || child[name] === '')) throw new Error('Every matched record needs nonempty scalar values for all selected key columns.');
          identity = '@' + JSON.stringify(keys.map(name => child[name]));
          if (used.has(identity)) throw new Error('Duplicate record keys are ambiguous. Choose a unique key or a combination of columns.');
          used.add(identity); order.push(identity);
        }
        visit(child,[...parts,identity],key,depth + 1);
      });
      if (keyed) orders.set(pathOf(parts),order);
    } else if (own(item) && Object.keys(item).length) for (const name of Object.keys(item).sort()) visit(item[name],[...parts,name],sensitiveDiffKey(key) ? key : name,depth + 1);
    else leaves.set(pathOf(parts),{ parts,value: item,key });
  };
  visit(value,[],'',0); return { leaves,orders };
}
function movedCount(before: string[],after: string[]) {
  const positions = new Map(after.map((value,i) => [value,i])); const sequence = before.filter(value => positions.has(value)).map(value => positions.get(value)!); const tails: number[] = [];
  for (const value of sequence) { let lo = 0; let hi = tails.length; while (lo < hi) { const mid = (lo + hi) >>> 1; if (tails[mid] < value) lo = mid + 1; else hi = mid; } tails[lo] = value; }
  return sequence.length - tails.length;
}

export function compareFiles(before: string,after: string,options: CompareOptions): CompareResult {
  checkDiffInput(before); checkDiffInput(after); validateOptions(options);
  const redactor = createDiffRedactor(options.redactions); let exactLeft = redactor.text(before); let exactRight = redactor.text(after);
  const infoA = diffTextInfo(before); const infoB = diffTextInfo(after); const entries: CompareEntry[] = []; const warnings: string[] = []; const rules: string[] = [];
  let left = ''; let right = ''; let reordered = 0;
  if (options.whitespace !== 'exact') rules.push(options.whitespace === 'trim' ? 'Ignore leading / trailing ASCII spaces and tabs' : 'Ignore all ASCII spaces and tabs');
  if (options.ignoreCase) rules.push('Ignore string case'); if (options.ignoreEol) rules.push('Ignore line-ending style');
  if (options.timestamps) rules.push('Ignore ISO timestamp-shaped text'); if (options.uuids) rules.push('Ignore UUID-shaped text');
  if (options.ignoreLiterals.length) rules.push(`${options.ignoreLiterals.length} literal comparison rules`);
  if (options.ignorePaths.length) rules.push(`${options.ignorePaths.length} field-path ignore rules`);
  if (options.numericTolerance) rules.push(`Numeric absolute tolerance: ${options.numericTolerance}`);
  const expect = (path: string) => options.expectedPaths.length ? options.expectedPaths.some(pattern => matchesDiffPath(path,pattern)) : null;
  const push = (entry: Omit<CompareEntry,'id'>) => { if (entries.length >= 5000) throw new Error('More than 5,000 change blocks. Compare smaller sections. No partial result was produced.'); entries.push({ id: `change-${entries.length + 1}`,...entry }); };
  if (options.mode === 'text') {
    const a = linesOf(before); const b = linesOf(after);
    for (const line of [...a,...b]) line.normalized = normalize(line.content,options) + (options.ignoreEol && line.eol ? '\n' : line.eol);
    const changes = diffArrays(a,b,{ comparator: (a,b) => a.normalized === b.normalized,timeout: 2000,maxEditLength: 20000 });
    if (!changes) throw new Error('Exact comparison exceeded the processing limit. Compare smaller sections or enable a relevant ignore rule.');
    const safeA = linesOf(exactLeft); const safeB = linesOf(exactRight);
    const previewA: string[] = []; const previewB: string[] = [];
    const safeNormalized = (line: Line) => normalize(line.content,options) + (options.ignoreEol && line.eol ? '\n' : line.eol);
    const extract = (safe: Line[],start: number,count: number) => safe.slice(start,start + count).map(line => line.raw).join('');
    const context = (safe: Line[],start: number,count: number) => extract(safe,Math.max(0,start - options.context),Math.min(safe.length,start + count + options.context) - Math.max(0,start - options.context));
    let ai = 0; let bi = 0;
    for (let i = 0; i < changes.length; i++) {
      const part = changes[i];
      if (!part.added && !part.removed) {
        for (let j = 0; j < part.count; j++) {
          if (a[ai].raw !== b[bi].raw) push({ path: `line:${ai + 1}`,kind: 'changed',ignored: true,expected: null,before: extract(safeA,ai,1),after: extract(safeB,bi,1),contextBefore: context(safeA,ai,1),contextAfter: context(safeB,bi,1),lineA: ai + 1,lineB: bi + 1,reasons: ['Equal under the active comparison rules'] });
          // Use a common masked representative for equal comparison tokens. Mask first:
          // normalization can otherwise alter a private-key delimiter and defeat detection.
          const preview = safeNormalized(safeA[ai]); previewA.push(preview); previewB.push(preview);
          ai++; bi++;
        }
      } else {
        const startA = ai; const startB = bi;
        while (i < changes.length && (changes[i].added || changes[i].removed)) { if (changes[i].removed) ai += changes[i].count; else bi += changes[i].count; i++; } i--;
        previewA.push(...safeA.slice(startA,ai).map(safeNormalized)); previewB.push(...safeB.slice(startB,bi).map(safeNormalized));
        push({ path: `line:${startA + 1}`,kind: ai === startA ? 'added' : bi === startB ? 'removed' : 'changed',ignored: false,expected: null,before: extract(safeA,startA,ai - startA),after: extract(safeB,startB,bi - startB),contextBefore: context(safeA,startA,ai - startA),contextAfter: context(safeB,startB,bi - startB),lineA: startA + 1,lineB: startB + 1,reasons: [] });
      }
    }
    // Exact, unique moved blocks only. Repeated or edited blocks are left as ordinary changes.
    const deleted = new Map<string,CompareEntry[]>(); const added = new Map<string,CompareEntry[]>();
    for (const entry of entries) if (!entry.ignored && ['added','removed'].includes(entry.kind)) { const content = entry.kind === 'removed' ? entry.before : entry.after; if (content.replace(/\s/g,'').length < 12) continue; const map = entry.kind === 'removed' ? deleted : added; map.set(content,[...(map.get(content) ?? []),entry]); }
    for (const [content,removed] of deleted) { const inserted = added.get(content); if (removed.length === 1 && inserted?.length === 1) { reordered++; removed[0].kind = 'moved'; inserted[0].kind = 'moved'; removed[0].reasons.push(`Exact block moved to right line ${inserted[0].lineB}`); inserted[0].reasons.push(`Exact block moved from left line ${removed[0].lineA}`); } }
    // Comparison previews are derived, never written back to source editors or downloads.
    left = previewA.join(''); right = previewB.join('');
    if (options.numericTolerance) warnings.push('Numeric tolerance applies to JSON numbers only.');
  } else {
    const parse = options.mode === 'json' ? parseJson : options.mode === 'csv' ? parseCsv : parseEnv;
    const parsedA = parse(before); const parsedB = parse(after);
    const maskStructured = (parsed: unknown,source: string) => {
      const safe = redactor.value(parsed);
      if (options.mode === 'json') return JSON.stringify(safe,null,2);
      if (options.mode === 'env') return Object.entries(safe as Record<string,unknown>).map(([key,value]) => `${key}=${JSON.stringify(value)}`).join('\n');
      const headers = Papa.parse<string[]>(source.replace(/^\uFEFF/,''),{ preview: 1 }).data[0];
      return Papa.unparse({ fields: headers.map(header => redactor.text(header)),data: (safe as Record<string,unknown>[]).map(row => headers.map(header => row[redactor.text(header)] ?? '')) });
    };
    exactLeft = maskStructured(parsedA,before); exactRight = maskStructured(parsedB,after);
    const a = flatten(parsedA,options.keys); const b = flatten(parsedB,options.keys);
    if (options.mode === 'csv') {
      const columnsA = Object.keys((parsedA as Record<string,unknown>[])[0] ?? {}); const columnsB = Object.keys((parsedB as Record<string,unknown>[])[0] ?? {});
      // Header-only tables still need structural comparison.
      const headers = (text: string) => Papa.parse<string[]>(text.replace(/^\uFEFF/,''),{ preview: 1 }).data[0];
      a.leaves.set('/$columns',{ parts: ['$columns'],key: '',value: columnsA.length ? columnsA.sort() : headers(before).sort() });
      b.leaves.set('/$columns',{ parts: ['$columns'],key: '',value: columnsB.length ? columnsB.sort() : headers(after).sort() });
      warnings.push('CSV cells are strings. Record keys are exact and case-sensitive.');
    }
    for (const [path,order] of a.orders) reordered += movedCount(order,b.orders.get(path) ?? []);
    const displayPath = (leaf: Leaf) => pathOf(leaf.parts.map(part => part.startsWith('@') && options.keys.some(sensitiveDiffKey) ? redactor.hide(part) : redactor.text(part)));
    const safeValue = (leaf: Leaf | undefined) => leaf ? JSON.stringify(redactor.value(leaf.value,leaf.key)) : '';
    const previewA: string[] = []; const previewB: string[] = [];
    for (const path of [...new Set([...a.leaves.keys(),...b.leaves.keys()])].sort()) {
      const av = a.leaves.get(path); const bv = b.leaves.get(path); const sample = av ?? bv!; const label = displayPath(sample);
      const as = safeValue(av); const bs = safeValue(bv);
      const equal = !!av && !!bv && JSON.stringify(av.value) === JSON.stringify(bv.value);
      const ignoredPath = options.ignorePaths.some(pattern => matchesDiffPath(path,pattern));
      let ignored = ignoredPath; const reasons: string[] = ignoredPath ? ['Matched an ignored field path'] : [];
      if (!equal && av && bv && typeof av.value === 'string' && typeof bv.value === 'string' && normalize(av.value,options) === normalize(bv.value,options)) { ignored = true; reasons.push('Strings equal under comparison rules'); }
      if (!equal && av && bv && typeof av.value === 'number' && typeof bv.value === 'number' && options.numericTolerance > 0 && Math.abs(av.value - bv.value) <= options.numericTolerance + Math.min(options.numericTolerance * 1e-12,Number.EPSILON * Math.max(1,Math.abs(av.value),Math.abs(bv.value)) * 4)) { ignored = true; reasons.push('Within the numeric tolerance'); }
      if (av && !ignored) previewA.push(`${label} = ${as}`); if (bv && !ignored) previewB.push(`${label} = ${bs}`);
      if (!equal) push({ path: label,kind: !av ? 'added' : !bv ? 'removed' : 'changed',ignored,expected: ignored ? null : expect(path),before: as,after: bs,contextBefore: as,contextAfter: bs,reasons });
    }
    left = previewA.join('\n'); right = previewB.join('\n');
    warnings.push('Structured review compares values; formatting, comments and object-key order are excluded.');
    if (options.mode === 'env') warnings.push('.env values are literal, single-line strings. No expansion or escape evaluation.');
    if (options.mode === 'csv' && !options.keys.length) warnings.push('Rows are matched by position. Choose record keys to match reordered rows.');
  }
  if (infoA.crlf !== infoB.crlf || infoA.lf !== infoB.lf || infoA.cr !== infoB.cr) warnings.push('Line-ending counts differ. Inspect file details for LF / CRLF / CR.');
  if (infoA.finalNewline !== infoB.finalNewline) warnings.push('Only one source ends with a newline.');
  if (infoA.bom !== infoB.bom) warnings.push('Only one source starts with a byte-order mark.');
  const meaningful = entries.filter(entry => !entry.ignored);
  return { entries,meaningful: meaningful.length,ignored: entries.length - meaningful.length,expected: meaningful.filter(entry => entry.expected === true).length,unexpected: meaningful.filter(entry => entry.expected === false).length,reordered,left,right,exactLeft,exactRight,infoA,infoB,warnings,rules,maskedValues: redactor.count(),mode: options.mode };
}

export function rawDiffPatch(before: string,after: string) {
  checkDiffInput(before); checkDiffInput(after);
  const patch = createTwoFilesPatch('original.txt','changed.txt',before,after,'','',{ context: 3,timeout: 2000,maxEditLength: 20000 });
  if (patch === undefined) throw new Error('Patch creation exceeded the limit. Compare smaller sections.');
  return patch;
}
