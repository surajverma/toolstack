'use client';

import { useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';

type Hashes = Record<string, string>;

const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

export default function FileHashPage() {
  const [file, setFile] = useState<File | null>(null);
  const [hashes, setHashes] = useState<Hashes>({});
  const [busy, setBusy] = useState(false);
  const [expected, setExpected] = useState('');
  const [error, setError] = useState('');

  const run = async (selectedFile: File) => {
    setFile(selectedFile);
    setBusy(true);
    setHashes({});
    setError('');

    try {
      const data = await selectedFile.arrayBuffer();
      const output: Hashes = {};

      for (const algorithm of ['SHA-256', 'SHA-384', 'SHA-512']) {
        output[algorithm] = hex(await crypto.subtle.digest(algorithm, data));
      }

      setHashes(output);
    } catch (caughtError) {
      setError((caughtError as Error).message || 'Unable to calculate hashes for this file.');
    } finally {
      setBusy(false);
    }
  };

  const normalized = expected.trim().toLowerCase();
  const match = normalized ? Object.values(hashes).some((hash) => hash === normalized) : null;

  return (
    <LocalToolLayout
      title='File Hash & Checksum'
      description='Generate SHA-256, SHA-384 and SHA-512 checksums locally using the Web Crypto API.'
    >
      <section className='mx-auto max-w-4xl rounded-xl bg-white p-6 shadow'>
        <input
          type='file'
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];
            if (selectedFile) void run(selectedFile);
          }}
          className='block w-full rounded border p-3'
        />

        {file && (
          <p className='mt-3 text-sm text-slate-600'>
            {file.name} · {(file.size / 1024).toFixed(1)} KB
          </p>
        )}
        {busy && <p className='mt-4'>Calculating hashes...</p>}
        {error && <p className='mt-4 text-red-600'>{error}</p>}

        <div className='mt-4 space-y-3'>
          {Object.entries(hashes).map(([algorithm, value]) => (
            <div key={algorithm}>
              <label className='text-sm font-semibold'>{algorithm}</label>
              <div className='mt-1 flex gap-2'>
                <input
                  readOnly
                  value={value}
                  className='min-w-0 flex-1 rounded border p-2 font-mono text-xs'
                />
                <button
                  onClick={() => navigator.clipboard.writeText(value)}
                  className='rounded bg-slate-800 px-3 text-white'
                >
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>

        {Object.keys(hashes).length > 0 && (
          <div className='mt-6 border-t pt-4'>
            <label className='text-sm font-semibold'>Verify a checksum</label>
            <input
              value={expected}
              onChange={(event) => setExpected(event.target.value)}
              placeholder='Paste expected SHA checksum'
              className='mt-1 w-full rounded border p-2 font-mono text-xs'
            />
            {match !== null && (
              <p className={`mt-2 font-semibold ${match ? 'text-green-700' : 'text-red-700'}`}>
                {match ? 'Checksum matches.' : 'No generated checksum matches.'}
              </p>
            )}
          </div>
        )}
      </section>
    </LocalToolLayout>
  );
}
