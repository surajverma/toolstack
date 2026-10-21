'use client';

import { useMemo, useState } from 'react';
import { useHydrated } from '@/lib/use-hydrated';
import { downloadLocal } from '@/lib/local-files';
import { canvasBlob, makeCanvas, openLocalImage } from '@/lib/image-canvas';
import {
  CodeOutput,
  ErrorMessage,
  Field,
  Tabs,
} from '@/components/workbench/Workbench';
import {
  DEFAULT_SVG_OPTIONS,
  prepareSvg,
  SVG_SAMPLE,
  type SvgOptions,
} from './svg';

export default function SvgToolkit() {
  const hydrated = useHydrated();
  const [source, setSource] = useState(SVG_SAMPLE);
  const [options, setOptions] = useState<SvgOptions>(DEFAULT_SVG_OPTIONS);
  const [output, setOutput] = useState<'svg' | 'jsx'>('svg');
  const [background, setBackground] = useState('#ffffff');
  const [size, setSize] = useState(512);
  const [error, setError] = useState('');
  const result = useMemo(() => {
    if (!hydrated) return { data: null, error: '' };
    try {
      return { data: prepareSvg(source, options), error: '' };
    } catch (err) {
      return { data: null, error: (err as Error).message };
    }
  }, [hydrated, source, options]);
  const preview = result.data
    ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(result.data.svg)
    : '';
  async function load(file: File) {
    setError('');
    try {
      if (file.size > 512000)
        throw new Error('Choose SVG source below 512 KB.');
      setSource(await file.text());
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function png() {
    setError('');
    try {
      if (!result.data || !Number.isInteger(size) || size < 16 || size > 2048)
        throw new Error('Choose a PNG width from 16 to 2,048 pixels.');
      const image = await openLocalImage(
        new File([result.data.svg], 'prepared.svg', { type: 'image/svg+xml' }),
      );
      const height = Math.max(
        1,
        Math.round((size * result.data.viewBox[3]) / result.data.viewBox[2]),
      );
      if (height > 4096)
        throw new Error(
          'This aspect ratio exceeds 4,096 pixels tall. Choose a smaller PNG width.',
        );
      const { canvas, context } = makeCanvas(size, height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      downloadLocal(await canvasBlob(canvas), 'prepared-icon.png', 'image/png');
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <div className="wb-stack">
      <div className="wb-toolbar">
        <div className="wb-actions">
          <Field label="Open SVG">
            <input
              className="field"
              type="file"
              accept=".svg,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void load(file);
                event.target.value = '';
              }}
            />
          </Field>
          <button
            className="action action-secondary"
            onClick={() => setSource(SVG_SAMPLE)}
          >
            Load example
          </button>
        </div>
        <span className="wb-muted">
          Static SVG profile · change report included
        </span>
      </div>
      <div className="wb-grid">
        <section className="panel wb-stack">
          <Field label="SVG source">
            <textarea
              className="field wb-editor"
              value={source}
              maxLength={512000}
              spellCheck={false}
              onChange={(event) => setSource(event.target.value)}
            />
          </Field>
          <div className="wb-form-grid">
            <Field label="ID prefix">
              <input
                className="field"
                value={options.prefix}
                maxLength={30}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    prefix: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Preview background">
              <input
                className="field"
                type="color"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
              />
            </Field>
          </div>
          {(['responsive', 'currentColor', 'removeDescriptions'] as const).map(
            (key) => (
              <label className="wb-checkbox" key={key}>
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                />
                {key === 'responsive'
                  ? 'Responsive dimensions'
                  : key === 'currentColor'
                    ? 'Use currentColor for paints'
                    : 'Remove title and description (may reduce accessibility)'}
              </label>
            ),
          )}
        </section>
        <section className="panel wb-stack">
          <h2>Safe image preview</h2>
          <div
            className="wb-svg-preview"
            style={{ backgroundColor: background }}
          >
            {preview ? (
              <svg
                viewBox="0 0 1 1"
                role="img"
                aria-label="Prepared SVG preview"
              >
                <image
                  href={preview}
                  width="1"
                  height="1"
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
            ) : (
              <p>No preview</p>
            )}
          </div>
          <ErrorMessage message={result.error || error} />
          {result.data && (
            <>
              <p className="wb-muted">
                {result.data.originalBytes.toLocaleString('en-US')} →{' '}
                {result.data.outputBytes.toLocaleString('en-US')} bytes ·{' '}
                {result.data.elements} elements
              </p>
              <ul className="wb-change-list">
                {result.data.changes.length ? (
                  result.data.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))
                ) : (
                  <li>No unsupported content found.</li>
                )}
              </ul>
              <div className="wb-actions">
                <button
                  className="action"
                  onClick={() =>
                    downloadLocal(
                      result.data!.svg,
                      'prepared-icon.svg',
                      'image/svg+xml',
                    )
                  }
                >
                  Download SVG
                </button>
                <button
                  className="action action-secondary"
                  onClick={() => downloadLocal(result.data!.jsx, 'Icon.tsx')}
                >
                  Download React component
                </button>
              </div>
              <div className="wb-form-grid">
                <Field label="PNG width">
                  <input
                    className="field"
                    type="number"
                    min={16}
                    max={2048}
                    value={size}
                    onChange={(event) => setSize(Number(event.target.value))}
                  />
                </Field>
                <button
                  className="action action-secondary"
                  onClick={() => void png()}
                >
                  Export PNG
                </button>
              </div>
            </>
          )}
          <p className="wb-muted">
            Scripts, embedded images, external links, animations, styles and
            unsupported filters are removed. Review the result: this is a
            focused SVG preparation tool, not a full drawing editor.
          </p>
        </section>
      </div>
      <Tabs
        value={output}
        onChange={setOutput}
        items={[
          { value: 'svg', label: 'Prepared SVG' },
          { value: 'jsx', label: 'React component' },
        ]}
      />
      <CodeOutput
        value={result.data ? result.data[output] : ''}
        label={output === 'svg' ? 'Prepared SVG' : 'React component'}
      />
    </div>
  );
}
