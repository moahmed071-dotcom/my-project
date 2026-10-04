import { useSyncExternalStore } from 'react';
import { clearMeasureCache } from '../model/textLayout';

/**
 * Bumps whenever web fonts finish loading so text is re-measured with the
 * real font instead of the fallback.
 */
let version = 0;
const listeners = new Set<() => void>();
let bound = false;

function bind() {
  if (bound || typeof document === 'undefined' || !('fonts' in document)) return;
  bound = true;
  document.fonts.addEventListener('loadingdone', () => {
    clearMeasureCache();
    version++;
    listeners.forEach((l) => l());
  });
}

function subscribe(cb: () => void) {
  bind();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useFontsVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
}

export function onFontsChange(cb: () => void): () => void {
  return subscribe(cb);
}
