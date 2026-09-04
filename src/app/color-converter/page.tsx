'use client';

import React, { useState, ChangeEvent } from 'react';
import Link from 'next/link';
import tinycolor from 'tinycolor2';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  prefix?: string;
  isValid: boolean;
}

const ColorInput = ({ label, value, onChange, prefix, isValid }: ColorInputProps) => (
  <div>
    <label className='block text-sm font-medium text-slate-600'>{label}</label>
    <div className='mt-1 flex rounded-md shadow-sm'>
      {prefix && <span className='inline-flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 text-slate-500 sm:text-sm'>{prefix}</span>}
      <input type='text' value={value} onChange={onChange} className={`block w-full flex-1 rounded-none border p-2 font-mono text-slate-900 ${isValid ? 'border-slate-300' : 'border-red-500'} outline-none transition duration-150 ease-in-out focus:border-sky-500 focus:ring-sky-500 ${prefix ? 'rounded-r-md' : 'rounded-md'}`}/>
    </div>
  </div>
);

type ColorSource = 'hex' | 'rgb' | 'hsl' | 'picker';

export default function ColorConverterPage() {
  const initial = tinycolor('#3b82f6');
  const [color, setColor] = useState(initial);
  const [hexValue, setHexValue] = useState(initial.toHexString());
  const [rgbValue, setRgbValue] = useState(initial.toRgbString());
  const [hslValue, setHslValue] = useState(initial.toHslString());

  const applyColor = (next: tinycolor.Instance, source: ColorSource) => {
    setColor(next);
    if (source !== 'hex') setHexValue(next.toHexString());
    if (source !== 'rgb') setRgbValue(next.toRgbString());
    if (source !== 'hsl') setHslValue(next.toHslString());
  };

  const onHexChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexValue(value);
    const next = tinycolor(value);
    if (next.isValid()) applyColor(next, 'hex');
  };

  const onRgbChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRgbValue(value);
    const next = tinycolor(value);
    if (next.isValid()) applyColor(next, 'rgb');
  };

  const onHslChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHslValue(value);
    const next = tinycolor(value);
    if (next.isValid()) applyColor(next, 'hsl');
  };

  const handlePickerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = tinycolor(e.target.value);
    if (next.isValid()) applyColor(next, 'picker');
  };

  const colorIsLight = color.isLight();

  return <div className='flex min-h-screen flex-col bg-slate-50'>
    <Navbar/>
    <Breadcrumbs/>
    <main className='container mx-auto flex-grow px-4 py-8'>
      <header className='mb-8 text-center'><h1 className='text-4xl font-bold text-slate-800'>Instant Color Converter</h1><p className='mt-1 text-lg text-slate-600'>Convert between HEX, RGB, and HSL color formats.</p></header>
      <section className='mx-auto max-w-lg rounded-lg bg-white p-6 shadow-xl md:p-8'>
        <div className='relative mb-6 flex h-48 w-full items-center justify-center rounded-lg border transition-colors duration-200 ease-in-out' style={{ backgroundColor: color.toRgbString(), borderColor: color.clone().darken(10).toRgbString() }}>
          <div className={`rounded-md p-4 text-center ${colorIsLight ? 'bg-white/50 text-black' : 'bg-black/50 text-white'}`}><p className='text-lg font-bold'>{color.toHexString().toUpperCase()}</p><p className='text-sm'>{color.toRgbString()}</p></div>
          <input type='color' value={color.toHexString()} onChange={handlePickerChange} className='absolute right-2 top-2 h-10 w-10 cursor-pointer rounded-md border border-slate-300 bg-white p-1' title='Select a color'/>
        </div>
        <div className='space-y-4'>
          <ColorInput label='HEX' value={hexValue} onChange={onHexChange} isValid={tinycolor(hexValue).isValid()}/>
          <ColorInput label='RGB' value={rgbValue} onChange={onRgbChange} isValid={tinycolor(rgbValue).isValid()}/>
          <ColorInput label='HSL' value={hslValue} onChange={onHslChange} isValid={tinycolor(hslValue).isValid()}/>
        </div>
        <div className='mt-8 border-t pt-4'><h3 className='text-lg font-semibold text-slate-700'>Color Model Explanations</h3><div className='mt-2 space-y-2 text-sm text-slate-600'><p><strong>HEX (Hexadecimal):</strong> A 6-digit code representing Red, Green, and Blue values. It&apos;s compact and widely used in web design.</p><p><strong>RGB (Red, Green, Blue):</strong> Defines a color by the intensity of Red, Green, and Blue, each from 0 to 255. It&apos;s the standard for digital displays.</p><p><strong>HSL (Hue, Saturation, Lightness):</strong> An intuitive model where Hue is the color type, Saturation is the vibrancy, and Lightness is the brightness.</p></div></div>
      </section>
      <div className='mt-12 text-center'><Link href='/' className='text-sky-600 hover:text-sky-800 hover:underline'>&larr; Back to All Tools</Link></div>
    </main>
    <Footer/>
  </div>;
}
