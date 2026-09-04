import Link from 'next/link';
import type { Tool } from '@/types/tool';

interface ToolCardProps { tool: Tool }

export default function ToolCard({ tool }: ToolCardProps) {
  return (
    <Link href={tool.slug} className='block rounded-2xl border border-slate-100 bg-white/90 p-6 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-sky-500'>
      <div className='mb-2 flex items-start justify-between gap-3'>
        <h3 className='text-xl font-extrabold tracking-tight text-slate-800'>{tool.name}</h3>
        <span className='shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700'>Local</span>
      </div>
      <p className='mb-3 text-base text-slate-600'>{tool.description}</p>
      <p className='mb-3 text-xs font-medium text-slate-500'>{tool.category}</p>
      <div className='flex flex-wrap gap-2'>{tool.tags.slice(0,5).map(tag => <span key={tag} className='rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700'>{tag}</span>)}</div>
    </Link>
  );
}
