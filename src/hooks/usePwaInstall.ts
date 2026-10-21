'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function subscribeDisplayMode(callback: () => void) {
  const media = matchMedia('(display-mode: standalone)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function isStandalone() {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  );
}

/** Browser-owned installation signals; no persistent installed flag to go stale. */
export function usePwaInstall(offlineReady: boolean) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const standalone = useSyncExternalStore(
    subscribeDisplayMode,
    isStandalone,
    () => false,
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setPrompt(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const canInstall =
    offlineReady && !!prompt && !installed && !standalone && !installing;
  async function install() {
    if (!canInstall || !prompt) return;
    const pending = prompt;
    setPrompt(null);
    setInstalling(true);
    try {
      await pending.prompt();
      if ((await pending.userChoice).outcome === 'accepted') {
        setInstalled(true);
        await navigator.storage?.persist?.().catch(() => false);
      }
    } catch (error) {
      console.warn('[ToolStack install]', error);
    } finally {
      setInstalling(false);
    }
  }
  return { canInstall, install };
}
