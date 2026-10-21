'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Keep random/generated output out of prerendered HTML and offline snapshots. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
