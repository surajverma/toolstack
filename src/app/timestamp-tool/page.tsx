'use client';
import { useMemo, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';

export default function TimestampToolPage() {
  const [value, setValue] = useState('');
  const parsed = useMemo(() => {
    const input = value.trim();
    if (!input) return null;
    let date: Date;
    if (/^\d{10}$/.test(input)) date = new Date(Number(input) * 1000);
    else if (/^\d{13}$/.test(input)) date = new Date(Number(input));
    else date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [value]);

  const useCurrentTime = () => setValue(String(Math.floor(Date.now() / 1000)));

  return <LocalToolLayout title='Timestamp & Date Toolkit' description='Convert Unix timestamps and date strings between local time, UTC and ISO 8601.'>
    <section className='mx-auto max-w-3xl rounded-xl bg-white p-6 shadow'>
      <div className='flex gap-2'><input value={value} onChange={e => setValue(e.target.value)} className='min-w-0 flex-1 rounded border p-3 font-mono' placeholder='Unix timestamp or date string'/><button onClick={useCurrentTime} className='rounded bg-sky-600 px-4 text-white'>Now</button></div>
      {!value.trim() ? <p className='mt-4 text-sm text-slate-500'>Enter a Unix timestamp or date, or choose Now.</p> : parsed ? <dl className='mt-6 grid gap-3 sm:grid-cols-[10rem_1fr]'><dt className='font-semibold'>Unix seconds</dt><dd className='font-mono'>{Math.floor(parsed.getTime() / 1000)}</dd><dt className='font-semibold'>Unix milliseconds</dt><dd className='font-mono'>{parsed.getTime()}</dd><dt className='font-semibold'>ISO 8601 / UTC</dt><dd className='font-mono'>{parsed.toISOString()}</dd><dt className='font-semibold'>Local time</dt><dd>{parsed.toLocaleString()}</dd><dt className='font-semibold'>UTC display</dt><dd>{parsed.toUTCString()}</dd></dl> : <p className='mt-4 text-red-600'>Could not parse that value.</p>}
    </section>
  </LocalToolLayout>;
}
