import { Parser } from 'htmlparser2';

export type SiteMetadata = {
  siteName: string;
  title: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
  locale: string;
  theme: string;
  noindex: boolean;
};
export const DEFAULT_SITE: SiteMetadata = {
  siteName: 'My project',
  title: 'A useful new project',
  description: 'A clear description of what this project helps people do.',
  url: 'https://example.com/',
  image: '',
  imageAlt: '',
  locale: 'en_US',
  theme: '#0284c7',
  noindex: false,
};
export const escapeMarkup = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function publicHttpUrl(value: string, label = 'URL') {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Enter an absolute HTTP(S) ${label}.`);
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error(`${label} must use HTTP(S) without embedded credentials.`);
  if (url.href.length > 2048) throw new Error(`${label} is too long.`);
  return url;
}

export function metadataOutput(site: SiteMetadata, includeIcons = false) {
  const url = publicHttpUrl(site.url, 'page URL');
  url.hash = '';
  if (!site.title.trim() || !site.description.trim())
    throw new Error('Enter a title and description.');
  if (
    site.title.length > 300 ||
    site.description.length > 1000 ||
    site.siteName.length > 200
  )
    throw new Error('Title, description or site name is too long.');
  if (
    !/^#[0-9a-f]{6}$/i.test(site.theme) ||
    !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(site.locale)
  )
    throw new Error('Use a HEX theme color and locale such as en_US.');
  const image = site.image
    ? publicHttpUrl(site.image, 'social image URL').href
    : '';
  const values: [string, string, string][] = [
    ['name', 'description', site.description],
    ['name', 'robots', site.noindex ? 'noindex, nofollow' : 'index, follow'],
    ['name', 'theme-color', site.theme],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', site.siteName],
    ['property', 'og:title', site.title],
    ['property', 'og:description', site.description],
    ['property', 'og:url', url.href],
    ['property', 'og:locale', site.locale],
    ['name', 'twitter:card', image ? 'summary_large_image' : 'summary'],
    ['name', 'twitter:title', site.title],
    ['name', 'twitter:description', site.description],
  ];
  if (image)
    values.push(
      ['property', 'og:image', image],
      ['property', 'og:image:alt', site.imageAlt],
      ['name', 'twitter:image', image],
      ['name', 'twitter:image:alt', site.imageAlt],
    );
  const html = `<title>${escapeMarkup(site.title)}</title>\n<link rel="canonical" href="${escapeMarkup(url.href)}">\n${values.map(([kind, name, content]) => `<meta ${kind}="${name}" content="${escapeMarkup(content)}">`).join('\n')}`;
  const next = {
    title: site.title,
    ...(includeIcons
      ? {
          icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
          manifest: '/site.webmanifest',
        }
      : {}),
    description: site.description,
    alternates: { canonical: url.href },
    robots: { index: !site.noindex, follow: !site.noindex },
    openGraph: {
      type: 'website',
      siteName: site.siteName,
      title: site.title,
      description: site.description,
      url: url.href,
      locale: site.locale,
      ...(image ? { images: [{ url: image, alt: site.imageAlt }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: site.title,
      description: site.description,
      ...(image ? { images: [{ url: image, alt: site.imageAlt }] } : {}),
    },
  };
  return {
    html,
    next: `import type { Metadata, Viewport } from 'next';\n\nexport const metadata: Metadata = ${JSON.stringify(next, null, 2)};\n\nexport const viewport: Viewport = { themeColor: ${JSON.stringify(site.theme)} };\n`,
    url: url.href,
    warnings: [
      ...(site.title.length > 65
        ? ['Long titles may be truncated in previews.']
        : []),
      ...(site.description.length > 170
        ? ['Long descriptions may be truncated in previews.']
        : []),
      ...(!image ? ['No social image URL supplied.'] : []),
      ...(image && !site.imageAlt.trim()
        ? ['Add social image alternative text.']
        : []),
    ],
  };
}

/** SAX parsing never creates browser elements or loads image/script URLs. */
export function inspectMetadata(source: string) {
  if (source.length > 512000)
    throw new Error('Paste HTML below 512,000 characters.');
  const tags = new Map<string, string[]>();
  let titleDepth = 0,
    title = '',
    titleCount = 0,
    count = 0;
  let inBody = false;
  let svgDepth = 0;
  const put = (key: string, value: string) =>
    tags.set(key, [...(tags.get(key) || []), value]);
  const parser = new Parser(
    {
      onopentag(name, attributes) {
        if (++count > 20000)
          throw new Error('HTML contains too many elements.');
        if (name === 'body') inBody = true;
        if (name === 'svg') svgDepth++;
        if (inBody || svgDepth) return;
        if (name === 'title') {
          titleDepth++;
          titleCount++;
        }
        if (name === 'meta') {
          const key = (
            attributes.name ||
            attributes.property ||
            ''
          ).toLowerCase();
          if (key) put(key, attributes.content || '');
        }
        if (
          name === 'link' &&
          attributes.rel?.toLowerCase().split(/\s+/).includes('canonical')
        )
          put('canonical', attributes.href || '');
      },
      ontext(text) {
        if (titleDepth && titleCount === 1) title += text;
      },
      onclosetag(name) {
        if (name === 'svg') svgDepth = Math.max(0, svgDepth - 1);
        if (name === 'title') titleDepth = Math.max(0, titleDepth - 1);
      },
    },
    { decodeEntities: true },
  );
  parser.write(source);
  parser.end();
  const first = (key: string) => tags.get(key)?.[0] || '';
  const warnings = [...tags]
    .filter(([, values]) => values.length > 1)
    .map(([key]) => `Duplicate ${key} tags; the first is imported.`);
  if (titleCount > 1) warnings.push('Multiple title tags were found.');
  return {
    values: {
      title: title.trim() || first('og:title'),
      description: first('description') || first('og:description'),
      siteName: first('og:site_name'),
      url: first('canonical') || first('og:url'),
      image: first('og:image') || first('twitter:image'),
      imageAlt: first('og:image:alt'),
      locale: first('og:locale'),
      theme: first('theme-color'),
      noindex: /\bnoindex\b/i.test(first('robots')),
    },
    warnings,
  };
}

export function sitemapXml(base: string, source: string) {
  const origin = publicHttpUrl(base);
  const paths = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (paths.length > 2000) throw new Error('Use up to 2,000 sitemap URLs.');
  const urls = new Set<string>();
  for (const path of paths) {
    const url = publicHttpUrl(new URL(path, origin).href);
    if (url.origin !== origin.origin)
      throw new Error('Every sitemap URL must belong to the same origin.');
    url.hash = '';
    urls.add(url.href);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map((url) => `  <url><loc>${escapeMarkup(url)}</loc></url>`).join('\n')}\n</urlset>`;
}
