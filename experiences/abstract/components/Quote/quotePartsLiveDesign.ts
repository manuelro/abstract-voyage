import { useSyncExternalStore } from 'react';
import {
  DEFAULT_QUOTE_HEADING_APPEARANCE,
  DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE,
  normalizeQuoteHeadingAppearance,
  normalizeQuoteSourceLinkAppearance,
  type QuoteHeadingAppearanceConfig,
  type QuoteSourceLinkAppearanceConfig,
} from './quotePartsConfig';

/**
 * Live, in-memory ONE-PER-APP appearance for the shared quote parts (heading +
 * source link). Module-scoped singleton, same useSyncExternalStore shape as
 * editorialLiveDesign.ts -- but no localStorage: a reload always comes back
 * to the defaults below. Because there is a single record (not one per
 * type), editing the heading/link in the lab updates every quote that
 * renders them for as long as the page stays mounted. UPDATE DIFF
 * (components/Panel's UpdateDiffButton) is the only thing that writes an
 * edit anywhere durable.
 */

export type QuotePartsDesign = {
  heading: QuoteHeadingAppearanceConfig;
  link: QuoteSourceLinkAppearanceConfig;
};

const DEFAULT_PARTS: QuotePartsDesign = {
  heading: DEFAULT_QUOTE_HEADING_APPEARANCE,
  link: DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE,
};

let cache: QuotePartsDesign = DEFAULT_PARTS;
const listeners = new Set<() => void>();

function snapshot() { return cache; }

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function persist(next: QuotePartsDesign) {
  cache = next;
  listeners.forEach(listener => listener());
}

export function setQuoteHeadingAppearance(config: QuoteHeadingAppearanceConfig) {
  persist({ ...snapshot(), heading: normalizeQuoteHeadingAppearance(config) });
}

export function setQuoteSourceLinkAppearance(config: QuoteSourceLinkAppearanceConfig) {
  persist({ ...snapshot(), link: normalizeQuoteSourceLinkAppearance(config) });
}

/** Non-hook read of the current shared parts design (same value the hook
 * returns), for call sites that are not React components. */
export function getQuotePartsDesign(): QuotePartsDesign {
  return snapshot();
}

export function useQuotePartsDesign(): QuotePartsDesign {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_PARTS);
}
