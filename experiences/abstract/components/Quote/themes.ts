import { useSyncExternalStore } from 'react';
import { normalizeQuoteConfig, type QuoteConfig } from './config';
import { normalizeEditorialQuoteConfig, type EditorialQuoteConfig, type EditorialVariant } from './editorialConfig';

export type QuoteThemeVariant = 'base' | EditorialVariant;

/**
 * Named, persisted QuoteConfig snapshots ("quote themes") — the typography/
 * ink/padding settings an operator dials in on a given Quote instance (e.g.
 * on /quote-lab), saved so the SAME combination can be re-applied later, on
 * that page or any other that mounts a <Quote>. Centralized here (not on any
 * one page) so saving/loading a theme is a capability of the Quote component
 * itself, matching how QUOTE_PANEL/QUOTE_SCOPE_ID already live alongside
 * Quote.tsx rather than on whichever page happens to render it first.
 *
 * Same module-level-cache + useSyncExternalStore + localStorage pattern as
 * components/Panel/config/useConfigScopeUsage.ts (the project's own
 * established shape for "a small reactive record persisted to
 * localStorage") — reused rather than inventing a second mechanism.
 */

export type QuoteThemeRecord = {
  schemaVersion?: 2;
  name: string;
  savedAt: number;
  variant: QuoteThemeVariant;
  config: QuoteConfig | EditorialQuoteConfig;
};

export type QuoteThemeMap = Readonly<Record<string, QuoteThemeRecord>>;

const STORAGE_KEY = 'quote-themes';

let cache: Record<string, QuoteThemeRecord> | null = null;
const listeners = new Set<() => void>();

function isValidRecord(value: unknown): value is QuoteThemeRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<QuoteThemeRecord>;
  return typeof candidate.name === 'string'
    && Number.isFinite(candidate.savedAt)
    && typeof candidate.config === 'object' && candidate.config !== null;
}

function readStoredThemes(): Record<string, QuoteThemeRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, QuoteThemeRecord> = {};
    for (const [name, entry] of Object.entries(parsed as Record<string, unknown>)) {
      // Normalized on read, not just on write -- a theme saved by an older
      // build (missing a field a later QuoteConfig addition introduced)
      // still loads as a complete, valid QuoteConfig instead of a partial
      // object that would crash whatever applies it via updateFields.
      if (isValidRecord(entry)) {
        const variant = entry.variant === 'featured' || entry.variant === 'plain' || entry.variant === 'solid' ? entry.variant : 'base';
        result[name] = { ...entry, schemaVersion: 2, variant, config: variant === 'base'
          ? normalizeQuoteConfig(entry.config)
          : normalizeEditorialQuoteConfig(entry.config, variant) };
      }
    }
    return result;
  } catch {
    return {};
  }
}

// Lazy, module-level cache -- read from localStorage at most once per page
// load (see useConfigScopeUsage.ts's own doc comment for why). All reads/
// writes below go through this cache; localStorage is a persistence
// side-channel written through on every change, not the source of truth.
function getCache(): Record<string, QuoteThemeRecord> {
  if (cache === null) cache = readStoredThemes();
  return cache;
}

function persist(next: Record<string, QuoteThemeRecord>) {
  cache = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can throw (quota, private mode) -- the in-memory cache above
      // still applies for the rest of this session, so this is safe to drop.
    }
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): QuoteThemeMap {
  return getCache();
}

function getServerSnapshot(): QuoteThemeMap {
  return {};
}

/** Default name for a theme saved without an explicit one -- a readable
 * local timestamp, not a counter or slug of the quote text (quote text is
 * free-form editorial copy an operator may still be drafting, not a stable
 * identifier). Collisions (two saves in the same second) overwrite, which is
 * the same "save" semantics a named-slot system needs anyway. */
function defaultThemeName(): string {
  return `Theme — ${new Date().toLocaleString()}`;
}

/** Saves `config` as a named theme, overwriting any existing theme of the
 * same name. Returns the saved record. Plain function (not a hook) so it can
 * be called from a `kind: 'action'` panel field's synchronous onClick. */
export function saveQuoteTheme(config: QuoteConfig | EditorialQuoteConfig, name?: string, variant: QuoteThemeVariant = 'base'): QuoteThemeRecord {
  const trimmedName = name?.trim();
  const record: QuoteThemeRecord = {
    schemaVersion: 2,
    name: trimmedName || defaultThemeName(),
    savedAt: Date.now(),
    variant,
    config: variant === 'base' ? normalizeQuoteConfig(config) : normalizeEditorialQuoteConfig(config as EditorialQuoteConfig, variant),
  };
  persist({ ...getCache(), [record.name]: record });
  return record;
}

export function deleteQuoteTheme(name: string): void {
  const current = getCache();
  if (!(name in current)) return;
  const next = { ...current };
  delete next[name];
  persist(next);
}

/** Live, reactive snapshot of every saved theme -- re-renders the caller
 * whenever ANY mounted consumer (any page, any host) saves/deletes a theme,
 * the same cross-instance reactivity useConfigScopeUsageSnapshot gives
 * panel-usage data. */
export function useQuoteThemes(): QuoteThemeMap {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
