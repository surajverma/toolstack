// src/app/http-status-codes/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

// Define the structure for a status code
interface StatusCode {
  code: number;
  title: string;
  description: string;
}

// A comprehensive list of HTTP status codes
const STATUS_CODES: Record<string, { label: string; codes: StatusCode[] }> = {
  '1xx': {
    label: '1xx Informational',
    codes: [
      {
        code: 100,
        title: 'Continue',
        description:
          'The server has received the request headers and the client should proceed to send the request body.',
      },
      {
        code: 101,
        title: 'Switching Protocols',
        description: 'The server is switching protocols to one requested by the client.',
      },
      {
        code: 102,
        title: 'Processing',
        description: 'The server has received and is processing the request, but no response is available yet.',
      },
    ],
  },
  '2xx': {
    label: '2xx Success',
    codes: [
      { code: 200, title: 'OK', description: 'The request has succeeded.' },
      {
        code: 201,
        title: 'Created',
        description: 'The request has been fulfilled and has resulted in one or more new resources being created.',
      },
      {
        code: 202,
        title: 'Accepted',
        description: 'The request has been accepted for processing, but the processing has not been completed.',
      },
      {
        code: 204,
        title: 'No Content',
        description: 'The server successfully processed the request and is not returning any content.',
      },
    ],
  },
  '3xx': {
    label: '3xx Redirection',
    codes: [
      {
        code: 301,
        title: 'Moved Permanently',
        description: 'This and all future requests should be directed to the given URI.',
      },
      {
        code: 302,
        title: 'Found',
        description: 'The resource was found but at a different URI. Clients should continue to use the original URI.',
      },
      {
        code: 304,
        title: 'Not Modified',
        description: 'The resource has not been modified since the version specified by the request headers.',
      },
      {
        code: 307,
        title: 'Temporary Redirect',
        description:
          'The request should be repeated with another URI, but future requests should still use the original URI.',
      },
    ],
  },
  '4xx': {
    label: '4xx Client Error',
    codes: [
      {
        code: 400,
        title: 'Bad Request',
        description: 'The server cannot process the request due to a client error (e.g., malformed request syntax).',
      },
      {
        code: 401,
        title: 'Unauthorized',
        description: 'The client must authenticate itself to get the requested response.',
      },
      { code: 403, title: 'Forbidden', description: 'The client does not have access rights to the content.' },
      { code: 404, title: 'Not Found', description: 'The server cannot find the requested resource.' },
      {
        code: 405,
        title: 'Method Not Allowed',
        description: 'The request method is known by the server but is not supported by the target resource.',
      },
      {
        code: 429,
        title: 'Too Many Requests',
        description: 'The user has sent too many requests in a given amount of time ("rate limiting").',
      },
    ],
  },
  '5xx': {
    label: '5xx Server Error',
    codes: [
      {
        code: 500,
        title: 'Internal Server Error',
        description: "The server has encountered a situation it doesn't know how to handle.",
      },
      {
        code: 501,
        title: 'Not Implemented',
        description: 'The request method is not supported by the server and cannot be handled.',
      },
      {
        code: 502,
        title: 'Bad Gateway',
        description:
          'The server, while acting as a gateway or proxy, received an invalid response from the upstream server.',
      },
      {
        code: 503,
        title: 'Service Unavailable',
        description:
          'The server is not ready to handle the request. Common causes are a server that is down for maintenance or that is overloaded.',
      },
      {
        code: 504,
        title: 'Gateway Timeout',
        description: 'The server is acting as a gateway and cannot get a response in time.',
      },
    ],
  },
};

export default function HttpStatusCodesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCodes = useMemo(() => {
    if (!searchTerm) {
      return STATUS_CODES;
    }

    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered: Record<string, { label: string; codes: StatusCode[] }> = {};

    for (const category in STATUS_CODES) {
      const { label, codes } = STATUS_CODES[category];
      const matchingCodes = codes.filter(
        (code) =>
          code.code.toString().includes(lowercasedFilter) ||
          code.title.toLowerCase().includes(lowercasedFilter) ||
          code.description.toLowerCase().includes(lowercasedFilter)
      );

      if (matchingCodes.length > 0) {
        filtered[category] = { label, codes: matchingCodes };
      }
    }
    return filtered;
  }, [searchTerm]);

  return (
    <div className='flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950'>
      <Navbar />
      <Breadcrumbs />
      <main id='main-content' className='flex-grow page-shell px-4 py-8'>
        <header className='mb-8 text-center'>
          <h1 className='text-4xl font-bold text-slate-800 dark:text-slate-100'>HTTP Status Code Explainer</h1>
          <p className='text-lg text-slate-600 dark:text-slate-300 mt-1'>A quick reference for HTTP status codes.</p>
        </header>

        <section className='w-full min-w-0 mx-auto'>
          {/* Search Input */}
          <div className='mb-6 sticky top-4 z-10'>
            <input
              type='search'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder='Search by code or name (e.g., 404, Not Found)'
              className='w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500'
            />
          </div>

          {/* Codes Display */}
          <div className='space-y-8'>
            {Object.entries(filteredCodes).map(([categoryKey, { label, codes }]) => (
              <div key={categoryKey}>
                <h2 className='text-2xl font-semibold text-slate-700 dark:text-slate-200 border-b-2 border-slate-200 dark:border-slate-800 pb-2 mb-4'>{label}</h2>
                <div className='space-y-4'>
                  {codes.map(({ code, title, description }) => (
                    <div key={code} className='p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm border'>
                      <h3 className='font-bold text-lg text-slate-800 dark:text-slate-100'>
                        {code} {title}
                      </h3>
                      <p className='text-slate-600 dark:text-slate-300 mt-1'>{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(filteredCodes).length === 0 && (
              <div className='text-center p-8 bg-white dark:bg-slate-900 rounded-lg shadow-sm border'>
                <p className='text-slate-500 dark:text-slate-400'>No status codes found matching your search.</p>
              </div>
            )}
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
