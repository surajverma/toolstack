import Link from 'next/link';
import type { Tool } from '@/types/tool';

export default function ToolCard({ tool }: { tool: Tool }) {
  return <Link href={tool.slug} className='group flex h-full flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:border-sky-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500'>
    <h3 className='mb-2 text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-300'>{tool.name}</h3>
    <p className='mb-5 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300'>{tool.description}</p>
    <div className='flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs font-medium text-slate-500 dark:text-slate-400'><span>{tool.category}</span><span aria-hidden='true' className='text-base text-sky-700 dark:text-sky-300'>→</span></div>
  </Link>;
}
