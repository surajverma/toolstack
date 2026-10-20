// src/app/contrast-checker/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import tinycolor from 'tinycolor2';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

// A reusable component for the color inputs with a picker
interface ColorInputProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorInput = ({ label, value, onChange }: ColorInputProps) => {
  const colorObj = tinycolor(value);
  return (
    <div>
      <label className='block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1'>{label}</label>
      <div className='flex items-center rounded-md shadow-sm'>
        <input
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`block w-full p-2 border border-slate-300 dark:border-slate-700 rounded-l-md focus:ring-sky-500 focus:border-sky-500 outline-none transition duration-150 ease-in-out ${
            !colorObj.isValid() ? 'border-red-500' : ''
          }`}
        />
        <input
          type='color'
          value={colorObj.toHexString()}
          onChange={(e) => onChange(e.target.value)}
          className='h-10 w-12 p-1 border border-l-0 border-slate-300 dark:border-slate-700 rounded-r-md cursor-pointer bg-white dark:bg-slate-900'
        />
      </div>
    </div>
  );
};

// A component to display the result of a single contrast check
const ResultRow = ({ label, ratio, passes }: { label: string; ratio: string; passes: boolean }) => (
  <div className={`p-3 rounded-lg flex justify-between items-center ${passes ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
    <div>
      <p className={`font-semibold ${passes ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>{label}</p>
      <p className={`text-xs ${passes ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Required ratio: {ratio}</p>
    </div>
    <span
      className={`px-3 py-1 text-sm font-bold rounded-full ${
        passes ? 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200'
      }`}>
      {passes ? 'Pass' : 'Fail'}
    </span>
  </div>
);

export default function ContrastCheckerPage() {
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [bgColor, setBgColor] = useState('#3b82f6');

  const { contrast, aa_normal, aaa_normal, aa_large, aaa_large } = useMemo(() => {
    const contrastRatio = tinycolor.readability(bgColor, textColor);
    return {
      contrast: contrastRatio.toFixed(2),
      aa_normal: tinycolor.isReadable(bgColor, textColor, { level: 'AA', size: 'small' }),
      aaa_normal: tinycolor.isReadable(bgColor, textColor, { level: 'AAA', size: 'small' }),
      aa_large: tinycolor.isReadable(bgColor, textColor, { level: 'AA', size: 'large' }),
      aaa_large: tinycolor.isReadable(bgColor, textColor, { level: 'AAA', size: 'large' }),
    };
  }, [textColor, bgColor]);

  return (
    <div className='flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950'>
      <Navbar />
      <Breadcrumbs />
      <main id='main-content' className='flex-grow page-shell px-4 py-8'>
        <header className='mb-8 text-center'>
          <h1 className='text-4xl font-bold text-slate-800 dark:text-slate-100'>Text Contrast Checker</h1>
          <p className='text-lg text-slate-600 dark:text-slate-300 mt-1'>
            Check if your color combinations meet WCAG accessibility standards.
          </p>
        </header>

        <section className='grid grid-cols-1 md:grid-cols-2 gap-8 w-full min-w-0 mx-auto'>
          {/* Left Side: Inputs and Preview */}
          <div className='space-y-6'>
            <ColorInput label='Text Color' value={textColor} onChange={setTextColor} />
            <ColorInput label='Background Color' value={bgColor} onChange={setBgColor} />

            <div className='p-6 rounded-lg shadow-inner' style={{ backgroundColor: bgColor }}>
              <h3 className='text-lg font-bold' style={{ color: textColor }}>
                Large Text (18pt / 24px)
              </h3>
              <p style={{ color: textColor }}>
                This is some sample text to preview the contrast. It helps to visualize how readable your color
                combination will be for different users.
              </p>
            </div>
          </div>

          {/* Right Side: Results */}
          <div className='bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm'>
            <h2 className='text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4 text-center'>Contrast Ratio</h2>
            <p className='text-6xl font-bold text-slate-800 dark:text-slate-100 text-center mb-6'>{contrast}</p>
            <div className='space-y-3'>
              <ResultRow label='Normal Text (AA)' ratio='4.5:1' passes={aa_normal} />
              <ResultRow label='Large Text (AA)' ratio='3:1' passes={aa_large} />
              <ResultRow label='Normal Text (AAA)' ratio='7:1' passes={aaa_normal} />
              <ResultRow label='Large Text (AAA)' ratio='4.5:1' passes={aaa_large} />
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
