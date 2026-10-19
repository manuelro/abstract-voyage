import { useSyncExternalStore } from 'react';
import { DEFAULT_EDITORIAL_QUOTE_CONFIGS, normalizeEditorialQuoteConfig, type EditorialQuoteConfig, type EditorialVariant } from './editorialConfig';

export type EditorialQuoteDesigns = Record<EditorialVariant, EditorialQuoteConfig>;

// In-memory draft only -- the lab and the wall share this one module-scoped
// value for as long as the page stays mounted, so editing a variant in the
// lab updates every preview that renders it live. Nothing here touches
// localStorage/disk: a reload always comes back to
// DEFAULT_EDITORIAL_QUOTE_CONFIGS, and UPDATE DIFF (components/Panel's
// UpdateDiffButton -> pages/api/dev/apply-config-update) is the only thing
// that writes an edit anywhere durable.
let cache: EditorialQuoteDesigns = DEFAULT_EDITORIAL_QUOTE_CONFIGS;
const listeners = new Set<() => void>();

function snapshot() { return cache; }

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setEditorialQuoteDesign(variant: EditorialVariant, config: EditorialQuoteConfig) {
  cache = { ...cache, [variant]: normalizeEditorialQuoteConfig(config, variant) };
  listeners.forEach(listener => listener());
}

/** Non-hook read of the current designs (same value the hook returns), for
 * call sites that are not React components. */
export function getEditorialQuoteDesigns(): EditorialQuoteDesigns {
  return snapshot();
}

export function useEditorialQuoteDesigns(): EditorialQuoteDesigns {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_EDITORIAL_QUOTE_CONFIGS);
}
