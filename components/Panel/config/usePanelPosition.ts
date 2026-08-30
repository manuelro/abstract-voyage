import { useCallback, useSyncExternalStore } from 'react';

// Same module-level-cache + localStorage + useSyncExternalStore pattern as
// useConfigScopeOpenState.ts's own STORAGE_KEY — a single global key since
// the shell itself is a single, page-independent floating element, not a
// per-scope value.
const STORAGE_KEY = 'panel-shell-position';

export type PanelPosition = { x: number; y: number };

let cache: PanelPosition | null | undefined;
const listeners = new Set<() => void>();

function readStoredPosition(): PanelPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

// Lazy, module-level cache — read from localStorage at most once per page
// load, same rationale as useConfigScopeOpenState.ts's own getCache.
function getCache(): PanelPosition | null {
  if (cache === undefined) cache = readStoredPosition();
  return cache;
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setPosition(position: PanelPosition | null) {
  if (typeof window === 'undefined') return;
  cache = position;
  try {
    if (position) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    else window.localStorage.removeItem(STORAGE_KEY);
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
export function usePanelPosition(): [PanelPosition | null, (position: PanelPosition | null) => void] {
  const getSnapshot = useCallback(() => getCache(), []);
  const getServerSnapshot = useCallback(() => null, []);

  const position = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback((next: PanelPosition | null) => {
    setPosition(next);
  }, []);

  return [position, set];
}
