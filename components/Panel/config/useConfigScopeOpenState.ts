import { useCallback, useSyncExternalStore } from 'react';
import { recordConfigScopeOpen } from './useConfigScopeUsage';

// One global key — same "personal tooling preference, not tied to a given
// page's content" reasoning useConfigScopeSortPreference's own STORAGE_KEY
// doc comment already gives. A `Record<scopeId, boolean>`, not a bare
// Set/array of "open" ids: a scope id absent from this record means "never
// explicitly toggled, use the definition's own defaultOpen" — collapsing
// that into "not in the open set" would be indistinguishable from "user
// explicitly closed a defaultOpen: true scope," silently springing it back
// open on the next visit. Explicit true/false per touched id removes that
// ambiguity.
const STORAGE_KEY = 'panel-config-open-scopes';

let cache: Record<string, boolean> | null = null;
const listeners = new Set<() => void>();

function readStoredOpenState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, boolean> = {};
    for (const [scopeId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'boolean') result[scopeId] = value;
    }
    return result;
  } catch {
    return {};
  }
}

// Lazy, module-level cache — see useConfigScopeUsage.ts's own identical
// pattern/rationale (read from localStorage at most once per page load).
function getCache(): Record<string, boolean> {
  if (cache === null) cache = readStoredOpenState();
  return cache;
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setScopeOpen(scopeId: string, open: boolean) {
  if (typeof window === 'undefined') return;
  const next = { ...getCache(), [scopeId]: open };
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can throw (quota, private mode) — the in-memory cache above
    // still applies for the rest of this session, so this is safe to drop.
  }
  // Usage-tracking rides on this same toggle, exactly on the closed→open
  // transition — see recordConfigScopeOpen's own doc comment for why this
  // is a plain function call here rather than a second, independently-
  // wired mechanism ConfigScopeRenderer would otherwise need to know about.
  if (open) recordConfigScopeOpen(scopeId);
  notifyListeners();
}

/**
 * Shared, persisted disclosure state for one config scope, keyed by its own
 * `scope.id` — replaces each ConfigScopeRenderer's previous local
 * `useState(defaultOpen)`. Two consequences of making this external rather
 * than per-instance local state (see PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's
 * sibling doc for the fuller design rationale):
 *   - It survives PanelShell unmounting its children on close (the store
 *     lives outside that subtree, in module scope) — reopening the panel
 *     restores exactly what was open before, instead of resetting to each
 *     scope's own static defaultOpen.
 *   - Two mounted instances of the same scope id (e.g. a "Frequently used"
 *     pinned copy and its full-list copy) always agree, since both
 *     subscribe to the identical external value rather than owning
 *     independent booleans.
 * `defaultOpen` is consulted only the first time a given scope id is ever
 * seen with nothing stored yet — same fallback relationship
 * useConfigScopeSortPreference already has with its own default constant.
 * Return shape deliberately mirrors useState's own `[value, setter]` pair,
 * though the setter here is a no-argument toggle (this call site never
 * needed to set an arbitrary value, only flip the current one).
 */
export function useConfigScopeOpenState(
  scopeId: string,
  defaultOpen: boolean,
): [boolean, () => void] {
  const getSnapshot = useCallback(() => {
    const record = getCache();
    return scopeId in record ? record[scopeId] : defaultOpen;
  }, [scopeId, defaultOpen]);
  const getServerSnapshot = useCallback(() => defaultOpen, [defaultOpen]);

  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    setScopeOpen(scopeId, !open);
  }, [scopeId, open]);

  return [open, toggle];
}
