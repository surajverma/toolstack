export type RobotRule = { allow: boolean; pattern: string; line: number };
type Group = { agents: string[]; rules: RobotRule[] };

export function parseRobots(source: string) {
  if (source.length > 64000)
    throw new Error('Keep robots.txt below 64,000 characters.');
  const groups: Group[] = [];
  const warnings: string[] = [];
  let current: Group | null = null,
    hasRules = false;
  const sitemaps: string[] = [];
  source.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.split('#')[0].trim();
    if (!line) return;
    const colon = line.indexOf(':');
    if (colon < 0) {
      warnings.push(`Line ${index + 1}: missing colon.`);
      return;
    }
    const name = line.slice(0, colon).trim().toLowerCase(),
      value = line.slice(colon + 1).trim();
    if (name === 'user-agent') {
      if (!/^(?:\*|[a-z_-]+)$/i.test(value)) {
        warnings.push(`Line ${index + 1}: unsupported user-agent token.`);
        return;
      }
      if (!current || hasRules) {
        current = { agents: [], rules: [] };
        groups.push(current);
        hasRules = false;
      }
      current.agents.push(value.toLowerCase());
    } else if (name === 'allow' || name === 'disallow') {
      if (!current) {
        warnings.push(`Line ${index + 1}: rule has no user-agent group.`);
        return;
      }
      hasRules = true;
      if (!value) return;
      if (!value.startsWith('/') || value.length > 512) {
        warnings.push(
          `Line ${index + 1}: use a path starting with / below 512 characters.`,
        );
        return;
      }
      current.rules.push({
        allow: name === 'allow',
        pattern: value,
        line: index + 1,
      });
    } else if (name === 'sitemap') {
      try {
        const url = new URL(value);
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.username ||
          url.password
        )
          throw new Error();
        sitemaps.push(url.href);
      } catch {
        warnings.push(
          `Line ${index + 1}: sitemap needs an absolute HTTP(S) URL.`,
        );
      }
    } else
      warnings.push(
        `Line ${index + 1}: ${name} is not evaluated by this tester.`,
      );
  });
  if (groups.reduce((total, group) => total + group.rules.length, 0) > 500)
    throw new Error('Use up to 500 rules.');
  return { groups, warnings, sitemaps };
}

function normalizedOctets(value: string) {
  return (
    value
      .replace(/[^\x00-\x7f]+/g, (text) => encodeURIComponent(text))
      .replace(/%([0-9a-f]{2})/gi, (_, code: string) => {
        const char = String.fromCharCode(Number.parseInt(code, 16));
        return /^[A-Za-z0-9._~-]$/.test(char) ? char : '%' + code.toUpperCase();
      })
      .match(/%[0-9A-F]{2}|./g) || []
  );
}

function pathMatches(pattern: string, path: string, budget: { left: number }) {
  const exact = pattern.endsWith('$');
  const tokens = normalizedOctets(exact ? pattern.slice(0, -1) : pattern),
    target = normalizedOctets(path);
  let previous = new Uint8Array(target.length + 1);
  previous[0] = 1;
  for (const token of tokens) {
    const next = new Uint8Array(target.length + 1);
    if (token === '*') next[0] = previous[0];
    for (let index = 1; index <= target.length; index++) {
      if (--budget.left < 0)
        throw new Error(
          'This rule test is too complex. Use shorter paths or fewer wildcard rules.',
        );
      next[index] =
        token === '*'
          ? previous[index] || next[index - 1]
          : previous[index - 1] && token === target[index - 1]
            ? 1
            : 0;
    }
    previous = next;
  }
  return exact ? !!previous[target.length] : previous.some(Boolean);
}

export function testRobots(source: string, agent: string, input: string) {
  const parsed = parseRobots(source);
  if (!/^[a-z_-]+$/i.test(agent))
    throw new Error('Use a crawler product token such as Googlebot.');
  if (input.length > 2048)
    throw new Error('Test a URL or path below 2,048 characters.');
  const url = new URL(input || '/', 'https://example.invalid');
  const path = url.pathname + url.search;
  let specificity = -1;
  let selected: Group[] = [];
  for (const group of parsed.groups) {
    const score = Math.max(
      -1,
      ...group.agents.map((token) =>
        token === '*'
          ? 0
          : agent.toLowerCase().includes(token)
            ? token.length
            : -1,
      ),
    );
    if (score < 0) continue;
    if (score > specificity) {
      specificity = score;
      selected = [group];
    } else if (score === specificity) selected.push(group);
  }
  let winner: RobotRule | null = null,
    length = -1;
  const budget = { left: 2_000_000 };
  for (const rule of selected.flatMap((group) => group.rules)) {
    if (!pathMatches(rule.pattern, path, budget)) continue;
    const score = normalizedOctets(
      rule.pattern.replace(/\*/g, '').replace(/\$$/, ''),
    ).length;
    if (score > length || (score === length && rule.allow)) {
      winner = rule;
      length = score;
    }
  }
  return {
    allowed: !winner || winner.allow,
    winner,
    path,
    warnings: parsed.warnings,
    group:
      specificity < 0
        ? 'No matching group'
        : [...new Set(selected.flatMap((group) => group.agents))].join(', '),
  };
}

export function defaultRobots(base: string) {
  const origin = new URL(base).origin;
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}
