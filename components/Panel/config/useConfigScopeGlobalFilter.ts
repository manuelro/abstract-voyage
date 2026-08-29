import { useCallback, useEffect, useState } from 'react';

// One global key, not per-host — same reasoning as
// useConfigScopeSortPreference.ts's own STORAGE_KEY: "I only want to browse
// global sections" is a preference about how the panel itself is browsed,
// not about a given page's content.
const STORAGE_KEY = 'panel-config-global-filter';

const DEFAULT_GLOBAL_ONLY = false;

function readStoredPreference(): boolean {
  if (typeof window === 'undefined') return DEFAULT_GLOBAL_ONLY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'true' ? true : raw === 'false' ? false : DEFAULT_GLOBAL_ONLY;
  } catch {
    return DEFAULT_GLOBAL_ONLY;
  }
}

/**
 * localStorage-backed "show only global sections" toggle for
 * ConfigScopeList — global here means the same thing
 * `ConfigScopeBinding.global` already does (components/Panel/config/types.ts):
 * a binding whose value/onChange are sourced from
 * SharedDesignConfigProvider, i.e. editing it has real cross-page
 * repercussions. Read once on mount and written on every change, same
 * pattern as useConfigScopeSortPreference.ts.
 */
export function useConfigScopeGlobalFilter() {
  const [globalOnly, setGlobalOnlyState] = useState(DEFAULT_GLOBAL_ONLY);

  useEffect(() => {
    setGlobalOnlyState(readStoredPreference());
  }, []);

  const setGlobalOnly = useCallback((next: boolean) => {
    setGlobalOnlyState(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Storage can throw (quota, private mode) — the in-memory value above
      // still applies for the rest of this session, so this is safe to drop.
    }
  }, []);

  return [globalOnly, setGlobalOnly] as const;
}
