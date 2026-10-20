'use client';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';
import { downloadLocal } from '@/lib/local-files';
import { clampBox, paintRedactions, type RedactionBox } from '@/lib/redaction';

export default function ScreenshotRedactorPage() {
  const source = useRef<ImageBitmap | null>(null); const canvas = useRef<HTMLCanvasElement>(null); const start = useRef<{ x: number; y: number } | null>(null); const loadId = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 }); const [boxes, setBoxes] = useState<RedactionBox[]>([]); const [draft, setDraft] = useState<RedactionBox | null>(null);
  const [manual, setManual] = useState<RedactionBox>({ x: 0, y: 0, width: 100, height: 40 }); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [inputKey, setInputKey] = useState(0);
  useEffect(() => () => { loadId.current++; source.current?.close(); }, []);
  useEffect(() => {
    const target = canvas.current; const image = source.current; if (!target || !image) return;
    target.width = image.width; target.height = image.height;
    const context = target.getContext('2d'); if (!context) return;
    context.drawImage(image, 0, 0); paintRedactions(context, [...boxes, ...(draft ? [draft] : [])]);
  }, [size, boxes, draft]);
  const open = async (file: File) => {
    const id = ++loadId.current; setMessage(''); setBusy(true); source.current?.close(); source.current = null; setBoxes([]); setDraft(null); setSize({ width: 0, height: 0 });
    try {
      if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('Choose a PNG, JPEG or WebP image up to 20 MB.');
      const image = await createImageBitmap(file);
      if (image.width * image.height > 12000000 || image.width > 12000 || image.height > 12000) { image.close(); throw new Error('Use an image up to 12 megapixels and 12,000 pixels per side.'); }
      if (id !== loadId.current) { image.close(); return; }
      source.current = image; setBoxes([]); setDraft(null); setSize({ width: image.width, height: image.height });
      setManual({ x: 0, y: 0, width: Math.min(100, image.width), height: Math.min(40, image.height) });
    } catch (err) { if (id === loadId.current) setMessage((err as Error).message); }
    finally { if (id === loadId.current) setBusy(false); }
  };
  const point = (event: PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * size.width / rect.width, y: (event.clientY - rect.top) * size.height / rect.height }; };
  const add = (raw: RedactionBox) => { const box = clampBox(raw, size.width, size.height); if (box.width < 1 || box.height < 1) { setMessage('The rectangle must cover at least one pixel inside the image.'); return; } if (boxes.length >= 100) { setMessage('Use up to 100 redaction areas per image.'); return; } setBoxes(old => [...old, box]); setMessage(''); };
  const exportImage = async () => {
    const image = source.current; if (!image || !boxes.length) return; setBusy(true); setMessage('');
    try {
      const output = document.createElement('canvas'); output.width = image.width; output.height = image.height;
      const context = output.getContext('2d'); if (!context) throw new Error('Canvas is unavailable.');
      context.drawImage(image, 0, 0); paintRedactions(context, boxes);
      const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(value => value ? resolve(value) : reject(new Error('PNG export failed.')), 'image/png'));
      const reopened = await createImageBitmap(blob);
      try { if (reopened.width !== image.width || reopened.height !== image.height) throw new Error('The exported image dimensions could not be verified.'); }
      finally { reopened.close(); }
      downloadLocal(blob, 'redacted-screenshot.png', 'image/png');
      setMessage(`Exported a new, flattened PNG with ${boxes.length} opaque redaction areas. Original image bytes, filename and editable layers are not included.`);
      output.width = 0; output.height = 0;
    } catch (err) { setMessage(`Could not export: ${(err as Error).message}`); } finally { setBusy(false); }
  };
  return <LocalToolLayout title='Screenshot Redactor' description='Cover sensitive pixels with solid black areas and export a new PNG. Paste a screenshot or open an image; the original stays on your device.'>
    <div className='mx-auto w-full min-w-0 space-y-5'>
      <section className='panel space-y-4' onPaste={event => { if (busy) return; const file = Array.from(event.clipboardData.files).find(file => file.type.startsWith('image/')); if (file) { event.preventDefault(); void open(file); } }}>
        <h2 className='text-lg font-bold'>1. Open or paste a screenshot</h2><label className='block text-sm font-semibold'>PNG, JPEG or WebP<input key={inputKey} className='field mt-2' type='file' accept='image/png,image/jpeg,image/webp' disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void open(file); }}/></label><div tabIndex={0} className='rounded-lg border border-dashed p-5 text-center text-sm text-slate-500 dark:text-slate-400' aria-label='Paste a screenshot here'>Focus here and paste an image with Ctrl+V / ⌘V. Up to 20 MB / 12 megapixels.</div>
        <p className='note'>This tool uses manual redaction. Review the entire image, including notifications, QR codes, account details and background content. Solid replacement is used instead of blur or pixelation. Downloaded files contain a fresh flattened image; the original remains unchanged.</p>
      </section>
      {size.width > 0 && <section className='panel space-y-4'><h2 className='text-lg font-bold'>2. Mark sensitive areas</h2><p className='text-sm'>Drag over the image, or add a rectangle using pixel coordinates below. {size.width} × {size.height} pixels.</p>
        <div className='flex justify-center overflow-hidden rounded-lg border bg-slate-200 dark:bg-slate-700 p-2'><canvas ref={canvas} aria-label='Screenshot preview. Draw redaction areas with a pointer, or use the coordinate controls below.' className='block max-w-full touch-none' style={{ width: 'auto', height: 'auto', maxHeight: '70vh', cursor: 'crosshair' }} onPointerDown={event => { if (busy) return; event.currentTarget.setPointerCapture(event.pointerId); start.current = point(event); setDraft(null); }} onPointerMove={event => { if (!start.current) return; const end = point(event); setDraft(clampBox({ x: start.current.x, y: start.current.y, width: end.x - start.current.x, height: end.y - start.current.y }, size.width, size.height)); }} onPointerUp={event => { if (!start.current) return; const end = point(event); add({ x: start.current.x, y: start.current.y, width: end.x - start.current.x, height: end.y - start.current.y }); start.current = null; setDraft(null); }} onPointerCancel={() => { start.current = null; setDraft(null); }}/></div>
        <fieldset className='rounded-lg border p-4'><legend className='px-2 text-sm font-semibold'>Add an area with coordinates</legend><div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>{(['x','y','width','height'] as const).map(key => <label key={key} className='text-sm capitalize'>{key}<input type='number' aria-label={`Rectangle ${key}`} className='field mt-1' min={key === 'x' || key === 'y' ? 0 : 1} max={key === 'x' || key === 'width' ? size.width : size.height} value={manual[key]} onChange={event => setManual(old => ({ ...old, [key]: Number(event.target.value) }))}/></label>)}</div><button disabled={busy} className='action action-secondary mt-3' onClick={() => add(manual)}>Add redaction area</button></fieldset>
        <div className='flex flex-wrap items-center gap-3'><span role='status' className='mr-auto text-sm'>{boxes.length} redaction areas</span><button className='action action-secondary' disabled={busy || !boxes.length} onClick={() => { setBoxes(old => old.slice(0, -1)); setMessage(''); }}>Undo last area</button><button className='action action-secondary' disabled={busy || !boxes.length} onClick={() => { setBoxes([]); setMessage(''); }}>Reset areas</button><button className='action' disabled={busy || !boxes.length} onClick={() => void exportImage()}>{busy ? 'Preparing image…' : 'Download redacted PNG'}</button></div>
        <button disabled={busy} className='text-sm font-semibold text-sky-700 dark:text-sky-300 hover:underline' onClick={() => { loadId.current++; source.current?.close(); source.current = null; setBoxes([]); setDraft(null); setSize({ width: 0, height: 0 }); setMessage(''); setInputKey(key => key + 1); }}>Clear image from this tool</button>
      </section>}
      {message && <p role='status' className='note'>{message}</p>}
    </div>
  </LocalToolLayout>;
}
