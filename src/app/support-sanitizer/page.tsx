'use client';
import { useEffect, useRef, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';
import { checkFileBatch, downloadLocal } from '@/lib/local-files';
import type { SupportInput, SupportOutput } from '@/lib/support-sanitizer';
import CurlConverter from '@/components/CurlConverter';

const SAMPLE: SupportInput[] = [
  { name: 'example.log', text: '2026-01-01T10:00:00Z user=alex@example.com status=500\nAuthorization: Bearer demonstration-token\nConfig: /home/alex/project/settings.json\nRetry by alex@example.com from 192.168.1.20' },
  { name: 'example.json', text: JSON.stringify({ customer: 'alex@example.com', api_key: 'demonstration-key', status: 500 }, null, 2) },
];
export default function SupportSanitizerPage() {
  const [mode, setMode] = useState<'files' | 'curl'>('files');
  const [inputs, setInputs] = useState<SupportInput[]>([]);
  const [paste, setPaste] = useState(''); const [aliases, setAliases] = useState(true); const [bodies, setBodies] = useState(false); const [literals, setLiterals] = useState('');
  const [outputs, setOutputs] = useState<SupportOutput[]>([]); const [selected, setSelected] = useState(0); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [inputKey, setInputKey] = useState(0);
  const worker = useRef<Worker | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => { worker.current?.terminate(); worker.current = null; if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => () => { worker.current?.terminate(); if (timer.current) clearTimeout(timer.current); }, []);
  const invalidate = () => { stop(); setBusy(false); setOutputs([]); setError(''); setSelected(0); };
  const run = () => {
    invalidate();
    try {
      const sources = [...inputs, ...(paste.trim() ? [{ name: 'pasted.txt', text: paste }] : [])];
      if (!sources.length) throw new Error('Choose files, paste text or load the example first.');
      if (paste.length > 5 * 1024 * 1024) throw new Error('Pasted text must be under 5 MB.');
      const exactValues = literals.split(/\r?\n/).filter(Boolean);
      if (exactValues.length > 100 || exactValues.some(value => value.length > 1000)) throw new Error('Use up to 100 exact values, with up to 1,000 characters each.');
      const next = new Worker(new URL('../../lib/support.worker.ts', import.meta.url)); worker.current = next; setBusy(true);
      timer.current = setTimeout(() => { stop(); setBusy(false); setError('Processing took too long. Use a smaller batch or fewer exact values.'); }, 10000);
      next.onmessage = (event: MessageEvent<{ result?: SupportOutput[]; error?: string }>) => { stop(); setBusy(false); if (event.data.error) setError(`Could not sanitize this batch: ${event.data.error}`); else setOutputs(event.data.result ?? []); };
      next.onerror = () => { stop(); setBusy(false); setError('The sanitizer worker could not complete. Reload and try again.'); };
      next.postMessage({ inputs: sources, options: { aliases, includeBodies: bodies, literals: exactValues } });
    }
    catch (err) { setError(`Could not sanitize this batch: ${(err as Error).message}`); }
  };
  const zip = async () => { setBusy(true); try { const { default: JSZip } = await import('jszip'); const archive = new JSZip(); outputs.forEach(output => archive.file(output.name, output.text)); archive.file('review-summary.txt', 'ToolStack support sanitization\nOriginal filenames and alias mappings are excluded.\nReview each output; detection is best-effort.\n' + outputs.map(output => `${output.name}: ${output.changes} transformations${output.requests !== undefined ? `; ${output.requests} requests, order/status/timings retained` : ''}`).join('\n')); downloadLocal(await archive.generateAsync({ type: 'blob' }), 'reviewed-support-files.zip', 'application/zip'); } catch { setError('Could not create the ZIP. Try downloading files individually.'); } finally { setBusy(false); } };
  return <LocalToolLayout title='Support File Sanitizer' description='Clean support files or convert cURL commands to JavaScript locally.'>
    <div className='mx-auto w-full min-w-0 space-y-5'><div className='flex flex-wrap gap-2' aria-label='Support tool mode'><button className={`action ${mode === 'files' ? '' : 'action-secondary'}`} aria-pressed={mode === 'files'} disabled={busy} onClick={() => setMode('files')}>Logs / JSON / HAR</button><button className={`action ${mode === 'curl' ? '' : 'action-secondary'}`} aria-pressed={mode === 'curl'} disabled={busy} onClick={() => setMode('curl')}>cURL → Fetch</button></div>{mode === 'curl' ? <CurlConverter/> : <><fieldset disabled={busy} className='min-w-0 space-y-5' aria-label='Support file workspace'>
      <section className='panel space-y-4'><h2 className='text-lg font-bold'>1. Choose what to share</h2><label className='block text-sm font-semibold'>Logs, JSON or HAR files<input key={inputKey} type='file' multiple accept='.txt,.log,.json,.har,.env,.yaml,.yml,.conf' className='field mt-2' onChange={async event => { invalidate(); setInputs([]); const files = Array.from(event.target.files ?? []); try { checkFileBatch(files); setBusy(true); setInputs(await Promise.all(files.map(async file => ({ name: file.name, text: await file.text() })))); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }}/></label><p className='text-xs text-slate-500 dark:text-slate-400'>Up to 10 files, 5 MB each, 20 MB total. Selected files replace the previous batch. YAML and config files are handled as text.</p>
        {inputs.length > 0 && <ul className='flex flex-wrap gap-2 text-sm'>{inputs.map((input, i) => <li key={i} className='rounded bg-slate-100 dark:bg-slate-800 px-3 py-1'>{input.name}</li>)}</ul>}
        <label className='block text-sm font-semibold'>Or paste a log / config snippet<textarea className='field mt-2 h-36 font-mono text-sm' value={paste} onChange={event => { invalidate(); setPaste(event.target.value); }}/></label>
        <button className='action action-secondary' onClick={() => { invalidate(); setInputs(SAMPLE); setPaste(''); setInputKey(key => key + 1); }}>Load example</button>
      </section>
      <section className='panel space-y-4'><h2 className='text-lg font-bold'>2. Set disclosure rules</h2><label className='flex gap-2 text-sm'><input type='checkbox' checked={aliases} onChange={event => { invalidate(); setAliases(event.target.checked); }}/>Use consistent aliases for emails, IPv4 addresses, UUIDs and local user-folder names</label><label className='flex gap-2 text-sm'><input type='checkbox' checked={bodies} onChange={event => { invalidate(); setBodies(event.target.checked); }}/>Keep and scrub HAR request / response bodies (more information to review)</label><label className='block text-sm font-semibold'>Additional exact values to remove, one per line<textarea className='field mt-2 h-24 font-mono text-sm' value={literals} onChange={event => { invalidate(); setLiterals(event.target.value); }} placeholder='A customer name, hostname or internal project name'/></label><p className='note'>Credentials are replaced, never aliased. HAR files are rebuilt: cookies, most headers, fragments, original filenames and extra fields are omitted; all query values are replaced. Encoded response bodies are omitted. URLs and plain-text bodies can still contain values the rules do not recognize. Review every output.</p><div className='flex flex-wrap gap-3'><button disabled={busy} onClick={run} className='action'>Sanitize & preview</button><button disabled={busy} className='action action-secondary' onClick={() => { invalidate(); setInputs([]); setPaste(''); setLiterals(''); setInputKey(key => key + 1); }}>Clear all</button></div></section>
      {error && <p role='alert' className='note text-red-700 dark:text-red-300'>{error}</p>}
      {outputs.length > 0 && <section className='panel space-y-4'><h2 className='text-lg font-bold'>3. Review the outgoing files</h2><p role='status' className='text-sm'>{outputs.length} files prepared. Downloads use generic filenames; replacement mappings are not exported.</p><label className='block text-sm font-semibold'>Preview file<select className='field mt-2' value={selected} onChange={event => setSelected(Number(event.target.value))}>{outputs.map((output, i) => <option key={i} value={i}>{output.name} · {output.changes} transformations</option>)}</select></label>{outputs[selected]?.requests !== undefined && <p className='text-sm text-emerald-700 dark:text-emerald-300'>{outputs[selected].requests} requests retained, in original order, with status codes and timings.</p>}<textarea aria-label='Outgoing file contents' readOnly value={outputs[selected]?.text ?? ''} className='field h-96 font-mono text-xs'/><div className='flex flex-wrap gap-3'><button className='action' disabled={busy} onClick={() => void zip()}>{busy ? 'Preparing ZIP…' : 'Download reviewed batch'}</button><button className='action action-secondary' onClick={() => { const output = outputs[selected]; if (output) downloadLocal(output.text, output.name); }}>Download this file</button></div></section>}
    </fieldset>{busy && <p role='status' className='note'>Processing locally…</p>}</>}</div>
  </LocalToolLayout>;
}
