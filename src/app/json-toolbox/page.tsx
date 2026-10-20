'use client';
import { useMemo, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';
import { diffJson } from '@/lib/json-diff';
import { inferJson } from '@/lib/json-inference';
import { downloadLocal } from '@/lib/local-files';

function sortObject(value: unknown): unknown { if (Array.isArray(value)) return value.map(sortObject); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => [key,sortObject(item)])); return value; }
const MODES = { pretty: 'Pretty print', minify: 'Minify', sort: 'Sort keys', diff: 'Structural diff', types: 'TypeScript', schema: 'JSON Schema' };
type Mode = keyof typeof MODES;
export default function JsonToolboxPage() {
  const [input,setInput] = useState('{"name":"ToolStack","privacy":true,"count":47}'); const [compare,setCompare] = useState('{"name":"ToolStack","privacy":true,"count":47,"offline":true}'); const [mode,setMode] = useState<Mode>('pretty');
  const [root,setRoot] = useState('ApiResponse'); const [style,setStyle] = useState<'interface' | 'type'>('interface'); const [message,setMessage] = useState('');
  const generation = mode === 'types' || mode === 'schema';
  const result = useMemo(() => {
    try {
      if (generation) { const inferred = inferJson(input,root,style); return { output: mode === 'types' ? inferred.typescript : inferred.schema, error: '' }; }
      const parsed = JSON.parse(input);
      if (mode === 'diff') return { output: JSON.stringify(diffJson(parsed,JSON.parse(compare)),null,2), error: '' };
      return { output: mode === 'minify' ? JSON.stringify(parsed) : JSON.stringify(mode === 'sort' ? sortObject(parsed) : parsed,null,2), error: '' };
    } catch (err) { return { output: '', error: (err as Error).message }; }
  },[input,compare,mode,generation,root,style]);
  return <LocalToolLayout title='JSON Toolbox' description='Format, compare and validate JSON, or generate TypeScript types and JSON Schema.'>
    <section className='panel mx-auto w-full min-w-0 space-y-4'>
      <div className='flex flex-wrap gap-2' aria-label='JSON operation'>{Object.entries(MODES).map(([value,label]) => <button key={value} className={`action ${mode === value ? '' : 'action-secondary'}`} aria-pressed={mode === value} onClick={() => { setMode(value as Mode); setMessage(''); }}>{label}</button>)}</div>
      {generation && <div className='flex flex-wrap items-end gap-4'><label className='text-sm font-semibold'>Root name<input className='field mt-2' value={root} onChange={event => { setRoot(event.target.value); setMessage(''); }}/></label>{mode === 'types' && <label className='text-sm font-semibold'>Declaration<select className='field mt-2' value={style} onChange={event => { setStyle(event.target.value as 'interface' | 'type'); setMessage(''); }}><option value='interface'>Interface</option><option value='type'>Type alias</option></select></label>}<button className='action action-secondary' onClick={() => { setInput(JSON.stringify([{ id: 1, name: 'Example', active: true, tags: ['demo'] },{ id: 2, name: 'Another', active: false, notes: null }],null,2)); setMessage(''); }}>Load mixed-object example</button></div>}
      <div className={`grid gap-4 ${mode === 'diff' ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}><label className='text-sm font-semibold'>JSON input<textarea aria-label='JSON input' className='field mt-2 h-96 font-mono text-xs' value={input} onChange={event => { setInput(event.target.value); setMessage(''); }}/></label>{mode === 'diff' && <label className='text-sm font-semibold'>Compare with<textarea aria-label='JSON comparison input' className='field mt-2 h-96 font-mono text-xs' value={compare} onChange={event => { setCompare(event.target.value); setMessage(''); }}/></label>}<label className='text-sm font-semibold'>{MODES[mode]} result<textarea aria-label='JSON result' readOnly className='field mt-2 h-96 font-mono text-xs' value={result.output}/></label></div>
      {result.error && <p role='alert' className='note text-red-700 dark:text-red-300'>{result.error}</p>}
      {!result.error && <div className='flex flex-wrap gap-3'><button className='action' onClick={async () => { try { await navigator.clipboard.writeText(result.output); setMessage('Copied.'); } catch { setMessage('Could not copy. Select the result to copy it manually.'); } }}>Copy result</button><button className='action action-secondary' onClick={() => downloadLocal(result.output,mode === 'types' ? 'types.ts' : mode === 'schema' ? 'schema.json' : 'result.json')}>Download {mode === 'types' ? '.ts' : '.json'}</button></div>}
      {generation && <p className='text-sm text-slate-500 dark:text-slate-400'>Inferred from this sample. Missing keys across array objects become optional. Empty arrays use unknown items. Review validation rules before using the schema.</p>}
      {message && <p role='status' className='text-sm'>{message}</p>}
    </section>
  </LocalToolLayout>;
}
