'use client';
import { usePathname } from 'next/navigation';
export default function SourceLink() { const pathname = usePathname(); if (!pathname || pathname === '/') return null; return <a href={`https://github.com/surajverma/toolstack/tree/master/src/app${pathname}`} target='_blank' rel='noopener noreferrer' className='text-xs font-semibold text-slate-500 hover:text-sky-700 hover:underline'>View this tool source</a>; }
