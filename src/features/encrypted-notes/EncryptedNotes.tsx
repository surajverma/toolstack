'use client';

import { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { createDiffRedactor } from '@/lib/diff-redaction';
import { downloadLocal } from '@/lib/local-files';
import {
  CodeOutput,
  CopyButton,
  ErrorMessage,
  Field,
  Tabs,
} from '@/components/workbench/Workbench';
import {
  decryptNote,
  encryptNote,
  MAX_NOTE_FILE,
  type NoteContent,
} from './crypto';

export default function EncryptedNotes() {
  const [tab, setTab] = useState<'write' | 'unlock'>('write');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<NoteContent['mode']>('text');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [envelope, setEnvelope] = useState('');
  const [unlocked, setUnlocked] = useState<NoteContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const markdown = useMemo(
    () =>
      unlocked?.mode === 'markdown'
        ? DOMPurify.sanitize(
            String(marked.parse(unlocked.text, { async: false })),
            {
              USE_PROFILES: { html: true },
              FORBID_TAGS: ['img', 'video', 'audio', 'source', 'a', 'style'],
              FORBID_ATTR: ['style'],
            },
          )
        : '',
    [unlocked],
  );

  async function encrypt() {
    setError('');
    setMessage('');
    setEnvelope('');
    setBusy(true);
    try {
      if (!text.trim()) throw new Error('Write a note first.');
      if (password !== confirmation)
        throw new Error('The passphrases do not match.');
      const result = await encryptNote({ title, text, mode }, password);
      setEnvelope(result);
      downloadLocal(result, 'private-note.tsnote', 'application/json');
      setPassword('');
      setConfirmation('');
      setMessage(
        'Encrypted note downloaded. Share its passphrase through a separate channel.',
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function unlock() {
    setError('');
    setMessage('');
    setUnlocked(null);
    setBusy(true);
    try {
      setUnlocked(await decryptNote(envelope, password));
      setPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function load(file: File) {
    setBusy(true);
    setUnlocked(null);
    setError('');
    setEnvelope('');
    try {
      if (file.size > MAX_NOTE_FILE)
        throw new Error('Choose an encrypted note below 400 KB.');
      setEnvelope(await file.text());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function clear() {
    setText('');
    setTitle('');
    setPassword('');
    setConfirmation('');
    setEnvelope('');
    setUnlocked(null);
    setError('');
    setMessage('Cleared from this page.');
  }
  return (
    <fieldset disabled={busy} className="wb-stack">
      <div className="wb-toolbar">
        <Tabs
          value={tab}
          onChange={(value) => {
            setTab(value);
            setError('');
            setMessage('');
            setUnlocked(null);
            setPassword('');
            setConfirmation('');
            setEnvelope('');
          }}
          items={[
            { value: 'write', label: 'Create a note' },
            { value: 'unlock', label: 'Unlock a note' },
          ]}
        />
        <button
          className="action action-secondary"
          disabled={busy}
          onClick={clear}
        >
          Clear all
        </button>
      </div>
      <div className="wb-grid">
        <section className="panel wb-stack">
          {tab === 'write' ? (
            <>
              <div className="wb-form-grid">
                <Field label="Title (encrypted too)">
                  <input
                    className="field"
                    maxLength={200}
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      setEnvelope('');
                    }}
                  />
                </Field>
                <Field label="Format">
                  <select
                    className="field"
                    value={mode}
                    onChange={(event) =>
                      setMode(event.target.value as NoteContent['mode'])
                    }
                  >
                    <option value="text">Plain text</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </Field>
              </div>
              <Field label="Your note">
                <textarea
                  className="field wb-editor"
                  maxLength={262144}
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setEnvelope('');
                  }}
                  placeholder="Write something that should stay private…"
                />
              </Field>
              <details className="wb-details">
                <summary>Review before sharing</summary>
                <p>
                  Mask detected credentials and common identifiers, then review
                  every line. Detection is best-effort.
                </p>
                <button
                  className="action action-secondary"
                  onClick={() => {
                    setText(createDiffRedactor([]).text(text));
                    setEnvelope('');
                  }}
                >
                  Mask detected private values
                </button>
              </details>
            </>
          ) : (
            <>
              <Field label="Encrypted note file">
                <input
                  className="field"
                  type="file"
                  accept=".tsnote,.json"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void load(file);
                    event.target.value = '';
                  }}
                />
              </Field>
              <Field label="Or paste an encrypted note">
                <textarea
                  className="field wb-editor"
                  maxLength={MAX_NOTE_FILE}
                  value={envelope}
                  onChange={(event) => {
                    setEnvelope(event.target.value);
                    setUnlocked(null);
                  }}
                  spellCheck={false}
                />
              </Field>
            </>
          )}
          <Field
            label="Passphrase"
            hint={
              tab === 'write'
                ? 'At least 12 characters. Use several unrelated words.'
                : 'Enter the passphrase supplied by the sender.'
            }
          >
            <input
              className="field"
              type={visible ? 'text' : 'password'}
              value={password}
              maxLength={1024}
              autoComplete="off"
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {tab === 'write' && (
            <Field label="Confirm passphrase">
              <input
                className="field"
                type={visible ? 'text' : 'password'}
                value={confirmation}
                maxLength={1024}
                autoComplete="off"
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </Field>
          )}
          <label className="wb-checkbox">
            <input
              type="checkbox"
              checked={visible}
              onChange={(event) => setVisible(event.target.checked)}
            />
            Show passphrase
          </label>
          <button
            className="action"
            disabled={
              busy ||
              (tab === 'write' ? !text || !password : !envelope || !password)
            }
            onClick={() => void (tab === 'write' ? encrypt() : unlock())}
          >
            {busy
              ? 'Working locally…'
              : tab === 'write'
                ? 'Encrypt & download'
                : 'Unlock locally'}
          </button>
          <ErrorMessage message={error} />
          <p role="status" className="wb-muted">
            {message}
          </p>
        </section>
        <section className="panel wb-stack">
          <h2>
            {unlocked
              ? unlocked.title || 'Unlocked note'
              : 'Private, portable, offline'}
          </h2>
          {unlocked ? (
            <>
              {unlocked.mode === 'markdown' ? (
                <div
                  className="prose wb-note-preview"
                  dangerouslySetInnerHTML={{ __html: markdown }}
                />
              ) : (
                <pre className="wb-note-preview" aria-label="Unlocked note">
                  {unlocked.text}
                </pre>
              )}
              <CopyButton text={unlocked.text} label="Copy note" />
              <button
                className="action action-secondary"
                onClick={() =>
                  downloadLocal(
                    unlocked.text,
                    unlocked.mode === 'markdown' ? 'note.md' : 'note.txt',
                  )
                }
              >
                Download decrypted text
              </button>
            </>
          ) : (
            <div className="wb-empty">
              <span aria-hidden="true">🔒</span>
              <p>Only the encrypted package leaves this page.</p>
              <p>
                Open it here on any device with ToolStack downloaded for offline
                use.
              </p>
            </div>
          )}
          <div className="note">
            Passphrases and notes stay in tab memory. Anyone with the file and
            passphrase can unlock it. Offline files can be copied; they have no
            enforced expiry, revocation or one-time access.
          </div>
          {tab === 'write' && envelope && (
            <CodeOutput value={envelope} label="Encrypted package" />
          )}
        </section>
      </div>
    </fieldset>
  );
}
