export type JsonDiffKind = 'added' | 'removed' | 'changed';
export interface JsonDiffEntry { path: string; kind: JsonDiffKind; before?: unknown; after?: unknown }
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const childPath = (base: string, key: string) => /^[A-Za-z_$][\w$]*$/.test(key) ? `${base}.${key}` : `${base}[${JSON.stringify(key)}]`;

export function diffJson(before: unknown, after: unknown, path = '$'): JsonDiffEntry[] {
  if (Object.is(before, after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    const out: JsonDiffEntry[] = [];
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index++) {
      const itemPath = `${path}[${index}]`;
      if (index >= before.length) out.push({ path: itemPath, kind: 'added', after: after[index] });
      else if (index >= after.length) out.push({ path: itemPath, kind: 'removed', before: before[index] });
      else out.push(...diffJson(before[index], after[index], itemPath));
    }
    return out;
  }
  if (record(before) && record(after)) {
    const out: JsonDiffEntry[] = [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const itemPath = childPath(path, key);
      if (!(key in before)) out.push({ path: itemPath, kind: 'added', after: after[key] });
      else if (!(key in after)) out.push({ path: itemPath, kind: 'removed', before: before[key] });
      else out.push(...diffJson(before[key], after[key], itemPath));
    }
    return out;
  }
  return [{ path, kind: 'changed', before, after }];
}
