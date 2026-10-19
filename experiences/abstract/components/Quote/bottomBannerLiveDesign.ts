import { useSyncExternalStore } from 'react';
import { DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG, normalizeBottomBannerQuoteConfig, type BottomBannerQuoteConfig } from './bottomBannerConfig';

// In-memory draft only -- see editorialLiveDesign.ts's own doc comment for
// why this never touches localStorage/disk. A reload always comes back to
// DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG; UPDATE DIFF is the only durable write.
let cache: BottomBannerQuoteConfig = DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG;
const listeners = new Set<() => void>();

function snapshot(): BottomBannerQuoteConfig {
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setBottomBannerQuoteDesign(value: BottomBannerQuoteConfig) {
  cache = normalizeBottomBannerQuoteConfig(value);
  listeners.forEach(listener => listener());
}

export function useBottomBannerQuoteDesign(): BottomBannerQuoteConfig {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG);
}
