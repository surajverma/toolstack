'use client';
import { useState } from 'react';
import { curlToFetch } from '@/lib/curl-converter';
import { downloadLocal } from '@/lib/local-files';

const SAMPLE = ["curl 'https://api.example.invalid/orders?customer=42'", "  -H 'Authorization: Bearer example-token'", `  --json '{"customer_id":42,"email":"test@example.invalid"}'`].join(' \\\n');
export default function CurlConverter() {
  const [input, setInput] = useState(''); const [redact, setRedact] = useState(true);
  const [result, setResult] = useState<ReturnType<typeof curlToFetch> | null>(null); const [message, setMessage] = useState('');
  const reset = () => { setResult(null); setMessage(''); };
  return <section className='panel space-y-4'>
    <label className='block text-sm font-semibold'>cURL command<textarea className='field mt-2 h-48 font-mono text-sm' value={input} onChange={event => { reset(); setInput(event.target.value); }} placeholder="curl 'https://api.example.invalid/data'"/></label>
    <div className='flex flex-wrap items-center gap-3'><button className='action action-secondary' onClick={() => { reset(); setInput(SAMPLE); }}>Load example</button><button className='action action-secondary' onClick={() => { reset(); setInput(''); }}>Clear</button><label className='flex items-center gap-2 text-sm'><input type='checkbox' checked={redact} onChange={event => { reset(); setRedact(event.target.checked); }}/>Redact values for sharing</label></div>
    <p className='text-sm text-slate-500 dark:text-slate-400'>Converts POSIX / Bash cURL text only. No request is sent.</p>
    <button className='action' disabled={!input.trim()} onClick={() => { reset(); try { setResult(curlToFetch(input,redact)); } catch (err) { setMessage((err as Error).message); } }}>Convert to JavaScript</button>
    {message && <p role='status' className='note'>{message}</p>}
    {result && <><label className='block text-sm font-semibold'>{redact ? 'Shareable JavaScript' : 'JavaScript with original values'}<textarea aria-label='Converted JavaScript' readOnly className='field mt-2 h-80 font-mono text-xs' value={result.code}/></label><div className='flex flex-wrap gap-3'><button className='action' onClick={async () => { try { await navigator.clipboard.writeText(result.code); setMessage('Copied.'); } catch { setMessage('Could not copy. Select the generated text to copy it manually.'); } }}>Copy JavaScript</button><button className='action action-secondary' onClick={() => downloadLocal(result.code,redact ? 'request-redacted.js' : 'request.js','text/javascript;charset=utf-8')}>Download .js</button></div>
      {result.warnings.length > 0 && <ul className='note list-inside list-disc'>{result.warnings.map((warning,i) => <li key={i}>{warning}</li>)}</ul>}
      <p className='text-sm text-slate-500 dark:text-slate-400'>{redact ? 'Query values, JSON body values and most header values are replaced. URL paths and field names remain; review them before sharing.' : 'The output contains original request values, including supported authorization headers.'} Browser cookies are not transferred. File references, shell expressions and unsupported options stop conversion.</p>
    </>}
  </section>;
}
