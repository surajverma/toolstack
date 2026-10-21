'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const readTheme = () => document.documentElement.dataset.theme === 'dark';
const subscribe = (callback: () => void) => {
  const media = matchMedia('(prefers-color-scheme: dark)');
  window.addEventListener('toolstack-theme', callback);
  window.addEventListener('storage', callback);
  media.addEventListener('change', callback);
  return () => {
    window.removeEventListener('toolstack-theme', callback);
    window.removeEventListener('storage', callback);
    media.removeEventListener('change', callback);
  };
};

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, readTheme, () => false);
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  const Icon = dark ? Sun : Moon;
  return <button type='button' aria-label={label} title={label} className='theme-toggle' onClick={() => {
    const value = dark ? 'light' : 'dark';
    document.documentElement.dataset.appearance = value;
    try { localStorage.setItem('toolstack-theme', value); } catch { /* Keep the theme for this page if storage is blocked. */ }
    document.documentElement.dataset.theme = value;
    window.dispatchEvent(new Event('toolstack-theme'));
  }}><Icon size={18} strokeWidth={1.7} aria-hidden='true' /></button>;
}
