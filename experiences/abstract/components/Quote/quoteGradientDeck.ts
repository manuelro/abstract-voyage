/*
 * A standalone, 22-option gradient deck for the Quote's unified-ink mesh.
 *
 * `gradientInkSourceCard` (config.ts) picks one index out of whatever deck a
 * host hands the Quote via `coverFlowGradient` -- normally that deck IS the
 * host page's own live CoverFlow cards, so the picker's range is capped at
 * however many cards happen to be featured right now (today: 6). This file
 * builds its own fixed-size deck instead, so the picker always has 22 stable
 * options regardless of the live card count.
 *
 * Both the synthetic slides' visual identity (seed/hueOffset/offsets/accent,
 * via getSliderVisualParameters) and the palette states built from them
 * (buildDeckPaletteStates) are pure functions of a card's index -- no
 * Math.random, no live config/content dependency -- so this deck is
 * identical on every load and every refresh.
 */
import { getSliderVisualParameters } from '../../../../helpers/sliderVisualParameters';
import type { SliderContentSlide } from '../../../../helpers/postContent';
import {
  buildDeckPaletteStates,
  type DeckPaletteState,
} from '../../helpers/deckPalette';
import {
  DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
} from '../AbstractPostDock/config/registered';
import type { QuoteCoverFlowGradient } from './Quote';

export const QUOTE_GRADIENT_DECK_SIZE = 22;

function buildSyntheticSlide(index: number): SliderContentSlide {
  const visual = getSliderVisualParameters(index);
  const label = `${index + 1}`.padStart(2, '0');
  return {
    id: index + 1,
    slug: `quote-gradient-${label}`,
    label,
    title: '',
    excerpt: '',
    topic: '',
    date: '',
    readingTime: '',
    href: '#',
    externalUrl: null,
    forceExternalNavigation: false,
    featured: false,
    ...visual,
  };
}

/** The deck's own slide identities -- content-free, index-driven only. */
export const QUOTE_GRADIENT_DECK_SLIDES: ReadonlyArray<SliderContentSlide> = Array.from(
  { length: QUOTE_GRADIENT_DECK_SIZE },
  (_, index) => buildSyntheticSlide(index),
);

/** The deck's palette states, baked once from the default (un-tuned) palette
 * and hue-influence config -- the same baseline every host page starts from
 * before any operator-side panel tweak. */
export const QUOTE_GRADIENT_DECK_PALETTES: ReadonlyArray<DeckPaletteState | null> | null =
  buildDeckPaletteStates({
    slides: QUOTE_GRADIENT_DECK_SLIDES,
    paletteConfig: DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
    hueInfluenceConfig: DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
    activeIndex: null,
    tier: 'mobile',
  });

/**
 * Swaps a host's live `slides`/`palettes` for this stable 22-entry deck,
 * keeping everything else (motion, shader config, hologram tuning, activity)
 * exactly as the host supplied it -- those drive the shared shader/physics,
 * not a specific card's identity, so there's nothing card-count-bound about
 * them. Returns undefined unchanged: a host with no coverFlowGradient at all
 * has no motion/config to render a mesh with regardless of deck size.
 *
 * An EMPTY host deck (`slides.length === 0`) is left untouched rather than
 * backfilled: that shape is also how a host signals "no deck yet" (initial
 * render before the live card deck resolves, or a deliberately deck-less
 * preview/test), and `resolveQuoteRenderState` (renderState.ts) depends on
 * `deckSize < 1` to show its own readable "unavailable" fallback instead of
 * stalling on a mesh that will never arrive. Swapping in 22 slides there
 * would misreport "ready" and leave the quote stuck on a frozen
 * pending-mesh state instead.
 */
export function withStableGradientDeck(
  coverFlowGradient: QuoteCoverFlowGradient | undefined,
): QuoteCoverFlowGradient | undefined {
  if (!coverFlowGradient || coverFlowGradient.slides.length === 0) return coverFlowGradient;
  return {
    ...coverFlowGradient,
    slides: QUOTE_GRADIENT_DECK_SLIDES,
    palettes: QUOTE_GRADIENT_DECK_PALETTES,
  };
}
