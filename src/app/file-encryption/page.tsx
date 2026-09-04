'use client';

import { useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';

const MAGIC = new TextEncoder().encode('TSTACK1');
const ITERATIONS = 250_000;

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

async function derive(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function download(bytes: Uint8Array, name: string, type = 'application/octet-stream') {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function FileEncryptionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const encrypt = async () => {
    if (!file || !password) return;
    setBusy(true);
    setError('');

    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await derive(password, salt);
      const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await file.arrayBuffer())
      );
      download(concat(MAGIC, salt, iv, ciphertext), `${file.name}.tstack`);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const decrypt = async () => {
    if (!file || !password) return;
    setBusy(true);
    setError('');

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (
        bytes.length < MAGIC.length + 16 + 12 + 16 ||
        !MAGIC.every((value, index) => bytes[index] === value)
      ) {
        throw new Error('Not a ToolStack encrypted file.');
      }

      let offset = MAGIC.length;
      const salt = bytes.slice(offset, (offset += 16));
      const iv = bytes.slice(offset, (offset += 12));
      const ciphertext = bytes.slice(offset);
      const key = await derive(password, salt);
      const plain = new Uint8Array(
        await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
      );
      download(plain, file.name.replace(/\.tstack$/, '') || 'decrypted-file');
    } catch {
      setError('Decryption failed. Check the password and file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LocalToolLayout
      title='File Encryption'
      description='Encrypt files locally with AES-256-GCM. Keys are derived from your password using PBKDF2-SHA-256; neither files nor passwords leave the browser.'
    >
      <section className='mx-auto max-w-3xl rounded-xl bg-white p-6 shadow'>
        <input
          type='file'
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className='w-full rounded border p-3'
        />
        <label className='mt-4 block font-semibold'>
          Password
          <input
            type='password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete='new-password'
            className='mt-2 w-full rounded border p-3'
          />
        </label>
        <div className='mt-5 flex flex-wrap gap-3'>
          <button
            disabled={!file || !password || busy}
            onClick={encrypt}
            className='rounded bg-sky-600 px-5 py-2 text-white disabled:opacity-50'
          >
            Encrypt & download
          </button>
          <button
            disabled={!file || !password || busy}
            onClick={decrypt}
            className='rounded bg-slate-800 px-5 py-2 text-white disabled:opacity-50'
          >
            Decrypt .tstack file
          </button>
        </div>
        {error && <p className='mt-4 text-red-600'>{error}</p>}
        <div className='mt-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
          <strong>Important:</strong> There is no password recovery. Keep the password separately. This
          format is ToolStack-specific and intended for local convenience, not archival interoperability.
        </div>
      </section>
    </LocalToolLayout>
  );
}
