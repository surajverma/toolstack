const SECRET_KEY = /password|passwd|(?:^|_)pwd(?:$|_)|secret|token|authorization|cookie|api[-_]?key|private[-_]?key|session[-_]?id|credential/i;
export function sensitiveDiffKey(key: string) { return SECRET_KEY.test(key); }

/** Per-comparison aliases preserve equality, without exporting originals or an alias map. */
export function createDiffRedactor(literals: string[]) {
  const aliases = new Map<string,string>(); let count = 0;
  const hide = (value: string) => {
    if (!aliases.has(value)) aliases.set(value,`[PRIVATE_${++count}]`);
    return aliases.get(value)! + (value.match(/\r\n|\r|\n/g) ?? []).map(eol => eol + '[PRIVATE_LINE]').join('');
  };
  const text = (value: string): string => {
    const source = value.replace(/\[PRIVATE_(\d+)\]/g,'[LITERAL_PRIVATE_$1]');
    let output = source;
    // Use source offsets for valid JSON/JSONC, including entire secret objects/arrays.
    // Replacing from the end retains source positions, and hide() retains line endings.
    if (/^\s*[\[{]/.test(source) && source.length <= 1024 * 1024) {
      try {
        const errors: ParseError[] = []; const tree = parseTree(source.replace(/^\uFEFF/,' '),errors); const ranges: { from: number; to: number }[] = []; let budget = 0;
        const scan = (node: Node,depth: number) => {
          if (depth > 50 || ++budget > 50000) throw new Error('Masking budget reached');
          if (node.type === 'object') for (const property of node.children ?? []) { const [key,child] = property.children!; if (SECRET_KEY.test(String(key.value))) ranges.push({ from: child.offset,to: child.offset + child.length }); else scan(child,depth + 1); }
          else if (node.type === 'array') for (const child of node.children ?? []) scan(child,depth + 1);
        };
        if (tree && !errors.length) { scan(tree,0); for (const range of ranges.sort((a,b) => b.from - a.from)) output = output.slice(0,range.from) + hide(source.slice(range.from,range.to)) + output.slice(range.to); }
      } catch { /* Non-JSON text falls through to the literal and pattern rules. */ }
    }
    output = output.replace(/-----BEGIN [^-\r\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\r\n]*PRIVATE KEY-----/g,hide);
    output = output.replace(/((?:["']?)[\w.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|authorization|cookie|credential)[\w.-]*["']?\s*[:=]\s*)("(?:\\.|[^"\\])*"|'[^']*'|[^\s,;\r\n]+)/gi,(_,prefix: string,secret: string) => prefix + hide(secret));
    output = output.replace(/^(\s*(?:authorization|proxy-authorization|cookie|set-cookie)\s*:\s*)[^\r\n]*/gim,(_,prefix: string) => prefix + hide(_.slice(prefix.length)));
    output = output.replace(/\b(Bearer|Basic)\s+[^\s"',;]+/gi,(_,scheme: string) => scheme + ' ' + hide(_));
    output = output.replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bsk-[A-Za-z0-9_-]{20,}\b/g,hide);
    output = output.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,hide);
    output = output.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,hide);
    output = output.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,hide);
    output = output.replace(/([A-Z]:\\Users\\|\/Users\/|\/home\/)([^\s/\\]+)/gi,(_,prefix: string,name: string) => prefix + hide(name));
    // Local URLs are never opened. Mask login information and every query value.
    output = output.replace(/https?:\/\/[^\s<>"']+/gi,match => {
      try { const url = new URL(match); if (url.username || url.password) { url.username = hide(url.username + ':' + url.password); url.password = ''; } for (const key of [...new Set(url.searchParams.keys())]) { const values = url.searchParams.getAll(key); url.searchParams.delete(key); values.forEach(value => url.searchParams.append(key,hide(value))); } url.hash = url.hash ? hide(url.hash) : ''; return url.toString(); } catch { return match; }
    });
    // Run literal rules last, so masking a field name cannot disable its automatic value rule.
    for (const literal of [...new Set(literals)].filter(Boolean).sort((a,b) => b.length - a.length)) output = output.split(literal).join(hide(literal));
    return output;
  };
  const value = (input: unknown,key = '',depth = 0): unknown => {
    if (depth > 50) throw new Error('Use data with at most 50 nesting levels.');
    if (SECRET_KEY.test(key)) return hide(JSON.stringify(input));
    if (typeof input === 'string') return text(input);
    if (Array.isArray(input)) return input.map(item => value(item,'',depth + 1));
    if (input && typeof input === 'object') return Object.fromEntries(Object.entries(input).map(([name,item]) => [text(name),value(item,name,depth + 1)]));
    return input;
  };
  return { text,value,hide,count: () => count };
}
import { parseTree,type ParseError,type Node } from 'jsonc-parser';
