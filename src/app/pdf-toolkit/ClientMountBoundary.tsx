'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function ClientMountBoundary({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!mounted) {
    return <div className='min-h-screen bg-slate-50 dark:bg-slate-950'>
      <main id='main-content' className='page-shell px-4 py-10'>
        <div className='mx-auto w-full min-w-0 rounded-xl bg-white dark:bg-slate-900 p-6 shadow' aria-live='polite'>
          <h1 className='text-xl font-semibold text-slate-900 dark:text-slate-100'>Preparing PDF Toolkit…</h1>
          <p className='mt-2 text-sm text-slate-500 dark:text-slate-400'>Loading the browser-only PDF workspace. Your files stay on this device.</p>
        </div>
      </main>
    </div>;
  }

  return children;
}
