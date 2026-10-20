'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TOOL_BY_SLUG } from '@/config/tools';
const SPECIAL = new Map([['/license','MIT License'],['/offline','Offline']]);
export default function Breadcrumbs() {
  const pathname = usePathname(); if (pathname === '/') return null; const registered = TOOL_BY_SLUG.get(pathname); const fallback = pathname.replace(/^\//,'').split('/').pop()?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Page'; const pageName = registered?.name ?? SPECIAL.get(pathname) ?? fallback;
  return <nav aria-label='Breadcrumb' className='page-shell px-4 pb-2 pt-6'><ol className='flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400'><li><Link href='/' className='hover:text-sky-700 dark:hover:text-sky-300 hover:underline'>Home</Link></li><li aria-hidden='true'>/</li><li><span className='font-medium text-slate-700 dark:text-slate-200'>{pageName}</span></li></ol></nav>;
}
