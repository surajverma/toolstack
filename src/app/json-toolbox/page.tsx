'use client';
import { useMemo, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, sortObject(v)]));
  return value;
}

export default function JsonToolboxPage() {
  const [input, setInput] = useState('{"name":"ToolStack","privacy":true,"count":32}');
  const [mode, setMode] = useState<'pretty'|'minify'|'sort'>('pretty');
  const result = useMemo(() => { try { const parsed = JSON.parse(input); return { output: mode === 'minify' ? JSON.stringify(parsed) : JSON.stringify(mode === 'sort' ? sortObject(parsed) : parsed, null, 2), error: '' }; } catch (e) { return { output: '', error: (e as Error).message }; } }, [input, mode]);
  return <LocalToolLayout title='JSON Toolbox' description='Validate, format, minify and recursively sort JSON entirely in your browser.'><section className='mx-auto max-w-6xl rounded-xl bg-white p-6 shadow'><div className='mb-4 flex flex-wrap gap-2'>{(['pretty','minify','sort'] as const).map(x => <button key={x} onClick={() => setMode(x)} className={`rounded px-4 py-2 ${mode===x?'bg-sky-600 text-white':'bg-slate-100 text-slate-700'}`}>{x==='pretty'?'Pretty print':x==='minify'?'Minify':'Sort keys'}</button>)}</div><div className='grid gap-4 md:grid-cols-2'><textarea aria-label='JSON input' value={input} onChange={e=>setInput(e.target.value)} className='h-96 rounded border p-4 font-mono'/><div className='h-96 overflow-auto rounded border bg-slate-50 p-4 font-mono whitespace-pre-wrap'>{result.error ? <span className='text-red-600'>Invalid JSON: {result.error}</span> : result.output}</div></div>{!result.error && <button onClick={()=>navigator.clipboard.writeText(result.output)} className='mt-4 rounded bg-slate-800 px-4 py-2 text-white'>Copy result</button>}</section></LocalToolLayout>;
}
