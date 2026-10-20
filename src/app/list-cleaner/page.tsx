// src/app/list-cleaner/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

const SAMPLE_LIST = `apple
banana
  cherry  
apple
orange
10
2
1`;

type SortOrder = 'none' | 'az' | 'za' | 'num_asc' | 'num_desc';

export default function ListCleanerPage() {
  const [inputText, setInputText] = useState(SAMPLE_LIST);
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  const outputText = useMemo(() => {
    let lines = inputText.split('\n');

    if (trimWhitespace) {
      lines = lines.map((line) => line.trim());
    }

    // Filter out empty lines after trimming
    lines = lines.filter((line) => line.length > 0);

    if (removeDuplicates) {
      lines = [...new Set(lines)];
    }

    // Sorting logic
    switch (sortOrder) {
      case 'az':
        lines.sort((a, b) => a.localeCompare(b));
        break;
      case 'za':
        lines.sort((a, b) => b.localeCompare(a));
        break;
      case 'num_asc':
        lines.sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
          return numA - numB;
        });
        break;
      case 'num_desc':
        lines.sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          if (isNaN(numA) || isNaN(numB)) return b.localeCompare(a);
          return numB - numA;
        });
        break;
    }

    if (prefix || suffix) {
      lines = lines.map((line) => `${prefix}${line}${suffix}`);
    }

    return lines.join('\n');
  }, [inputText, sortOrder, removeDuplicates, trimWhitespace, prefix, suffix]);

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => {
      setCopySuccess('List copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  return (
    <div className='flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950'>
      <Navbar />
      <Breadcrumbs />
      <main id='main-content' className='flex-grow page-shell px-4 py-8'>
        <header className='mb-8 text-center'>
          <h1 className='text-4xl font-bold text-slate-800 dark:text-slate-100'>Quick List Cleaner & Formatter</h1>
          <p className='text-lg text-slate-600 dark:text-slate-300 mt-1'>Easily sort, clean, and format your lists of text.</p>
        </header>

        <section className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0 mx-auto'>
          {/* Input Area */}
          <div className='flex flex-col'>
            <h2 className='font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 p-2 border border-b-0 rounded-t-lg'>Your List</h2>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className='w-full h-96 p-4 border border-slate-300 dark:border-slate-700 rounded-b-lg font-mono focus:ring-2 focus:ring-sky-500 resize-none'
              placeholder='Paste your list here, one item per line...'
            />
          </div>
          {/* Output Area */}
          <div className='flex flex-col'>
            <div className='flex-shrink-0 flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 border border-b-0 rounded-t-lg'>
              <h2 className='font-semibold text-slate-700 dark:text-slate-200'>Formatted List</h2>
              <button
                onClick={handleCopy}
                disabled={!outputText}
                className='px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-950 disabled:opacity-50'>
                Copy
              </button>
            </div>
            <textarea
              readOnly
              value={outputText}
              className='w-full h-96 p-4 border border-slate-300 dark:border-slate-700 rounded-b-lg font-mono bg-slate-50 dark:bg-slate-950 resize-none'
            />
            {copySuccess && <p className='text-right text-xs text-green-600 dark:text-green-400 mt-1'>{copySuccess}</p>}
          </div>
        </section>

        {/* Controls */}
        <section className='bg-white dark:bg-slate-900 p-6 rounded-lg shadow-xl w-full min-w-0 mx-auto mt-6'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
            {/* Column 1: Main Actions */}
            <div className='space-y-3'>
              <h3 className='font-semibold text-slate-800 dark:text-slate-100'>Cleaning</h3>
              <div className='flex items-center'>
                <input
                  id='trim-whitespace'
                  type='checkbox'
                  checked={trimWhitespace}
                  onChange={(e) => setTrimWhitespace(e.target.checked)}
                  className='h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-sky-600 dark:text-sky-400 focus:ring-sky-500'
                />
                <label htmlFor='trim-whitespace' className='ml-2 block text-sm text-gray-900 dark:text-slate-100'>
                  Trim Whitespace
                </label>
              </div>
              <div className='flex items-center'>
                <input
                  id='remove-duplicates'
                  type='checkbox'
                  checked={removeDuplicates}
                  onChange={(e) => setRemoveDuplicates(e.target.checked)}
                  className='h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-sky-600 dark:text-sky-400 focus:ring-sky-500'
                />
                <label htmlFor='remove-duplicates' className='ml-2 block text-sm text-gray-900 dark:text-slate-100'>
                  Remove Duplicates
                </label>
              </div>
            </div>

            {/* Column 2: Sorting */}
            <div className='space-y-3'>
              <h3 className='font-semibold text-slate-800 dark:text-slate-100'>Sorting</h3>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className='mt-1 block w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-sky-500'>
                <option value='none'>No Sorting</option>
                <option value='az'>Alphabetical (A-Z)</option>
                <option value='za'>Alphabetical (Z-A)</option>
                <option value='num_asc'>Numerical (Asc)</option>
                <option value='num_desc'>Numerical (Desc)</option>
              </select>
            </div>

            {/* Column 3: Formatting */}
            <div className='space-y-3'>
              <h3 className='font-semibold text-slate-800 dark:text-slate-100'>Formatting</h3>
              <div>
                <label htmlFor='prefix' className='block text-xs font-medium text-slate-600 dark:text-slate-300'>
                  Add Prefix
                </label>
                <input
                  type='text'
                  id='prefix'
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className='mt-1 block w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-sky-500'
                />
              </div>
              <div>
                <label htmlFor='suffix' className='block text-xs font-medium text-slate-600 dark:text-slate-300'>
                  Add Suffix
                </label>
                <input
                  type='text'
                  id='suffix'
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className='mt-1 block w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-sky-500'
                />
              </div>
            </div>
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
