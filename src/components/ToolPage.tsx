import Link from 'next/link';
import PrivacyBadge from './PrivacyBadge';
import SourceLink from './SourceLink';
export default function ToolPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className='container mx-auto flex-grow px-4 py-8'><header className='mb-8 text-center'><h1 className='text-4xl font-bold tracking-tight text-slate-900'>{title}</h1><p className='mx-auto mt-2 max-w-3xl text-lg text-slate-600'>{description}</p><div className='mt-4'><PrivacyBadge/></div><div className='mt-2'><SourceLink/></div></header>{children}<div className='mt-12 text-center'><Link href='/' className='font-semibold text-sky-700 hover:underline'>&larr; Back to all tools</Link></div></main>;
}
