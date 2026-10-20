'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import LocalToolLayout from '@/components/LocalToolLayout';
import { downloadLocal } from '@/lib/local-files';
import { inspectQrText, qrPayload, type QrInput } from '@/lib/qr-toolkit';

export default function QrToolkitPage() {
  const [mode,setMode] = useState<'generate' | 'inspect'>('generate'); const [kind,setKind] = useState<QrInput['kind']>('text');
  const [text,setText] = useState(''); const [ssid,setSsid] = useState(''); const [password,setPassword] = useState(''); const [security,setSecurity] = useState<'WPA' | 'WEP' | 'nopass'>('WPA'); const [hidden,setHidden] = useState(false);
  const [name,setName] = useState(''); const [email,setEmail] = useState(''); const [phone,setPhone] = useState(''); const [organization,setOrganization] = useState('');
  const [generated,setGenerated] = useState<{ png: Blob; svg: string; payload: string } | null>(null); const [decoded,setDecoded] = useState<string | null>(null); const [error,setError] = useState(''); const [busy,setBusy] = useState(false); const [message,setMessage] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null); const worker = useRef<Worker | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const active = useRef(true);
  const stop = () => { worker.current?.terminate(); worker.current = null; if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => { active.current = true; return () => { active.current = false; worker.current?.terminate(); if (timer.current) clearTimeout(timer.current); }; },[]);
  const invalidate = () => { setGenerated(null); setDecoded(null); setError(''); setMessage(''); };
  const generate = async () => {
    invalidate(); setBusy(true);
    try {
      const input: QrInput = kind === 'wifi' ? { kind,ssid,password,security,hidden } : kind === 'contact' ? { kind,name,email,phone,organization } : { kind,text };
      const payload = qrPayload(input); const target = canvas.current!;
      await QRCode.toCanvas(target,payload,{ errorCorrectionLevel: 'M',margin: 4,scale: 6 });
      const svg = await QRCode.toString(payload,{ type: 'svg',errorCorrectionLevel: 'M',margin: 4 });
      const png = await new Promise<Blob>((resolve,reject) => target.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create the QR image.')),'image/png'));
      if (active.current) setGenerated({ png,svg,payload });
    } catch (err) { if (active.current) setError((err as Error).message); } finally { if (active.current) setBusy(false); }
  };
  const decode = (target: HTMLCanvasElement) => {
    stop(); setDecoded(null); setMessage(''); setError(''); setBusy(true);
    try {
      const pixels = target.getContext('2d',{ willReadFrequently: true })!.getImageData(0,0,target.width,target.height).data;
      const next = new Worker(new URL('../../lib/qr.worker.ts',import.meta.url)); worker.current = next;
      timer.current = setTimeout(() => { stop(); setBusy(false); setError('Decoding took too long. Try a smaller, cropped QR image.'); },10000);
      next.onmessage = (event: MessageEvent<{ text?: string; error?: string }>) => { stop(); setBusy(false); if (event.data.error) setError(event.data.error); else setDecoded(event.data.text ?? ''); };
      next.onerror = () => { stop(); setBusy(false); setError('Could not decode this QR image.'); };
      next.postMessage({ pixels,width: target.width,height: target.height },[pixels.buffer]);
    } catch { stop(); setBusy(false); setError('Could not read image pixels in this browser.'); }
  };
  const readImage = async (file: File) => {
    setDecoded(null); setError(''); setMessage(''); setBusy(true);
    let bitmap: ImageBitmap | null = null;
    try {
      if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('Use a PNG, JPEG or WebP image up to 20 MB.');
      bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 20000000) throw new Error('Use an image with at most 20 million pixels.');
      if (!active.current) return;
      const scale = Math.min(1,1600 / Math.max(bitmap.width,bitmap.height)); const target = document.createElement('canvas'); target.width = Math.max(1,Math.round(bitmap.width * scale)); target.height = Math.max(1,Math.round(bitmap.height * scale));
      const context = target.getContext('2d')!; context.fillStyle = '#ffffff'; context.fillRect(0,0,target.width,target.height); context.drawImage(bitmap,0,0,target.width,target.height); decode(target);
    } catch (err) { if (active.current) { setBusy(false); setError((err as Error).message); } } finally { bitmap?.close(); }
  };
  const inspection = decoded === null ? null : inspectQrText(decoded);
  return <LocalToolLayout title='QR Toolkit' description='Create QR codes or read their contents locally.'>
    <fieldset disabled={busy} className='mx-auto min-w-0 max-w-3xl space-y-5'>
      <div className='flex flex-wrap gap-2'>{(['generate','inspect'] as const).map(item => <button key={item} aria-pressed={mode === item} className={`action ${mode === item ? '' : 'action-secondary'}`} onClick={() => { setMode(item); setDecoded(null); setError(''); setMessage(''); }}>{item === 'generate' ? 'Create QR' : 'Read image'}</button>)}</div>
      {mode === 'generate' && <section className='panel space-y-4'>
        <label className='block text-sm font-semibold'>Contents<select className='field mt-2' value={kind} onChange={event => { invalidate(); setKind(event.target.value as QrInput['kind']); }}><option value='text'>Text / URL</option><option value='wifi'>Wi-Fi</option><option value='contact'>Contact</option></select></label>
        {kind === 'text' && <label className='block text-sm font-semibold'>Text or URL<textarea className='field mt-2 h-32' value={text} onChange={event => { invalidate(); setText(event.target.value); }} maxLength={1500}/></label>}
        {kind === 'wifi' && <><label className='block text-sm font-semibold'>Network name (SSID)<input className='field mt-2' maxLength={200} value={ssid} onChange={event => { invalidate(); setSsid(event.target.value); }}/></label><label className='block text-sm font-semibold'>Security<select className='field mt-2' value={security} onChange={event => { invalidate(); setSecurity(event.target.value as typeof security); }}><option value='WPA'>WPA / WPA2 / WPA3 personal</option><option value='WEP'>WEP</option><option value='nopass'>Open network</option></select></label>{security !== 'nopass' && <label className='block text-sm font-semibold'>Password<input type='password' autoComplete='off' className='field mt-2' maxLength={200} value={password} onChange={event => { invalidate(); setPassword(event.target.value); }}/></label>}<label className='flex items-center gap-2 text-sm'><input type='checkbox' checked={hidden} onChange={event => { invalidate(); setHidden(event.target.checked); }}/>Hidden network</label><p className='text-xs text-slate-500 dark:text-slate-400'>Anyone with the QR image can read the network password.</p></>}
        {kind === 'contact' && <div className='grid gap-4 sm:grid-cols-2'>{[{ label: 'Name',value: name,set: setName },{ label: 'Organization',value: organization,set: setOrganization },{ label: 'Email',value: email,set: setEmail },{ label: 'Phone',value: phone,set: setPhone }].map(field => <label className='text-sm font-semibold' key={field.label}>{field.label}<input className='field mt-2' maxLength={200} value={field.value} onChange={event => { invalidate(); field.set(event.target.value); }}/></label>)}</div>}
        <button className='action' onClick={generate}>{busy ? 'Working…' : 'Generate QR'}</button>
      </section>}
      <section hidden={mode !== 'generate' || !generated} className='panel space-y-4'>
        <canvas ref={canvas} aria-label='Generated QR code' role='img' className='mx-auto h-auto max-w-full rounded bg-white' style={{ width: '20rem' }}/>
        {generated && <><div className='flex flex-wrap gap-3'><button className='action' onClick={() => downloadLocal(generated.png,'qr-code.png','image/png')}>Download PNG</button><button className='action action-secondary' onClick={() => downloadLocal(generated.svg,'qr-code.svg','image/svg+xml')}>Download SVG</button><button className='action action-secondary' onClick={() => decode(canvas.current!)}>Inspect this QR</button></div><details><summary className='text-sm font-semibold'>Encoded text</summary><textarea aria-label='Encoded QR text' readOnly className='field mt-3 h-32 font-mono text-xs' value={generated.payload}/></details></>}
      </section>
      {mode === 'inspect' && <section className='panel space-y-4' tabIndex={0} aria-label='QR image workspace' onPaste={event => { if (busy) return; const file = Array.from(event.clipboardData.files).find(item => item.type.startsWith('image/')); if (file) { event.preventDefault(); void readImage(file); } }}><label className='block text-sm font-semibold'>QR image<input className='field mt-2' type='file' accept='image/png,image/jpeg,image/webp' onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void readImage(file); }}/></label><p className='text-sm text-slate-500 dark:text-slate-400'>PNG, JPEG or WebP. You can also paste an image here. Reads one QR code at a time.</p></section>}
      {busy && <p role='status' className='note'>Processing locally…</p>}
      {error && <p role='alert' className='note'>{error}</p>}
      {inspection && decoded !== null && <section className='panel space-y-4'><h2 className='text-lg font-bold'>{inspection.kind}</h2>{inspection.details.length > 0 && <ul className='list-inside list-disc text-sm'>{inspection.details.map((detail,i) => <li key={i}>{detail}</li>)}</ul>}<label className='block text-sm font-semibold'>Decoded contents<textarea aria-label='Decoded QR contents' className='field mt-2 h-48 font-mono text-xs' value={decoded} readOnly/></label><button className='action action-secondary' onClick={async () => { try { await navigator.clipboard.writeText(decoded); setMessage('Copied.'); } catch { setMessage('Could not copy. Select the text to copy it manually.'); } }}>Copy text</button><p className='text-xs text-slate-500 dark:text-slate-400'>Contents are shown without opening links or joining networks. Decoding does not establish whether a destination is safe.</p></section>}
      {message && <p role='status' className='note'>{message}</p>}
    </fieldset>
  </LocalToolLayout>;
}
