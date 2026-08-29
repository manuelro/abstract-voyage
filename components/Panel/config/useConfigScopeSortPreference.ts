import { useCallback, useEffect, useState } from 'react';

export type ConfigScopeSortField = 'name' | 'recency';
export type ConfigScopeSortDirection = 'asc' | 'desc';

export type ConfigScopeSortPreference = {
  field: ConfigScopeSortField;
  direction: ConfigScopeSortDirection;
};

// One global key, not per-host: "how I like to browse config sections" is a
// preference about the panel UI itself, not a given page's content — see
// PLAN-CONFIG-PANEL-SEARCH-AND-ORDERING.md §5.
const STORAGE_KEY = 'panel-config-sort-preference';

export const DEFAULT_CONFIG_SCOPE_SORT_PREFERENCE: ConfigScopeSortPreference = {
  field: 'recency',
  direction: 'desc',
};

function isValidPreference(value: unknown): value is ConfigScopeSortPreference {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ConfigScopeSortPreference>;
  return (
    (candidate.field === 'name' || candidate.field === 'recency')
    && (candidate.direction === 'asc' || candidate.direction === 'desc')
  );
}

function readStoredPreference(): ConfigScopeSortPreference {
  if (typeof window === 'undefined') return DEFAULT_CONFIG_SCOPE_SORT_PREFERENCE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG_SCOPE_SORT_PREFERENCE;
    const parsed = JSON.parse(raw);
    return isValidPreference(parsed) ? parsed : DEFAULT_CONFIG_SCOPE_SORT_PREFERENCE;
  } catch {
    return DEFAULT_CONFIG_SCOPE_SORT_PREFERENCE;
  }
}

/**
 * localStorage-backed sort preference for ConfigScopeList, read once on
 * mount and written on every change (PLAN-CONFIG-PANEL-SEARCH-AND-ORDERING.md
 * §5). Search query itself is deliberately not persisted — see the same
 * section.
 */
export function useConfigScopeSortPreference() {
  const [preference, setPreference] = useState(DEFAULT_CONFIG_SCOPE_SORT_PREFERENCE);

  useEffect(() => {
    setPreference(readStoredPreference());
  }, []);

  const updatePreference = useCallback((next: ConfigScopeSortPreference) => {
    setPreference(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can throw (quota, private mode) — the in-memory value above
      // still applies for the rest of this session, so this is safe to drop.
    }
  }, []);

  return [preference, updatePreference] as const;
}
