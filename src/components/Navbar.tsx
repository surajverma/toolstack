import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  return <nav aria-label='Main navigation' className='bg-gradient-to-r from-sky-700 to-indigo-800 text-white shadow-sm'>
    <div className='page-shell flex items-center justify-between gap-4 px-4 py-4'>
      <Link href='/' className='text-2xl font-extrabold tracking-tight'>ToolStack</Link>
      <div className='flex items-center gap-4'><Link href='/#tools' className='hidden text-sm font-semibold hover:underline sm:inline'>All tools</Link><ThemeToggle/></div>
    </div>
  </nav>;
}
