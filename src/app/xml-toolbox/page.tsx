'use client';
import { useMemo, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';
import { formatXml } from '@/lib/xml';

type Mode = 'format' | 'minify' | 'json';
function parseXml(value: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(value)) throw new Error('DOCTYPE and ENTITY declarations are blocked in this local utility.');
  const document = new DOMParser().parseFromString(value, 'application/xml');
  const parserError = document.querySelector('parsererror');
  if (parserError) throw new Error(parserError.textContent?.trim() || 'Invalid XML.');
  return document;
}
function elementValue(element: Element): unknown {
  const children = Array.from(element.children);
  const attributes = Object.fromEntries(Array.from(element.attributes).map(attribute => [attribute.name, attribute.value]));
  if (!children.length) return Object.keys(attributes).length ? { '@attributes': attributes, '#text': element.textContent ?? '' } : element.textContent ?? '';
  const result: Record<string, unknown> = {};
  if (Object.keys(attributes).length) result['@attributes'] = attributes;
  for (const child of children) {
    const value = elementValue(child); const current = result[child.tagName];
    if (current === undefined) result[child.tagName] = value;
    else if (Array.isArray(current)) current.push(value);
    else result[child.tagName] = [current, value];
  }
  return result;
}
export default function XmlToolboxPage() {
  const [input, setInput] = useState('<root><item id="1">ToolStack</item><item id="2">Local</item></root>'); const [mode, setMode] = useState<Mode>('format');
  const result = useMemo(() => { try { const document = parseXml(input); const serialized = new XMLSerializer().serializeToString(document); const output = mode === 'format' ? formatXml(serialized) : mode === 'minify' ? serialized.replace(/>\s+</g, '><') : JSON.stringify({ [document.documentElement.tagName]: elementValue(document.documentElement) }, null, 2); return { output, error: '' }; } catch (err) { return { output: '', error: (err as Error).message }; } }, [input, mode]);
  return <LocalToolLayout title='XML Toolbox' description='Validate, format, minify and convert XML to JSON locally. External entity declarations are blocked.'><section className='mx-auto max-w-6xl rounded-xl bg-white p-6 shadow'><div className='mb-4 flex flex-wrap gap-2'>{(['format','minify','json'] as Mode[]).map(value => <button key={value} onClick={() => setMode(value)} className={`rounded px-4 py-2 ${mode === value ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{value === 'json' ? 'XML to JSON' : value[0].toUpperCase() + value.slice(1)}</button>)}</div><div className='grid gap-4 md:grid-cols-2'><textarea value={input} onChange={event => setInput(event.target.value)} aria-label='XML input' className='h-96 rounded border p-4 font-mono'/><pre className='h-96 overflow-auto whitespace-pre-wrap rounded border bg-slate-50 p-4 font-mono text-sm'>{result.error ? `Error: ${result.error}` : result.output}</pre></div>{!result.error && <button onClick={() => navigator.clipboard.writeText(result.output)} className='mt-4 rounded bg-slate-800 px-4 py-2 text-white'>Copy result</button>}</section></LocalToolLayout>;
}
