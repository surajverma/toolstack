'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { TOOLS } from '@/config/tools';

const STORAGE_KEY = 'toolstack-pinned-tools';
const CHANGED_EVENT = 'toolstack-pins-changed';
const toolIds = new Set(TOOLS.map(tool => tool.id));
let snapshot = '[]';
let initialized = false;

function parsePins(value: string): Set<string> {
  try {
    const ids: unknown = JSON.parse(value);
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && toolIds.has(id)) : []);
  } catch {
    return new Set();
  }
}

function readSnapshot() {
  if (!initialized) {
    initialized = true;
    try { snapshot = localStorage.getItem(STORAGE_KEY) ?? '[]'; } catch { /* Pins still work for this tab when storage is unavailable. */ }
  }
  return snapshot;
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    initialized = true;
    snapshot = event.newValue ?? '[]';
    callback();
  };
  window.addEventListener(CHANGED_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGED_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}

function togglePin(id: string) {
  if (!toolIds.has(id)) return;
  const pins = parsePins(readSnapshot());
  if (pins.has(id)) pins.delete(id); else pins.add(id);
  snapshot = JSON.stringify([...pins]);
  try { localStorage.setItem(STORAGE_KEY, snapshot); } catch { /* Keep the in-memory preference. */ }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function usePinnedTools() {
  const value = useSyncExternalStore(subscribe, readSnapshot, () => '[]');
  const pinnedIds = useMemo(() => parsePins(value), [value]);
  return { pinnedIds, togglePin };
}
