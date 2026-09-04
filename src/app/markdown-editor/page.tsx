'use client';
import { useMemo, useState } from 'react';
import showdown from 'showdown';
import LocalToolLayout from '@/components/LocalToolLayout';

const SAMPLE='# Welcome to the Markdown Editor!\n\nThis preview renders **Markdown** locally. Raw HTML is escaped for safety.\n\n- No upload\n- Live preview\n- Copy generated HTML';
const escapeRawHtml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export default function MarkdownEditorPage(){
 const [markdown,setMarkdown]=useState(SAMPLE);
 const converter=useMemo(()=>new showdown.Converter({tables:true,simplifiedAutoLink:true,strikethrough:true,tasklists:true}),[]);
 const html=useMemo(()=>converter.makeHtml(escapeRawHtml(markdown)),[markdown,converter]);
 return <LocalToolLayout title='Markdown Editor' description='Edit Markdown locally with a live preview. Raw HTML is escaped before rendering to keep pasted content from executing scripts.'><section className='mx-auto grid max-w-7xl gap-4 md:grid-cols-2'><div className='flex min-h-[60vh] flex-col'><h2 className='rounded-t border bg-slate-100 p-2 font-semibold'>Markdown</h2><textarea value={markdown} onChange={e=>setMarkdown(e.target.value)} className='min-h-0 flex-1 rounded-b border p-4 font-mono'/></div><div className='flex min-h-[60vh] flex-col'><div className='flex items-center justify-between rounded-t border bg-slate-100 p-2'><h2 className='font-semibold'>Preview</h2><button onClick={()=>navigator.clipboard.writeText(html)} className='rounded border bg-white px-3 py-1 text-xs'>Copy HTML</button></div><div className='prose max-w-none min-h-0 flex-1 overflow-auto rounded-b border bg-white p-4' dangerouslySetInnerHTML={{__html:html}}/></div></section></LocalToolLayout>;
}
