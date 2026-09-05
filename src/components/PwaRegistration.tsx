'use client';

import { useEffect } from 'react';

const TOOLSTACK_CACHE_PREFIX = 'toolstack-';

async function cleanupDevelopmentPwaState() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(async registration => {
    const workers = [registration.active, registration.waiting, registration.installing].filter(Boolean);
    const isToolStackWorker = workers.some(worker => {
      try {
        return new URL(worker!.scriptURL).pathname === '/sw.js';
      } catch {
        return false;
      }
    });
    if (isToolStackWorker) await registration.unregister();
  }));

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(TOOLSTACK_CACHE_PREFIX)).map(key => caches.delete(key)));
  }
}

export default function PwaRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      void cleanupDevelopmentPwaState();
      return;
    }

    void navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(() => undefined);
  }, []);

  return null;
}
