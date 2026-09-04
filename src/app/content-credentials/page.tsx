'use client';
import { useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';

type C2paReader = { manifestStore: () => Promise<unknown>; activeManifest: () => Promise<unknown>; free: () => void | Promise<void> };
type C2paClient = { reader: { fromBlob: (mimeType: string, blob: Blob) => Promise<C2paReader | null> }; dispose: () => void | Promise<void> };
type Result = { active: unknown; store: unknown };

export default function ContentCredentialsPage() {
  const [file, setFile] = useState<File | null>(null); const [result, setResult] = useState<Result | null>(null); const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false);
  const inspect = async (next: File) => {
    setFile(next); setResult(null); setStatus(''); setBusy(true); let c2pa: C2paClient | null = null; let reader: C2paReader | null = null;
    try { const module = await import('@contentauth/c2pa-web/inline'); c2pa = await module.createC2pa() as unknown as C2paClient; reader = await c2pa.reader.fromBlob(next.type || 'application/octet-stream', next); if (!reader) { setStatus('No embedded C2PA / Content Credentials manifest was found in this file.'); return; } const [active, store] = await Promise.all([reader.activeManifest(), reader.manifestStore()]); setResult({ active, store }); setStatus('Content Credentials metadata found.'); }
    catch (err) { setStatus(`Could not inspect this file: ${(err as Error).message}`); }
    finally { try { if (reader) await Promise.resolve(reader.free()); } finally { if (c2pa) await Promise.resolve(c2pa.dispose()); setBusy(false); } }
  };
  return <LocalToolLayout title='Content Credentials Inspector' description='Inspect embedded C2PA Content Credentials locally using bundled inline WebAssembly. This tool reads provenance metadata; it does not upload the asset or claim that every signer is trusted.'><section className='mx-auto max-w-5xl rounded-xl bg-white p-6 shadow'><input type='file' onChange={event => event.target.files?.[0] && void inspect(event.target.files[0])} className='w-full rounded border p-3'/>{file && <p className='mt-3 text-sm text-slate-600'>{file.name} · {file.type || 'unknown MIME type'} · {(file.size / 1024).toFixed(1)} KB</p>}<p className={`mt-4 ${result ? 'text-emerald-700' : 'text-slate-600'}`} aria-live='polite'>{busy ? 'Inspecting locally...' : status}</p>{result && <div className='mt-6 grid gap-4 lg:grid-cols-2'><div><h2 className='mb-2 font-semibold'>Active manifest</h2><pre className='max-h-[34rem] overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-4 text-xs text-slate-100'>{JSON.stringify(result.active, null, 2)}</pre></div><div><h2 className='mb-2 font-semibold'>Manifest store</h2><pre className='max-h-[34rem] overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-4 text-xs text-slate-100'>{JSON.stringify(result.store, null, 2)}</pre></div></div>}<div className='mt-6 rounded bg-slate-50 p-4 text-sm text-slate-600'>The SDK is bundled with ToolStack and uses its inline WASM build, so this inspector does not need a CDN or a separate WASM request. Trust interpretation can depend on external trust lists, so this page focuses on reading the embedded provenance data rather than making a blanket authenticity claim.</div></section></LocalToolLayout>;
}
