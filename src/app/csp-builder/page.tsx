'use client';
import { useMemo, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';
import { analyzeCsp } from '@/lib/csp';

const STRICT = "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
const APP = "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
export default function CspBuilderPage() {
  const [policy, setPolicy] = useState(STRICT); const findings = useMemo(() => analyzeCsp(policy), [policy]);
  return <LocalToolLayout title='Content Security Policy Builder & Analyzer' description='Draft and review a CSP locally. The analyzer flags common weakening patterns but does not replace application-specific security review.'><section className='mx-auto max-w-5xl rounded-xl bg-white p-6 shadow'><div className='flex flex-wrap gap-2'><button onClick={() => setPolicy(STRICT)} className='rounded bg-sky-600 px-4 py-2 text-white'>Strict static preset</button><button onClick={() => setPolicy(APP)} className='rounded bg-slate-200 px-4 py-2 text-slate-800'>Interactive app preset</button></div><label className='mt-5 block font-semibold'>Policy<textarea value={policy} onChange={event => setPolicy(event.target.value)} className='mt-2 h-48 w-full rounded border p-3 font-mono text-sm'/></label><div className='mt-6'><h2 className='font-semibold'>Analysis</h2><div className='mt-3 space-y-2'>{findings.map((finding, index) => <div key={`${finding.message}-${index}`} className={`rounded p-3 text-sm ${finding.level === 'warning' ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}>{finding.message}</div>)}</div></div><button onClick={() => navigator.clipboard.writeText(policy)} className='mt-5 rounded bg-slate-800 px-4 py-2 text-white'>Copy policy</button></section></LocalToolLayout>;
}
