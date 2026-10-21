'use client';

import { useState } from 'react';
import { canvasBlob, makeCanvas, openLocalImage } from '@/lib/image-canvas';
import { downloadLocal } from '@/lib/local-files';
import {
  CopyButton,
  ErrorMessage,
  Field,
  Tabs,
} from '@/components/workbench/Workbench';
import { asciiHtml, pixelsToAscii, textBanner } from './ascii';

export default function AsciiArt() {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('ToolStack'),
    [ink, setInk] = useState('#'),
    [scale, setScale] = useState(1);
  const [image, setImage] = useState<HTMLImageElement | null>(null),
    [width, setWidth] = useState(100);
  const [charset, setCharset] = useState('@%#*+=-:. '),
    [inverted, setInverted] = useState(false),
    [dither, setDither] = useState(false);
  const [dark, setDark] = useState(true),
    [output, setOutput] = useState(textBanner('ToolStack')),
    [error, setError] = useState('');
  async function load(file: File) {
    setError('');
    try {
      if (
        ![
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/gif',
          'image/avif',
        ].includes(file.type)
      )
        throw new Error('Choose a raster image such as PNG, JPEG or WebP.');
      setImage(await openLocalImage(file));
      setOutput('');
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function generate() {
    setError('');
    try {
      if (mode === 'text') {
        setOutput(textBanner(text, ink, scale));
        return;
      }
      if (!image) throw new Error('Choose an image first.');
      if (!Number.isInteger(width) || width < 10 || width > 240)
        throw new Error('Use a width of 10–240 characters.');
      const height = Math.max(
        1,
        Math.min(
          250,
          Math.round((image.naturalHeight / image.naturalWidth) * width * 0.5),
        ),
      );
      const { canvas, context } = makeCanvas(width, height);
      context.drawImage(image, 0, 0, width, height);
      setOutput(
        pixelsToAscii(
          context.getImageData(0, 0, canvas.width, canvas.height).data,
          width,
          height,
          charset,
          inverted,
          dither,
        ),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function png() {
    setError('');
    try {
      const lines = output.split('\n'),
        columns = Math.max(...lines.map((line) => [...line].length));
      if (columns * lines.length > 100000)
        throw new Error('Reduce the output before PNG export.');
      const { canvas, context } = makeCanvas(
        Math.max(1, Math.ceil(columns * 7.3 + 32)),
        lines.length * 12 + 32,
      );
      context.fillStyle = dark ? '#0b1220' : '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = dark ? '#f8fafc' : '#0b1220';
      context.font = '12px monospace';
      context.textBaseline = 'top';
      lines.forEach((line, index) =>
        context.fillText(line, 16, 16 + index * 12),
      );
      downloadLocal(await canvasBlob(canvas), 'ascii-art.png', 'image/png');
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <div className="wb-stack">
      <Tabs
        value={mode}
        onChange={(value) => {
          setMode(value);
          setOutput('');
          setError('');
        }}
        items={[
          { value: 'text', label: 'Text banner' },
          { value: 'image', label: 'Image to ASCII' },
        ]}
      />
      <div className="wb-grid wb-grid-sidebar">
        <section className="panel wb-stack">
          {mode === 'text' ? (
            <>
              <Field label="Banner text (A–Z, digits and basic punctuation)">
                <input
                  className="field"
                  maxLength={80}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
              </Field>
              <div className="wb-form-grid">
                <Field label="Ink character">
                  <input
                    className="field"
                    value={ink}
                    onChange={(event) =>
                      setInk([...event.target.value].slice(0, 1).join(''))
                    }
                  />
                </Field>
                <Field label="Scale">
                  <select
                    className="field"
                    value={scale}
                    onChange={(event) => setScale(Number(event.target.value))}
                  >
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                    <option value={3}>3×</option>
                  </select>
                </Field>
              </div>
            </>
          ) : (
            <>
              <Field label="Local image">
                <input
                  className="field"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void load(file);
                    event.target.value = '';
                  }}
                />
              </Field>
              <Field label="Width in characters">
                <input
                  className="field"
                  type="number"
                  min={10}
                  max={240}
                  value={width}
                  onChange={(event) => setWidth(Number(event.target.value))}
                />
              </Field>
              <Field label="Character ramp: dark → light">
                <input
                  className="field"
                  value={charset}
                  maxLength={80}
                  onChange={(event) => setCharset(event.target.value)}
                />
              </Field>
              <label className="wb-checkbox">
                <input
                  type="checkbox"
                  checked={inverted}
                  onChange={(event) => setInverted(event.target.checked)}
                />
                Invert ramp
              </label>
              <label className="wb-checkbox">
                <input
                  type="checkbox"
                  checked={dither}
                  onChange={(event) => setDither(event.target.checked)}
                />
                Dither tones
              </label>
            </>
          )}
          <button className="action" onClick={generate}>
            Generate locally
          </button>
          <label className="wb-checkbox">
            <input
              type="checkbox"
              checked={dark}
              onChange={(event) => setDark(event.target.checked)}
            />
            Dark terminal preview
          </label>
          <ErrorMessage message={error} />
          <p className="wb-muted">
            Fonts and processing are bundled locally. Image rows are corrected
            for typical monospace character proportions and limited to 250 rows.
          </p>
        </section>
        <section className="panel wb-stack">
          <div className="wb-output-heading">
            <h2>ASCII output</h2>
            <CopyButton text={output} />
          </div>
          <pre
            className="wb-ascii-output"
            style={{
              backgroundColor: dark ? '#0b1220' : '#ffffff',
              color: dark ? '#f8fafc' : '#0b1220',
            }}
            tabIndex={0}
            aria-label="ASCII output"
          >
            {output}
          </pre>
          <div className="wb-actions">
            <button
              className="action action-secondary"
              disabled={!output}
              onClick={() => downloadLocal(output, 'ascii-art.txt')}
            >
              Download text
            </button>
            <button
              className="action action-secondary"
              disabled={!output}
              onClick={() =>
                downloadLocal(
                  asciiHtml(output, dark),
                  'ascii-art.html',
                  'text/html',
                )
              }
            >
              Download HTML
            </button>
            <button
              className="action action-secondary"
              disabled={!output}
              onClick={() => void png()}
            >
              Download PNG
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
