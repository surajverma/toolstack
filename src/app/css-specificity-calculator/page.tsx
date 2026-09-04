'use client';
import { useMemo, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';
import { calculateSpecificity, specificityLabel } from '@/lib/css-specificity';

export default function CssSpecificityCalculatorPage() {
  const [selector, setSelector] = useState('article:where(.card) :is(#title, .heading) > a:hover::before');
  const result = useMemo(() => {
    try { return { rows: calculateSpecificity(selector), error: '' }; }
    catch (err) { return { rows: [], error: (err as Error).message }; }
  }, [selector]);

  return <LocalToolLayout title='CSS Specificity Calculator' description='Calculate selector specificity with an AST-based parser, including the special rules for :where(), :is(), :not() and :has().'>
    <section className='mx-auto max-w-4xl rounded-xl bg-white p-6 shadow'>
      <label htmlFor='selector' className='font-semibold'>CSS selector</label><textarea id='selector' value={selector} onChange={e => setSelector(e.target.value)} className='mt-2 h-28 w-full rounded border p-3 font-mono'/>
      {result.error ? <p className='mt-4 rounded bg-red-50 p-3 text-red-700'>{result.error}</p> : <div className='mt-6 space-y-4'>{result.rows.map((row, index) => <div key={`${row.selector}-${index}`} className='rounded-lg border p-4'><div className='flex flex-wrap items-center justify-between gap-3'><code className='break-all text-sm'>{row.selector}</code><strong className='rounded-full bg-sky-50 px-3 py-1 font-mono text-sky-700'>{specificityLabel(row.specificity)}</strong></div><div className='mt-3 grid grid-cols-3 gap-2 text-center text-sm'><div className='rounded bg-red-50 p-2'><strong>{row.specificity[0]}</strong><div>IDs</div></div><div className='rounded bg-sky-50 p-2'><strong>{row.specificity[1]}</strong><div>Classes / attributes / pseudo-classes</div></div><div className='rounded bg-emerald-50 p-2'><strong>{row.specificity[2]}</strong><div>Elements / pseudo-elements</div></div></div></div>)}</div>}
      <div className='mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600'><strong>Modern selector rules:</strong> `:where()` contributes zero specificity. `:is()`, `:not()` and `:has()` contribute the highest specificity of their selector-list arguments rather than adding a pseudo-class point themselves.</div>
    </section>
  </LocalToolLayout>;
}
