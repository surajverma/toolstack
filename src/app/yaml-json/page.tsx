'use client';
import { useMemo, useState } from 'react';
import YAML from 'yaml';
import LocalToolLayout from '@/components/LocalToolLayout';

type Mode = 'yaml-to-json' | 'json-to-yaml';
export default function YamlJsonPage() {
  const [mode, setMode] = useState<Mode>('yaml-to-json'); const [input, setInput] = useState('name: ToolStack\nprivacy: true\ntools:\n  - PDF Toolkit\n  - File Hash\n');
  const result = useMemo(() => { try { const output = mode === 'yaml-to-json' ? JSON.stringify(YAML.parse(input), null, 2) : YAML.stringify(JSON.parse(input)); return { output, error: '' }; } catch (err) { return { output: '', error: (err as Error).message }; } }, [input, mode]);
  const switchMode = (next: Mode) => { setMode(next); setInput(next === 'yaml-to-json' ? 'name: ToolStack\nprivacy: true\n' : '{\n  "name": "ToolStack",\n  "privacy": true\n}'); };
  return <LocalToolLayout title='YAML ↔ JSON Converter' description='Convert YAML and JSON locally using a bundled parser. No document content is transmitted.'><section className='mx-auto max-w-6xl rounded-xl bg-white p-6 shadow'><div className='mb-4 flex gap-2'><button onClick={() => switchMode('yaml-to-json')} className={`rounded px-4 py-2 ${mode === 'yaml-to-json' ? 'bg-sky-600 text-white' : 'bg-slate-100'}`}>YAML → JSON</button><button onClick={() => switchMode('json-to-yaml')} className={`rounded px-4 py-2 ${mode === 'json-to-yaml' ? 'bg-sky-600 text-white' : 'bg-slate-100'}`}>JSON → YAML</button></div><div className='grid gap-4 md:grid-cols-2'><textarea value={input} onChange={event => setInput(event.target.value)} className='h-96 rounded border p-4 font-mono'/><pre className='h-96 overflow-auto whitespace-pre-wrap rounded border bg-slate-50 p-4 font-mono text-sm'>{result.error ? `Error: ${result.error}` : result.output}</pre></div>{!result.error && <button onClick={() => navigator.clipboard.writeText(result.output)} className='mt-4 rounded bg-slate-800 px-4 py-2 text-white'>Copy result</button>}</section></LocalToolLayout>;
}
