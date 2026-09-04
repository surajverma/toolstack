'use client';
import { useEffect, useMemo, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';
import { runRegexReplace } from '@/lib/regex-worker';

const SAMPLE_TEXT = `From: user@example.com\nUser 550e8400-e29b-41d4-a716-446655440000 with IP 192.168.1.1 accessed the server.\nDevice: 00:1A:2B:3C:4D:5E\nFor support, call +1 (555) 123-4567.\nCard: 4111 1111 1111 1111\nProject ID: PROJ-12345`;

const RULES = {
  email: { label: 'Email addresses', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  phone: { label: 'Phone numbers (common NANP formats)', regex: /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, replacement: '[REDACTED_PHONE]' },
  ipv4: { label: 'IPv4 addresses', regex: /(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)/g, replacement: '[REDACTED_IP]' },
  uuid: { label: 'UUIDs', regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, replacement: '[REDACTED_UUID]' },
  mac: { label: 'MAC addresses', regex: /\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi, replacement: '[REDACTED_MAC]' },
} as const;
type RuleKey = keyof typeof RULES;

function luhn(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0; let double = false;
  for (let i = digits.length - 1; i >= 0; i--) { let n = Number(digits[i]); if (double) { n *= 2; if (n > 9) n -= 9; } sum += n; double = !double; }
  return sum % 10 === 0;
}

function applyStandard(input: string, active: Record<RuleKey, boolean>, cards: boolean) {
  let output = input;
  (Object.keys(RULES) as RuleKey[]).forEach((key) => { if (active[key]) output = output.replace(RULES[key].regex, RULES[key].replacement); });
  if (cards) output = output.replace(/\b(?:\d[ -]*?){13,19}\b/g, match => luhn(match) ? '[REDACTED_PAYMENT_CARD]' : match);
  return output;
}

function parseCustom(value: string) {
  if (value.startsWith('/') && value.lastIndexOf('/') > 0) {
    const end = value.lastIndexOf('/');
    return { pattern: value.slice(1, end), flags: `g${value.slice(end + 1).replace(/g/g, '')}` };
  }
  return { pattern: value, flags: 'g' };
}

export default function DataAnonymizerPage() {
  const [input, setInput] = useState(SAMPLE_TEXT);
  const [active, setActive] = useState<Record<RuleKey, boolean>>({ email: true, phone: true, ipv4: true, uuid: true, mac: true });
  const [cards, setCards] = useState(true);
  const [customEnabled, setCustomEnabled] = useState(true);
  const [customFind, setCustomFind] = useState('PROJ-\\d+');
  const [customReplace, setCustomReplace] = useState('[PROJECT_ID]');
  const [output, setOutput] = useState('');
  const [customError, setCustomError] = useState('');
  const baseOutput = useMemo(() => applyStandard(input, active, cards), [input, active, cards]);

  useEffect(() => {
    let cancelled = false;
    if (!customEnabled || !customFind) { setOutput(baseOutput); setCustomError(''); return; }
    const timer = window.setTimeout(async () => {
      try {
        const { pattern, flags } = parseCustom(customFind);
        const result = await runRegexReplace(pattern, flags, baseOutput, customReplace);
        if (!cancelled) { setOutput(result); setCustomError(''); }
      } catch (err) {
        if (!cancelled) { setOutput(baseOutput); setCustomError((err as Error).message); }
      }
    }, 120);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [baseOutput, customEnabled, customFind, customReplace]);

  return <LocalToolLayout title='Data Anonymizer' description='Redact common sensitive-looking values before sharing text. Detection is local and intentionally described as best-effort, not complete PII discovery.'>
    <div className='mx-auto max-w-7xl space-y-6'>
      <div className='grid gap-4 md:grid-cols-2'><label className='font-semibold'>Original text<textarea value={input} onChange={e => setInput(e.target.value)} className='mt-2 h-80 w-full rounded border p-4 font-mono'/></label><label className='font-semibold'>Scrubbed text<textarea readOnly value={output} className='mt-2 h-80 w-full rounded border bg-slate-50 p-4 font-mono'/></label></div>
      <section className='rounded-xl bg-white p-6 shadow'><h2 className='text-lg font-semibold'>Detection presets</h2><div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>{(Object.keys(RULES) as RuleKey[]).map(key => <label key={key} className='flex items-start gap-2 text-sm'><input type='checkbox' checked={active[key]} onChange={() => setActive(prev => ({ ...prev, [key]: !prev[key] }))}/><span>{RULES[key].label}</span></label>)}<label className='flex items-start gap-2 text-sm'><input type='checkbox' checked={cards} onChange={e => setCards(e.target.checked)}/><span>Payment-card-like numbers (Luhn-valid only)</span></label></div>
        <div className='mt-6 border-t pt-5'><label className='flex gap-2 font-medium'><input type='checkbox' checked={customEnabled} onChange={e => setCustomEnabled(e.target.checked)}/>Custom regex rule</label><div className='mt-3 grid gap-3 sm:grid-cols-2'><input aria-label='Custom regex' disabled={!customEnabled} value={customFind} onChange={e => setCustomFind(e.target.value)} className='rounded border p-2 font-mono'/><input aria-label='Custom replacement' disabled={!customEnabled} value={customReplace} onChange={e => setCustomReplace(e.target.value)} className='rounded border p-2 font-mono'/></div>{customError && <p className='mt-2 text-sm text-red-600' aria-live='polite'>{customError}</p>}</div>
        <div className='mt-5 flex flex-wrap gap-3'><button onClick={() => navigator.clipboard.writeText(output)} className='rounded bg-slate-800 px-4 py-2 text-white'>Copy scrubbed text</button></div><p className='mt-4 text-xs text-slate-500'>False positives and false negatives are possible. Review the result before relying on it.</p>
      </section>
    </div>
  </LocalToolLayout>;
}
