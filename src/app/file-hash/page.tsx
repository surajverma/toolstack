'use client';
import { useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';

type Hashes = Record<string,string>;
const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map(b=>b.toString(16).padStart(2,'0')).join('');

export default function FileHashPage(){
 const [file,setFile]=useState<File|null>(null); const [hashes,setHashes]=useState<Hashes>({}); const [busy,setBusy]=useState(false); const [expected,setExpected]=useState('');
 const run=async(f:File)=>{setFile(f);setBusy(true);setHashes({});const data=await f.arrayBuffer();const out:Hashes={};for(const alg of ['SHA-256','SHA-384','SHA-512']) out[alg]=hex(await crypto.subtle.digest(alg,data));setHashes(out);setBusy(false)};
 const normalized=expected.trim().toLowerCase(); const match=normalized ? Object.values(hashes).some(h=>h===normalized) : null;
 return <LocalToolLayout title='File Hash & Checksum' description='Generate SHA-256, SHA-384 and SHA-512 checksums locally using the Web Crypto API.'><section className='mx-auto max-w-4xl rounded-xl bg-white p-6 shadow'><input type='file' onChange={e=>e.target.files?.[0]&&run(e.target.files[0])} className='block w-full rounded border p-3'/>{file&&<p className='mt-3 text-sm text-slate-600'>{file.name} · {(file.size/1024).toFixed(1)} KB</p>}{busy&&<p className='mt-4'>Calculating hashes...</p>}<div className='mt-4 space-y-3'>{Object.entries(hashes).map(([alg,value])=><div key={alg}><label className='text-sm font-semibold'>{alg}</label><div className='mt-1 flex gap-2'><input readOnly value={value} className='min-w-0 flex-1 rounded border p-2 font-mono text-xs'/><button onClick={()=>navigator.clipboard.writeText(value)} className='rounded bg-slate-800 px-3 text-white'>Copy</button></div></div>)}</div>{Object.keys(hashes).length>0&&<div className='mt-6 border-t pt-4'><label className='text-sm font-semibold'>Verify a checksum</label><input value={expected} onChange={e=>setExpected(e.target.value)} placeholder='Paste expected SHA checksum' className='mt-1 w-full rounded border p-2 font-mono text-xs'/>{match!==null&&<p className={`mt-2 font-semibold ${match?'text-green-700':'text-red-700'}`}>{match?'Checksum matches.':'No generated checksum matches.'}</p>}</div>}</section></LocalToolLayout>
}
