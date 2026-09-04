import Link from 'next/link';
import type { Tool } from '@/types/tool';
interface ToolCardProps { tool: Tool }
export default function ToolCard({ tool }: ToolCardProps) {
  return <Link href={tool.slug} className='group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500'>
    <div className='mb-3 flex items-start justify-between gap-3'><h3 className='text-lg font-bold tracking-tight text-slate-900 group-hover:text-sky-700'>{tool.name}</h3><div className='flex shrink-0 gap-1'>{tool.new && <span className='rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700'>New</span>}<span className='rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700'>Local</span></div></div>
    <p className='mb-4 text-sm leading-6 text-slate-600'>{tool.description}</p><div className='mb-3 text-xs font-semibold text-slate-500'>{tool.category}</div><div className='flex flex-wrap gap-1.5'>{tool.tags.slice(0,5).map(tag => <span key={tag} className='rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600'>{tag}</span>)}</div>
  </Link>;
}
