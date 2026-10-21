'use client';

import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onSearch }: { value: string; onSearch: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select'))) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return <form role='search' className='directory-search' onSubmit={event => event.preventDefault()}>
    <label htmlFor='tool-search' className='sr-only'>Search tools</label>
    <Search size={19} strokeWidth={1.7} aria-hidden='true' />
    <input ref={input} type='search' name='search' id='tool-search' value={value} onChange={event => onSearch(event.target.value)} placeholder='Search tools…' autoComplete='off' />
    {value && <button type='button' className='search-clear' aria-label='Clear search' onClick={() => { onSearch(''); input.current?.focus(); }}><X size={17} aria-hidden='true' /></button>}
    <kbd aria-hidden='true'>/</kbd>
  </form>;
}
