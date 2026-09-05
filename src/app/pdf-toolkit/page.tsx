'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { degrees, PDFDocument } from 'pdf-lib';
import LocalToolLayout from '@/components/LocalToolLayout';
import { parsePageSelection } from '@/lib/page-selection';

type PdfInfo = { file: File; pages: number; error?: string };
type MetadataState = { title: string; author: string; subject: string; keywords: string };
type CompressionMode = 'lossless' | 'balanced' | 'strong';
type CompressionResult = { original: number; compressed: number; downloaded: boolean };

const EMPTY_META: MetadataState = { title: '', author: '', subject: '', keywords: '' };
const MAX_PDF_FILES = 20;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024;
const MAX_COMPRESSION_BYTES = 100 * 1024 * 1024;
const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;
const baseName = (name: string) => name.replace(/\.pdf$/i, '');

function downloadBytes(bytes: Uint8Array, name: string, type = 'application/pdf') {
  const blob = new Blob([new Uint8Array(bytes).buffer], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index++) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

async function loadPdf(file: File) {
  return PDFDocument.load(await file.arrayBuffer());
}

async function readMetadata(item: PdfInfo): Promise<MetadataState> {
  const doc = await loadPdf(item.file);
  return {
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    keywords: doc.getKeywords() ?? '',
  };
}

function compressionArgs(mode: CompressionMode) {
  const args = [
    '--compress-streams=y',
    '--decode-level=generalized',
    '--recompress-flate',
    '--compression-level=9',
    '--object-streams=generate',
  ];
  if (mode !== 'lossless') {
    args.push('--optimize-images', `--jpeg-quality=${mode === 'balanced' ? 75 : 50}`);
  }
  return [...args, '--', 'input.pdf', 'output.pdf'];
}

export default function PdfToolkitPage() {
  const [files, setFiles] = useState<PdfInfo[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [selection, setSelection] = useState('');
  const [operation, setOperation] = useState<'extract' | 'delete' | 'rotate'>('extract');
  const [rotation, setRotation] = useState(90);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [metadata, setMetadata] = useState<MetadataState>(EMPTY_META);
  const [images, setImages] = useState<File[]>([]);
  const [compressionMode, setCompressionMode] = useState<CompressionMode>('lossless');
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);

  const activatePdf = async (item: PdfInfo) => {
    setSelectedKey(fileKey(item.file));
    setSelection(`1-${item.pages}`);
    setMetadata(await readMetadata(item));
    setCompressionResult(null);
  };

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

      if (!selectedKey) {
        const first = loaded.find(item => !item.error && item.pages > 0);
        if (first) await activatePdf(first);
      }
    } finally {
      setBusy(false);
    }
  };

  const selectWorkingPdf = async (key: string) => {
    const item = files.find(candidate => fileKey(candidate.file) === key && !candidate.error && candidate.pages > 0);
    if (!item) return;
    setBusy(true);
    setMessage('');
    try {
      await activatePdf(item);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeFile = async (key: string) => {
    const next = files.filter(item => fileKey(item.file) !== key);
    setFiles(next);
    setMessage('');

    if (selectedKey !== key) return;

    const replacement = next.find(item => !item.error && item.pages > 0);
    if (!replacement) {
      setSelectedKey('');
      setSelection('');
      setMetadata(EMPTY_META);
      setCompressionResult(null);
      return;
    }

    setBusy(true);
    try {
      await activatePdf(replacement);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setSelectedKey('');
    setSelection('');
    setMetadata(EMPTY_META);
    setCompressionResult(null);
    setMessage('');
  };

  const moveFile = (index: number, direction: -1 | 1) => setFiles(prev => {
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
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const applyPages = async (workingPdf: PdfInfo) => {
    setBusy(true);
    setMessage('');
    try {
      const source = await loadPdf(workingPdf.file);
      const indexes = parsePageSelection(selection, source.getPageCount());
      if (operation === 'extract') {
        const output = await PDFDocument.create();
        const copied = await output.copyPages(source, indexes);
        copied.forEach(page => output.addPage(page));
        downloadBytes(await output.save(), `${baseName(workingPdf.file.name)}-selected.pdf`);
      } else if (operation === 'delete') {
        const remove = new Set(indexes);
        const keep = source.getPageIndices().filter(index => !remove.has(index));
        if (!keep.length) throw new Error('At least one page must remain after deletion.');
        const output = await PDFDocument.create();
        const copied = await output.copyPages(source, keep);
        copied.forEach(page => output.addPage(page));
        downloadBytes(await output.save(), `${baseName(workingPdf.file.name)}-pages-removed.pdf`);
      } else {
        for (const index of new Set(indexes)) {
          const page = source.getPage(index);
          page.setRotation(degrees((page.getRotation().angle + rotation + 360) % 360));
        }
        downloadBytes(await source.save(), `${baseName(workingPdf.file.name)}-rotated.pdf`);
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const split = async (workingPdf: PdfInfo) => {
    setBusy(true);
    setMessage('');
    try {
      const source = await loadPdf(workingPdf.file);
      const zip = new JSZip();
      for (const index of source.getPageIndices()) {
        const output = await PDFDocument.create();
        const [page] = await output.copyPages(source, [index]);
        output.addPage(page);
        zip.file(`${baseName(workingPdf.file.name)}-page-${String(index + 1).padStart(3, '0')}.pdf`, await output.save());
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName(workingPdf.file.name)}-split.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveMetadata = async (workingPdf: PdfInfo) => {
    setBusy(true);
    setMessage('');
    try {
      const doc = await loadPdf(workingPdf.file);
      if (metadata.title) doc.setTitle(metadata.title);
      if (metadata.author) doc.setAuthor(metadata.author);
      if (metadata.subject) doc.setSubject(metadata.subject);
      doc.setKeywords(metadata.keywords.split(',').map(value => value.trim()).filter(Boolean));
      doc.setModificationDate(new Date());
      downloadBytes(await doc.save(), `${baseName(workingPdf.file.name)}-metadata.pdf`);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const compressPdf = async (workingPdf: PdfInfo) => {
    if (workingPdf.file.size > MAX_COMPRESSION_BYTES) {
      setMessage('For browser stability, compression is limited to PDFs up to 100 MB.');
      return;
    }

    setBusy(true);
    setMessage('');
    setCompressionResult(null);
    try {
      const { createQpdfRunner } = await import('qpdf-run');
      const runner = await createQpdfRunner({
        workerUrl: new URL('qpdf-run/worker', import.meta.url).href,
        qpdfJsUrl: new URL('qpdf-run/qpdf.js', import.meta.url).href,
        wasmUrl: new URL('qpdf-run/qpdf.wasm', import.meta.url).href,
        timeoutMs: 90000,
      });

      try {
        const input = new Uint8Array(await workingPdf.file.arrayBuffer());
        const output = await runner.runOne({
          input,
          inputName: 'input.pdf',
          outputName: 'output.pdf',
          args: compressionArgs(compressionMode),
        });
        const downloaded = output.byteLength < input.byteLength;
        setCompressionResult({ original: input.byteLength, compressed: output.byteLength, downloaded });

        if (downloaded) {
          downloadBytes(output, `${baseName(workingPdf.file.name)}-compressed.pdf`);
        } else {
          setMessage('This PDF is already compact enough that the selected mode did not produce a smaller file. No larger copy was downloaded.');
        }
      } finally {
        await runner.destroy();
      }
    } catch (err) {
      setMessage(`Compression failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
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
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const readableFiles = files.filter(item => !item.error && item.pages > 0);
  const workingPdf = readableFiles.find(item => fileKey(item.file) === selectedKey) ?? null;
  const operationHelp = operation === 'extract'
    ? 'Creates a new PDF containing only the pages you list, in exactly that order. Use 5,2,1 to reorder or 8-6 to reverse a range.'
    : operation === 'delete'
      ? 'Creates a new PDF with the listed pages removed. Your original file is never modified.'
      : 'Rotates only the listed pages by the angle you choose and downloads a new copy.';
  const compressionHelp = compressionMode === 'lossless'
    ? 'Recompresses compatible streams and PDF structure without intentionally reducing image quality. Best first choice for normal documents.'
    : compressionMode === 'balanced'
      ? 'Includes image optimization at JPEG quality 75 when qpdf can make supported images smaller. Text remains text, but some images may become lossy.'
      : 'Uses stronger JPEG quality 50 image optimization when possible. Best for size reduction when some image-quality loss is acceptable.';

  return <LocalToolLayout title='PDF Toolkit' description='Compress, merge, split, reorder, extract, delete and rotate PDF pages, edit metadata, or turn images into a PDF without uploading documents.'>
    <div className='mx-auto max-w-6xl space-y-6'>
      <section className='rounded-xl bg-white p-6 shadow'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h2 className='text-xl font-semibold'>PDF files</h2>
            <p className='mt-1 text-sm text-slate-500'>Add several PDFs at once, or add them one at a time. New selections are appended to the current list.</p>
          </div>
          {files.length > 0 && <button disabled={busy} onClick={clearFiles} className='rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40'>Clear all</button>}
        </div>
        <label htmlFor='pdf-files' className='mt-4 inline-block text-sm font-semibold text-slate-700'>Add one or more PDF files</label>
        <input id='pdf-files' type='file' multiple accept='application/pdf,.pdf' disabled={busy} onChange={event => { void addPdfs(event.target.files); event.currentTarget.value = ''; }} className='mt-2 w-full rounded border p-3 disabled:opacity-50'/>

        {files.length > 0 && <>
          <p className='mt-3 text-sm text-slate-500'>{files.length} file{files.length === 1 ? '' : 's'} loaded, {readableFiles.length} readable.</p>
          <div className='mt-4 space-y-2'>{files.map((item, index) => <div key={fileKey(item.file)} className='flex flex-wrap items-center gap-2 rounded border p-3'>
            <div className='min-w-0 flex-1'>
              <p className='truncate font-medium'>{item.file.name}</p>
              <p className={`text-sm ${item.error ? 'text-red-600' : 'text-slate-500'}`}>{item.error ? 'Could not read this PDF' : `${item.pages} page${item.pages === 1 ? '' : 's'} · ${formatBytes(item.file.size)}`}</p>
            </div>
            <button disabled={busy || index === 0} onClick={() => moveFile(index, -1)} className='rounded border px-3 py-1 disabled:opacity-30' aria-label={`Move ${item.file.name} up`}>↑</button>
            <button disabled={busy || index === files.length - 1} onClick={() => moveFile(index, 1)} className='rounded border px-3 py-1 disabled:opacity-30' aria-label={`Move ${item.file.name} down`}>↓</button>
            <button disabled={busy} onClick={() => void removeFile(fileKey(item.file))} className='rounded border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-30' aria-label={`Remove ${item.file.name}`}>Remove</button>
          </div>)}</div>
        </>}

        <button disabled={busy || readableFiles.length < 2} onClick={() => void merge()} className='mt-4 rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40'>Merge PDFs in this order</button>
      </section>

      {readableFiles.length > 0 && <section className='rounded-xl border border-sky-100 bg-sky-50 p-5'>
        <label htmlFor='working-pdf' className='block font-semibold text-slate-900'>PDF to edit or compress</label>
        <p className='mt-1 text-sm text-slate-600'>Merge uses the full ordered list above. The tools below work on this selected PDF only.</p>
        <select id='working-pdf' disabled={busy} value={workingPdf ? fileKey(workingPdf.file) : ''} onChange={event => void selectWorkingPdf(event.target.value)} className='mt-3 w-full rounded border border-sky-200 bg-white p-3 disabled:opacity-50'>
          {readableFiles.map(item => <option key={fileKey(item.file)} value={fileKey(item.file)}>{item.file.name} ({item.pages} pages)</option>)}
        </select>
      </section>}

      {workingPdf && <section className='rounded-xl bg-white p-6 shadow'>
        <h2 className='text-xl font-semibold'>Compress PDF</h2>
        <p className='mt-1 text-sm text-slate-500'>Compression runs locally with qpdf WebAssembly. Searchable/selectable text is preserved; ToolStack does not rasterize every page into an image.</p>
        <div className='mt-4 grid gap-3 md:grid-cols-[16rem_1fr]'>
          <select value={compressionMode} onChange={event => { setCompressionMode(event.target.value as CompressionMode); setCompressionResult(null); }} className='rounded border p-3'>
            <option value='lossless'>Lossless / structural</option>
            <option value='balanced'>Balanced image optimization</option>
            <option value='strong'>Stronger image optimization</option>
          </select>
          <p className='rounded bg-slate-50 p-3 text-sm text-slate-600'>{compressionHelp}</p>
        </div>
        <button disabled={busy} onClick={() => void compressPdf(workingPdf)} className='mt-4 rounded bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-40'>{busy ? 'Working…' : `Compress ${workingPdf.file.name}`}</button>
        {compressionResult && <div className='mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm'>
          <div className='grid gap-2 sm:grid-cols-3'>
            <div><span className='block text-slate-500'>Original</span><strong>{formatBytes(compressionResult.original)}</strong></div>
            <div><span className='block text-slate-500'>Compressed result</span><strong>{formatBytes(compressionResult.compressed)}</strong></div>
            <div><span className='block text-slate-500'>Reduction</span><strong>{compressionResult.compressed < compressionResult.original ? `${((1 - compressionResult.compressed / compressionResult.original) * 100).toFixed(1)}%` : 'No reduction'}</strong></div>
          </div>
          <p className='mt-2 text-slate-600'>{compressionResult.downloaded ? 'The smaller copy was downloaded automatically.' : 'The result was not smaller, so ToolStack kept your original instead of downloading a larger file.'}</p>
        </div>}
      </section>}

      {workingPdf && <section className='rounded-xl bg-white p-6 shadow'>
        <h2 className='text-xl font-semibold'>Edit pages in a PDF</h2>
        <p className='mt-1 text-sm text-slate-500'>Extract, reorder, delete or rotate pages in <strong>{workingPdf.file.name}</strong>. Enter pages such as 1-3,5,8-6. Descending ranges reverse page order.</p>
        <div className='mt-4 grid gap-3 md:grid-cols-[1fr_12rem_10rem]'>
          <input value={selection} onChange={event => setSelection(event.target.value)} className='rounded border p-2 font-mono' aria-label='Page selection'/>
          <select value={operation} onChange={event => setOperation(event.target.value as typeof operation)} className='rounded border p-2'>
            <option value='extract'>Extract / reorder</option>
            <option value='delete'>Delete selected</option>
            <option value='rotate'>Rotate selected</option>
          </select>
          {operation === 'rotate' ? <select value={rotation} onChange={event => setRotation(Number(event.target.value))} className='rounded border p-2'><option value={90}>+90°</option><option value={180}>+180°</option><option value={270}>+270°</option></select> : <div/>}
        </div>
        <p className='mt-3 rounded bg-slate-50 p-3 text-sm text-slate-600'>{operationHelp}</p>
        <div className='mt-4 flex flex-wrap gap-3'>
          <button disabled={busy} onClick={() => void applyPages(workingPdf)} className='rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40'>Apply & download copy</button>
          <button disabled={busy} onClick={() => void split(workingPdf)} className='rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-40'>Split every page to ZIP</button>
        </div>
        <p className='mt-3 text-xs text-slate-500'>“Split every page to ZIP” creates one single-page PDF per page and packages all of them into a ZIP file. It does not use the page-selection field.</p>
      </section>}

      {workingPdf && <section className='rounded-xl bg-white p-6 shadow'>
        <h2 className='text-xl font-semibold'>Document metadata · {workingPdf.file.name}</h2>
        <div className='mt-4 grid gap-3 sm:grid-cols-2'>
          <label>Title<input value={metadata.title} onChange={event => setMetadata(prev => ({ ...prev, title: event.target.value }))} className='mt-1 w-full rounded border p-2'/></label>
          <label>Author<input value={metadata.author} onChange={event => setMetadata(prev => ({ ...prev, author: event.target.value }))} className='mt-1 w-full rounded border p-2'/></label>
          <label>Subject<input value={metadata.subject} onChange={event => setMetadata(prev => ({ ...prev, subject: event.target.value }))} className='mt-1 w-full rounded border p-2'/></label>
          <label>Keywords (comma separated)<input value={metadata.keywords} onChange={event => setMetadata(prev => ({ ...prev, keywords: event.target.value }))} className='mt-1 w-full rounded border p-2'/></label>
        </div>
        <button disabled={busy} onClick={() => void saveMetadata(workingPdf)} className='mt-4 rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-40'>Save metadata to a copy</button>
      </section>}

      <section className='rounded-xl bg-white p-6 shadow'>
        <h2 className='text-xl font-semibold'>Images → PDF</h2>
        <p className='mt-1 text-sm text-slate-500'>JPEG, PNG and browser-decodable images are fitted onto A4 portrait or landscape pages.</p>
        <input type='file' multiple accept='image/*' onChange={event => setImages(Array.from(event.target.files ?? []))} className='mt-4 w-full rounded border p-3'/>
        <button disabled={busy || !images.length} onClick={() => void imagesToPdf()} className='mt-4 rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40'>Create PDF from {images.length || 0} image{images.length === 1 ? '' : 's'}</button>
      </section>

      <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950'>PDF operations rewrite document structure. Existing digital signatures can become invalid, and unusual/encrypted PDFs may not be supported. Lossless compression mainly optimizes PDF structure and streams, so an already-efficient or image-heavy PDF may shrink only a little. Balanced/strong modes can use lossy JPEG recompression for supported images.</div>
      {message && <p className='rounded bg-red-50 p-3 text-red-700' aria-live='polite'>{message}</p>}
    </div>
  </LocalToolLayout>;
}
