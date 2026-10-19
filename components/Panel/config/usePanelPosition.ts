import { useCallback, useSyncExternalStore } from 'react';

// Same module-level-cache + localStorage + useSyncExternalStore pattern as
// useConfigScopeOpenState.ts. The site settings shell retains its original
// key; other PanelShell instances may supply a separate key so dragging one
// does not move the other after a remount.
const STORAGE_KEY = 'panel-shell-position';

export type PanelPosition = { x: number; y: number };

const cache = new Map<string, PanelPosition | null>();
const listeners = new Set<() => void>();

function readStoredPosition(storageKey: string): PanelPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed
      || typeof parsed !== 'object'
      || typeof (parsed as PanelPosition).x !== 'number'
      || typeof (parsed as PanelPosition).y !== 'number'
      || !Number.isFinite((parsed as PanelPosition).x)
      || !Number.isFinite((parsed as PanelPosition).y)
    ) return null;
    return { x: (parsed as PanelPosition).x, y: (parsed as PanelPosition).y };
  } catch {
    return null;
  }
}

// Lazy, per-key cache — read each shell's localStorage entry at most once per
// page load, same rationale as useConfigScopeOpenState.ts's own getCache.
function getCache(storageKey: string): PanelPosition | null {
  if (!cache.has(storageKey)) cache.set(storageKey, readStoredPosition(storageKey));
  return cache.get(storageKey) ?? null;
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setPosition(storageKey: string, position: PanelPosition | null) {
  if (typeof window === 'undefined') return;
  cache.set(storageKey, position);
  try {
    if (position) window.localStorage.setItem(storageKey, JSON.stringify(position));
    else window.localStorage.removeItem(storageKey);
  } catch {
    // Storage can throw (quota, private mode) — the in-memory cache above
    // still applies for the rest of this session, same as
    // useConfigScopeOpenState.ts's own identical try/catch.
  }
  notifyListeners();
}

/**
 * Persisted drag position for PanelShell — an explicit pixel offset from the
 * shell's own default fixed bottom-right anchor (Panel.module.css's
 * `.panelFrame`), applied as a `transform: translate()` on top of that
 * anchor rather than replacing it, so a shell that's never been dragged
 * renders exactly as before this feature existed. `null` means "never
 * dragged, use the default anchor" — distinct from `{ x: 0, y: 0 }`, which
 * is a real, explicit "dragged back to the default spot" position.
 */
export function usePanelPosition(storageKey = STORAGE_KEY): [PanelPosition | null, (position: PanelPosition | null) => void] {
  const getSnapshot = useCallback(() => getCache(storageKey), [storageKey]);
  const getServerSnapshot = useCallback(() => null, []);

  const position = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback((next: PanelPosition | null) => {
    setPosition(storageKey, next);
  }, [storageKey]);

  return [position, set];
}
