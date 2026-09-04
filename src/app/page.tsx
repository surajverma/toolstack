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

  const filtered = useMemo(() => TOOLS.filter(tool => {
    const matchesCategory = !category || tool.category === category;
    const matchesSearch = !q
      || tool.name.toLowerCase().includes(q)
      || tool.description.toLowerCase().includes(q)
      || tool.tags.some(value => value.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  }), [category, q]);

  const heading = category ?? (q ? 'Search results' : 'All tools');

  return <div className='flex min-h-screen flex-col bg-slate-50'>
    <Navbar/>
    <main className='container mx-auto flex-grow px-4 py-10'>
      <header className='mx-auto mb-10 max-w-4xl text-center'>
        <h1 className='text-5xl font-extrabold tracking-tight text-slate-950'>Tool<span className='text-sky-600'>Stack</span></h1>
        <p className='mx-auto mt-4 max-w-3xl text-xl font-medium text-slate-600'>Useful tools with one simple privacy rule: your working data stays on your device.</p>
        <div className='mt-5'><PrivacyBadge/></div>
      </header>

      <section className='mx-auto mb-8 max-w-4xl'><SearchBar onSearch={setSearchTerm}/></section>

      <section className='mb-8 grid gap-3 sm:grid-cols-3'>
        <div className='rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center'><strong className='text-emerald-900'>No uploads</strong><p className='mt-1 text-sm text-emerald-800'>Files and text are processed in the browser.</p></div>
        <div className='rounded-xl border border-sky-100 bg-sky-50 p-4 text-center'><strong className='text-sky-900'>No account or tracking</strong><p className='mt-1 text-sm text-sky-800'>No sign-in is required to use the utilities.</p></div>
        <div className='rounded-xl border border-slate-200 bg-white p-4 text-center'><strong className='text-slate-900'>Offline-friendly</strong><p className='mt-1 text-sm text-slate-600'>Previously visited tools can reopen from the PWA cache.</p></div>
      </section>

      <section className='mb-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm' aria-label='Tool categories'>
        <div className='flex flex-wrap justify-center gap-2'>
          <button onClick={() => setCategory(null)} className={`rounded-full px-4 py-2 text-sm font-semibold ${category === null ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>All</button>
          {TOOL_CATEGORIES.map(item => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm font-semibold ${category === item ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{item}</button>)}
        </div>
      </section>

      <section>
        <div className='mb-5 flex flex-wrap items-baseline justify-between gap-2'>
          <h2 className='text-2xl font-bold text-slate-900'>{heading}</h2>
          <span className='text-sm text-slate-500'>{filtered.length} tool{filtered.length === 1 ? '' : 's'}</span>
        </div>
        <ToolList tools={filtered}/>
        {filtered.length === 0 && <div className='rounded-lg bg-white p-8 text-center shadow'><p className='text-slate-500'>No tools found matching your search.</p></div>}
      </section>
    </main>
    <Footer/>
  </div>;
}
