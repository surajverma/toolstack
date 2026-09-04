'use client';
import { useEffect, useMemo, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';
import { runRegexMatch, type RegexMatch } from '@/lib/regex-worker';

const TOKEN: Record<string, string> = {
  '\\d': 'digit', '\\D': 'non-digit', '\\w': 'word character', '\\W': 'non-word character',
  '\\s': 'whitespace', '\\S': 'non-whitespace', '.': 'any character except newline', '^': 'start of input',
  '$': 'end of input', '+': 'one or more', '*': 'zero or more', '?': 'optional / lazy modifier', '|': 'OR',
};

function explain(pattern: string) {
  const out: string[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const token = pattern[i] === '\\' && i + 1 < pattern.length ? pattern.slice(i, i + 2) : pattern[i];
    if (token.length === 2) i++;
    out.push(`${token}: ${TOKEN[token] ?? 'literal or regex syntax'}`);
  }
  return out;
}

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState('\\w+');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('Hello World 123');
  const [matches, setMatches] = useState<RegexMatch[]>([]);
  const [time, setTime] = useState(0);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!pattern) { setMatches([]); setError(''); setTime(0); return; }
      setRunning(true);
      try {
        const result = await runRegexMatch(pattern, flags, text);
        if (!cancelled) { setMatches(result.matches); setTime(result.executionTime); setError(''); }
      } catch (err) {
        if (!cancelled) { setMatches([]); setTime(0); setError((err as Error).message); }
      } finally {
        if (!cancelled) setRunning(false);
      }
    }, 120);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [pattern, flags, text]);

  const explanation = useMemo(() => explain(pattern), [pattern]);

  return <LocalToolLayout title='Regex Tester & Explainer' description='Test JavaScript regular expressions locally. Execution runs in a disposable Web Worker and is stopped if a pattern takes too long.'>
    <div className='mx-auto max-w-4xl space-y-6'>
      <section className='rounded-xl bg-white p-6 shadow'>
        <label htmlFor='regex-pattern' className='font-semibold'>Pattern</label>
        <div className='mt-2 flex'><span className='rounded-l border bg-slate-100 p-2'>/</span><input id='regex-pattern' value={pattern} onChange={e => setPattern(e.target.value)} className='min-w-0 flex-1 border-y p-2 font-mono'/><span className='border-y bg-slate-100 p-2'>/</span><input aria-label='Regex flags' value={flags} onChange={e => setFlags(e.target.value)} className='w-20 rounded-r border p-2 font-mono'/></div>
        <label htmlFor='regex-text' className='mt-5 block font-semibold'>Test text</label><textarea id='regex-text' value={text} onChange={e => setText(e.target.value)} className='mt-2 h-40 w-full rounded border p-3 font-mono'/>
        <div aria-live='polite' className='mt-4'>{running ? <p className='text-sm text-slate-500'>Testing safely...</p> : error ? <p className='text-red-600'>{error}</p> : <><p className='text-sm text-slate-600'>{matches.length} match{matches.length === 1 ? '' : 'es'} in {time.toFixed(3)} ms</p>{matches.slice(0, 100).map((m, i) => <pre key={`${m.index}-${i}`} className='mt-2 overflow-auto rounded bg-emerald-50 p-3 text-sm'>{JSON.stringify(m, null, 2)}</pre>)}{matches.length > 100 && <p className='mt-2 text-sm text-slate-500'>Showing the first 100 matches.</p>}</>}</div>
      </section>
      <section className='rounded-xl bg-white p-6 shadow'><h2 className='font-semibold'>Basic explanation</h2><div className='mt-3 space-y-1 font-mono text-sm'>{explanation.map((x, i) => <div key={i}>{x}</div>)}</div><p className='mt-4 text-xs text-slate-500'>The explainer is intentionally lightweight; the tester itself uses the JavaScript RegExp engine built into the browser.</p></section>
    </div>
  </LocalToolLayout>;
}
