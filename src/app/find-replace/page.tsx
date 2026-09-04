// src/app/find-replace/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

const SAMPLE_TEXT = `This is a simple text for testing.
My email is test@example.com, please contact me.
The quick brown fox jumps over the lazy dog.
A simple plan is a good plan.
SIMPLE things can be the most effective. hello@email.com`;

export default function FindReplacePage() {
  const [inputText, setInputText] = useState(SAMPLE_TEXT);
  const [findText, setFindText] = useState('/^[^s@]+@[^s@]+.[^s@]+$/');
  const [replaceText, setReplaceText] = useState('[REDACTED_EMAIL]');
  const [useRegex, setUseRegex] = useState(true);
  const [isCaseSensitive, setIsCaseSensitive] = useState(true);
  const [copySuccess, setCopySuccess] = useState('');

  const { outputText, matchCount, error, isRegexFlagsProvided } = useMemo(() => {
    if (!findText) return { outputText: inputText, matchCount: 0, error: null, isRegexFlagsProvided: false };
    try {
      if (useRegex) {
        let pattern = findText;
        let flags = isCaseSensitive ? 'g' : 'gi';
        let flagsProvided = false;
        if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
          const lastSlash = pattern.lastIndexOf('/');
          const providedFlags = pattern.substring(lastSlash + 1);
          pattern = pattern.substring(1, lastSlash);
          flags = 'g' + providedFlags.replace(/g/i, '');
          flagsProvided = true;
        }
        if (flags.includes('g')) {
          if (pattern.startsWith('^')) pattern = pattern.substring(1);
          if (pattern.endsWith('$') && !pattern.endsWith('\\$')) pattern = pattern.slice(0, -1);
        }
        const regex = new RegExp(pattern, flags);
        const matches = inputText.match(regex);
        return { outputText: inputText.replace(regex, replaceText), matchCount: matches ? matches.length : 0, error: null, isRegexFlagsProvided: flagsProvided };
      }
      const escapedFindText = findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedFindText, isCaseSensitive ? 'g' : 'gi');
      const matches = inputText.match(regex);
      return { outputText: inputText.replace(regex, replaceText), matchCount: matches ? matches.length : 0, error: null, isRegexFlagsProvided: false };
    } catch (e: unknown) {
      return { outputText: inputText, matchCount: 0, error: (e as Error).message, isRegexFlagsProvided: false };
    }
  }, [inputText, findText, replaceText, useRegex, isCaseSensitive]);

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => {
      setCopySuccess('Output copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  const handleRegexToggle = (checked: boolean) => {
    setUseRegex(checked);
    if (checked) setIsCaseSensitive(true);
  };

  return <div className='flex min-h-screen flex-col bg-slate-50'>
    <Navbar/><Breadcrumbs/>
    <main className='container mx-auto flex-grow px-4 py-8'>
      <header className='mb-8 text-center'><h1 className='text-4xl font-bold text-slate-800'>Find & Replace</h1><p className='mt-1 text-lg text-slate-600'>Perform powerful find and replace operations on your text.</p></header>
      <section className='mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='flex flex-col'><h2 className='rounded-t-lg border border-b-0 bg-slate-100 p-2 font-semibold text-slate-700'>Input Text</h2><textarea value={inputText} onChange={e => setInputText(e.target.value)} className='h-80 w-full resize-none rounded-b-lg border border-slate-300 p-4 font-mono focus:ring-2 focus:ring-sky-500' placeholder='Paste your text here...'/></div>
        <div className='flex flex-col'><div className='flex flex-shrink-0 items-center justify-between rounded-t-lg border border-b-0 bg-slate-100 p-2'><h2 className='font-semibold text-slate-700'>Output</h2><button onClick={handleCopy} disabled={!outputText} className='rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50'>Copy</button></div><textarea readOnly value={outputText} className='h-80 w-full resize-none rounded-b-lg border border-slate-300 bg-slate-50 p-4 font-mono'/>{copySuccess && <p className='mt-1 text-right text-xs text-green-600'>{copySuccess}</p>}</div>
      </section>
      <section className='mx-auto mt-6 max-w-4xl rounded-lg bg-white p-6 shadow-xl'>
        <div className='grid grid-cols-1 items-end gap-4 sm:grid-cols-2'><div><label htmlFor='find' className='block text-sm font-medium text-slate-700'>{useRegex ? 'Find (Regular Expression)' : 'Find'}</label><input type='text' id='find' value={findText} onChange={e => setFindText(e.target.value)} className='mt-1 block w-full rounded-md border border-slate-300 p-2 shadow-sm focus:ring-sky-500'/></div><div><label htmlFor='replace' className='block text-sm font-medium text-slate-700'>Replace with</label><input type='text' id='replace' value={replaceText} onChange={e => setReplaceText(e.target.value)} className='mt-1 block w-full rounded-md border border-slate-300 p-2 shadow-sm focus:ring-sky-500'/></div></div>
        <div className='mt-4 flex flex-wrap items-center justify-between border-t pt-4'><div className='flex items-center space-x-4'><div className='flex items-center'><input id='use-regex' type='checkbox' checked={useRegex} onChange={e => handleRegexToggle(e.target.checked)} className='h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500'/><label htmlFor='use-regex' className='ml-2 block text-sm text-gray-900'>Use Regular Expression</label></div><div className='flex items-center'><input id='case-sensitive' type='checkbox' checked={isCaseSensitive} onChange={e => setIsCaseSensitive(e.target.checked)} disabled={isRegexFlagsProvided} className='h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50'/><label htmlFor='case-sensitive' className={`ml-2 block text-sm ${isRegexFlagsProvided ? 'text-gray-400' : 'text-gray-900'}`}>Case Sensitive</label></div></div><div className='mt-2 sm:mt-0'><span className='rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600'>{matchCount} {matchCount === 1 ? 'match' : 'matches'} found</span></div></div>
        {error && <div className='mt-2 rounded-md bg-red-50 p-2 text-xs text-red-600'>Error: {error}</div>}
      </section>
      <div className='mt-12 text-center'><Link href='/' className='text-sky-600 hover:text-sky-800 hover:underline'>&larr; Back to All Tools</Link></div>
    </main>
    <Footer/>
  </div>;
}
