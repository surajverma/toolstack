// src/components/SearchBar.tsx
'use client'; // This component will involve user interaction, so mark it as a Client Component

import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void; // Callback to parent with search term
}

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    // Optionally, call onSearch on every keystroke or use a debounce function
    // For now, we'll rely on a search button or pressing Enter
    // Or, let's do it on every keystroke for immediate feedback:
    onSearch(newSearchTerm);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent page reload on form submission
    onSearch(searchTerm); // Call the onSearch prop with the current term
  };

  return (
    <form onSubmit={handleSubmit} className='w-full max-w-2xl mx-auto'>
      <label htmlFor='tool-search' className='sr-only'>
        Search tools
      </label>
      <div className='relative'>
        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
          <svg
            className='h-5 w-5 text-slate-400'
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 20 20'
            fill='currentColor'
            aria-hidden='true'>
            <path
              fillRule='evenodd'
              d='M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z'
              clipRule='evenodd'
            />
          </svg>
        </div>
        <input
          type='search'
          name='search'
          id='tool-search'
          value={searchTerm}
          onChange={handleInputChange}
          className='block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-shadow duration-150 shadow-sm hover:shadow-md'
          placeholder='Search for a tool (e.g., image compressor, regex)'
        />
      </div>
      {/* Optionally, add a search button if you don't want instant search on type */}
      {/* <button type="submit" className="mt-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700">Search</button> */}
    </form>
  );
};

export default SearchBar;
