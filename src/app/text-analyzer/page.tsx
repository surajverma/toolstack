// src/app/text-analyzer/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

// Component to display a single statistic
interface StatCardProps {
  label: string;
  value: number | string;
}

const StatCard = ({ label, value }: StatCardProps) => (
  <div className='bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-center shadow-sm'>
    <p className='text-sm font-medium text-slate-500 dark:text-slate-400'>{label}</p>
    <p className='text-3xl font-bold text-slate-800 dark:text-slate-100'>{value}</p>
  </div>
);

export default function TextAnalyzerPage() {
  const [text, setText] = useState(
    'Paste your text here to see the statistics. This is the first sentence. And this is the second!'
  );

  const stats = useMemo(() => {
    if (!text) {
      return {
        characters: 0,
        words: 0,
        sentences: 0,
        paragraphs: 0,
      };
    }

    // Character count (including spaces)
    const characters = text.length;

    // Word count (splits by spaces and newlines, filters out empty strings)
    const words = text.trim().split(/\s+/).filter(Boolean).length;

    // Sentence count (splits by ., !, ?)
    const sentences = text.match(/[.!?]+/g)?.length || 0;

    // Paragraph count (splits by one or more newline characters)
    const paragraphs = text.split(/\n+/).filter((p) => p.trim() !== '').length;

    return { characters, words, sentences, paragraphs };
  }, [text]);

  return (
    <div className='flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950'>
      <Navbar />
      <Breadcrumbs />
      <main id='main-content' className='flex-grow page-shell px-4 py-8'>
        <header className='mb-8 text-center'>
          <h1 className='text-4xl font-bold text-slate-800 dark:text-slate-100'>Text Statistics Analyzer</h1>
          <p className='text-lg text-slate-600 dark:text-slate-300 mt-1'>
            Get instant stats on your text, like word count, characters, and more.
          </p>
        </header>

        <section className='w-full min-w-0 mx-auto'>
          {/* Input Text Area */}
          <div className='bg-white dark:bg-slate-900 p-6 rounded-lg shadow-xl mb-8'>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className='w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition duration-150 ease-in-out'
              rows={12}
              placeholder='Start typing or paste your text here...'
            />
          </div>

          {/* Statistics Display */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <StatCard label='Words' value={stats.words} />
            <StatCard label='Characters' value={stats.characters} />
            <StatCard label='Sentences' value={stats.sentences} />
            <StatCard label='Paragraphs' value={stats.paragraphs} />
          </div>
        </section>

        <div className='mt-12 text-center'>
          <Link href='/' className='text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 hover:underline'>
            &larr; Back to All Tools
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
