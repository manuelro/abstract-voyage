import { clamp } from '../helpers/clamp';

/**
 * Page-owned settings for carousel-lab.tsx's own coverflow geometry — not
 * any single component's concern (CoverFlowLab.tsx takes plain pixel
 * props; this is what resolves them per breakpoint), same pattern as
 * abstract.config.ts's AbstractPageLayoutConfig.
 *
 * "Card distance": the ratio of CoverFlowLab's own `centerGap` (x-distance
 * from the active card to its first neighbour) to the active card's own
 * width — see pages/carousel-lab.tsx's own cardWidthPx derivation. A ratio,
 * not a flat pixel value, so it still scales with the active card's own
 * responsive width; this only overrides *how much* it scales per tier.
 * `stackSpacing` (further-out neighbours) tracks whichever of these three
 * is active, keeping its own fixed ratio to it (100/250, the original
 * fork's own tuning) — see carousel-lab.tsx's own
 * STACK_SPACING_TO_CENTER_GAP_RATIO.
 *
 * Split by tier (mobile/md/lg, not one shared value) because the value that
 * reads correctly on a wide desktop viewport did not read correctly on a
 * real phone even after the perspective/depth and z-index fixes (see
 * CoverFlowLab.tsx's own doc comments) — rather than keep guessing one
 * global ratio and re-testing on a real device each time, this exposes it
 * as a live, per-tier control.
 */
export type CarouselLabConfig = {
  /** Mobile — < 768px (unsuffixed = the base/mobile-first tier, matching
   * this repo's own convention elsewhere, e.g. SplitColumnCardStackConfig's
   * `cardWidth`/`cardWidthWide`/`cardWidthLg`). */
  cardDistanceRatio: number;
  /** Tablet — >= 768px. */
  cardDistanceRatioMd: number;
  /** Desktop — >= 1024px. */
  cardDistanceRatioLg: number;
  /** Card size — Mobile (< 768px). Fraction of the measured container's own
   * width the active card should occupy, replacing the page's previous
   * fixed 0.62 constant. Deliberately no fixed pixel ceiling either — an
   * earlier version clamped to a hardcoded 344px (pages/carousel-lab.tsx's
   * own CARD_WIDTH_PX), which made this ratio a no-op above ~0.245 on any
   * desktop-width container (containerWidth * ratio blew past 344 almost
   * immediately, and the clamp always won); only MIN_CARD_WIDTH_PX (a
   * legibility floor, not a desktop cap) still bounds it. Split by tier —
   * same reasoning as Card distance above: the value that reads correctly
   * on desktop doesn't necessarily read correctly on a real phone, so this
   * is independently tunable per breakpoint rather than one shared ratio. */
  cardWidthRatio: number;
  /** Card size — Tablet (>= 768px). */
  cardWidthRatioMd: number;
  /** Card size — Desktop (>= 1024px). */
  cardWidthRatioLg: number;
  /** CSS `perspective`, px — flat, not tier-scaled the way depthPx (the
   * closest neighbour's own translateZ magnitude, still auto-scaled with
   * the active card's real measured width) is. An operator tuning this
   * directly owns the tradeoff that scaling used to resolve automatically;
   * exposed as a knob rather than silently derived, per instruction. */
  perspectivePx: number;
  /** CSS `perspective-origin`, percent of the coverflow's own container box
   * (0-100 matches perspective-origin's own percentage syntax; a modest
   * overshoot past that range is allowed for creative off-center framing).
   * 50/50 is CSS's own default — dead center. */
  perspectiveOriginXPercent: number;
  perspectiveOriginYPercent: number;
};

// 250/344 — CoverFlowLab's own original fork tuning (itemWidth 344,
// centerGap 250), unchanged as the default at every tier.
const DEFAULT_CARD_DISTANCE_RATIO = 250 / 344;
// Matches pages/carousel-lab.tsx's own previous CARD_WIDTH_TO_CONTAINER_RATIO
// and CoverFlowLab.tsx's own original PERSPECTIVE_PX default, unchanged.
const DEFAULT_CARD_WIDTH_RATIO = 0.62;
const DEFAULT_PERSPECTIVE_PX = 1000;

export const DEFAULT_CAROUSEL_LAB_CONFIG = {
  cardDistanceRatio: DEFAULT_CARD_DISTANCE_RATIO,
  cardDistanceRatioMd: DEFAULT_CARD_DISTANCE_RATIO,
  cardDistanceRatioLg: DEFAULT_CARD_DISTANCE_RATIO,
  cardWidthRatio: DEFAULT_CARD_WIDTH_RATIO,
  cardWidthRatioMd: DEFAULT_CARD_WIDTH_RATIO,
  cardWidthRatioLg: DEFAULT_CARD_WIDTH_RATIO,
  perspectivePx: DEFAULT_PERSPECTIVE_PX,
  perspectiveOriginXPercent: 50,
  perspectiveOriginYPercent: 50,
} satisfies CarouselLabConfig;

// Wide enough that an operator can genuinely close two cards up (0.2, most
// of a neighbour tucked behind the active card) or spread them out past a
// full card width apart (1.5) while testing — not a physical limit, a
// sane editing range.
const CARD_DISTANCE_RATIO_MIN = 0.2;
const CARD_DISTANCE_RATIO_MAX = 1.5;
// 0.1 (a sliver of the container) to 1.0 (fills the full measured width,
// at any viewport size — no fixed pixel ceiling clamps this back down).
const CARD_WIDTH_RATIO_MIN = 0.1;
const CARD_WIDTH_RATIO_MAX = 1;
// A strong close-up (200px) through a near-flat, barely-3D read (4000px) —
// CoverFlowLab.tsx's own original tuning (1000px) sits comfortably inside.
const PERSPECTIVE_PX_MIN = 200;
const PERSPECTIVE_PX_MAX = 4000;
// A deliberate overshoot past perspective-origin's own natural 0-100%
// "on the box" range, for off-center framing that still reads intentional
// rather than unbounded.
const PERSPECTIVE_ORIGIN_PERCENT_MIN = -50;
const PERSPECTIVE_ORIGIN_PERCENT_MAX = 150;

export function normalizeCarouselLabConfig(
  config: Partial<CarouselLabConfig> | undefined,
): CarouselLabConfig {
  const base = { ...DEFAULT_CAROUSEL_LAB_CONFIG, ...(config ?? {}) };
  return {
    cardDistanceRatio: clamp(base.cardDistanceRatio, CARD_DISTANCE_RATIO_MIN, CARD_DISTANCE_RATIO_MAX),
    cardDistanceRatioMd: clamp(base.cardDistanceRatioMd, CARD_DISTANCE_RATIO_MIN, CARD_DISTANCE_RATIO_MAX),
    cardDistanceRatioLg: clamp(base.cardDistanceRatioLg, CARD_DISTANCE_RATIO_MIN, CARD_DISTANCE_RATIO_MAX),
    cardWidthRatio: clamp(base.cardWidthRatio, CARD_WIDTH_RATIO_MIN, CARD_WIDTH_RATIO_MAX),
    cardWidthRatioMd: clamp(base.cardWidthRatioMd, CARD_WIDTH_RATIO_MIN, CARD_WIDTH_RATIO_MAX),
    cardWidthRatioLg: clamp(base.cardWidthRatioLg, CARD_WIDTH_RATIO_MIN, CARD_WIDTH_RATIO_MAX),
    perspectivePx: clamp(base.perspectivePx, PERSPECTIVE_PX_MIN, PERSPECTIVE_PX_MAX),
    perspectiveOriginXPercent: clamp(
      base.perspectiveOriginXPercent, PERSPECTIVE_ORIGIN_PERCENT_MIN, PERSPECTIVE_ORIGIN_PERCENT_MAX,
    ),
    perspectiveOriginYPercent: clamp(
      base.perspectiveOriginYPercent, PERSPECTIVE_ORIGIN_PERCENT_MIN, PERSPECTIVE_ORIGIN_PERCENT_MAX,
    ),
  };
}
