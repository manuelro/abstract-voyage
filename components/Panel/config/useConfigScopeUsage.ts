import { useCallback, useSyncExternalStore } from 'react';

export type ConfigScopeUsageEntry = {
  count: number;
  lastOpenedAt: number;
};

export type ConfigScopeUsageRecord = Readonly<Record<string, ConfigScopeUsageEntry>>;

// One global key, not per-host — "which sections I open a lot" is a
// personal-tooling-usage question about the panel UI itself, the same
// reasoning useConfigScopeSortPreference's own STORAGE_KEY doc comment
// already gives for sort preference. Scope ids are already the correct
// partition key: most scopes that matter here carry a page-specific id
// (see PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md), so a single shared record can't
// leak one page's usage onto an unrelated scope on another page.
const STORAGE_KEY = 'panel-config-scope-usage';

let cache: Record<string, ConfigScopeUsageEntry> | null = null;
const listeners = new Set<() => void>();

function isValidEntry(value: unknown): value is ConfigScopeUsageEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ConfigScopeUsageEntry>;
  return Number.isFinite(candidate.count) && Number.isFinite(candidate.lastOpenedAt);
}

function readStoredUsage(): Record<string, ConfigScopeUsageEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, ConfigScopeUsageEntry> = {};
    for (const [scopeId, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (isValidEntry(entry)) result[scopeId] = entry;
    }
    return result;
  } catch {
    return {};
  }
}

// Lazy, module-level cache — read from localStorage at most once per page
// load, not on every useSyncExternalStore getSnapshot call (which can run on
// every render pass). All reads/writes below go through this cache; it's
// the single in-memory source of truth, localStorage is a persistence
// side-channel written through on every change.
function getCache(): Record<string, ConfigScopeUsageEntry> {
  if (cache === null) cache = readStoredUsage();
  return cache;
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ConfigScopeUsageRecord {
  return getCache();
}

function getServerSnapshot(): ConfigScopeUsageRecord {
  return {};
}

/**
 * Records one "open" action for `scopeId` — called by
 * useConfigScopeOpenState's own toggle, exactly on the closed→open
 * transition, never on close. A plain function (not a hook) so it can be
 * called from useConfigScopeOpenState's module-level mutator without that
 * hook needing to also be mounted/subscribed to this store.
 */
export function recordConfigScopeOpen(scopeId: string) {
  if (typeof window === 'undefined') return;
  const current = getCache();
  const existing = current[scopeId];
  const next = {
    ...current,
    [scopeId]: {
      count: (existing?.count ?? 0) + 1,
      lastOpenedAt: Date.now(),
    },
  };
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can throw (quota, private mode) — the in-memory cache above
    // still applies for the rest of this session, so this is safe to drop.
  }
  notifyListeners();
}

/**
 * Live snapshot of the whole usage record, reactive via
 * useSyncExternalStore — re-renders the calling component whenever any
 * mounted consumer (anywhere in the app, any host) records a new open,
 * not just the instance that recorded it. This is what keeps
 * ConfigScopeList's own "Frequently used" ranking fresh immediately after
 * a section is opened, rather than only on that list's own next unrelated
 * re-render.
 */
export function useConfigScopeUsageSnapshot(): ConfigScopeUsageRecord {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Pure ranking helper — filters `candidateIds` down to ones with recorded
 * usage (count > 0), sorted by count desc, ties broken by more-recently-
 * opened first, capped to `limit`. Callers pass their own bindings' own ids
 * as `candidateIds` so a globally-popular scope that doesn't exist on the
 * current host can never be ranked in.
 */
export function getRankedScopeIds(
  usage: ConfigScopeUsageRecord,
  candidateIds: ReadonlyArray<string>,
  limit: number,
): string[] {
  return candidateIds
    .filter(id => (usage[id]?.count ?? 0) > 0)
    .sort((a, b) => {
      const countDiff = usage[b].count - usage[a].count;
      if (countDiff !== 0) return countDiff;
      return usage[b].lastOpenedAt - usage[a].lastOpenedAt;
    })
    .slice(0, limit);
}
