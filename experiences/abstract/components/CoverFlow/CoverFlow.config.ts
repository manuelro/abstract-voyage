import { clamp } from '../../../../helpers/clamp';

/**
 * CoverFlow's own geometry config — promoted from pages/carousel-lab.config.ts's
 * CarouselLabConfig (same field shape, same tuning), now owned by the
 * component itself rather than resolved per-page. See CoverFlow.tsx's own
 * useCoverFlowGeometry for how these ratios turn into concrete pixel values
 * per breakpoint tier.
 *
 * "Card distance": the ratio of the active card's centerGap (x-distance to
 * its first neighbour) to the active card's own width. stackSpacing
 * (further-out neighbours) tracks centerGap via stackSpacingToCenterGapRatio,
 * the original fork's own fixed 100/250 tuning.
 *
 * Split by tier (mobile/md/lg) because the value that reads correctly on a
 * wide desktop viewport does not read correctly on a real phone — confirmed
 * live in the carousel-lab spike this was promoted from.
 */
export type CoverFlowConfig = {
  /** Mobile — < 768px (unsuffixed = base/mobile-first tier). */
  cardDistanceRatio: number;
  /** Tablet — >= 768px. */
  cardDistanceRatioMd: number;
  /** Desktop — >= 1024px. */
  cardDistanceRatioLg: number;
  /** Fraction of the measured container's own width the active card should
   * occupy — Mobile (< 768px). No fixed pixel ceiling; only minCardWidthPx
   * bounds it from below. */
  cardWidthRatio: number;
  /** Card size — Tablet (>= 768px). */
  cardWidthRatioMd: number;
  /** Card size — Desktop (>= 1024px). */
  cardWidthRatioLg: number;
  /** Fixed aspect ratio (height / width) the resolved itemHeight is derived
   * from — 4/3 matches the card's own 3:4 default. */
  cardAspectRatio: number;
  /** stackSpacing / centerGap — the original fork's own fixed 100/250
   * ratio, kept constant across tiers so further-out neighbours keep the
   * same relative spacing to the first neighbour. */
  stackSpacingToCenterGapRatio: number;
  rotationDeg: number;
  /** Signed-looking distance progression is intentionally represented as a
   * non-negative blend step: each inactive position adds this fraction of
   * the remaining distance toward the caller's column color. Zero preserves
   * the configured inactive face exactly (opt-out). */
  inactiveCardColumnDarkeningStep: number;
  /** CSS `perspective`, px — one flat value across every tier. */
  perspectivePx: number;
  /** CSS `perspective-origin`, percent of the coverflow's own container box. */
  perspectiveOriginXPercent: number;
  perspectiveOriginYPercent: number;
  /** Closest neighbour's own translateZ magnitude at referenceWidthPx —
   * scaled by cardWidthPx / referenceWidthPx at render time so the
   * WebKit-safe depth/size relationship (see CoverFlow.tsx's own `z` doc
   * comment) holds at any resolved card size. */
  depthPxAtReferenceWidth: number;
  referenceWidthPx: number;
  /** Legibility floor — the resolved card width never goes below this,
   * regardless of container width or cardWidthRatio. */
  minCardWidthPx: number;
  enableClickToSnap: boolean;
  enableScroll: boolean;
  scrollThresholdPx: number;
  /** Pointer travel (px) beyond which a click-vs-drag disambiguation
   * treats the gesture as a drag, not a tap. */
  clickVsDragThresholdPx: number;
  /** How long after a card becomes active before it's considered visually
   * *settled* — i.e. its snap/rotate/translate transition has finished, so
   * it's safe to start revealing its own detail content (the meta row,
   * and — see staggeredCardRevealEnabled below — every other element)
   * instead of racing that reveal against the card still sliding into
   * place. Approximates this spring's own settle time (see the
   * `useSpring({ stiffness: 150, damping: 30, mass: 1 })` call in
   * CoverFlow.tsx) rather than reading it out of the spring itself —
   * framer-motion doesn't expose a "has this spring settled" event, only a
   * continuously-updating value. */
  activeSettleDelayMs: number;
  /** Once a card settles as active (see activeSettleDelayMs above), every
   * one of its own content elements — meta row, title, excerpt, and CTA
   * alike — joins the same reveal/exit gate. This toggle only controls the
   * entrance rhythm: on = a deliberately staggered sequence, off = all
   * elements enter together. Exit never staggers; cardRevealExit* below
   * always controls one shared fade-out across the information layer. */
  staggeredCardRevealEnabled: boolean;
  /** Spacing, in ms, between each successive element's own start in the
   * staggered sequence above — ordered by ascending information value/
   * cognitive load (see CoverFlow.tsx's own reveal-computation doc
   * comment for the full ordering rationale): topic tag (0 · a glanceable
   * category, lowest load) → date + reading time (1 step · still trivial,
   * paired since they're read together) → title (2 steps · the headline,
   * the card's primary content) → excerpt (3 steps · a full sentence,
   * the highest reading load) → CTA (4 steps · a short action label, but
   * only relevant once the rest has been read). */
  staggeredCardRevealStepMs: number;
  /** Each element's own fade-in duration under the staggered sequence
   * above — shared across every element (only the delay is staggered per
   * element; duration/easing stay one deliberate, consistent motion
   * language across the whole sequence, matching this repo's own
   * ARTICLE_CARD_DETAIL_FADE_MS convention for the same kind of reveal). */
  staggeredCardRevealElementDurationMs: number;
  /** Shared CSS easing for the staggered sequence above — defaults to the
   * same curve ArticleCard's own existing detail-fade
   * (ARTICLE_CARD_DETAIL_FADE_EASING_CSS) already uses everywhere else, so
   * the staggered sequence reads as one consistent motion language with
   * the rest of the site rather than a competing one. */
  staggeredCardRevealEasingCss: string;
  /** Unlike entering — where staggeredCardRevealEnabled above opts into a
   * per-element sequence — leaving never staggers, regardless of that
   * setting: every one of a card's own detail elements fades out together
   * as one shared motion the instant it stops being the active/settled
   * card, not a replay of the entrance's own per-element delays in
   * reverse (a staggered exit reads as the UI breaking apart at different
   * times, not a deliberate sequence). This delay/duration/easing triad is
   * always in effect, not opt-in — see ArticleCard.tsx's own
   * staggerRevealExitDelayMs/-DurationMs/-EasingCss doc comments for the
   * full mechanism (a CSS attribute-selector rule keyed to the *leaving*
   * direction, resolved by the browser automatically). */
  cardRevealExitDelayMs: number;
  cardRevealExitDurationMs: number;
  cardRevealExitEasingCss: string;
};

const DEFAULT_CARD_WIDTH_RATIO = 0.62;
const DEFAULT_PERSPECTIVE_PX = 1000;

export const DEFAULT_COVER_FLOW_CONFIG = {
  cardDistanceRatio: 1.5,
  cardDistanceRatioMd: 1.1,
  cardDistanceRatioLg: 1.5,
  cardWidthRatio: 0.83,
  cardWidthRatioMd: DEFAULT_CARD_WIDTH_RATIO,
  cardWidthRatioLg: 0.69,
  cardAspectRatio: 4 / 3,
  stackSpacingToCenterGapRatio: 0.45,
  rotationDeg: 31,
  inactiveCardColumnDarkeningStep: 0,
  perspectivePx: 4000,
  perspectiveOriginXPercent: 50,
  perspectiveOriginYPercent: 50,
  depthPxAtReferenceWidth: 110,
  referenceWidthPx: 334,
  minCardWidthPx: 400,
  enableClickToSnap: true,
  enableScroll: true,
  scrollThresholdPx: 100,
  clickVsDragThresholdPx: 6,
  activeSettleDelayMs: 120,
  staggeredCardRevealEnabled: true,
  staggeredCardRevealStepMs: 60,
  // Matches components/ArticleCard.detailFade.ts's own
  // ARTICLE_CARD_DETAIL_FADE_MS/-EASING_CSS exactly — same reveal language
  // as every other detail-fade on this card, not a competing one.
  staggeredCardRevealElementDurationMs: 480,
  staggeredCardRevealEasingCss: 'ease-out',
  cardRevealExitDelayMs: 20,
  cardRevealExitDurationMs: 150,
  cardRevealExitEasingCss: 'ease-out',
} satisfies CoverFlowConfig;

const CARD_DISTANCE_RATIO_MIN = 0.2;
const CARD_DISTANCE_RATIO_MAX = 1.5;
const CARD_WIDTH_RATIO_MIN = 0.1;
const CARD_WIDTH_RATIO_MAX = 1;
const PERSPECTIVE_PX_MIN = 200;
const PERSPECTIVE_PX_MAX = 4000;
const PERSPECTIVE_ORIGIN_PERCENT_MIN = -50;
const PERSPECTIVE_ORIGIN_PERCENT_MAX = 150;
const ROTATION_DEG_MIN = 0;
const ROTATION_DEG_MAX = 90;
const INACTIVE_CARD_COLUMN_DARKENING_STEP_MIN = 0;
const INACTIVE_CARD_COLUMN_DARKENING_STEP_MAX = 1;
const DEPTH_PX_MIN = 0;
const DEPTH_PX_MAX = 2000;
const REFERENCE_WIDTH_PX_MIN = 50;
const REFERENCE_WIDTH_PX_MAX = 1000;
const MIN_CARD_WIDTH_PX_MIN = 50;
const MIN_CARD_WIDTH_PX_MAX = 500;
const SCROLL_THRESHOLD_PX_MIN = 10;
const SCROLL_THRESHOLD_PX_MAX = 1000;
const CLICK_VS_DRAG_THRESHOLD_PX_MIN = 1;
const CLICK_VS_DRAG_THRESHOLD_PX_MAX = 50;
const STACK_SPACING_RATIO_MIN = 0;
const STACK_SPACING_RATIO_MAX = 2;
const CARD_ASPECT_RATIO_MIN = 0.2;
const CARD_ASPECT_RATIO_MAX = 5;
const ACTIVE_SETTLE_DELAY_MS_MIN = 0;
const ACTIVE_SETTLE_DELAY_MS_MAX = 3000;
const STAGGERED_CARD_REVEAL_STEP_MS_MIN = 0;
const STAGGERED_CARD_REVEAL_STEP_MS_MAX = 1000;
const STAGGERED_CARD_REVEAL_ELEMENT_DURATION_MS_MIN = 0;
const STAGGERED_CARD_REVEAL_ELEMENT_DURATION_MS_MAX = 3000;
const CARD_REVEAL_EXIT_DELAY_MS_MIN = 0;
const CARD_REVEAL_EXIT_DELAY_MS_MAX = 2000;
const CARD_REVEAL_EXIT_DURATION_MS_MIN = 0;
const CARD_REVEAL_EXIT_DURATION_MS_MAX = 3000;

export function normalizeCoverFlowConfig(
  config: Partial<CoverFlowConfig> | undefined,
): CoverFlowConfig {
  const base = { ...DEFAULT_COVER_FLOW_CONFIG, ...(config ?? {}) };
  return {
    cardDistanceRatio: clamp(base.cardDistanceRatio, CARD_DISTANCE_RATIO_MIN, CARD_DISTANCE_RATIO_MAX),
    cardDistanceRatioMd: clamp(base.cardDistanceRatioMd, CARD_DISTANCE_RATIO_MIN, CARD_DISTANCE_RATIO_MAX),
    cardDistanceRatioLg: clamp(base.cardDistanceRatioLg, CARD_DISTANCE_RATIO_MIN, CARD_DISTANCE_RATIO_MAX),
    cardWidthRatio: clamp(base.cardWidthRatio, CARD_WIDTH_RATIO_MIN, CARD_WIDTH_RATIO_MAX),
    cardWidthRatioMd: clamp(base.cardWidthRatioMd, CARD_WIDTH_RATIO_MIN, CARD_WIDTH_RATIO_MAX),
    cardWidthRatioLg: clamp(base.cardWidthRatioLg, CARD_WIDTH_RATIO_MIN, CARD_WIDTH_RATIO_MAX),
    cardAspectRatio: clamp(base.cardAspectRatio, CARD_ASPECT_RATIO_MIN, CARD_ASPECT_RATIO_MAX),
    stackSpacingToCenterGapRatio: clamp(
      base.stackSpacingToCenterGapRatio, STACK_SPACING_RATIO_MIN, STACK_SPACING_RATIO_MAX,
    ),
    rotationDeg: clamp(base.rotationDeg, ROTATION_DEG_MIN, ROTATION_DEG_MAX),
    inactiveCardColumnDarkeningStep: clamp(
      base.inactiveCardColumnDarkeningStep,
      INACTIVE_CARD_COLUMN_DARKENING_STEP_MIN,
      INACTIVE_CARD_COLUMN_DARKENING_STEP_MAX,
    ),
    perspectivePx: clamp(base.perspectivePx, PERSPECTIVE_PX_MIN, PERSPECTIVE_PX_MAX),
    perspectiveOriginXPercent: clamp(
      base.perspectiveOriginXPercent, PERSPECTIVE_ORIGIN_PERCENT_MIN, PERSPECTIVE_ORIGIN_PERCENT_MAX,
    ),
    perspectiveOriginYPercent: clamp(
      base.perspectiveOriginYPercent, PERSPECTIVE_ORIGIN_PERCENT_MIN, PERSPECTIVE_ORIGIN_PERCENT_MAX,
    ),
    depthPxAtReferenceWidth: clamp(base.depthPxAtReferenceWidth, DEPTH_PX_MIN, DEPTH_PX_MAX),
    referenceWidthPx: clamp(base.referenceWidthPx, REFERENCE_WIDTH_PX_MIN, REFERENCE_WIDTH_PX_MAX),
    minCardWidthPx: clamp(base.minCardWidthPx, MIN_CARD_WIDTH_PX_MIN, MIN_CARD_WIDTH_PX_MAX),
    enableClickToSnap: base.enableClickToSnap,
    enableScroll: base.enableScroll,
    scrollThresholdPx: clamp(base.scrollThresholdPx, SCROLL_THRESHOLD_PX_MIN, SCROLL_THRESHOLD_PX_MAX),
    clickVsDragThresholdPx: clamp(
      base.clickVsDragThresholdPx, CLICK_VS_DRAG_THRESHOLD_PX_MIN, CLICK_VS_DRAG_THRESHOLD_PX_MAX,
    ),
    activeSettleDelayMs: clamp(
      base.activeSettleDelayMs, ACTIVE_SETTLE_DELAY_MS_MIN, ACTIVE_SETTLE_DELAY_MS_MAX,
    ),
    staggeredCardRevealEnabled: base.staggeredCardRevealEnabled === true,
    staggeredCardRevealStepMs: clamp(
      base.staggeredCardRevealStepMs, STAGGERED_CARD_REVEAL_STEP_MS_MIN, STAGGERED_CARD_REVEAL_STEP_MS_MAX,
    ),
    staggeredCardRevealElementDurationMs: clamp(
      base.staggeredCardRevealElementDurationMs,
      STAGGERED_CARD_REVEAL_ELEMENT_DURATION_MS_MIN,
      STAGGERED_CARD_REVEAL_ELEMENT_DURATION_MS_MAX,
    ),
    staggeredCardRevealEasingCss: typeof base.staggeredCardRevealEasingCss === 'string'
      && base.staggeredCardRevealEasingCss.length > 0
      ? base.staggeredCardRevealEasingCss
      : DEFAULT_COVER_FLOW_CONFIG.staggeredCardRevealEasingCss,
    cardRevealExitDelayMs: clamp(
      base.cardRevealExitDelayMs, CARD_REVEAL_EXIT_DELAY_MS_MIN, CARD_REVEAL_EXIT_DELAY_MS_MAX,
    ),
    cardRevealExitDurationMs: clamp(
      base.cardRevealExitDurationMs, CARD_REVEAL_EXIT_DURATION_MS_MIN, CARD_REVEAL_EXIT_DURATION_MS_MAX,
    ),
    cardRevealExitEasingCss: typeof base.cardRevealExitEasingCss === 'string'
      && base.cardRevealExitEasingCss.length > 0
      ? base.cardRevealExitEasingCss
      : DEFAULT_COVER_FLOW_CONFIG.cardRevealExitEasingCss,
  };
}
