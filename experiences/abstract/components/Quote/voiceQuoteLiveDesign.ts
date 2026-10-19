import { useSyncExternalStore } from 'react';
import { DEFAULT_VOICE_QUOTE_CONFIG, normalizeVoiceQuoteConfig, type VoiceQuoteConfig } from './voiceQuoteConfig';

// In-memory draft only -- see editorialLiveDesign.ts's own doc comment for
// why this never touches localStorage/disk. A reload always comes back to
// DEFAULT_VOICE_QUOTE_CONFIG; UPDATE DIFF is the only durable write.
let cache: VoiceQuoteConfig = DEFAULT_VOICE_QUOTE_CONFIG;
const listeners = new Set<() => void>();

function snapshot(): VoiceQuoteConfig {
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setVoiceQuoteDesign(value: VoiceQuoteConfig) {
  cache = normalizeVoiceQuoteConfig(value);
  listeners.forEach(listener => listener());
}

export function useVoiceQuoteDesign(): VoiceQuoteConfig {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_VOICE_QUOTE_CONFIG);
}
