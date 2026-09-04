'use client';
import { useState } from 'react';
import JSZip from 'jszip';
import { degrees, PDFDocument } from 'pdf-lib';
import LocalToolLayout from '@/components/LocalToolLayout';
import { parsePageSelection } from '@/lib/page-selection';

type PdfInfo = { file: File; pages: number; error?: string };
type MetadataState = { title: string; author: string; subject: string; keywords: string };
const EMPTY_META: MetadataState = { title: '', author: '', subject: '', keywords: '' };
const MAX_PDF_FILES = 20;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024;
const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

function downloadBytes(bytes: Uint8Array, name: string, type = 'application/pdf') {
  const blob = new Blob([new Uint8Array(bytes).buffer], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

async function loadPdf(file: File) { return PDFDocument.load(await file.arrayBuffer()); }
const baseName = (name: string) => name.replace(/\.pdf$/i, '');

export default function PdfToolkitPage() {
  const [files, setFiles] = useState<PdfInfo[]>([]);
  const [selection, setSelection] = useState('');
  const [operation, setOperation] = useState<'extract'|'delete'|'rotate'>('extract');
  const [rotation, setRotation] = useState(90);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [metadata, setMetadata] = useState<MetadataState>(EMPTY_META);
  const [images, setImages] = useState<File[]>([]);

  const addPdfs = async (list: FileList | null) => {
    if (!list) return;
    const existingKeys = new Set(files.map(item => fileKey(item.file)));
    const room = Math.max(0, MAX_PDF_FILES - files.length);
    const picked = Array.from(list)
      .filter(file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name))
      .filter(file => !existingKeys.has(fileKey(file)))
      .slice(0, room);

    if (!picked.length) {
      setMessage(room === 0 ? `A maximum of ${MAX_PDF_FILES} PDFs can be loaded at once.` : 'No new PDF files were selected.');
      return;
    }

    const total = files.reduce((sum, item) => sum + item.file.size, 0) + picked.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setMessage('Keep the combined PDF batch under 250 MB to avoid exhausting browser memory.');
      return;
    }

    const hadReadablePdf = files.some(item => !item.error && item.pages > 0);
    setBusy(true);
    setMessage('');
    try {
      const loaded = await Promise.all(picked.map(async file => {
        try {
          const doc = await loadPdf(file);
          return { file, pages: doc.getPageCount() };
        } catch (err) {
          return { file, pages: 0, error: (err as Error).message };
        }
      }));
      setFiles(prev => [...prev, ...loaded]);

      if (!hadReadablePdf) {
        const first = loaded.find(item => !item.error && item.pages > 0);
        if (first) {
          setSelection(`1-${first.pages}`);
          const doc = await loadPdf(first.file);
          setMetadata({ title: doc.getTitle() ?? '', author: doc.getAuthor() ?? '', subject: doc.getSubject() ?? '', keywords: doc.getKeywords() ?? '' });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const moveFile = (index: number, direction: -1|1) => setFiles(prev => {
    const target = index + direction;
    if (target < 0 || target >= prev.length) return prev;
    const copy = [...prev];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    return copy;
  });

  const merge = async () => {
    const valid = files.filter(item => !item.error && item.pages > 0);
    if (valid.length < 2) return;
    setBusy(true);
    setMessage('');
    try {
      const output = await PDFDocument.create();
      for (const item of valid) {
        const source = await loadPdf(item.file);
        const copied = await output.copyPages(source, source.getPageIndices());
        copied.forEach(page => output.addPage(page));
      }
      downloadBytes(await output.save(), 'merged.pdf');
    } catch (err) { setMessage((err as Error).message); } finally { setBusy(false); }
  };

  const applyPages = async () => {
    const first = files.find(item => !item.error && item.pages > 0);
    if (!first) return;
    setBusy(true);
    setMessage('');
    try {
      const source = await loadPdf(first.file);
      const indexes = parsePageSelection(selection, source.getPageCount());
      if (operation === 'extract') {
        const output = await PDFDocument.create();
        const copied = await output.copyPages(source, indexes);
        copied.forEach(page => output.addPage(page));
        downloadBytes(await output.save(), `${baseName(first.file.name)}-selected.pdf`);
      } else if (operation === 'delete') {
        const remove = new Set(indexes);
        const keep = source.getPageIndices().filter(index => !remove.has(index));
        if (!keep.length) throw new Error('At least one page must remain after deletion.');
        const output = await PDFDocument.create();
        const copied = await output.copyPages(source, keep);
        copied.forEach(page => output.addPage(page));
        downloadBytes(await output.save(), `${baseName(first.file.name)}-pages-removed.pdf`);
      } else {
        for (const index of new Set(indexes)) {
          const page = source.getPage(index);
          page.setRotation(degrees((page.getRotation().angle + rotation + 360) % 360));
        }
        downloadBytes(await source.save(), `${baseName(first.file.name)}-rotated.pdf`);
      }
    } catch (err) { setMessage((err as Error).message); } finally { setBusy(false); }
  };

  const split = async () => {
    const first = files.find(item => !item.error && item.pages > 0);
    if (!first) return;
    setBusy(true);
    setMessage('');
    try {
      const source = await loadPdf(first.file);
      const zip = new JSZip();
      for (const index of source.getPageIndices()) {
        const output = await PDFDocument.create();
        const [page] = await output.copyPages(source, [index]);
        output.addPage(page);
        zip.file(`${baseName(first.file.name)}-page-${String(index + 1).padStart(3,'0')}.pdf`, await output.save());
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName(first.file.name)}-split.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) { setMessage((err as Error).message); } finally { setBusy(false); }
  };

  const saveMetadata = async () => {
    const first = files.find(item => !item.error && item.pages > 0);
    if (!first) return;
    setBusy(true);
    setMessage('');
    try {
      const doc = await loadPdf(first.file);
      if (metadata.title) doc.setTitle(metadata.title);
      if (metadata.author) doc.setAuthor(metadata.author);
      if (metadata.subject) doc.setSubject(metadata.subject);
      doc.setKeywords(metadata.keywords.split(',').map(value => value.trim()).filter(Boolean));
      doc.setModificationDate(new Date());
      downloadBytes(await doc.save(), `${baseName(first.file.name)}-metadata.pdf`);
    } catch (err) { setMessage((err as Error).message); } finally { setBusy(false); }
  };

  const imagesToPdf = async () => {
    if (!images.length) return;
    setBusy(true);
    setMessage('');
    try {
      const doc = await PDFDocument.create();
      for (const file of images) {
        let bytes = new Uint8Array(await file.arrayBuffer());
        let embedded;
        if (file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)) embedded = await doc.embedJpg(bytes);
        else if (file.type === 'image/png' || /\.png$/i.test(file.name)) embedded = await doc.embedPng(bytes);
        else {
          const bitmap = await createImageBitmap(file);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas is unavailable.');
          context.drawImage(bitmap, 0, 0);
          bitmap.close();
          const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error(`Could not convert ${file.name}.`)), 'image/png'));
          bytes = new Uint8Array(await png.arrayBuffer());
          embedded = await doc.embedPng(bytes);
        }
        const landscape = embedded.width > embedded.height;
        const pageWidth = landscape ? 841.89 : 595.28;
        const pageHeight = landscape ? 595.28 : 841.89;
        const margin = 36;
        const scale = Math.min((pageWidth - margin * 2) / embedded.width, (pageHeight - margin * 2) / embedded.height);
        const width = embedded.width * scale;
        const height = embedded.height * scale;
        const page = doc.addPage([pageWidth, pageHeight]);
        page.drawImage(embedded, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
      }
      downloadBytes(await doc.save(), 'images.pdf');
    } catch (err) { setMessage((err as Error).message); } finally { setBusy(false); }
  };

  const first = files.find(item => !item.error && item.pages > 0);
  const readableCount = files.filter(item => !item.error && item.pages > 0).length;

  return <LocalToolLayout title='PDF Toolkit' description='Merge, split, reorder, extract, delete and rotate PDF pages, edit basic metadata, or turn images into a PDF without uploading documents.'>
    <div className='mx-auto max-w-6xl space-y-6'>
      <section className='rounded-xl bg-white p-6 shadow'>
        <h2 className='text-xl font-semibold'>PDF files</h2>
        <p className='mt-1 text-sm text-slate-500'>Add several PDFs at once, or add them one at a time. New selections are appended to the current list.</p>
        <label htmlFor='pdf-files' className='mt-4 inline-block text-sm font-semibold text-slate-700'>Add one or more PDF files</label>
        <input id='pdf-files' type='file' multiple accept='application/pdf,.pdf' disabled={busy} onChange={event => void addPdfs(event.target.files)} className='mt-2 w-full rounded border p-3 disabled:opacity-50'/>
        {files.length > 0 && <><p className='mt-3 text-sm text-slate-500'>{files.length} file{files.length === 1 ? '' : 's'} loaded, {readableCount} readable.</p><div className='mt-4 space-y-2'>{files.map((item, index) => <div key={fileKey(item.file)} className='flex flex-wrap items-center gap-2 rounded border p-3'><div className='min-w-0 flex-1'><p className='truncate font-medium'>{item.file.name}</p><p className={`text-sm ${item.error ? 'text-red-600' : 'text-slate-500'}`}>{item.error ? 'Could not read this PDF' : `${item.pages} page${item.pages === 1 ? '' : 's'}`}</p></div><button disabled={index === 0} onClick={() => moveFile(index, -1)} className='rounded border px-3 py-1 disabled:opacity-30' aria-label={`Move ${item.file.name} up`}>↑</button><button disabled={index === files.length - 1} onClick={() => moveFile(index, 1)} className='rounded border px-3 py-1 disabled:opacity-30' aria-label={`Move ${item.file.name} down`}>↓</button></div>)}</div></>}
        <button disabled={busy || readableCount < 2} onClick={() => void merge()} className='mt-4 rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40'>Merge PDFs in this order</button>
      </section>

      {first && <section className='rounded-xl bg-white p-6 shadow'><h2 className='text-xl font-semibold'>Page operations · {first.file.name}</h2><p className='mt-1 text-sm text-slate-500'>Use page numbers such as 1-3,5,8-6. Descending ranges are useful for reversing pages.</p><div className='mt-4 grid gap-3 md:grid-cols-[1fr_12rem_10rem]'><input value={selection} onChange={event => setSelection(event.target.value)} className='rounded border p-2 font-mono' aria-label='Page selection'/><select value={operation} onChange={event => setOperation(event.target.value as typeof operation)} className='rounded border p-2'><option value='extract'>Extract / reorder</option><option value='delete'>Delete selected</option><option value='rotate'>Rotate selected</option></select>{operation === 'rotate' ? <select value={rotation} onChange={event => setRotation(Number(event.target.value))} className='rounded border p-2'><option value={90}>+90°</option><option value={180}>+180°</option><option value={270}>+270°</option></select> : <div/>}</div><div className='mt-4 flex flex-wrap gap-3'><button disabled={busy} onClick={() => void applyPages()} className='rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40'>Apply & download copy</button><button disabled={busy} onClick={() => void split()} className='rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-40'>Split every page to ZIP</button></div></section>}

      {first && <section className='rounded-xl bg-white p-6 shadow'><h2 className='text-xl font-semibold'>Document metadata</h2><div className='mt-4 grid gap-3 sm:grid-cols-2'><label>Title<input value={metadata.title} onChange={event => setMetadata(prev => ({ ...prev, title: event.target.value }))} className='mt-1 w-full rounded border p-2'/></label><label>Author<input value={metadata.author} onChange={event => setMetadata(prev => ({ ...prev, author: event.target.value }))} className='mt-1 w-full rounded border p-2'/></label><label>Subject<input value={metadata.subject} onChange={event => setMetadata(prev => ({ ...prev, subject: event.target.value }))} className='mt-1 w-full rounded border p-2'/></label><label>Keywords (comma separated)<input value={metadata.keywords} onChange={event => setMetadata(prev => ({ ...prev, keywords: event.target.value }))} className='mt-1 w-full rounded border p-2'/></label></div><button disabled={busy} onClick={() => void saveMetadata()} className='mt-4 rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-40'>Save metadata to a copy</button></section>}

      <section className='rounded-xl bg-white p-6 shadow'><h2 className='text-xl font-semibold'>Images → PDF</h2><p className='mt-1 text-sm text-slate-500'>JPEG, PNG and browser-decodable images are fitted onto A4 portrait or landscape pages.</p><input type='file' multiple accept='image/*' onChange={event => setImages(Array.from(event.target.files ?? []))} className='mt-4 w-full rounded border p-3'/><button disabled={busy || !images.length} onClick={() => void imagesToPdf()} className='mt-4 rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40'>Create PDF from {images.length || 0} image{images.length === 1 ? '' : 's'}</button></section>

      <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950'>PDF operations rewrite document structure. Existing digital signatures can become invalid, and unusual/encrypted PDFs may not be supported. This tool does not claim secure redaction or PDF compression.</div>
      {message && <p className='rounded bg-red-50 p-3 text-red-700' aria-live='polite'>{message}</p>}
    </div>
  </LocalToolLayout>;
}
