import { clamp } from '../../../../helpers/clamp';
import {
  PADDING_X_OPTIONS,
  PADDING_Y_OPTIONS,
  type PaddingXClass,
  type PaddingYClass,
} from '../../../../components/tailwindSpacingScale';

export const MOBILE_PINNED_ARTICLE_SECTION_SCOPE_ID =
  'MobilePinnedArticleSection/layout' as const;

// Regression fix (operator-reported: the dropdown wasn't showing "the
// correct list of values based on the available Tailwind tokens") — this
// used to be its own bespoke, artificially truncated 9-value catalog
// (px-0/1/2/3/4/6/8/10/12, skipping every half-step AND every odd value
// past 4, capped at 12), independently hand-maintained instead of reusing
// the SAME shared, comprehensive PADDING_X_OPTIONS/PADDING_Y_OPTIONS
// catalog (tailwindSpacingScale.ts) every other padding field in this
// codebase already draws from (half-steps included, continuing to px-96).
// Re-exported under these names so no existing config/panel import path
// needs to change.
export const EXPANDED_LIST_PADDING_X_TOKENS = PADDING_X_OPTIONS.map(option => option.value);
export const EXPANDED_LIST_PADDING_Y_TOKENS = PADDING_Y_OPTIONS.map(option => option.value);
export type ExpandedListPaddingX = PaddingXClass;
export type ExpandedListPaddingY = PaddingYClass;

export type MobilePinnedArticleSectionConfig = {
  /** Also doubles as "N" for the short list's stop-and-expand window (see
   * MobilePinnedArticleSection.tsx's computeWindowStart): the max rows shown
   * before an appended "Expand list" row appears. Same knob, tier-specific
   * as it always was — not a new parallel field. */
  visibleRowsLargePhone: number;
  visibleRowsSmallPhone: number;
  smallPhoneMaxHeightPx: number;
  expandedPanelHeightPercent: number;
  carouselHeightPercent: number;
  listHeightPercent: number;
  panelOpacity: number;
  peekHeightSvh: number;
  /** Vertical scroll pixels required for one CoverFlow horizontal step.
   * `1` preserves direct 1:1 movement; lower values increase carousel travel
   * per finger pixel, higher values make each article require more travel.
   * Only read while `scrollDrivenNavigationEnabled` is on. */
  scrollEffortMultiplier: number;
  /** Off (default): the carousel's active index is never driven by page
   * scroll — only by the timeline list (short or expanded) and the
   * carousel's own swipe gesture. No extra scroll height is reserved, and
   * none of the scroll/snap/hash-restoration machinery runs. On: the
   * legacy behavior — scrolling through this section's own reserved travel
   * height moves the carousel one card per `scrollEffortMultiplier`-scaled
   * step, exactly as this component originally shipped. */
  scrollDrivenNavigationEnabled: boolean;
  /** Horizontal inset applied to the row list while expanded, as a Tailwind
   * spacing token (e.g. `px-6`). */
  expandedListPaddingX: ExpandedListPaddingX;
  /** Vertical inset applied to the row list while expanded, as a Tailwind
   * spacing token (e.g. `py-0`). */
  expandedListPaddingY: ExpandedListPaddingY;
  /** Overrides the panel's background color while expanded. Empty string
   * inherits the collapsed panel's own color (`panelColor` prop). */
  expandedListBackgroundColor: string;
  /** Overrides `panelOpacity` while expanded. */
  expandedListBackgroundOpacity: number;
  /** Backdrop blur radius applied to the expanded panel, in px — was a
   * hardcoded `blur(12px)` (styles.module.css's own `.panel` rule) with no
   * config surface at all; 12 here reproduces that exact value. */
  expandedListBackdropBlurPx: number;
  /** Opacity of the collapsed carousel card still visible behind/above the
   * expanded list panel — was a hardcoded `opacity: 0.7`
   * (`.stickyViewport[data-expanded='true'] .carousel`, styles.module.css)
   * with no config surface at all; 0.7 here reproduces that exact value. */
  expandedCarouselBehindOpacity: number;
  /** Opt-in (default on — operator ask): while the list is expanded, the
   * page's own scroll-gradient background (PolymorphicScrollGradientBackground,
   * shared across every PolymorphicLayout page) is forced to its own
   * maximum darken level, independent of the real scroll position. Reading
   * happens inside a modal-like, scroll-locked overlay — the background
   * behind it should read as settled/at-rest, not chase whatever
   * `window.scrollY` happens to report during that time (which, prior to
   * this feature, could shift unexpectedly the instant an article was
   * selected — see MobilePinnedArticleSection.tsx's own onExpandedChange
   * doc comment for the underlying scroll-lock interaction this sidesteps
   * entirely, rather than papering over). Off falls back to the background's
   * own plain scroll-driven schedule, unaffected by this component. */
  expandedForcesMaxBackgroundDarken: boolean;
  /** Cubic-bezier easing shared by the phases NOT covered by
   * expandedEnterEasing/expandedSelectEasing below (sentinel mount-in, panel
   * collapse, post-collapse list settle). Defaults to the curve
   * styles.module.css's own `.panel` transition already uses. */
  selectMotionEasing: [number, number, number, number];
  /** STAGE-04/05 — ms for each expanded-list row's own opacity fade-in when
   * the panel opens. Opacity only, no scale/transform. */
  expandedEnterDurationMs: number;
  /** STAGE-04/05 — ms of stagger delay between each row's entrance fade-in,
   * item 1 first through item N (index-based: row N starts N *
   * expandedEnterStaggerMs after row 0). 0 = no stagger, every row fades in
   * at once. */
  expandedEnterStaggerMs: number;
  /** STAGE-04/05 — cubic-bezier easing for the entrance fade-in, independent
   * of the leaving easing (expandedSelectEasing) — entrance and leaving are
   * two distinct motions and may want different curves. */
  expandedEnterEasing: [number, number, number, number];
  /** STAGE-06 (condensed) — ms for each expanded-list row's own opacity
   * fade-out once a row is tapped to select a different article. Opacity
   * only, no scale/transform. Applies to every row currently on screen —
   * all of them stay in the expanded list at their own original position
   * while fading, not just the ones that won't survive into the final short
   * list. The underlying row order is swapped to the final selection only
   * once every row is fully invisible, then the panel collapses (STAGE-08)
   * around already-correct, already-visible content. */
  expandedSelectFadeOutDurationMs: number;
  /** STAGE-06 — ms of stagger delay between each row's exit fade-out, in the
   * SAME direction as the entrance: item 1 fades first, the LAST row fades
   * last (index-based from the start of the list). The panel does not start
   * collapsing until the last row's fade-out has finished. 0 = no stagger,
   * every row fades out at once. */
  expandedSelectStaggerMs: number;
  /** STAGE-06 — cubic-bezier easing for the leaving fade-out, independent of
   * the entrance easing (expandedEnterEasing). */
  expandedSelectEasing: [number, number, number, number];
  /** STAGE-07/08 — ms held once every row has finished fading out (and the
   * list has already been swapped to its final order) before the panel
   * starts collapsing. 0 = no pause. */
  expandedSelectHoldMs: number;
  /** Phase 4 — ms for the panel-height collapse. Must match
   * styles.module.css's `.panel` transition duration (CSS-driven, not
   * controlled by this value) — kept here only so the JS-side settle timer
   * that watches for the collapse to finish stays in sync with it. */
  panelCollapseDurationMs: number;
  /** Phase 5 — ms for the collapsed short list's post-settle fade/slide-in. */
  listSettleDurationMs: number;
};

export const DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG = {
  visibleRowsLargePhone: 3,
  visibleRowsSmallPhone: 3,
  smallPhoneMaxHeightPx: 700,
  expandedPanelHeightPercent: 76,
  carouselHeightPercent: 62,
  listHeightPercent: 38,
  panelOpacity: 0.82,
  peekHeightSvh: 12,
  // 0.8 shortens the per-article page travel by 20% while keeping every
  // scroll, snap, restoration, and swipe calculation on the same scale.
  // Set to 1 for strict 1:1 page-to-coverflow travel.
  scrollEffortMultiplier: 0.8,
  scrollDrivenNavigationEnabled: false,
  expandedListPaddingX: 'px-14',
  expandedListPaddingY: 'py-7',
  expandedListBackgroundColor: '',
  expandedListBackgroundOpacity: 0,
  expandedListBackdropBlurPx: 40,
  expandedCarouselBehindOpacity: 0.5,
  expandedForcesMaxBackgroundDarken: true,
  selectMotionEasing: [0.22, 1, 0.36, 1],
  expandedEnterDurationMs: 850,
  expandedEnterStaggerMs: 130,
  expandedEnterEasing: [0.22, 1, 0.36, 1],
  expandedSelectFadeOutDurationMs: 870,
  expandedSelectStaggerMs: 275,
  expandedSelectEasing: [0.22, 1, 0.36, 1],
  expandedSelectHoldMs: 480,
  panelCollapseDurationMs: 1000,
  listSettleDurationMs: 1000,
} satisfies MobilePinnedArticleSectionConfig;

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

function normalizeEasing(
  value: [number, number, number, number],
  fallback: [number, number, number, number],
): [number, number, number, number] {
  if (Array.isArray(value) && value.length === 4 && value.every(isFiniteNumber)) {
    return [value[0], value[1], value[2], value[3]];
  }
  return fallback;
}

export function normalizeMobilePinnedArticleSectionConfig(
  value: Partial<MobilePinnedArticleSectionConfig> | undefined,
): MobilePinnedArticleSectionConfig {
  const base = { ...DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG, ...(value ?? {}) };
  const carouselHeightPercent = clamp(base.carouselHeightPercent, 40, 80);
  return {
    visibleRowsLargePhone: Math.round(clamp(base.visibleRowsLargePhone, 1, 6)),
    visibleRowsSmallPhone: Math.round(clamp(base.visibleRowsSmallPhone, 1, 6)),
    smallPhoneMaxHeightPx: Math.round(clamp(base.smallPhoneMaxHeightPx, 480, 900)),
    expandedPanelHeightPercent: clamp(base.expandedPanelHeightPercent, 50, 95),
    carouselHeightPercent,
    listHeightPercent: 100 - carouselHeightPercent,
    panelOpacity: clamp(base.panelOpacity, 0, 1),
    peekHeightSvh: clamp(base.peekHeightSvh, 4, 24),
    scrollEffortMultiplier: clamp(base.scrollEffortMultiplier, 0.5, 2),
    scrollDrivenNavigationEnabled: base.scrollDrivenNavigationEnabled === true,
    expandedListPaddingX: EXPANDED_LIST_PADDING_X_TOKENS.includes(base.expandedListPaddingX)
      ? base.expandedListPaddingX
      : DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.expandedListPaddingX,
    expandedListPaddingY: EXPANDED_LIST_PADDING_Y_TOKENS.includes(base.expandedListPaddingY)
      ? base.expandedListPaddingY
      : DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.expandedListPaddingY,
    expandedListBackgroundColor: typeof base.expandedListBackgroundColor === 'string'
      ? base.expandedListBackgroundColor.trim()
      : '',
    expandedListBackgroundOpacity: clamp(base.expandedListBackgroundOpacity, 0, 1),
    expandedListBackdropBlurPx: Math.round(clamp(base.expandedListBackdropBlurPx, 0, 40)),
    expandedCarouselBehindOpacity: clamp(base.expandedCarouselBehindOpacity, 0, 1),
    expandedForcesMaxBackgroundDarken: base.expandedForcesMaxBackgroundDarken !== false,
    selectMotionEasing: normalizeEasing(
      base.selectMotionEasing, DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.selectMotionEasing,
    ),
    expandedEnterDurationMs: Math.round(clamp(base.expandedEnterDurationMs, 0, 1000)),
    expandedEnterStaggerMs: Math.round(clamp(base.expandedEnterStaggerMs, 0, 300)),
    expandedEnterEasing: normalizeEasing(
      base.expandedEnterEasing, DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.expandedEnterEasing,
    ),
    expandedSelectFadeOutDurationMs: Math.round(clamp(base.expandedSelectFadeOutDurationMs, 0, 1000)),
    expandedSelectStaggerMs: Math.round(clamp(base.expandedSelectStaggerMs, 0, 300)),
    expandedSelectEasing: normalizeEasing(
      base.expandedSelectEasing, DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.expandedSelectEasing,
    ),
    expandedSelectHoldMs: Math.round(clamp(base.expandedSelectHoldMs, 0, 1000)),
    panelCollapseDurationMs: Math.round(clamp(base.panelCollapseDurationMs, 0, 1000)),
    listSettleDurationMs: Math.round(clamp(base.listSettleDurationMs, 0, 1000)),
  };
}
