'use client';

import { useMemo, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';

type Mode =
  | 'base64-encode'
  | 'base64-decode'
  | 'url-encode'
  | 'url-decode'
  | 'html-encode'
  | 'html-decode';

function bytesToBinary(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return binary;
}

const toBase64 = (value: string) => btoa(bytesToBinary(new TextEncoder().encode(value)));
const fromBase64 = (value: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(value), (character) => character.charCodeAt(0)));
const htmlEncode = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!
  );
const htmlDecode = (value: string) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

export default function EncoderDecoderPage() {
  const [mode, setMode] = useState<Mode>('base64-encode');
  const [input, setInput] = useState('ToolStack privacy first');

  const result = useMemo(() => {
    try {
      switch (mode) {
        case 'base64-encode':
          return toBase64(input);
        case 'base64-decode':
          return fromBase64(input);
        case 'url-encode':
          return encodeURIComponent(input);
        case 'url-decode':
          return decodeURIComponent(input);
        case 'html-encode':
          return htmlEncode(input);
        case 'html-decode':
          return htmlDecode(input);
      }
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }, [mode, input]);

  return (
    <LocalToolLayout
      title='Encoder / Decoder'
      description='Encode and decode Base64, URLs and HTML entities locally.'
    >
      <section className='mx-auto max-w-5xl rounded-xl bg-white p-6 shadow'>
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as Mode)}
          className='mb-4 rounded border p-2'
        >
          {[
            'base64-encode',
            'base64-decode',
            'url-encode',
            'url-decode',
            'html-encode',
            'html-decode',
          ].map((option) => (
            <option key={option} value={option}>
              {option.replaceAll('-', ' ')}
            </option>
          ))}
        </select>

        <div className='grid gap-4 md:grid-cols-2'>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className='h-72 rounded border p-3 font-mono'
          />
          <textarea
            readOnly
            value={result}
            className='h-72 rounded border bg-slate-50 p-3 font-mono'
          />
        </div>

        <button
          onClick={() => navigator.clipboard.writeText(result)}
          className='mt-4 rounded bg-slate-800 px-4 py-2 text-white'
        >
          Copy output
        </button>
      </section>
    </LocalToolLayout>
  );
}
