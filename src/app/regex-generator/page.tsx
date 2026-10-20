// src/app/regex-generator/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

// Define the structure for our regex patterns
interface RegexPattern {
  value: string;
  label: string;
  regex: RegExp;
  description: string;
}

// An expanded, structured library for the two-dropdown approach
const REGEX_LIBRARY: Record<string, { label: string; patterns: RegexPattern[] }> = {
  validate: {
    label: 'Validate...',
    patterns: [
      {
        value: 'email',
        label: 'an Email Address',
        regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        description: 'Checks for a standard email address format.',
      },
      {
        value: 'url',
        label: 'a URL (with http/s)',
        regex: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
        description: 'Matches a full URL, including http or https.',
      },
      {
        value: 'strong_password',
        label: 'a Strong Password',
        regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        description:
          'Requires 8+ characters, with one uppercase, one lowercase, one number, and one special character.',
      },
      {
        value: 'us_phone',
        label: 'a US Phone Number',
        regex: /^(?:\+1[-.\s]?)?\(?([2-9][0-8][0-9])\)?[-.\s]?([2-9][0-9]{2})[-.\s]?([0-9]{4})$/,
        description: 'Validates common US phone number formats.',
      },
      {
        value: 'credit_card',
        label: 'a Credit Card Number',
        regex:
          /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
        description:
          'Validates common credit card number formats (Visa, Mastercard, Amex, etc.). Does not check for validity, only format.',
      },
      {
        value: 'date_ymd',
        label: 'a Date (YYYY-MM-DD)',
        regex: /^\d{4}-\d{2}-\d{2}$/,
        description: 'Matches the YYYY-MM-DD date format.',
      },
      {
        value: 'hex_color',
        label: 'a HEX Color Code',
        regex: /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
        description: 'Matches 3 or 6-digit hexadecimal color codes.',
      },
      {
        value: 'ipv4',
        label: 'an IPv4 Address',
        regex: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        description: 'Validates an IPv4 address format.',
      },
    ],
  },
  find: {
    label: 'Find all instances of...',
    patterns: [
      { value: 'hashtag', label: 'a Hashtag', regex: /#(\w+)/g, description: 'Finds words preceded by a # symbol.' },
      {
        value: 'mention',
        label: 'a Mention/Handle',
        regex: /@(\w+)/g,
        description: 'Finds words preceded by an @ symbol.',
      },
      {
        value: 'all_numbers',
        label: 'all Numbers',
        regex: /\d+/g,
        description: 'Finds all sequences of one or more digits.',
      },
      {
        value: 'all_caps_words',
        label: 'all Capitalized Words',
        regex: /\b[A-Z][a-z]*\b/g,
        description: 'Finds all words that start with a capital letter.',
      },
    ],
  },
  extract: {
    label: 'Extract...',
    patterns: [
      {
        value: 'domain',
        label: 'the Domain from a URL',
        regex: /https?:\/\/([^\/]+)/,
        description: 'Captures the domain name part of a URL.',
      },
      {
        value: 'filename',
        label: 'the Filename from a Path',
        regex: /[ \w-]+\.[A-Za-z]{2,4}$/,
        description: 'Captures the filename from a file path.',
      },
    ],
  },
};

export default function RegexGeneratorPage() {
  const [actionKey, setActionKey] = useState(Object.keys(REGEX_LIBRARY)[0]);
  const [patternValue, setPatternValue] = useState(REGEX_LIBRARY[actionKey].patterns[0].value);
  const [copySuccess, setCopySuccess] = useState('');

  const handleActionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newActionKey = event.target.value;
    setActionKey(newActionKey);
    // When action changes, reset pattern to the first one in the new list
    setPatternValue(REGEX_LIBRARY[newActionKey].patterns[0].value);
  };

  const handlePatternChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPatternValue(event.target.value);
  };

  const selectedPattern =
    REGEX_LIBRARY[actionKey].patterns.find((p) => p.value === patternValue) || REGEX_LIBRARY[actionKey].patterns[0];

  const handleCopy = (textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopySuccess('Copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  return (
    <div className='flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950'>
      <Navbar />
      <Breadcrumbs />
      <main id='main-content' className='flex-grow page-shell px-4 py-8'>
        <header className='mb-8 text-center'>
          <h1 className='text-4xl font-bold text-slate-800 dark:text-slate-100'>Easy Regex Generator</h1>
          <p className='text-lg text-slate-600 dark:text-slate-300 mt-1'>
            Build a regular expression by choosing what you need from the list below.
          </p>
        </header>

        <section className='bg-white dark:bg-slate-900 p-6 md:p-8 rounded-lg shadow-xl max-w-2xl mx-auto'>
          {/* The "Sentence Builder" with two dropdowns */}
          <div className='flex items-center justify-center flex-wrap gap-x-3 gap-y-2 mb-8 bg-slate-50 dark:bg-slate-950 p-6 rounded-lg border'>
            <span className='text-lg text-slate-700 dark:text-slate-200'>I want to...</span>
            <select
              value={actionKey}
              onChange={handleActionChange}
              className='text-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500'>
              {Object.entries(REGEX_LIBRARY).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={patternValue}
              onChange={handlePatternChange}
              className='text-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500'>
              {REGEX_LIBRARY[actionKey].patterns.map((pattern) => (
                <option key={pattern.value} value={pattern.value}>
                  {pattern.label}
                </option>
              ))}
            </select>
          </div>

          {/* Output Section */}
          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-200'>Generated Regex</label>
              <div className='mt-1 relative'>
                <pre className='w-full p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-100 overflow-x-auto'>
                  <code>{selectedPattern.regex.toString()}</code>
                </pre>
                <button
                  onClick={() => handleCopy(selectedPattern.regex.toString())}
                  className='absolute top-3 right-3 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'>
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-200'>Description</label>
              <p className='mt-1 text-slate-600 dark:text-slate-300 p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-100 dark:bg-slate-800'>
                {selectedPattern.description}
              </p>
            </div>

            {copySuccess && <p className='text-center text-sm text-green-600 dark:text-green-400'>{copySuccess}</p>}

            <div className='pt-4 text-center'>
              <Link
                href={`/regex-tester?pattern=${encodeURIComponent(
                  selectedPattern.regex.source
                )}&flags=${encodeURIComponent(selectedPattern.regex.flags)}`}
                onClick={() => handleCopy(selectedPattern.regex.toString())}
                className='inline-block px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors'>
                Test this Regex &rarr;
              </Link>
            </div>
          </div>
        </section>

        <div className='mt-12 text-center'>
          <Link href='/' className='text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 hover:underline'>
            &larr; Back to All Tools
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
