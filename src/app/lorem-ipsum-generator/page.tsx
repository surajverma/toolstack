// src/app/lorem-ipsum-generator/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

const LOREM_IPSUM_WORDS = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','curabitur','vel','hendrerit','libero','eleifend','blandit','nunc','ornare','odio','ut','orci','gravida','imperdiet','nullam','purus','lacinia','a','pretium','quis','congue','praesent','sagittis','laoreet','auctor','mauris','non','velit','eros','dictum','proin','accumsan','sapien','nec','massa','volutpat','venenatis','sed','eu','molestie','lacus','quisque','porttitor','ligula','dui','mollis','tempus','at','magna','vestibulum','turpis','ac','diam','tincidunt','id','condimentum','enim','sodales','in','hac','habitasse','platea','dictumst','aenean','neque','fusce','augue','leo','eget','semper','mattis','tortor','scelerisque','nulla','interdum','tellus','malesuada','rhoncus','porta','sem','aliquet','et','nam','suspendisse','potenti','vivamus','luctus','fringilla','erat','donec','justo','vehicula','ultricies','varius','ante','primis','faucibus','ultrices','posuere','cubilia','curae','etiam','cursus','aliquam','quam','dapibus','nisl','feugiat','egestas','class','aptent','taciti','sociosqu','ad','litora','torquent','per','conubia','nostra','inceptos','himenaeos','phasellus','nibh','pulvinar','vitae','urna','iaculis','lobortis','nisi','viverra','arcu','morbi','pellentesque','metus','commodo','facilisis','felis','tristique','ullamcorper','placerat','convallis','sollicitudin','integer','rutrum','duis','est','bibendum','pharetra','vulputate','maecenas','mi','fermentum','consequat','suscipit','habitant','senectus','netus','fames','euismod','lectus','elementum','tempor','risus','cras'];
const INITIAL_LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur vel hendrerit libero, eleifend blandit nunc ornare odio.';
type GenerationType = 'words' | 'sentences' | 'paragraphs';

export default function LoremIpsumGeneratorPage() {
  const [genType, setGenType] = useState<GenerationType>('paragraphs');
  const [amount, setAmount] = useState(5);
  const [outputText, setOutputText] = useState(INITIAL_LOREM);
  const [copySuccess, setCopySuccess] = useState('');

  const generateSentence = useCallback(() => {
    const sentenceLength = Math.floor(Math.random() * 10) + 5;
    let sentence = '';
    for (let i = 0; i < sentenceLength; i++) sentence += LOREM_IPSUM_WORDS[Math.floor(Math.random() * LOREM_IPSUM_WORDS.length)] + ' ';
    const trimmed = sentence.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + '.';
  }, []);

  const generateParagraph = useCallback(() => {
    const paragraphLength = Math.floor(Math.random() * 4) + 3;
    let paragraph = '';
    for (let i = 0; i < paragraphLength; i++) paragraph += generateSentence() + ' ';
    return paragraph.trim();
  }, [generateSentence]);

  const handleGenerate = () => {
    if (amount <= 0) { setOutputText(''); return; }
    let result = '';
    if (genType === 'words') {
      for (let i = 0; i < amount; i++) result += LOREM_IPSUM_WORDS[Math.floor(Math.random() * LOREM_IPSUM_WORDS.length)] + ' ';
    } else if (genType === 'sentences') {
      for (let i = 0; i < amount; i++) result += generateSentence() + ' ';
    } else {
      for (let i = 0; i < amount; i++) result += generateParagraph() + '\n\n';
    }
    setOutputText(result.trim());
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => { setCopySuccess('Text copied to clipboard!'); setTimeout(() => setCopySuccess(''), 2000); });
  };

  const amountLabel = genType === 'paragraphs' ? 'Number of Paragraphs:' : genType === 'sentences' ? 'Number of Sentences:' : 'Number of Words:';

  return <div className='flex min-h-screen flex-col bg-slate-50'>
    <Navbar/><Breadcrumbs/>
    <main className='container mx-auto flex-grow px-4 py-8'>
      <header className='mb-8 text-center'><h1 className='text-4xl font-bold text-slate-800'>Lorem Ipsum Generator</h1><p className='mt-1 text-lg text-slate-600'>Create placeholder text for your designs and mockups.</p></header>
      <section className='mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-xl md:p-8'>
        <div className='mb-6 flex flex-wrap items-center justify-center gap-4 rounded-lg border bg-slate-50 p-4 sm:gap-6'><div className='flex items-center gap-2'><label htmlFor='amount' className='whitespace-nowrap font-medium text-slate-700'>{amountLabel}</label><input type='number' id='amount' value={amount} onChange={e => setAmount(Math.max(1, parseInt(e.target.value) || 1))} className='w-20 rounded-md border border-slate-300 p-2 focus:ring-2 focus:ring-sky-500'/></div><div className='flex items-center gap-x-4'><span className='font-medium text-slate-700'>Type:</span><div className='flex items-center gap-x-3'>{(['paragraphs','sentences','words'] as const).map(type => <label key={type} className='flex items-center text-sm text-gray-900'><input name='gen-type' type='radio' checked={genType === type} onChange={() => setGenType(type)} className='h-4 w-4 border-gray-300 text-sky-600 focus:ring-sky-500'/><span className='ml-2 capitalize'>{type}</span></label>)}</div></div><button onClick={handleGenerate} className='rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white hover:bg-sky-700'>Generate</button></div>
        <div className='relative'><textarea readOnly value={outputText} className='h-80 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-4' placeholder='Generated text will appear here...'/><button onClick={handleCopy} disabled={!outputText} className='absolute right-3 top-3 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50'>Copy</button>{copySuccess && <p className='absolute bottom-3 right-3 rounded-md bg-green-100 px-2 py-1 text-xs text-green-700 shadow-lg'>{copySuccess}</p>}</div>
      </section>
      <div className='mt-12 text-center'><Link href='/' className='text-sky-600 hover:text-sky-800 hover:underline'>&larr; Back to All Tools</Link></div>
    </main>
    <Footer/>
  </div>;
}
