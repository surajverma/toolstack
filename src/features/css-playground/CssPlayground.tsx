'use client';

import { useMemo, useState } from 'react';
import { downloadLocal } from '@/lib/local-files';
import { canvasBlob, makeCanvas } from '@/lib/image-canvas';
import {
  CodeOutput,
  ErrorMessage,
  Field,
  Tabs,
} from '@/components/workbench/Workbench';
import {
  GRADIENT_PRESETS,
  gradientCss,
  gridCss,
  hexColor,
  parseGradient,
  sampledGradientContrast,
  type Gradient,
} from './css';

export default function CssPlayground() {
  const [tab, setTab] = useState<'gradient' | 'grid' | 'shadow'>('gradient');
  const [gradient, setGradient] = useState<Gradient>({
    type: 'linear',
    angle: 135,
    space: 'srgb',
    stops: GRADIENT_PRESETS[0].stops,
  });
  const [textColor, setTextColor] = useState('#ffffff');
  const [importCss, setImportCss] = useState('');
  const [error, setError] = useState('');
  const [columns, setColumns] = useState(3),
    [rows, setRows] = useState(3),
    [gap, setGap] = useState(16),
    [minimum, setMinimum] = useState(160);
  const [cells, setCells] = useState([
    'header',
    'header',
    'header',
    'aside',
    'content',
    'content',
    'footer',
    'footer',
    'footer',
  ]);
  const [start, setStart] = useState<number | null>(null),
    [end, setEnd] = useState<number | null>(null),
    [area, setArea] = useState('section');
  const [shadow, setShadow] = useState({
    x: 0,
    y: 16,
    blur: 40,
    spread: -8,
    opacity: 25,
    color: '#0f172a',
    inset: false,
    radius: 20,
  });
  const [previewWidth, setPreviewWidth] = useState(768);
  const gradientResult = useMemo(() => {
    try {
      return {
        value: gradientCss(gradient),
        fallback: gradientCss(gradient, true),
        contrast: sampledGradientContrast(gradient.stops, textColor),
        error: '',
      };
    } catch (err) {
      return {
        value: '',
        fallback: '',
        contrast: 0,
        error: (err as Error).message,
      };
    }
  }, [gradient, textColor]);
  const grid = useMemo(() => {
    try {
      return { ...gridCss(cells, columns, rows, gap, minimum), error: '' };
    } catch (err) {
      return { css: '', html: '', areas: [], error: (err as Error).message };
    }
  }, [cells, columns, rows, gap, minimum]);
  const shadowValue = `${shadow.inset ? 'inset ' : ''}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}${Math.round(
    shadow.opacity * 2.55,
  )
    .toString(16)
    .padStart(2, '0')}`;
  const code =
    tab === 'gradient'
      ? `/* sRGB fallback */\nbackground-image: ${gradientResult.fallback};${gradient.space === 'oklab' ? `\n/* Modern color interpolation */\nbackground-image: ${gradientResult.value};` : ''}\ncolor: ${textColor};`
      : tab === 'grid'
        ? grid.css + '\n\n<!-- HTML -->\n' + grid.html
        : `box-shadow: ${shadowValue};\nborder-radius: ${shadow.radius}px;`;
  function changeStop(
    index: number,
    update: Partial<Gradient['stops'][number]>,
  ) {
    setGradient((current) => ({
      ...current,
      stops: current.stops.map((stop, i) =>
        i === index ? { ...stop, ...update } : stop,
      ),
    }));
  }
  function resizeGrid(nextColumns: number, nextRows: number) {
    setColumns(nextColumns);
    setRows(nextRows);
    setCells(Array(nextColumns * nextRows).fill('.'));
    setStart(null);
    setEnd(null);
  }
  function paint() {
    if (start === null || end === null) return;
    const left = Math.min(start % columns, end % columns),
      right = Math.max(start % columns, end % columns);
    const top = Math.min(
        Math.floor(start / columns),
        Math.floor(end / columns),
      ),
      bottom = Math.max(Math.floor(start / columns), Math.floor(end / columns));
    setCells((current) =>
      current.map((cell, index) =>
        index % columns >= left &&
        index % columns <= right &&
        Math.floor(index / columns) >= top &&
        Math.floor(index / columns) <= bottom
          ? area
          : cell,
      ),
    );
    setStart(null);
    setEnd(null);
  }
  async function exportGradient() {
    setError('');
    try {
      if (gradient.type !== 'linear' || gradient.space !== 'srgb')
        throw new Error(
          'PNG export currently supports linear sRGB gradients. CSS export supports every mode.',
        );
      const { canvas, context } = makeCanvas(1200, 630);
      const angle = (gradient.angle * Math.PI) / 180,
        dx = Math.sin(angle),
        dy = -Math.cos(angle);
      const span = Math.abs(1200 * dx) + Math.abs(630 * dy);
      const fill = context.createLinearGradient(
        600 - (dx * span) / 2,
        315 - (dy * span) / 2,
        600 + (dx * span) / 2,
        315 + (dy * span) / 2,
      );
      [...gradient.stops]
        .sort((a, b) => a.position - b.position)
        .forEach((stop) =>
          fill.addColorStop(stop.position / 100, hexColor(stop.color)),
        );
      context.fillStyle = fill;
      context.fillRect(0, 0, 1200, 630);
      downloadLocal(await canvasBlob(canvas), 'gradient.png', 'image/png');
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <div className="wb-stack">
      <Tabs
        value={tab}
        onChange={(value) => {
          setTab(value);
          setError('');
        }}
        items={[
          { value: 'gradient', label: 'Gradients' },
          { value: 'grid', label: 'Grid layouts' },
          { value: 'shadow', label: 'Shadows' },
        ]}
      />
      <div className="wb-grid wb-grid-sidebar">
        <section className="panel wb-stack">
          {tab === 'gradient' && (
            <>
              <div className="wb-form-grid">
                <Field label="Type">
                  <select
                    className="field"
                    value={gradient.type}
                    onChange={(event) =>
                      setGradient((current) => ({
                        ...current,
                        type: event.target.value as Gradient['type'],
                      }))
                    }
                  >
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                    <option value="conic">Conic</option>
                  </select>
                </Field>
                <Field label="Interpolation">
                  <select
                    className="field"
                    value={gradient.space}
                    onChange={(event) =>
                      setGradient((current) => ({
                        ...current,
                        space: event.target.value as Gradient['space'],
                      }))
                    }
                  >
                    <option value="srgb">sRGB</option>
                    <option value="oklab">OKLab + sRGB fallback</option>
                  </select>
                </Field>
              </div>
              <Field label={`Angle: ${gradient.angle}°`}>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={gradient.angle}
                  onChange={(event) =>
                    setGradient((current) => ({
                      ...current,
                      angle: Number(event.target.value),
                    }))
                  }
                />
              </Field>
              <h2>Color stops</h2>
              {gradient.stops.map((stop, index) => (
                <div className="wb-color-stop" key={index}>
                  <input
                    aria-label={`Stop ${index + 1} color`}
                    type="color"
                    value={stop.color}
                    onChange={(event) =>
                      changeStop(index, { color: event.target.value })
                    }
                  />
                  <input
                    aria-label={`Stop ${index + 1} position`}
                    type="range"
                    min={0}
                    max={100}
                    value={stop.position}
                    onChange={(event) =>
                      changeStop(index, {
                        position: Number(event.target.value),
                      })
                    }
                  />
                  <span>{Math.round(stop.position)}%</span>
                  <button
                    aria-label={`Remove stop ${index + 1}`}
                    disabled={gradient.stops.length <= 2}
                    onClick={() =>
                      setGradient((current) => ({
                        ...current,
                        stops: current.stops.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="action action-secondary"
                disabled={gradient.stops.length >= 12}
                onClick={() =>
                  setGradient((current) => ({
                    ...current,
                    stops: [
                      ...current.stops,
                      { color: '#ffffff', position: 50 },
                    ],
                  }))
                }
              >
                Add color stop
              </button>
              <Field label="Text color">
                <input
                  className="field"
                  type="color"
                  value={textColor}
                  onChange={(event) => setTextColor(event.target.value)}
                />
              </Field>
              <div className="wb-actions">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    className="action action-secondary"
                    key={preset.name}
                    onClick={() =>
                      setGradient((current) => ({
                        ...current,
                        stops: preset.stops,
                      }))
                    }
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              <details className="wb-details">
                <summary>Edit existing gradient CSS</summary>
                <Field label="Gradient CSS">
                  <textarea
                    className="field"
                    rows={4}
                    value={importCss}
                    maxLength={2048}
                    onChange={(event) => setImportCss(event.target.value)}
                  />
                </Field>
                <button
                  className="action action-secondary"
                  onClick={() => {
                    try {
                      setGradient(parseGradient(importCss));
                      setError('');
                    } catch (err) {
                      setError((err as Error).message);
                    }
                  }}
                >
                  Import gradient
                </button>
                <p className="wb-muted">
                  Imports HEX stops, percentage positions and supported
                  geometry. External URLs and arbitrary declarations are
                  rejected.
                </p>
              </details>
            </>
          )}
          {tab === 'grid' && (
            <>
              <div className="wb-form-grid">
                <Field label="Columns">
                  <select
                    className="field"
                    value={columns}
                    onChange={(event) =>
                      resizeGrid(Number(event.target.value), rows)
                    }
                  >
                    {Array.from({ length: 8 }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Rows">
                  <select
                    className="field"
                    value={rows}
                    onChange={(event) =>
                      resizeGrid(columns, Number(event.target.value))
                    }
                  >
                    {Array.from({ length: 8 }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label={`Gap: ${gap}px`}>
                <input
                  type="range"
                  min={0}
                  max={64}
                  value={gap}
                  onChange={(event) => setGap(Number(event.target.value))}
                />
              </Field>
              <Field
                label={`Minimum column width before stacking: ${minimum}px`}
              >
                <input
                  type="range"
                  min={80}
                  max={400}
                  value={minimum}
                  onChange={(event) => setMinimum(Number(event.target.value))}
                />
              </Field>
              <Field label="Area name">
                <input
                  className="field"
                  value={area}
                  maxLength={30}
                  onChange={(event) => setArea(event.target.value)}
                />
              </Field>
              <p className="wb-muted">
                Select the first and last cell of a rectangle, then assign its
                name. Use a dot to erase cells.
              </p>
              <button
                className="action"
                disabled={
                  start === null ||
                  end === null ||
                  !/^(?:\.|[A-Za-z][A-Za-z0-9_-]{0,29})$/.test(area)
                }
                onClick={paint}
              >
                Assign selected rectangle
              </button>
              <div
                className="wb-grid-painter"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(44px, 1fr))`,
                }}
              >
                {cells.map((cell, index) => (
                  <button
                    key={index}
                    aria-label={`Row ${Math.floor(index / columns) + 1}, column ${(index % columns) + 1}, ${cell}`}
                    aria-pressed={index === start || index === end}
                    onClick={() => {
                      if (start === null || end !== null) {
                        setStart(index);
                        setEnd(null);
                      } else setEnd(index);
                    }}
                  >
                    {cell}
                  </button>
                ))}
              </div>
              <button
                className="action action-secondary"
                onClick={() => {
                  setColumns(3);
                  setRows(3);
                  setCells([
                    'header',
                    'header',
                    'header',
                    'aside',
                    'content',
                    'content',
                    'footer',
                    'footer',
                    'footer',
                  ]);
                }}
              >
                Load sidebar layout
              </button>
            </>
          )}
          {tab === 'shadow' && (
            <>
              {(['x', 'y', 'blur', 'spread', 'opacity', 'radius'] as const).map(
                (key) => (
                  <Field
                    label={`${key}: ${shadow[key]}${key === 'opacity' ? '%' : 'px'}`}
                    key={key}
                  >
                    <input
                      type="range"
                      min={
                        key === 'x' || key === 'y' || key === 'spread' ? -80 : 0
                      }
                      max={key === 'opacity' ? 100 : 120}
                      value={shadow[key]}
                      onChange={(event) =>
                        setShadow((current) => ({
                          ...current,
                          [key]: Number(event.target.value),
                        }))
                      }
                    />
                  </Field>
                ),
              )}
              <Field label="Shadow color">
                <input
                  className="field"
                  type="color"
                  value={shadow.color}
                  onChange={(event) =>
                    setShadow((current) => ({
                      ...current,
                      color: event.target.value,
                    }))
                  }
                />
              </Field>
              <label className="wb-checkbox">
                <input
                  type="checkbox"
                  checked={shadow.inset}
                  onChange={(event) =>
                    setShadow((current) => ({
                      ...current,
                      inset: event.target.checked,
                    }))
                  }
                />
                Inset shadow
              </label>
            </>
          )}
        </section>
        <section className="panel wb-stack">
          <div className="wb-output-heading">
            <h2>Live preview</h2>
            {tab === 'grid' && (
              <select
                aria-label="Preview width"
                className="field wb-select-compact"
                value={previewWidth}
                onChange={(event) =>
                  setPreviewWidth(Number(event.target.value))
                }
              >
                <option value={375}>375px</option>
                <option value={768}>768px</option>
                <option value={1200}>1200px</option>
              </select>
            )}
          </div>
          {tab === 'gradient' && (
            <>
              <div
                className="wb-gradient-preview"
                style={{
                  background: gradientResult.fallback,
                  backgroundImage: gradientResult.value,
                  color: textColor,
                }}
              >
                <strong>Make something useful.</strong>
                <span>A little color, a clear purpose.</span>
              </div>
              <p className="wb-muted">
                {gradient.space === 'srgb'
                  ? `Lowest sampled text contrast: ${gradientResult.contrast.toFixed(2)}:1 across 257 positions.`
                  : 'Contrast sampling is available for sRGB interpolation.'}{' '}
                Sampling is an aid, not a complete accessibility guarantee.
              </p>
              <button
                className="action action-secondary"
                disabled={
                  gradient.type !== 'linear' || gradient.space !== 'srgb'
                }
                onClick={() => void exportGradient()}
              >
                Download 1200 × 630 PNG (linear sRGB)
              </button>
            </>
          )}
          {tab === 'grid' && (
            <>
              <div className="wb-layout-viewport">
                <div
                  className="wb-layout-preview"
                  style={{
                    width: previewWidth,
                    maxWidth: '100%',
                    display: 'grid',
                    gap,
                    gridTemplateColumns:
                      previewWidth <= minimum * columns + gap * (columns - 1)
                        ? '1fr'
                        : `repeat(${columns}, minmax(0, 1fr))`,
                    gridTemplateAreas:
                      previewWidth <= minimum * columns + gap * (columns - 1) ||
                      grid.error
                        ? undefined
                        : Array.from(
                            { length: rows },
                            (_, row) =>
                              `"${cells.slice(row * columns, (row + 1) * columns).join(' ')}"`,
                          ).join(' '),
                  }}
                >
                  {grid.areas.map((name) => (
                    <div
                      key={name}
                      style={{
                        gridArea:
                          previewWidth <=
                          minimum * columns + gap * (columns - 1)
                            ? undefined
                            : name,
                      }}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>
              <p className="wb-muted">
                Sections are exported in first-appearance order. Keep meaningful
                DOM order when adapting the layout.
              </p>
            </>
          )}
          {tab === 'shadow' && (
            <div className="wb-shadow-preview">
              <div
                style={{ boxShadow: shadowValue, borderRadius: shadow.radius }}
              >
                A softer edge
              </div>
            </div>
          )}
          <ErrorMessage
            message={
              error ||
              (tab === 'grid'
                ? grid.error
                : tab === 'gradient'
                  ? gradientResult.error
                  : '')
            }
          />
          <CodeOutput
            value={code}
            label={tab === 'grid' ? 'CSS and HTML' : 'CSS output'}
          />
        </section>
      </div>
    </div>
  );
}
