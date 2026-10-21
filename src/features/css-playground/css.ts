export type ColorStop = { color: string; position: number };
export type Gradient = {
  type: 'linear' | 'radial' | 'conic';
  angle: number;
  space: 'srgb' | 'oklab';
  stops: ColorStop[];
};
export const GRADIENT_PRESETS: { name: string; stops: ColorStop[] }[] = [
  {
    name: 'Ocean',
    stops: [
      { color: '#0284c7', position: 0 },
      { color: '#7c3aed', position: 100 },
    ],
  },
  {
    name: 'Sunset',
    stops: [
      { color: '#fb7185', position: 0 },
      { color: '#fbbf24', position: 100 },
    ],
  },
  {
    name: 'Forest',
    stops: [
      { color: '#064e3b', position: 0 },
      { color: '#6ee7b7', position: 100 },
    ],
  },
];
export function hexColor(value: string) {
  if (!/^#[0-9a-f]{6}$/i.test(value))
    throw new Error('Use six-digit HEX colors.');
  return value.toLowerCase();
}
function bounded(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`Use a value from ${min} to ${max}.`);
  return value;
}
export function gradientCss(gradient: Gradient, fallback = false) {
  if (
    !['linear', 'radial', 'conic'].includes(gradient.type) ||
    !['srgb', 'oklab'].includes(gradient.space)
  )
    throw new Error('Unsupported gradient.');
  if (gradient.stops.length < 2 || gradient.stops.length > 12)
    throw new Error('Use 2–12 color stops.');
  const stops = [...gradient.stops]
    .sort((a, b) => a.position - b.position)
    .map((stop) => `${hexColor(stop.color)} ${bounded(stop.position, 0, 100)}%`)
    .join(', ');
  const space = gradient.space === 'oklab' && !fallback ? ' in oklab' : '';
  const angle = bounded(gradient.angle, 0, 360);
  const geometry =
    gradient.type === 'linear'
      ? `${angle}deg`
      : gradient.type === 'radial'
        ? 'circle at center'
        : `from ${angle}deg at center`;
  return `${gradient.type}-gradient(${geometry}${space}, ${stops})`;
}

function splitTopLevel(value: string) {
  const parts: string[] = [];
  let depth = 0,
    start = 0;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '(') depth++;
    if (value[index] === ')') depth--;
    if (depth < 0 || depth > 8) throw new Error('Unsupported gradient syntax.');
    if (value[index] === ',' && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (depth) throw new Error('Unbalanced gradient syntax.');
  parts.push(value.slice(start).trim());
  return parts;
}
export function parseGradient(source: string): Gradient {
  if (source.length > 2048)
    throw new Error('Paste a single gradient below 2 KB.');
  const match = source
    .trim()
    .replace(/^background(?:-image)?\s*:\s*/i, '')
    .replace(/;$/, '')
    .match(/^(linear|radial|conic)-gradient\(([\s\S]*)\)$/i);
  if (!match)
    throw new Error(
      'Paste a linear, radial or conic gradient with HEX color stops.',
    );
  const type = match[1].toLowerCase() as Gradient['type'];
  const parts = splitTopLevel(match[2]);
  let angle = 180;
  let space: Gradient['space'] = 'srgb';
  if (!parts[0].startsWith('#')) {
    let geometry = parts.shift()!;
    if (geometry.endsWith(' in oklab')) {
      space = 'oklab';
      geometry = geometry.slice(0, -9);
    }
    if (type === 'linear' && /^\d+(?:\.\d+)?deg$/.test(geometry))
      angle = Number.parseFloat(geometry);
    else if (type === 'radial' && geometry === 'circle at center') angle = 0;
    else if (
      type === 'conic' &&
      /^from \d+(?:\.\d+)?deg at center$/.test(geometry)
    )
      angle = Number.parseFloat(geometry.slice(5));
    else
      throw new Error(
        'Use an angle in degrees, circle at center, or from Ndeg at center.',
      );
  }
  const parsed = parts.map((part) => {
    const stop = part.match(/^(#[0-9a-f]{6})(?:\s+(\d+(?:\.\d+)?)%)?$/i);
    if (!stop)
      throw new Error(
        'Import supports six-digit HEX colors with optional percentage positions.',
      );
    return {
      color: hexColor(stop[1]),
      position:
        stop[2] === undefined ? undefined : bounded(Number(stop[2]), 0, 100),
    };
  });
  if (parsed.length < 2 || parsed.length > 12)
    throw new Error('Use 2–12 color stops.');
  parsed[0].position ??= 0;
  parsed[parsed.length - 1].position ??= 100;
  // CSS fixes decreasing explicit stops, then distributes omitted stops between anchors.
  let anchor = 0;
  for (let index = 1; index < parsed.length; index++) {
    if (parsed[index].position === undefined) continue;
    const start = parsed[anchor].position!;
    const end = Math.max(start, parsed[index].position!);
    for (let step = anchor + 1; step <= index; step++) {
      parsed[step].position =
        start + ((end - start) * (step - anchor)) / (index - anchor);
    }
    anchor = index;
  }
  const stops = parsed.map((stop) => ({
    color: stop.color,
    position: stop.position!,
  }));
  const gradient: Gradient = {
    type,
    angle,
    space,
    stops,
  };
  gradientCss(gradient);
  return gradient;
}

function rgb(color: string) {
  return hexColor(color)
    .slice(1)
    .match(/../g)!
    .map((channel) => Number.parseInt(channel, 16) / 255);
}
function luminance(channels: number[]) {
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
export function sampledGradientContrast(stops: ColorStop[], text: string) {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const foreground = luminance(rgb(text));
  let minimum = 21;
  for (let sample = 0; sample <= 256; sample++) {
    const position = (sample * 100) / 256;
    const rightIndex = sorted.findIndex((stop) => stop.position >= position);
    const right = rightIndex === -1 ? sorted.at(-1)! : sorted[rightIndex];
    const left = rightIndex <= 0 ? right : sorted[rightIndex - 1];
    const weight =
      right.position === left.position
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              (position - left.position) / (right.position - left.position),
            ),
          );
    const background = luminance(
      rgb(left.color).map(
        (channel, index) =>
          channel * (1 - weight) + rgb(right.color)[index] * weight,
      ),
    );
    minimum = Math.min(
      minimum,
      (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05),
    );
  }
  return minimum;
}

export function gridCss(
  cells: string[],
  columns: number,
  rows: number,
  gap: number,
  minimum: number,
) {
  if (!Number.isInteger(columns) || !Number.isInteger(rows))
    throw new Error('Use whole-number grid dimensions.');
  bounded(columns, 1, 12);
  bounded(rows, 1, 8);
  bounded(gap, 0, 64);
  bounded(minimum, 80, 500);
  if (
    cells.length !== columns * rows ||
    cells.some(
      (cell) => cell !== '.' && !/^[A-Za-z][A-Za-z0-9_-]{0,29}$/.test(cell),
    )
  )
    throw new Error('Use short area names starting with a letter.');
  const areas = [...new Set(cells.filter((cell) => cell !== '.'))];
  for (const area of areas) {
    const indices = cells.flatMap((cell, index) =>
      cell === area ? [index] : [],
    );
    const xs = indices.map((index) => index % columns),
      ys = indices.map((index) => Math.floor(index / columns));
    const left = Math.min(...xs),
      right = Math.max(...xs),
      top = Math.min(...ys),
      bottom = Math.max(...ys);
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++)
        if (cells[y * columns + x] !== area)
          throw new Error(`Area “${area}” must form one rectangle.`);
  }
  const template = Array.from(
    { length: rows },
    (_, row) =>
      `    "${cells.slice(row * columns, (row + 1) * columns).join(' ')}"`,
  ).join('\n');
  const css = `.layout {\n  display: grid;\n  gap: ${gap}px;\n  grid-template-columns: repeat(${columns}, minmax(0, 1fr));\n  grid-template-areas:\n${template};\n}\n${areas.map((area) => `.area-${area} { grid-area: ${area}; }`).join('\n')}\n\n@media (max-width: ${minimum * columns + gap * (columns - 1)}px) {\n  .layout { grid-template-columns: 1fr; grid-template-areas: none; }\n  .layout > * { grid-area: auto; }\n}`;
  const html = `<div class="layout">\n${areas.map((area) => `  <section class="area-${area}">${area}</section>`).join('\n')}\n</div>`;
  return { css, html, areas };
}
