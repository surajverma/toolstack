type Schema = { type?: string; properties?: Record<string, Schema>; required?: string[]; items?: Schema; anyOf?: Schema[] };

function infer(values: unknown[], depth: number, budget: { nodes: number }): Schema {
  if (depth > 35 || (budget.nodes += values.length) > 50000) throw new Error('Use a smaller sample (up to 50,000 values and 35 nesting levels).');
  if (!values.length) return {};
  const groups = new Map<string, unknown[]>();
  for (const value of values) {
    const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    const items = groups.get(kind) ?? []; items.push(value); groups.set(kind, items);
  }
  const variants: Schema[] = [];
  for (const [kind, samples] of [...groups].sort(([a],[b]) => a.localeCompare(b))) {
    if (kind === 'object') {
      const objects = samples as Record<string, unknown>[];
      const keys = [...new Set(objects.flatMap(Object.keys))].sort();
      variants.push({ type: 'object', properties: Object.fromEntries(keys.map(key => [key, infer(objects.filter(item => Object.hasOwn(item,key)).map(item => item[key]), depth + 1, budget)])), required: keys.filter(key => objects.every(item => Object.hasOwn(item,key))) });
    } else if (kind === 'array') variants.push({ type: 'array', items: infer((samples as unknown[][]).flat(), depth + 1, budget) });
    else variants.push({ type: kind === 'number' && samples.every(value => Number.isInteger(value)) ? 'integer' : kind });
  }
  return variants.length === 1 ? variants[0] : { anyOf: variants };
}

function renderType(schema: Schema, depth = 0): string {
  if (schema.anyOf) return schema.anyOf.map(item => renderType(item, depth)).join(' | ');
  if (schema.type === 'object') {
    const entries = Object.entries(schema.properties ?? {});
    if (!entries.length) return 'Record<string, unknown>';
    const indentation = '  '.repeat(depth);
    return `{\n${entries.map(([key, value]) => `${indentation}  ${JSON.stringify(key)}${schema.required?.includes(key) ? '' : '?'}: ${renderType(value, depth + 1)};`).join('\n')}\n${indentation}}`;
  }
  if (schema.type === 'array') return `Array<${renderType(schema.items ?? {}, depth)}>`;
  return schema.type === 'integer' ? 'number' : schema.type ?? 'unknown';
}

export function inferJson(input: string, rootName = 'Root', style: 'interface' | 'type' = 'interface') {
  if (input.length > 1024 * 1024) throw new Error('Use a JSON sample up to 1 MB.');
  if (rootName.length > 100 || ['bigint','symbol'].includes(rootName)) throw new Error('Choose a TypeScript name up to 100 characters, such as ApiResponse.');
  if (['Array', 'Record'].includes(rootName)) throw new Error('Choose a name other than Array or Record, such as ApiResponse.');
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(rootName) || /^(?:string|number|boolean|null|undefined|any|unknown|never|void|object|interface|type|class|enum|const|let|var|function|default|export|import|extends|implements|new|return|this|typeof|keyof|infer|true|false|switch|case|delete|do|else|for|if|in|instanceof|super|throw|try|while|with|yield|await|break|catch|continue|debugger|finally)$/.test(rootName)) throw new Error('Choose a valid TypeScript name, such as ApiResponse.');
  const parsed: unknown = JSON.parse(input);
  const schema = infer([parsed], 0, { nodes: 0 });
  const definition = renderType(schema);
  const typescript = style === 'interface' && schema.type === 'object' && Object.keys(schema.properties ?? {}).length ? `export interface ${rootName} ${definition}\n` : `export type ${rootName} = ${definition};\n`;
  return { typescript, schema: JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', title: rootName, ...schema }, null, 2) };
}
