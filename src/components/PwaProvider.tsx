'use client';

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Check, Download, RefreshCw } from 'lucide-react';

type OfflineStatus = { state: 'preparing' | 'ready' | 'error' | 'unsupported' | 'development'; completed?: number; total?: number };
type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type PwaState = { status: OfflineStatus; update: boolean; retry(): void; install(): void; applyUpdate(): void };
const PwaContext = createContext<PwaState | null>(null);

async function cleanupDevelopmentPwaState() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(async registration => {
    const workers = [registration.active, registration.waiting, registration.installing];
    if (workers.some(worker => worker && new URL(worker.scriptURL).pathname === '/sw.js')) await registration.unregister();
  }));
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('toolstack-')).map(key => caches.delete(key)));
  }
}

function subscribeDisplayMode(callback: () => void) {
  const media = matchMedia('(display-mode: standalone)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches || !!(navigator as Navigator & { standalone?: boolean }).standalone;
}

export default function PwaProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<OfflineStatus>({ state: process.env.NODE_ENV === 'production' ? 'preparing' : 'development' });
  const [update, setUpdate] = useState(false);
  const [installing, setInstalling] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const prompt = useRef<InstallPrompt | null>(null);
  const help = useRef<HTMLDialogElement>(null);
  const reloadOnUpdate = useRef(false);
  const standalone = useSyncExternalStore(subscribeDisplayMode, isStandalone, () => false);

  useEffect(() => {
    let disposed = false;
    let hadController = !!navigator.serviceWorker?.controller;
    const onInstallPrompt = (event: Event) => { event.preventDefault(); prompt.current = event as InstallPrompt; };
    const onInstalled = () => { prompt.current = null; help.current?.close(); };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const onMessage = (event: MessageEvent) => {
      const source = event.source as ServiceWorker | null;
      if (!source?.scriptURL || new URL(source.scriptURL).origin !== location.origin || event.data?.type !== 'TOOLSTACK_OFFLINE') return;
      // A waiting build must not replace the active build's readiness indicator.
      if (navigator.serviceWorker.controller && source !== navigator.serviceWorker.controller) return;
      const { state, completed, total } = event.data;
      if (state === 'ready' || state === 'preparing' || state === 'error') setStatus({ state, completed, total });
    };
    const onController = () => {
      if (reloadOnUpdate.current) location.reload();
      else {
        if (hadController) setUpdate(true);
        hadController = true;
        navigator.serviceWorker.controller?.postMessage({ type: 'OFFLINE_STATUS' });
      }
    };
    const setup = async () => {
      if (!('serviceWorker' in navigator) || !window.isSecureContext) { setStatus({ state: 'unsupported' }); return; }
      if (process.env.NODE_ENV !== 'production') { await cleanupDevelopmentPwaState(); return; }
      navigator.serviceWorker.addEventListener('message', onMessage);
      navigator.serviceWorker.addEventListener('controllerchange', onController);
      // An existing installation must start without fetching the worker script.
      const existing = await navigator.serviceWorker.getRegistration('/');
      const ownWorker = existing?.active && new URL(existing.active.scriptURL).pathname === '/sw.js';
      const next = ownWorker ? existing : await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      if (disposed) return;
      registration.current = next;
      const watch = () => {
        if (disposed) return;
        if (next.waiting && navigator.serviceWorker.controller) setUpdate(true);
        const worker = next.installing;
        worker?.addEventListener('statechange', () => {
          if (disposed) return;
          if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdate(true);
          if (worker.state === 'redundant') setStatus(current => current.state === 'ready' ? current : { state: 'error' });
        });
      };
      next.addEventListener('updatefound', watch);
      watch();
      next.active?.postMessage({ type: 'OFFLINE_STATUS' });
      void next.update().catch(() => undefined);
    };
    void setup().catch(() => { if (!disposed) setStatus({ state: 'error' }); });
    return () => {
      disposed = true;
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
      navigator.serviceWorker?.removeEventListener('controllerchange', onController);
    };
  }, []);

  function retry() {
    setStatus({ state: 'preparing' });
    const active = registration.current?.active;
    if (active) {
      active.postMessage({ type: 'PREPARE_OFFLINE' });
      void registration.current?.update().catch(() => setStatus({ state: 'error' }));
    }
    else location.reload();
  }
  async function install() {
    if (!prompt.current) { help.current?.showModal(); return; }
    const pending = prompt.current;
    prompt.current = null;
    setInstalling(true);
    try {
      await pending.prompt();
      if ((await pending.userChoice).outcome === 'accepted') await navigator.storage?.persist?.().catch(() => false);
    } catch { help.current?.showModal(); }
    finally { setInstalling(false); }
  }
  function applyUpdate() {
    // Ordinary background updates never reload a tab or replace tool input.
    if (!registration.current?.waiting) { location.reload(); return; }
    reloadOnUpdate.current = true;
    registration.current.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  return <PwaContext value={{ status, update, retry, install: () => { if (!installing) void install(); }, applyUpdate }}>
    {children}
    <dialog ref={help} className='pwa-dialog' aria-labelledby='pwa-install-title' onClick={event => { if (event.target === event.currentTarget) help.current?.close(); }}>
      <div className='pwa-dialog-title'><span className='pwa-app-icon' aria-hidden='true' /><h2 id='pwa-install-title'>{standalone ? 'ToolStack on your device' : 'Install ToolStack'}</h2></div>
      <p>{status.state === 'ready' ? 'All tools are ready to use offline. Your files and tool input are not saved with the app.' : 'Keep ToolStack open online until “Offline ready” appears before disconnecting.'}</p>
      {!standalone && <ul>
        <li><strong>Chrome or Edge:</strong> choose Install ToolStack from the address bar or browser menu.</li>
        <li><strong>iPhone or iPad:</strong> open in Safari, tap Share, then Add to Home Screen.</li>
        <li><strong>Other browsers:</strong> use Add to Home Screen or Install if available.</li>
      </ul>}
      {status.state === 'development' && <p>Installation and offline downloads run in a production build, on HTTPS or localhost.</p>}
      <p className='pwa-note'>Browser storage can be cleared or evicted. Reconnect to download the app again if that happens.</p>
      <form method='dialog'><button className='pwa-button'>Close</button></form>
    </dialog>
  </PwaContext>;
}

export function PwaControls() {
  const pwa = useContext(PwaContext);
  const standalone = useSyncExternalStore(subscribeDisplayMode, isStandalone, () => false);
  if (!pwa) return null;
  const { status } = pwa;
  const progress = status.total ? ` ${Math.round((status.completed || 0) / status.total * 100)}%` : '';
  return <div className='pwa-controls'>
    {status.state !== 'development' && <span role='status' className={status.state === 'ready' ? 'pwa-ready' : ''}>
      {status.state === 'ready' && <Check size={14} aria-hidden='true' />}
      {status.state === 'ready' ? 'Offline ready' : status.state === 'preparing' ? `Preparing offline…${progress}` : status.state === 'unsupported' ? 'Offline unavailable' : 'Offline download incomplete'}
    </span>}
    {status.state === 'error' && <button className='pwa-button' onClick={pwa.retry}>Retry download</button>}
    {pwa.update && <button className='pwa-button' onClick={pwa.applyUpdate} title='Save or download your work before reloading'><RefreshCw size={14} aria-hidden='true' />Reload to update</button>}
    <button className='pwa-button' onClick={pwa.install}><Download size={14} aria-hidden='true' />{standalone ? 'App & offline' : 'Install app'}</button>
  </div>;
}
