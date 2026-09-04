import Link from 'next/link';
import PrivacyBadge from './PrivacyBadge';

export default function ToolPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className='flex-grow container mx-auto px-4 py-8'>
      <header className='mb-8 text-center'>
        <h1 className='text-4xl font-bold text-slate-800'>{title}</h1>
        <p className='mx-auto mt-2 max-w-3xl text-lg text-slate-600'>{description}</p>
        <div className='mt-4'><PrivacyBadge /></div>
      </header>
      {children}
      <div className='mt-12 text-center'><Link href='/' className='text-sky-600 hover:text-sky-800 hover:underline'>&larr; Back to All Tools</Link></div>
    </main>
  );
}
