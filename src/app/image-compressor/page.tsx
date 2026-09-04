'use client';
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import LocalToolLayout from '@/components/LocalToolLayout';

interface ImageItem {
  id: string; file: File; previewUrl: string; status: 'pending'|'compressing'|'done'|'error'; progress: number;
  originalSize: number; compressedSize?: number; compressedFile?: File; width: number; height: number;
}
const MAX_FILES = 25;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;
const BATCH_SIZE = 3;
const release = (items: ImageItem[]) => items.forEach(item => URL.revokeObjectURL(item.previewUrl));

function ImageCard({ item, onRemove, onDownload }: { item: ImageItem; onRemove: (id: string) => void; onDownload: (item: ImageItem) => void }) {
  return <article className='relative overflow-hidden rounded-lg border bg-white shadow-sm'>
    <button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.file.name}`} className='absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-lg font-bold text-white hover:bg-black/80'>&times;</button>
    <div className='flex h-32 items-center justify-center bg-slate-100'><Image unoptimized src={item.previewUrl} alt={`Preview of ${item.file.name}`} width={item.width} height={item.height} className='max-h-full max-w-full object-contain'/></div>
    <div className='p-3 text-center'><p className='truncate text-xs font-semibold text-slate-700' title={item.file.name}>{item.file.name}</p><p className='mt-1 text-xs text-slate-500'>{(item.originalSize / 1024).toFixed(1)} KB</p>
      {item.status === 'compressing' && <div className='mt-2'><div role='progressbar' aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress} aria-label={`Compression progress for ${item.file.name}`} className='h-2.5 w-full rounded-full bg-slate-200'><div className='h-2.5 rounded-full bg-sky-600 transition-all' style={{ width: `${item.progress}%` }}/></div><p className='mt-1 text-xs text-sky-700'>{item.progress}%</p></div>}
      {item.status === 'done' && item.compressedSize !== undefined && <div className='mt-2 text-xs'><p className='font-bold text-emerald-700'>{(item.compressedSize / 1024).toFixed(1)} KB</p><p className='text-emerald-700'>Saved {Math.max(0, (1 - item.compressedSize / item.originalSize) * 100).toFixed(1)}%</p><button onClick={() => onDownload(item)} className='mt-2 w-full rounded bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700'>Download</button></div>}
      {item.status === 'error' && <p className='mt-2 text-xs font-semibold text-red-600'>Failed</p>}
    </div>
  </article>;
}

export default function ImageCompressorPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<ImageItem[]>([]);
  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => release(imagesRef.current), []);

  const clearAll = () => { release(imagesRef.current); setImages([]); setMessage(''); };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imagesRef.current.length + selected.length > MAX_FILES) { setMessage(`Keep each batch to ${MAX_FILES} images or fewer.`); return; }
    const total = imagesRef.current.reduce((sum, item) => sum + item.file.size, 0) + selected.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_BYTES) { setMessage('This batch is over 150 MB. Split it into smaller batches to avoid exhausting browser memory.'); return; }
    setMessage('');
    const additions: ImageItem[] = [];
    for (const file of selected) {
      const previewUrl = URL.createObjectURL(file);
      try {
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => { const img = document.createElement('img'); img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight }); img.onerror = () => reject(new Error('Image could not be decoded.')); img.src = previewUrl; });
        additions.push({ id: crypto.randomUUID(), file, previewUrl, status: 'pending', progress: 0, originalSize: file.size, ...dimensions });
      } catch { URL.revokeObjectURL(previewUrl); }
    }
    setImages(prev => [...prev, ...additions]);
  };

  const compressOne = async (target: ImageItem) => {
    setImages(prev => prev.map(item => item.id === target.id ? { ...item, status: 'compressing' } : item));
    try {
      const blob = await imageCompression(target.file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, onProgress: progress => setImages(prev => prev.map(item => item.id === target.id ? { ...item, progress: Math.round(progress) } : item)) });
      const useOriginal = blob.size >= target.originalSize;
      const file = useOriginal ? target.file : new File([blob], `compressed_${target.file.name}`, { type: blob.type });
      setImages(prev => prev.map(item => item.id === target.id ? { ...item, status: 'done', progress: 100, compressedFile: file, compressedSize: file.size } : item));
    } catch { setImages(prev => prev.map(item => item.id === target.id ? { ...item, status: 'error' } : item)); }
  };

  const compress = async () => { setBusy(true); try { const pending = imagesRef.current.filter(item => item.status === 'pending'); for (let i = 0; i < pending.length; i += BATCH_SIZE) await Promise.all(pending.slice(i, i + BATCH_SIZE).map(compressOne)); } finally { setBusy(false); } };
  const download = (item: ImageItem) => { if (!item.compressedFile) return; const url = URL.createObjectURL(item.compressedFile); const link = document.createElement('a'); link.href = url; link.download = item.compressedFile.name; link.click(); URL.revokeObjectURL(url); };
  const downloadZip = async () => { const done = imagesRef.current.filter(item => item.status === 'done' && item.compressedFile); if (!done.length) return; setDownloading(true); try { const zip = new JSZip(); done.forEach(item => zip.file(item.compressedFile!.name, item.compressedFile!)); const blob = await zip.generateAsync({ type: 'blob' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'compressed_images.zip'; link.click(); URL.revokeObjectURL(url); clearAll(); } finally { setDownloading(false); } };
  const remove = (id: string) => { const item = imagesRef.current.find(candidate => candidate.id === id); if (item) URL.revokeObjectURL(item.previewUrl); setImages(prev => prev.filter(candidate => candidate.id !== id)); };
  const change = (event: ChangeEvent<HTMLInputElement>) => { void handleFiles(event.target.files); event.target.value = ''; };
  const dragOver = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(true); };
  const dragLeave = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); };
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); void handleFiles(event.dataTransfer.files); };
  const pending = images.filter(item => item.status === 'pending').length;
  const done = images.filter(item => item.status === 'done').length;

  return <LocalToolLayout title='Batch Image Compressor' description='Compress image batches locally with sensible memory limits. Files and previews never leave your browser.'>
    <section className='mx-auto max-w-6xl rounded-xl bg-white p-6 shadow'>
      <div onDragOver={dragOver} onDragLeave={dragLeave} onDrop={drop} className={`rounded-xl border-4 border-dashed p-8 text-center ${dragging ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-slate-50'}`}><input ref={inputRef} type='file' multiple accept='image/*' onChange={change} className='sr-only'/><p className='text-lg font-semibold text-slate-700'>{dragging ? 'Drop images here' : 'Drag images here'}</p><p className='mt-1 text-sm text-slate-500'>Up to 25 files / 150 MB per batch.</p><button type='button' onClick={() => inputRef.current?.click()} className='mt-4 rounded bg-sky-600 px-5 py-2 font-semibold text-white hover:bg-sky-700'>Choose images</button></div>
      <p className='mt-3 text-sm text-amber-700' aria-live='polite'>{message}</p>
      {images.length > 0 && <><div className='mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>{images.map(item => <ImageCard key={item.id} item={item} onRemove={remove} onDownload={download}/>)}</div><div className='mt-8 flex flex-wrap justify-center gap-3'><button disabled={busy || pending === 0} onClick={() => void compress()} className='rounded bg-sky-600 px-5 py-2 font-semibold text-white disabled:opacity-40'>{busy ? 'Compressing...' : `Compress ${pending} remaining`}</button><button disabled={busy || downloading || done < 2} onClick={() => void downloadZip()} className='rounded bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-40'>{downloading ? 'Creating ZIP...' : `Download ${done} as ZIP`}</button><button disabled={busy || downloading} onClick={clearAll} className='rounded bg-slate-200 px-5 py-2 font-semibold text-slate-700 disabled:opacity-40'>Clear all</button></div></>}
    </section>
  </LocalToolLayout>;
}
