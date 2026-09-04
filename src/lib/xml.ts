export const escapeXml = (value: unknown) => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export const xmlName = (name: string, index = 0) => {
  const cleaned = name.trim().replace(/[^A-Za-z0-9_.-]/g, '_').replace(/^[^A-Za-z_]+/, '');
  return cleaned || `field_${index + 1}`;
};
export function formatXml(xml: string) {
  const lines = xml.replace(/>\s*</g, '><').replace(/(>)(<)(\/?)/g, '$1\n$2$3').split('\n');
  let depth = 0;
  return lines.map(line => {
    const trimmed = line.trim();
    if (/^<\//.test(trimmed)) depth = Math.max(0, depth - 1);
    const output = `${'  '.repeat(depth)}${trimmed}`;
    if (/^<[^!?/][^>]*[^/]?>/.test(trimmed) && !/<\/[^>]+>$/.test(trimmed) && !/\/>$/.test(trimmed)) depth++;
    return output;
  }).join('\n');
}
