import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import Wordmark from './Wordmark';

export default function Navbar({ home = false }: { home?: boolean }) {
  return <nav aria-label='Main navigation' className='site-navbar'>
    <div className='page-shell site-navbar-inner'>
      <Link href='/' aria-label='ToolStack home' className='site-logo'><Wordmark /></Link>
      <div className='site-navbar-links'>
        {!home && <Link href='/#tools'>All tools</Link>}
        <a href='https://github.com/surajverma/toolstack' target='_blank' rel='noopener noreferrer'>GitHub</a>
        <ThemeToggle />
      </div>
    </div>
  </nav>;
}
