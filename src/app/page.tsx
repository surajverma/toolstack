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

  const filteredTools = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      const categoryMatch = !category || tool.category === category;
      const searchMatch = !q || tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q) || tool.tags.some((tag) => tag.toLowerCase().includes(q));
      return categoryMatch && searchMatch;
    });
  }, [searchTerm, category]);

  return (
    <div className='flex min-h-screen flex-col bg-slate-50'>
      <Navbar />
      <main className='container mx-auto flex-grow px-4 py-8'>
        <header className='mb-8 text-center'>
          <h1 className='bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent'>ToolStack</h1>
          <p className='mx-auto mt-3 max-w-3xl text-xl font-medium text-slate-600'>Useful browser tools with a simple rule: your working data stays on your device.</p>
          <div className='mt-5'><PrivacyBadge /></div>
        </header>

        <section className='mb-8'><SearchBar onSearch={setSearchTerm} /></section>

        <section className='mb-10 rounded-xl bg-white p-5 shadow-sm' aria-label='Tool categories'>
          <div className='flex flex-wrap justify-center gap-2'>
            <button onClick={() => setCategory(null)} className={`rounded-full px-4 py-2 text-sm font-medium ${category===null?'bg-sky-600 text-white':'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>All</button>
            {TOOL_CATEGORIES.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm font-medium ${category===item?'bg-sky-600 text-white':'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{item}</button>)}
          </div>
        </section>

        <section>
          <div className='mb-5 flex flex-wrap items-baseline justify-between gap-2'>
            <h2 className='text-2xl font-semibold text-slate-700'>{category ?? 'All Tools'}</h2>
            <span className='text-sm text-slate-500'>{filteredTools.length} tool{filteredTools.length===1?'':'s'}</span>
          </div>
          <ToolList tools={filteredTools} />
          {filteredTools.length===0 && <div className='rounded-lg bg-white p-8 text-center shadow'><p className='text-slate-500'>No tools found matching your search.</p></div>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
