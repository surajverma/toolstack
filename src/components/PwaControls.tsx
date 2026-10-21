'use client';

import { useSyncExternalStore } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { usePwa, type PwaState } from './PwaProvider';

function subscribeConnection(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function isOnline() {
  return navigator.onLine !== false;
}

/** Only actionable controls belong in the footer; routine readiness stays internal. */
export function PwaActions({
  pwa,
  online,
}: {
  pwa: PwaState;
  online: boolean;
}) {
  const retry = pwa.status.state === 'error' && online;
  const install = pwa.status.state === 'ready' && pwa.canInstall && online;
  if (!retry && !install && !pwa.update) return null;

  return (
    <div className="pwa-controls">
      {retry && (
        <button className="pwa-button" onClick={pwa.retry}>
          Retry offline download
        </button>
      )}
      {pwa.update && (
        <button
          className="pwa-button"
          onClick={pwa.applyUpdate}
          title="Save or download your work before reloading"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Reload to update
        </button>
      )}
      {install && (
        <button className="pwa-button" onClick={pwa.install}>
          <Download size={14} aria-hidden="true" />
          Install app
        </button>
      )}
    </div>
  );
}

export function PwaControls() {
  const pwa = usePwa();
  const online = useSyncExternalStore(
    subscribeConnection,
    isOnline,
    () => true,
  );
  return pwa ? <PwaActions pwa={pwa} online={online} /> : null;
}
