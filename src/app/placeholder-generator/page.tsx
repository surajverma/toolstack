// src/app/placeholder-generator/page.tsx
'use client';

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // ADDED: Import Next.js Image component
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

// A reusable input component for our generator settings
interface SettingInputProps {
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

const SettingInput = ({ label, type = 'text', value, onChange, placeholder, className }: SettingInputProps) => (
  <div>
    <label htmlFor={`placeholder-${label.toLowerCase().replaceAll(' ', '-')}`} className='block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1'>{label}</label>
    <input
      id={`placeholder-${label.toLowerCase().replaceAll(' ', '-')}`}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`block w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 outline-none transition duration-150 ease-in-out ${className}`}
    />
  </div>
);

// Helper to ensure color is a valid hex code for the canvas
const formatColor = (color: string) => {
  let sanitized = color.replace(/[^0-9a-fA-F]/g, '');
  if (sanitized.length < 6) {
    // Pad with '0' if the hex code is incomplete
    sanitized = sanitized.padEnd(6, '0');
  }
  return `#${sanitized.slice(0, 6)}`;
};

interface ColorSettingInputProps {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const ColorSettingInput = ({ label, value, onChange }: ColorSettingInputProps) => (
  <div>
    <label htmlFor={`placeholder-${label.toLowerCase().replaceAll(' ', '-')}`} className='block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1'>{label}</label>
    <div className='flex items-center rounded-md shadow-sm'>
      <input
        type='text'
        id={`placeholder-${label.toLowerCase().replaceAll(' ', '-')}`}
        value={value}
        onChange={onChange}
        placeholder='e.g., cccccc'
        className='block w-full p-2 border border-slate-300 dark:border-slate-700 rounded-l-md focus:ring-sky-500 focus:border-sky-500 outline-none transition duration-150 ease-in-out'
      />
      <input
        type='color'
        aria-label={`${label} picker`}
        value={formatColor(value)}
        onChange={(e) => {
          const event = {
            target: {
              value: e.target.value.substring(1),
            },
          } as ChangeEvent<HTMLInputElement>;
          onChange(event);
        }}
        className='h-10 w-12 p-1 border border-l-0 border-slate-300 dark:border-slate-700 rounded-r-md cursor-pointer bg-white dark:bg-slate-900'
      />
    </div>
  </div>
);

// =================================================================
// START: NEW Text Wrapping Helper Function
// This function calculates line breaks and draws the text centered.
// =================================================================
const wrapAndCenterText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) => {
  const words = text.split(' ');
  let line = '';
  const lines = [];

  // First pass: group words into lines
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Second pass: draw the lines centered
  const totalTextHeight = lines.length * lineHeight;
  let currentY = y - totalTextHeight / 2 + lineHeight / 2;

  context.textAlign = 'center';
  context.textBaseline = 'middle';

  for (const l of lines) {
    context.fillText(l.trim(), x, currentY);
    currentY += lineHeight;
  }
};
// =================================================================
// END: NEW Text Wrapping Helper Function
// =================================================================

export default function PlaceholderGeneratorPage() {
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(400);
  const [bgColor, setBgColor] = useState('cccccc');
  const [textColor, setTextColor] = useState('969696');
  const [text, setText] = useState(`${width}x${height}`);
  const [imageUrl, setImageUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate the image URL whenever a setting changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = width > 0 ? width : 1;
    canvas.height = height > 0 ? height : 1;

    // --- Drawing Logic ---

    // Background
    ctx.fillStyle = formatColor(bgColor);
    ctx.fillRect(0, 0, width, height);

    // Text
    ctx.fillStyle = formatColor(textColor);
    // Adjust font size based on width, but with a reasonable minimum and maximum
    const fontSize = Math.max(Math.floor(width / 15), 12);
    ctx.font = `${fontSize}px sans-serif`;

    const lineHeight = fontSize * 1.2;
    // Use 90% of the canvas width for text to allow for padding
    const maxWidth = width * 0.9;
    const x = width / 2;
    const y = height / 2;

    wrapAndCenterText(ctx, text, x, y, maxWidth, lineHeight);

    // --- End Drawing Logic ---

    // Get the data URL and update the state
    const dataUrl = canvas.toDataURL('image/png');
    setImageUrl(dataUrl);
  }, [width, height, bgColor, textColor, text]);

  const handleCopyUrl = () => {
    // Using the Clipboard API to copy the base64 Data URL
    navigator.clipboard.writeText(imageUrl).then(
      () => {
        setCopySuccess('Data URL copied to clipboard!');
        setTimeout(() => setCopySuccess(''), 2000); // Clear message after 2 seconds
      },
      (err) => {
        setCopySuccess('Failed to copy URL.');
        console.error('Could not copy text: ', err);
      }
    );
  };

  return (
    <div className='flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950'>
      <Navbar />
      <Breadcrumbs />
      <main id='main-content' className='flex-grow page-shell px-4 py-8'>
        <header className='mb-8 text-center'>
          <h1 className='text-4xl font-bold text-slate-800 dark:text-slate-100'>Placeholder Image Generator</h1>
          <p className='text-lg text-slate-600 dark:text-slate-300 mt-1'>
            Create custom placeholder images for your mockups, generated entirely in your browser.
          </p>
        </header>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 w-full min-w-0 mx-auto'>
          {/* Controls */}
          <section className='md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-lg shadow-xl h-fit'>
            <h2 className='text-xl font-semibold text-slate-700 dark:text-slate-200 border-b pb-2 mb-4'>Settings</h2>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <SettingInput
                  label='Width'
                  type='number'
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value) || 1)}
                />
                <SettingInput
                  label='Height'
                  type='number'
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 1)}
                />
              </div>
              <ColorSettingInput
                label='Background Color'
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
              />
              <ColorSettingInput label='Text Color' value={textColor} onChange={(e) => setTextColor(e.target.value)} />
              <SettingInput
                label='Text'
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='e.g., 600x400'
              />
            </div>
          </section>

          {/* Preview */}
          <section className='md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-lg shadow-xl'>
            <h2 className='text-xl font-semibold text-slate-700 dark:text-slate-200 border-b pb-2 mb-4'>Preview</h2>
            <div className='flex justify-center items-center bg-slate-100 dark:bg-slate-800 rounded-md p-4 min-h-[200px]'>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {/* FIX: Replaced <img> with next/image <Image> */}
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt='Generated placeholder'
                  width={width}
                  height={height}
                  className='max-w-full h-auto shadow-md'
                />
              )}
            </div>
            <div className='mt-4'>
              <label htmlFor='image-url' className='block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1'>
                Generated Data URL
              </label>
              <div className='flex rounded-md shadow-sm'>
                <textarea
                  id='image-url'
                  value={imageUrl}
                  readOnly
                  rows={3}
                  className='block w-full flex-1 rounded-none rounded-l-md p-2 font-mono text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs'
                />
                <button
                  onClick={handleCopyUrl}
                  className='relative inline-flex items-center space-x-2 rounded-r-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500'>
                  Copy
                </button>
              </div>
              {copySuccess && <p className='mt-2 text-sm text-green-600 dark:text-green-400'>{copySuccess}</p>}
            </div>
          </section>
        </div>

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
