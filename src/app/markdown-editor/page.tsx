'use client';
import { useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import LocalToolLayout from '@/components/LocalToolLayout';

const SAMPLE = '# Welcome to the Markdown Editor!\n\nThis preview renders **Markdown** locally.\n\n- No upload\n- Sanitized HTML preview\n- Copy generated HTML\n\nRaw HTML such as `<strong>this</strong>` is allowed, but unsafe markup is removed.';
const INITIAL_HTML = String(marked.parse(SAMPLE, { async: false }));

export default function MarkdownEditorPage() {
  const [markdown, setMarkdown] = useState(SAMPLE);
  const [html, setHtml] = useState(INITIAL_HTML);

  const updateMarkdown = (value: string) => {
    setMarkdown(value);
    const rendered = marked.parse(value, { async: false });
    setHtml(DOMPurify.sanitize(String(rendered), { USE_PROFILES: { html: true } }));
  };

  return <LocalToolLayout title='Markdown Editor' description='Edit Markdown locally with a live preview. Marked renders the Markdown and DOMPurify sanitizes the resulting HTML before it reaches the page.'>
    <section className='mx-auto grid max-w-7xl gap-4 md:grid-cols-2'>
      <div className='flex min-h-[60vh] flex-col'><h2 className='rounded-t border bg-slate-100 p-2 font-semibold'>Markdown</h2><textarea aria-label='Markdown input' value={markdown} onChange={e => updateMarkdown(e.target.value)} className='min-h-0 flex-1 rounded-b border p-4 font-mono'/></div>
      <div className='flex min-h-[60vh] flex-col'><div className='flex items-center justify-between rounded-t border bg-slate-100 p-2'><h2 className='font-semibold'>Sanitized preview</h2><button onClick={() => navigator.clipboard.writeText(html)} className='rounded border bg-white px-3 py-1 text-xs'>Copy HTML</button></div><div className='prose max-w-none min-h-0 flex-1 overflow-auto rounded-b border bg-white p-4' dangerouslySetInnerHTML={{ __html: html }}/></div>
    </section>
  </LocalToolLayout>;
}
