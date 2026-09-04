'use client';

import { Fragment, useMemo, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';

const TRACKING = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'yclid',
  '_hsenc',
  '_hsmi',
  'vero_conv',
  'vero_id',
]);

const isTracking = (key: string) =>
  key.toLowerCase().startsWith('utm_') || TRACKING.has(key.toLowerCase());

export default function UrlCleanerPage() {
  const [input, setInput] = useState(
    'https://example.com/article?utm_source=newsletter&utm_campaign=test&id=42&fbclid=abc'
  );

  const data = useMemo(() => {
    try {
      const url = new URL(input);
      const removed: string[] = [];

      [...url.searchParams.keys()].forEach((key) => {
        if (isTracking(key)) {
          removed.push(key);
          url.searchParams.delete(key);
        }
      });

      return {
        url: url.toString(),
        removed,
        error: '',
        parts: {
          protocol: url.protocol,
          host: url.host,
          path: url.pathname,
          query: url.search,
          fragment: url.hash,
        },
      };
    } catch (error) {
      return {
        url: '',
        removed: [],
        error: (error as Error).message,
        parts: null,
      };
    }
  }, [input]);

  return (
    <LocalToolLayout
      title='Tracking URL Cleaner'
      description='Strip common analytics and advertising parameters without sending the URL anywhere.'
    >
      <section className='mx-auto max-w-4xl rounded-xl bg-white p-6 shadow'>
        <label className='font-semibold'>URL</label>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className='mt-2 h-28 w-full rounded border p-3 font-mono'
        />

        {data.error ? (
          <p className='mt-3 text-red-600'>Invalid URL</p>
        ) : (
          <>
            <label className='mt-5 block font-semibold'>Clean URL</label>
            <div className='mt-2 flex gap-2'>
              <input
                readOnly
                value={data.url}
                className='min-w-0 flex-1 rounded border p-3 font-mono text-sm'
              />
              <button
                onClick={() => navigator.clipboard.writeText(data.url)}
                className='rounded bg-sky-600 px-4 text-white'
              >
                Copy
              </button>
            </div>

            <p className='mt-3 text-sm text-slate-600'>
              {data.removed.length
                ? `Removed: ${data.removed.join(', ')}`
                : 'No known tracking parameters found.'}
            </p>

            {data.parts && (
              <dl className='mt-6 grid gap-2 rounded bg-slate-50 p-4 text-sm sm:grid-cols-[8rem_1fr]'>
                {Object.entries(data.parts).map(([key, value]) => (
                  <Fragment key={key}>
                    <dt className='font-semibold capitalize'>{key}</dt>
                    <dd className='break-all font-mono'>{value || '—'}</dd>
                  </Fragment>
                ))}
              </dl>
            )}
          </>
        )}
      </section>
    </LocalToolLayout>
  );
}
