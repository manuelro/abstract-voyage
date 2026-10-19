import { useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';
import { DEFAULT_QUOTE_CONFIG, normalizeQuoteConfig, type QuoteConfig } from './config';

// In-memory draft only -- the lab and the wall share this one module-scoped
// value for as long as the page stays mounted, so editing in the lab updates
// the wall preview live. Nothing here touches localStorage/disk: a reload
// always starts back at defaultConfig, and UPDATE DIFF (components/Panel's
// UpdateDiffButton -> pages/api/dev/apply-config-update) is the only thing
// that writes an edit anywhere durable.
const defaultConfig = normalizeQuoteConfig(DEFAULT_QUOTE_CONFIG);
let cache: QuoteConfig = defaultConfig;
const listeners = new Set<() => void>();

function getSnapshot(): QuoteConfig {
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const setQuoteLiveDesign: Dispatch<SetStateAction<QuoteConfig>> = update => {
  cache = normalizeQuoteConfig(typeof update === 'function' ? update(cache) : update);
  listeners.forEach(listener => listener());
};

export function useQuoteLiveDesign(): [QuoteConfig, Dispatch<SetStateAction<QuoteConfig>>] {
  return [useSyncExternalStore(subscribe, getSnapshot, () => defaultConfig), setQuoteLiveDesign];
}
