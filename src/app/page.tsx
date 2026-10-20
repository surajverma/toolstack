'use client';
import { useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SearchBar from '@/components/SearchBar';
import ToolList from '@/components/ToolList';
import PrivacyBadge from '@/components/PrivacyBadge';
import { TOOLS, TOOL_CATEGORIES } from '@/config/tools';
import type { ToolCategory } from '@/types/tool';

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<ToolCategory | null>(null);
  const q = searchTerm.trim().toLowerCase();
  const filtered = useMemo(() => TOOLS.filter(tool => (!category || tool.category === category) && (!q || [tool.name, tool.description, ...tool.tags].some(value => value.toLowerCase().includes(q)))), [category, q]);
  const browsing = !q && !category;
  return <div className='flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950'>
    <Navbar/>
    <main id='main-content' className='page-shell flex-grow px-4 py-8 sm:py-10'>
      <header className='mx-auto max-w-3xl text-center'>
        <h1 className='text-4xl font-extrabold tracking-tight text-slate-950 dark:text-slate-100 sm:text-5xl'>Tool<span className='text-sky-600 dark:text-sky-300'>Stack</span></h1>
        <p className='mt-3 text-lg text-slate-600 dark:text-slate-300'>Privacy-first browser tools. Your data stays on your device.</p>
        <div className='mt-4'><PrivacyBadge/></div>
        <div className='mt-6'><SearchBar onSearch={setSearchTerm}/></div>
      </header>

      <section id='tools' className='mt-10 scroll-mt-6' aria-label='Tool directory'>
        <label className='mb-6 block text-sm font-semibold sm:hidden'>Category<select className='field mt-2' value={category ?? ''} onChange={event => setCategory(event.target.value ? event.target.value as ToolCategory : null)}><option value=''>All tools ({TOOLS.length})</option>{TOOL_CATEGORIES.map(item => <option key={item} value={item}>{item} ({TOOLS.filter(tool => tool.category === item).length})</option>)}</select></label>
        <div className='mb-7 hidden flex-wrap gap-2 sm:flex' aria-label='Filter by category'>
          <button aria-pressed={category === null} onClick={() => setCategory(null)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${category === null ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-sky-400'}`}>All <span className='ml-1 opacity-75'>{TOOLS.length}</span></button>
          {TOOL_CATEGORIES.map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${category === item ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-sky-400'}`}>{item}<span className='ml-1.5 opacity-75'>{TOOLS.filter(tool => tool.category === item).length}</span></button>)}
        </div>
        {browsing ? <>
          <div id='all-tools' className='scroll-mt-6 space-y-10'>{TOOL_CATEGORIES.map(item => <section key={item} aria-label={item}><div className='mb-4 flex items-center gap-3'><h2 className='text-xl font-bold text-slate-900 dark:text-slate-100'>{item}</h2><span className='text-sm text-slate-500 dark:text-slate-400'>{TOOLS.filter(tool => tool.category === item).length} tools</span></div><ToolList tools={TOOLS.filter(tool => tool.category === item)}/></section>)}</div>
        </> : <>
          <div className='mb-5 flex flex-wrap items-baseline justify-between gap-2'><h2 className='text-2xl font-bold text-slate-900 dark:text-slate-100'>{q ? 'Search results' : category}</h2><p role='status' className='text-sm text-slate-500 dark:text-slate-400'>{filtered.length} tool{filtered.length === 1 ? '' : 's'}</p></div>
          <ToolList tools={filtered}/>
          {filtered.length === 0 && <div className='panel text-center'><p>No tools found. Try a shorter search or choose another category.</p></div>}
        </>}
      </section>
    </main>
    <Footer/>
  </div>;
}
