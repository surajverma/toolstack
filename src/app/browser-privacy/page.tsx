'use client';
import { useEffect, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';

type PrivacyRow = [string, string];

function readBrowserRows(): PrivacyRow[] {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return [
    ['User agent', navigator.userAgent],
    ['Language', navigator.language],
    ['Languages', navigator.languages.join(', ')],
    ['Platform', navigator.platform || 'Unavailable'],
    ['Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone],
    ['Screen', `${screen.width} × ${screen.height}, ${screen.colorDepth}-bit color`],
    ['Viewport', `${innerWidth} × ${innerHeight}`],
    ['CPU threads', String(navigator.hardwareConcurrency || 'Unavailable')],
    ['Approx. device memory', nav.deviceMemory ? `${nav.deviceMemory} GB` : 'Unavailable'],
    ['Cookies enabled', String(navigator.cookieEnabled)],
    ['Online status', String(navigator.onLine)],
    ['Do Not Track', navigator.doNotTrack ?? 'Unspecified'],
    ['Local storage', typeof localStorage !== 'undefined' ? 'Available' : 'Unavailable'],
    ['Session storage', typeof sessionStorage !== 'undefined' ? 'Available' : 'Unavailable'],
  ];
}

export default function BrowserPrivacyPage() {
  const [rows, setRows] = useState<PrivacyRow[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setRows(readBrowserRows()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <LocalToolLayout title='Browser Privacy Inspector' description='See common information a webpage can read from your browser. ToolStack does not transmit these results.'>
    <section className='mx-auto max-w-4xl rounded-xl bg-white p-6 shadow'>
      <p className='mb-5 rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900'>These values are read locally from browser APIs. The tool intentionally does not create or send a fingerprint.</p>
      <dl className='grid gap-3 sm:grid-cols-[12rem_1fr]'>{rows.map(([key, value]) => <div key={key} className='contents'><dt className='font-semibold text-slate-700'>{key}</dt><dd className='break-all font-mono text-sm'>{value}</dd></div>)}</dl>
    </section>
  </LocalToolLayout>;
}
