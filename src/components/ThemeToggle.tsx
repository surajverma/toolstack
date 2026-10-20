'use client';
import { useSyncExternalStore } from 'react';

const readTheme = () => document.documentElement.dataset.theme === 'dark';
const subscribe = (callback: () => void) => {
  const media = matchMedia('(prefers-color-scheme: dark)');
  window.addEventListener('toolstack-theme', callback); window.addEventListener('storage', callback); media.addEventListener('change', callback);
  return () => { window.removeEventListener('toolstack-theme', callback); window.removeEventListener('storage', callback); media.removeEventListener('change', callback); };
};

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, readTheme, () => false);
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return <button type='button' aria-label={label} title={label} className='inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full border border-white/30 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10' onClick={() => {
    const value = dark ? 'light' : 'dark';
    document.documentElement.dataset.appearance = value;
    try { localStorage.setItem('toolstack-theme', value); } catch { /* Keep the selected theme for this page if storage is blocked. */ }
    document.documentElement.dataset.theme = value;
    window.dispatchEvent(new Event('toolstack-theme'));
  }}>
    <svg aria-hidden='true' width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      {dark ? <path d='M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z'/> : <><circle cx='12' cy='12' r='4'/><path d='M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/></>}
    </svg><span className='hidden sm:inline'>{dark ? 'Dark' : 'Light'}</span>
  </button>;
}
