'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';

type OfflineStatus = {
  state: 'preparing' | 'ready' | 'error' | 'unsupported' | 'development';
  completed?: number;
  total?: number;
};
export type PwaState = {
  status: OfflineStatus;
  update: boolean;
  canInstall: boolean;
  retry(): void;
  install(): void;
  applyUpdate(): void;
};
const PwaContext = createContext<PwaState | null>(null);

async function cleanupDevelopmentPwaState() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (registration) => {
      const workers = [
        registration.active,
        registration.waiting,
        registration.installing,
      ];
      if (
        workers.some(
          (worker) => worker && new URL(worker.scriptURL).pathname === '/sw.js',
        )
      )
        await registration.unregister();
    }),
  );
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('toolstack-'))
        .map((key) => caches.delete(key)),
    );
  }
}

export default function PwaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<OfflineStatus>({
    state: process.env.NODE_ENV === 'production' ? 'preparing' : 'development',
  });
  const [update, setUpdate] = useState(false);
  const { canInstall, install } = usePwaInstall(status.state === 'ready');
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const reloadOnUpdate = useRef(false);
  useEffect(() => {
    let disposed = false;
    const cleanups: (() => void)[] = [];
    let hadController = !!navigator.serviceWorker?.controller;
    const onMessage = (event: MessageEvent) => {
      const source = event.source as ServiceWorker | null;
      if (
        !source?.scriptURL ||
        new URL(source.scriptURL).origin !== location.origin ||
        event.data?.type !== 'TOOLSTACK_OFFLINE'
      )
        return;
      // A waiting build must not replace the active build's readiness indicator.
      if (
        navigator.serviceWorker.controller &&
        source !== navigator.serviceWorker.controller
      )
        return;
      const { state, completed, total, detail } = event.data;
      if (state === 'error' && typeof detail === 'string')
        console.warn('[ToolStack offline]', detail);
      if (state === 'ready' || state === 'preparing' || state === 'error')
        setStatus({ state, completed, total });
    };
    const onController = () => {
      if (reloadOnUpdate.current) location.reload();
      else {
        if (hadController) setUpdate(true);
        hadController = true;
        navigator.serviceWorker.controller?.postMessage({
          type: 'OFFLINE_STATUS',
        });
      }
    };
    const setup = async () => {
      if (!('serviceWorker' in navigator) || !window.isSecureContext) {
        setStatus({ state: 'unsupported' });
        return;
      }
      if (process.env.NODE_ENV !== 'production') {
        await cleanupDevelopmentPwaState();
        return;
      }
      navigator.serviceWorker.addEventListener('message', onMessage);
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        onController,
      );
      // An existing installation must start without fetching the worker script.
      const existing = await navigator.serviceWorker.getRegistration('/');
      const ownWorker =
        existing?.active &&
        new URL(existing.active.scriptURL).pathname === '/sw.js';
      const next = ownWorker
        ? existing
        : await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
          });
      if (disposed) return;
      registration.current = next;
      const watch = () => {
        if (disposed) return;
        if (next.waiting && navigator.serviceWorker.controller) setUpdate(true);
        const worker = next.installing;
        if (!worker) return;
        const onStateChange = () => {
          if (disposed) return;
          if (
            worker.state === 'installed' &&
            navigator.serviceWorker.controller
          )
            setUpdate(true);
          if (worker.state === 'redundant')
            setStatus((current) =>
              current.state === 'ready' ? current : { state: 'error' },
            );
        };
        worker?.addEventListener('statechange', onStateChange);
        cleanups.push(() =>
          worker?.removeEventListener('statechange', onStateChange),
        );
      };
      next.addEventListener('updatefound', watch);
      cleanups.push(() => next.removeEventListener('updatefound', watch));
      watch();
      next.active?.postMessage({ type: 'OFFLINE_STATUS' });
      void next.update().catch(() => undefined);
    };
    void setup().catch(() => {
      if (!disposed) setStatus({ state: 'error' });
    });
    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
      navigator.serviceWorker?.removeEventListener('message', onMessage);
      navigator.serviceWorker?.removeEventListener(
        'controllerchange',
        onController,
      );
    };
  }, []);

  function retry() {
    setStatus({ state: 'preparing' });
    const active = registration.current?.active;
    if (active) {
      active.postMessage({ type: 'PREPARE_OFFLINE' });
      void registration.current
        ?.update()
        .catch(() => setStatus({ state: 'error' }));
    } else location.reload();
  }
  function applyUpdate() {
    // Ordinary background updates never reload a tab or replace tool input.
    if (!registration.current?.waiting) {
      location.reload();
      return;
    }
    reloadOnUpdate.current = true;
    registration.current.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  return (
    <PwaContext
      value={{
        status,
        update,
        canInstall,
        retry,
        install: () => {
          void install();
        },
        applyUpdate,
      }}
    >
      {children}
    </PwaContext>
  );
}

export function usePwa() {
  return useContext(PwaContext);
}
