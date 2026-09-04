export interface CspFinding { level: 'warning' | 'info'; message: string }
export function analyzeCsp(policy: string): CspFinding[] {
  const directives = new Map<string, string[]>();
  for (const part of policy.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length) directives.set(tokens[0].toLowerCase(), tokens.slice(1));
  }
  const findings: CspFinding[] = [];
  if (!directives.has('default-src')) findings.push({ level: 'warning', message: 'Add default-src as a fallback policy.' });
  const script = directives.get('script-src') ?? directives.get('default-src') ?? [];
  if (script.includes("'unsafe-inline'")) findings.push({ level: 'warning', message: "script-src allows 'unsafe-inline'. Prefer nonces or hashes when practical." });
  if (script.includes("'unsafe-eval'")) findings.push({ level: 'warning', message: "script-src allows 'unsafe-eval', which weakens script injection protection." });
  if (script.includes('*')) findings.push({ level: 'warning', message: 'script-src contains a wildcard source.' });
  const objectSrc = directives.get('object-src');
  if (!objectSrc || !objectSrc.includes("'none'")) findings.push({ level: 'warning', message: "Set object-src 'none' unless legacy plug-in content is required." });
  if (!directives.has('frame-ancestors')) findings.push({ level: 'info', message: 'Consider frame-ancestors to control embedding and clickjacking.' });
  if (!directives.has('base-uri')) findings.push({ level: 'info', message: 'Consider base-uri to prevent injected base tags from changing relative URLs.' });
  if (!directives.has('form-action')) findings.push({ level: 'info', message: 'Consider form-action to restrict form submission destinations.' });
  for (const [name, sources] of directives) {
    if (sources.includes('*')) findings.push({ level: 'warning', message: `${name} contains a wildcard source.` });
    if (sources.some(source => source.startsWith('http:'))) findings.push({ level: 'warning', message: `${name} contains an insecure http: source.` });
  }
  if (!findings.length) findings.push({ level: 'info', message: 'No obvious issues found by this lightweight analyzer. Review the policy against your actual application needs.' });
  return findings;
}
