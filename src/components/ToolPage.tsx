import Link from 'next/link';
import PrivacyBadge from './PrivacyBadge';
import SourceLink from './SourceLink';
export default function ToolPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main id='main-content' className='page-shell flex-grow px-4 py-8'><header className='mb-8 text-center'><h1 className='text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100'>{title}</h1><p className='mx-auto mt-2 max-w-3xl text-lg text-slate-600 dark:text-slate-300'>{description}</p><div className='mt-4'><PrivacyBadge/></div><div className='mt-2'><SourceLink/></div></header>{children}<div className='mt-12 text-center'><Link href='/' className='font-semibold text-sky-700 dark:text-sky-300 hover:underline'>&larr; Back to all tools</Link></div></main>;
}
