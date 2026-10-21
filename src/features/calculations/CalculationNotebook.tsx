'use client';

import { useMemo, useState } from 'react';
import { downloadLocal } from '@/lib/local-files';
import {
  decryptNote,
  encryptNote,
  MAX_NOTE_FILE,
} from '@/features/encrypted-notes/crypto';
import {
  CopyButton,
  ErrorMessage,
  Field,
} from '@/components/workbench/Workbench';
import {
  evaluateNotebook,
  redactNotebookNumbers,
  type NotebookRow,
} from './notebook';

const EXAMPLE =
  '# Project estimate\nworkHours = 12 hour\nrate = 85 USD / hour\nsubtotal = workHours * rate\nreserve = 15% of subtotal\nsubtotal + reserve\n\n# Conversions and exact decimal arithmetic\n2 hours + 30 min to hours\n60 km / hour to m / s\n0.1 + 0.2';

export default function CalculationNotebook() {
  const [source, setSource] = useState(EXAMPLE);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const result = useMemo(() => {
    try {
      return { rows: evaluateNotebook(source), error: '' };
    } catch (err) {
      return { rows: [] as NotebookRow[], error: (err as Error).message };
    }
  }, [source]);
  const report = result.rows
    .map((row) =>
      row.comment
        ? row.source
        : `${row.source}\n  = ${row.error || row.display}`,
    )
    .join('\n');

  async function saveEncrypted() {
    setBusy(true);
    setError('');
    try {
      downloadLocal(
        await encryptNote(
          { text: source, title: 'Calculation notebook', mode: 'text' },
          password,
        ),
        'notebook.tsnote',
        'application/json',
      );
      setPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function load(file: File) {
    setBusy(true);
    setError('');
    try {
      if (file.size > MAX_NOTE_FILE)
        throw new Error('Choose a file below 400 KB.');
      const content = await file.text();
      let next: string;
      if (file.name.endsWith('.tsnote')) {
        next = (await decryptNote(content, password)).text;
        setPassword('');
      } else {
        const parsed = JSON.parse(content);
        if (
          parsed?.format !== 'toolstack-notebook' ||
          parsed.version !== 1 ||
          typeof parsed.source !== 'string'
        )
          throw new Error(
            'Choose a ToolStack notebook JSON or encrypted .tsnote file.',
          );
        next = parsed.source;
      }
      evaluateNotebook(next);
      setSource(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset disabled={busy} className="wb-stack">
      <div className="wb-toolbar">
        <div className="wb-actions">
          <button
            className="action action-secondary"
            onClick={() => setSource(EXAMPLE)}
          >
            Load example
          </button>
          <button
            className="action action-secondary"
            onClick={() => setSource('')}
          >
            Clear
          </button>
        </div>
        <span className="wb-muted">
          Tab memory only · 40 significant digits · display rounded to 12 places
        </span>
      </div>
      <div className="wb-grid">
        <section className="panel wb-stack">
          <Field
            label="Calculation notebook"
            hint="One expression per line. Use # for comments and name = expression for variables."
          >
            <textarea
              className="field wb-editor wb-notebook"
              value={source}
              maxLength={64000}
              onChange={(event) => setSource(event.target.value)}
              spellCheck={false}
            />
          </Field>
        </section>
        <section className="panel wb-stack">
          <div className="wb-output-heading">
            <h2>Results</h2>
            <CopyButton text={report} label="Copy results" />
          </div>
          <ErrorMessage message={result.error} />
          <ol className="wb-calculation-results">
            {result.rows.map((row) => (
              <li key={row.line} className={row.comment ? 'is-comment' : ''}>
                <span className="wb-line-number">{row.line}</span>
                <div>
                  {row.comment ? (
                    <span>{row.source || ' '}</span>
                  ) : (
                    <>
                      <code>{row.name || row.expression}</code>
                      <strong className={row.error ? 'wb-error' : ''}>
                        {row.error || row.display}
                      </strong>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <div className="wb-grid">
        <section className="panel wb-stack">
          <h2>Save or share</h2>
          <div className="wb-actions">
            <button
              className="action action-secondary"
              onClick={() =>
                downloadLocal(
                  JSON.stringify(
                    { format: 'toolstack-notebook', version: 1, source },
                    null,
                    2,
                  ),
                  'notebook.json',
                  'application/json',
                )
              }
            >
              Download notebook
            </button>
            <button
              className="action action-secondary"
              onClick={() =>
                downloadLocal(
                  redactNotebookNumbers(source),
                  'calculation-structure.txt',
                )
              }
            >
              Export structure without numbers
            </button>
          </div>
          <p className="wb-muted">
            Structure exports remove comments and numeric values. Variable names
            and unit labels remain visible; review them before sharing.
            Placeholders need values before recalculating.
          </p>
          <Field label="Passphrase for encrypted export or import">
            <input
              className="field"
              type="password"
              value={password}
              maxLength={1024}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              placeholder="At least 12 characters"
            />
          </Field>
          <div className="wb-actions">
            <button
              className="action"
              disabled={busy || password.length < 12}
              onClick={() => void saveEncrypted()}
            >
              {busy ? 'Working…' : 'Save encrypted'}
            </button>
            <Field label="Import notebook (replaces this page)">
              <input
                type="file"
                accept=".json,.tsnote"
                disabled={busy}
                className="field"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void load(file);
                  event.target.value = '';
                }}
              />
            </Field>
          </div>
          <ErrorMessage message={error} />
        </section>
        <section className="panel wb-stack">
          <h2>A small language, no code execution</h2>
          <p>
            Use <code>+ - * / ^ %</code>, parentheses and{' '}
            <code>abs, round, floor, ceil, sqrt, sum, minof, maxof</code>.
            Percentages are fractions: <code>15% of 200</code> gives 30.
          </p>
          <p>
            <code>
              hour, min, s, day, m, cm, km, ft, inch, mile, kg, g, lb, B, MB,
              MiB, GB, GiB
            </code>{' '}
            and common currency labels are supported. Write{' '}
            <code>to hours</code> or <code>to km / hour</code> to convert.
          </p>
          <p className="wb-muted">
            Currencies are separate labels; there are no live exchange rates.
            Quantities must have compatible units. Use the finance calculator
            for schedules with explicit cent rounding.
          </p>
        </section>
      </div>
    </fieldset>
  );
}
