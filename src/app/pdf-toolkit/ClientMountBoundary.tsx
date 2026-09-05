'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function ClientMountBoundary({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!mounted) {
    return <div className='min-h-screen bg-slate-50'>
      <main className='container mx-auto px-4 py-10'>
        <div className='mx-auto max-w-6xl rounded-xl bg-white p-6 shadow' aria-live='polite'>
          <h1 className='text-xl font-semibold text-slate-900'>Preparing PDF Toolkit…</h1>
          <p className='mt-2 text-sm text-slate-500'>Loading the browser-only PDF workspace. Your files stay on this device.</p>
        </div>
      </main>
    </div>;
  }

  return children;
}
