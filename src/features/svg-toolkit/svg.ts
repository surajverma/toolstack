/** Deliberately small static SVG profile. Unsupported features are reported. */
const SVG_NS = 'http://www.w3.org/2000/svg';
const TAGS = new Set([
  'svg',
  'g',
  'defs',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'title',
  'desc',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'pattern',
  'symbol',
  'use',
]);
const ATTRIBUTES = new Set([
  'id',
  'xmlns',
  'xmlns:xlink',
  'viewBox',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'd',
  'points',
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'transform',
  'gradientTransform',
  'patternTransform',
  'gradientUnits',
  'patternUnits',
  'patternContentUnits',
  'offset',
  'stop-color',
  'stop-opacity',
  'clip-path',
  'clip-rule',
  'mask',
  'maskUnits',
  'maskContentUnits',
  'href',
  'xlink:href',
  'preserveAspectRatio',
  'spreadMethod',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'dx',
  'dy',
  'role',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'vector-effect',
]);
const PAINT = new Set(['fill', 'stroke', 'stop-color']);
const ID = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const LOCAL_URL = /^url\(\s*#([A-Za-z_][A-Za-z0-9_.-]*)\s*\)$/;
export type SvgOptions = {
  prefix: string;
  responsive: boolean;
  currentColor: boolean;
  removeDescriptions: boolean;
};
export const DEFAULT_SVG_OPTIONS: SvgOptions = {
  prefix: 'icon-',
  responsive: true,
  currentColor: false,
  removeDescriptions: false,
};

function elements(root: Element): Element[] {
  const output: Element[] = [];
  const queue = [root];
  while (queue.length) {
    const node = queue.pop()!;
    output.push(node);
    if (output.length > 5000)
      throw new Error('Use an SVG with fewer than 5,000 elements.');
    for (const child of Array.from(node.childNodes))
      if (child.nodeType === 1) queue.push(child as Element);
  }
  return output;
}

export function prepareSvg(
  source: string,
  options: SvgOptions = DEFAULT_SVG_OPTIONS,
) {
  if (source.length > 512000)
    throw new Error('Keep SVG source below 512,000 characters.');
  if (/<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error('DOCTYPE and ENTITY declarations are unsupported.');
  if (options.prefix && !/^[A-Za-z_][A-Za-z0-9_-]{0,29}$/.test(options.prefix))
    throw new Error(
      'Use an ID prefix starting with a letter or underscore, up to 30 characters.',
    );
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = document.documentElement;
  if (
    !root ||
    root.localName !== 'svg' ||
    root.namespaceURI !== SVG_NS ||
    document.getElementsByTagName('parsererror').length
  )
    throw new Error(
      'Choose well-formed SVG with xmlns="http://www.w3.org/2000/svg".',
    );
  const all = elements(root);
  const changes = new Map<string, number>();
  const changed = (message: string) =>
    changes.set(message, (changes.get(message) || 0) + 1);
  for (const node of all.reverse()) {
    if (
      node !== root &&
      (node.namespaceURI !== SVG_NS ||
        !TAGS.has(node.localName) ||
        (options.removeDescriptions &&
          ['title', 'desc'].includes(node.localName)))
    ) {
      node.parentNode?.removeChild(node);
      changed(`Removed <${node.tagName}>`);
      continue;
    }
    if (node.attributes.length > 60)
      throw new Error('An element has too many attributes.');
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name,
        value = attribute.value.trim();
      const namespaced =
        !!attribute.namespaceURI &&
        ![
          'http://www.w3.org/2000/xmlns/',
          'http://www.w3.org/1999/xlink',
        ].includes(attribute.namespaceURI);
      const badLink =
        (name === 'href' || name === 'xlink:href') &&
        (!value.startsWith('#') || !ID.test(value.slice(1)));
      const badUrl = /url\s*\(/i.test(value) && !LOCAL_URL.test(value);
      if (
        !ATTRIBUTES.has(name) ||
        namespaced ||
        badLink ||
        badUrl ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) ||
        (/javascript\s*:|data\s*:|https?\s*:|\/\//i.test(value) &&
          !name.startsWith('xmlns'))
      ) {
        node.removeAttributeNode(attribute);
        changed(`Removed attribute ${name}`);
      }
    }
    for (const child of Array.from(node.childNodes))
      if (child.nodeType === 8 || child.nodeType === 7) {
        node.removeChild(child);
        changed('Removed comment or processing instruction');
      }
  }
  const remaining = elements(root);
  const ids = new Map<string, string>();
  for (const node of remaining) {
    const id = node.getAttribute('id');
    if (!id) continue;
    if (!ID.test(id)) {
      node.removeAttribute('id');
      changed('Removed unsupported ID');
      continue;
    }
    if (ids.has(id))
      throw new Error(`Duplicate ID “${id}”. Resolve it before exporting.`);
    ids.set(id, options.prefix + id);
  }
  for (const node of remaining) {
    for (const attribute of Array.from(node.attributes)) {
      let value = attribute.value;
      if (attribute.name === 'id') value = ids.get(value)!;
      else if (attribute.name === 'href' || attribute.name === 'xlink:href') {
        if (!ids.has(value.slice(1))) {
          node.removeAttributeNode(attribute);
          changed('Removed broken local reference');
          continue;
        }
        value = '#' + ids.get(value.slice(1));
      } else if (LOCAL_URL.test(value)) {
        const id = value.match(LOCAL_URL)![1];
        if (!ids.has(id)) {
          node.removeAttributeNode(attribute);
          changed('Removed broken local reference');
          continue;
        }
        value = `url(#${ids.get(id)})`;
      } else if (
        ['aria-labelledby', 'aria-describedby'].includes(attribute.name)
      )
        value = value
          .split(/\s+/)
          .filter((id) => ids.has(id))
          .map((id) => ids.get(id))
          .join(' ');
      if (
        options.currentColor &&
        PAINT.has(attribute.name) &&
        !/^(none|transparent|url\()/i.test(value)
      ) {
        value = 'currentColor';
        changed('Changed paint to currentColor');
      }
      attribute.value = value;
    }
  }
  if (!root.hasAttribute('viewBox')) {
    const numeric = (value: string | null) =>
      value?.match(/^(\d+(?:\.\d+)?)(?:px)?$/)?.[1];
    const width = numeric(root.getAttribute('width')),
      height = numeric(root.getAttribute('height'));
    if (!width || !height || Number(width) <= 0 || Number(height) <= 0)
      throw new Error('Add a viewBox or positive width and height in pixels.');
    root.setAttribute('viewBox', `0 0 ${width} ${height}`);
    changed('Added viewBox from dimensions');
  }
  const viewBox = root
    .getAttribute('viewBox')!
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    viewBox.length !== 4 ||
    viewBox.some(
      (value) => !Number.isFinite(value) || Math.abs(value) > 1000000,
    ) ||
    viewBox[2] <= 0 ||
    viewBox[3] <= 0
  )
    throw new Error('Use a finite viewBox with positive dimensions.');
  if (options.responsive) {
    root.removeAttribute('width');
    root.removeAttribute('height');
  }
  root.setAttribute('xmlns', SVG_NS);
  const svg = new XMLSerializer().serializeToString(root);
  const jsx = svgToJsx(root);
  return {
    svg,
    jsx,
    viewBox,
    changes: [...changes].map(
      ([message, count]) => `${message}${count > 1 ? ` (${count})` : ''}`,
    ),
    elements: remaining.length,
    originalBytes: new TextEncoder().encode(source).length,
    outputBytes: new TextEncoder().encode(svg).length,
  };
}

function svgToJsx(root: Element) {
  function render(node: Node): string {
    if (node.nodeType === 3 || node.nodeType === 4)
      return node.nodeValue ? `{${JSON.stringify(node.nodeValue)}}` : '';
    if (node.nodeType !== 1) return '';
    const element = node as Element;
    const props = Array.from(element.attributes)
      .map((attribute) => {
        const name =
          attribute.name === 'xmlns:xlink'
            ? 'xmlnsXlink'
            : attribute.name === 'xlink:href'
              ? 'xlinkHref'
              : attribute.name.startsWith('aria-')
                ? attribute.name
                : attribute.name.replace(/-([a-z])/g, (_, char: string) =>
                    char.toUpperCase(),
                  );
        return ` ${name}={${JSON.stringify(attribute.value)}}`;
      })
      .join('');
    const children = Array.from(element.childNodes).map(render).join('');
    return children
      ? `<${element.tagName}${props}>${children}</${element.tagName}>`
      : `<${element.tagName}${props} />`;
  }
  return `export default function Icon() {\n  return (${render(root)});\n}\n`;
}

export const SVG_SAMPLE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><title>Stacked tools</title><defs><linearGradient id="paint"><stop stop-color="#0284c7"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect x="12" y="12" width="96" height="96" rx="24" fill="url(#paint)"/><path d="M36 40h48M36 60h48M36 80h28" stroke="white" stroke-width="8" stroke-linecap="round"/></svg>';
