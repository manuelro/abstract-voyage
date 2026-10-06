import { clamp } from '../../../../helpers/clamp';
import {
  PADDING_TOP_OPTIONS,
  PADDING_RIGHT_OPTIONS,
  PADDING_BOTTOM_OPTIONS,
  PADDING_LEFT_OPTIONS,
  PADDING_X_OPTIONS,
  type PaddingTopClass,
  type PaddingRightClass,
  type PaddingBottomClass,
  type PaddingLeftClass,
  type PaddingXClass,
} from '../../../../components/tailwindSpacingScale';

export const MOBILE_PINNED_ARTICLE_SECTION_EASINGS = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
} as const;

export type MobilePinnedArticleSectionEasing =
  keyof typeof MOBILE_PINNED_ARTICLE_SECTION_EASINGS;

const MOTION_EASING_KEYS = Object.keys(
  MOBILE_PINNED_ARTICLE_SECTION_EASINGS,
) as MobilePinnedArticleSectionEasing[];

export const MOBILE_PINNED_ARTICLE_SECTION_SCOPE_ID =
  'MobilePinnedArticleSection/layout' as const;

// Regression fix (operator-reported: the dropdown wasn't showing "the
// correct list of values based on the available Tailwind tokens") — this
// used to be its own bespoke, artificially truncated 9-value catalog
// (px-0/1/2/3/4/6/8/10/12, skipping every half-step AND every odd value
// past 4, capped at 12), independently hand-maintained instead of reusing
// the SAME shared, comprehensive PADDING_TOP/RIGHT/BOTTOM/LEFT_OPTIONS
// catalogs (tailwindSpacingScale.ts) every other per-edge padding field in
// this codebase already draws from (half-steps included, continuing to
// *-96). Segregated into one token per edge (operator ask) instead of the
// X/Y pair these replace, so each side of the expanded list can carry its
// own value independent of the others.
export const EXPANDED_LIST_PADDING_TOP_TOKENS = PADDING_TOP_OPTIONS.map(option => option.value);
export const EXPANDED_LIST_PADDING_RIGHT_TOKENS = PADDING_RIGHT_OPTIONS.map(option => option.value);
export const EXPANDED_LIST_PADDING_BOTTOM_TOKENS = PADDING_BOTTOM_OPTIONS.map(option => option.value);
export const EXPANDED_LIST_PADDING_LEFT_TOKENS = PADDING_LEFT_OPTIONS.map(option => option.value);
export const CAROUSEL_GUTTER_X_TOKENS = PADDING_X_OPTIONS.map(option => option.value);
export type ExpandedListPaddingTop = PaddingTopClass;
export type ExpandedListPaddingRight = PaddingRightClass;
export type ExpandedListPaddingBottom = PaddingBottomClass;
export type ExpandedListPaddingLeft = PaddingLeftClass;
export type CarouselGutterX = PaddingXClass;
export type MobilePinnedArticleListPresentation = 'glassPanel' | 'cardFlip';

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
  /** Horizontal distance the settled ACTIVE card keeps from the true
   * viewport edge, as a Tailwind `px-*` token — was CoverFlow's own
   * `mobileCardGutterX` (moved here since that field was read nowhere
   * except this section's own carousel). Applied via CoverFlow's
   * `cardWidthBasisPx` override (pages/abstract.tsx), NOT as literal
   * padding on the plane CoverFlow measures/clips — that plane stays the
   * true full-bleed viewport width regardless of this value, so a
   * swipe/transition still slides genuinely edge-to-edge; only the
   * resolved active-card width (itself further scaled by CoverFlow's own
   * `cardWidthRatio`) shrinks. At `px-0` the card can use the full plane
   * width (subject to `cardWidthRatio`); higher tokens narrow it further. */
  carouselGutterX: CarouselGutterX;
  listHeightPercent: number;
  panelOpacity: number;
  peekHeightSvh: number;
  /** Opt-in (default off). While on, the active CoverFlow card renders
   * outline-only — a border and text in one derived ink color, no gradient
   * fill — while this section is merely peeking at the top of the viewport,
   * then cross-fades to the full colorful gradient as the user scrolls it
   * into its pinned, primary-focus position. Off preserves today's behavior
   * exactly: the gradient is always fully visible, no border. */
  peekOutlineModeEnabled: boolean;
  /** How close, in svh (same unit as peekHeightSvh), the section's top must
   * come to its pinned position before the outline snaps to the full
   * gradient — a threshold margin, not a ramp: focusProgress resolves to a
   * flat 0 or 1, flipping the instant `top - scrollY` falls within this
   * many svh, never a fractional cross-fade tied to exactly how close it
   * is. Only read while peekOutlineModeEnabled is on. A larger value flips
   * earlier/more forgivingly (tolerates sub-pixel scroll-snap slop, dynamic
   * mobile toolbar resize, etc. — see MobilePinnedArticleSection.tsx's own
   * focusProgress effect for the operator-reported failure mode a too-small
   * margin produces: the flip never visibly fires even once the section
   * looks fully settled). Deliberately independent of peekHeightSvh — that
   * field sizes the peek sliver's own layout height, a different concern
   * from how close counts as "arrived." */
  peekFocusRangeSvh: number;
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
  /** The opt-in alternative to the expanded glass panel. `cardFlip` rotates
   * the active carousel surface 190 degrees and renders the full list on its
   * reverse face; `glassPanel` preserves the established bottom-sheet view. */
  fullListPresentation: MobilePinnedArticleListPresentation;
  /** Top inset applied to the row list while expanded, as a Tailwind spacing
   * token (e.g. `pt-7`). Segregated per-edge (was a single X/Y pair) so each
   * side can carry its own value independent of the others. */
  expandedListPaddingTop: ExpandedListPaddingTop;
  /** Right inset applied to the row list while expanded, as a Tailwind
   * spacing token (e.g. `pr-10`). */
  expandedListPaddingRight: ExpandedListPaddingRight;
  /** Bottom inset applied to the row list while expanded, as a Tailwind
   * spacing token (e.g. `pb-7`). */
  expandedListPaddingBottom: ExpandedListPaddingBottom;
  /** Left inset applied to the row list while expanded, as a Tailwind
   * spacing token (e.g. `pl-10`). */
  expandedListPaddingLeft: ExpandedListPaddingLeft;
  /** Overrides the panel's background color while expanded. Empty string
   * uses the caller's resolved opaque fallback surface when supplied, then
   * falls back to the collapsed panel color. This preserves visible paint if
   * a browser temporarily drops the backdrop-filter compositor surface. */
  expandedListBackgroundColor: string;
  /** Opacity of the expanded panel's *background color layer*, not the panel
   * element. Kept below 1 by default so the always-on backdrop blur remains
   * visible through the fixed-size inner glass layer; opening and closing
   * animate only its clipping wrapper's height and never the panel opacity. */
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
  /** STAGE-04 — ms for the presentation's own open transition. Glass grows
   * the persistent compact panel to expandedPanelHeightPercent; cardFlip
   * rotates the active card. Decoupled from panelCollapseDurationMs below. */
  panelExpandDurationMs: number;
  /** STAGE-04 — familiar CSS-style easing name for the panel's own open
   * transition, independent of panelCollapseEasing. */
  panelExpandEasing: MobilePinnedArticleSectionEasing;
  /** Percentage of the panel-open duration that overlaps the first row's
   * entrance. `0` preserves the serial panel-then-rows sequence; `100`
   * starts the first row with the panel. */
  panelExpandFirstRowOverlapPercent: number;
  /** Extra ms before the first row starts fading in. At 0% panel/row overlap
   * it begins after the panel transition; otherwise it is added to the
   * calculated overlap position. */
  rowFadeInDelayMs: number;
  /** STAGE-05 — ms for one row's own opacity fade-in (no scale/transform). */
  rowFadeInDurationMs: number;
  /** Percentage of a row's entrance duration that overlaps the next row.
   * `0` is sequential; `100` starts every row together. */
  rowFadeInOverlapPercent: number;
  /** STAGE-05 — familiar CSS-style easing name for each row's fade-in. */
  rowFadeInEasing: MobilePinnedArticleSectionEasing;
  /** STAGE-06 — ms for ONE row's own opacity fade-out when the full list
   * closes (selection, Escape, or backdrop; no scale/transform). Applies to
   * every row currently on screen — all stay at their original position
   * while fading. */
  rowFadeOutDurationMs: number;
  /** Percentage of a row's exit duration that overlaps the next row's exit.
   * `0` is sequential; `100` starts every row together. */
  rowFadeOutOverlapPercent: number;
  /** STAGE-06 — familiar CSS-style easing name for each row's fade-out. */
  rowFadeOutEasing: MobilePinnedArticleSectionEasing;
  /** Percentage of the row-exit cascade that overlaps the panel close.
   * `0` starts closing after the final row; `100` starts closing with the
   * first row. Completion waits for both motions. */
  panelCollapseFirstRowOverlapPercent: number;
  /** Extra ms after the overlap schedule before the panel starts closing. */
  panelCollapseDelayMs: number;
  /** STAGE-07 — ms for the panel's own close transition. It can overlap the
   * row-exit cascade according to panelCollapseFirstRowOverlapPercent, and
   * the close finishes only once both motions have completed. The carousel
   * behind it settles within the first 320ms of this interval. It directly
   * drives the real CSS transition (`.panel`/`.carousel` via
   * --mobile-pinned-panel-collapse-ms), not just a JS-side timer. */
  panelCollapseDurationMs: number;
  /** STAGE-07 — familiar CSS-style easing name for the panel's own close
   * transition, independent of panelExpandEasing. Also used for the
   * short list's own post-collapse settle cross-fade (listSettleDurationMs
   * below) — that settle is triggered by the same closePanel() call that
   * starts this close transition, so the two read as one motion. */
  panelCollapseEasing: MobilePinnedArticleSectionEasing;
  /** Ms for the collapsed short list's own post-settle fade/slide-in
   * whenever its windowed selection changes — an always-on feature
   * independent of the expand/collapse sequence above (it also fires on
   * plain short-list taps and carousel swipes), left untouched by this
   * config's expand/collapse simplification. Paired with
   * panelCollapseEasing (see that field's own doc comment). */
  listSettleDurationMs: number;
};

export const DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG = {
  visibleRowsLargePhone: 5,
  // Was 4 (operator-reported bug: the short list showed 4 article rows plus
  // "Expand list" instead of the intended 3-row cap on short-viewport
  // phones). 3 matches visibleRowsLargePhone's own cap.
  visibleRowsSmallPhone: 3,
  smallPhoneMaxHeightPx: 700,
  expandedPanelHeightPercent: 76,
  carouselHeightPercent: 62,
  carouselGutterX: 'px-7',
  listHeightPercent: 38,
  panelOpacity: 0.82,
  peekHeightSvh: 15,
  peekOutlineModeEnabled: false,
  // Re-tuned for this field's new margin semantics (see its own doc
  // comment) — 100 was a leftover from the old ramp-denominator formula,
  // where a bigger number only widened how early the outline STARTED
  // easing, never when it finished (that always landed at the exact
  // geometric top === scrollY instant, the operator-reported bug this
  // field's rewrite fixes). Under the new "how close counts as arrived"
  // meaning, 100 (a full viewport height of margin) would flip to fully
  // revealed almost as soon as any part of the section entered the
  // viewport at all, defeating the outline effect entirely. 30 — a bit
  // past peekHeightSvh's own 15 — gives real slack against scroll-snap/
  // toolbar-resize slop without dissolving the outline prematurely.
  peekFocusRangeSvh: 30,
  // 0.8 shortens the per-article page travel by 20% while keeping every
  // scroll, snap, restoration, and swipe calculation on the same scale.
  // Set to 1 for strict 1:1 page-to-coverflow travel.
  scrollEffortMultiplier: 0.8,
  scrollDrivenNavigationEnabled: false,
  fullListPresentation: 'glassPanel',
  // px-10/py-7 split evenly across their two edges — same rendered padding
  // as before segregation, just addressable per-side now.
  expandedListPaddingTop: 'pt-7',
  expandedListPaddingRight: 'pr-14',
  expandedListPaddingBottom: 'pb-7',
  expandedListPaddingLeft: 'pl-10',
  expandedListBackgroundColor: '',
  // Keep enough translucency to reveal the fixed-size blur layer while the
  // resolved fallback color preserves the panel silhouette if Chromium drops
  // a filtered frame.
  expandedListBackgroundOpacity: 0,
  expandedListBackdropBlurPx: 40,
  expandedCarouselBehindOpacity: 0.72,
  expandedForcesMaxBackgroundDarken: false,
  // The persistent surface's top edge travels from the compact-list boundary
  // to the expanded boundary. A symmetric curve makes this read as one object
  // growing upward rather than a fast reveal.
  panelExpandDurationMs: 720,
  panelExpandEasing: 'easeInOut',
  panelExpandFirstRowOverlapPercent: 20,
  // A short settle beat makes the completed surface legible before its
  // content starts, without turning an intentional sequence into a pause.
  rowFadeInDelayMs: 10,
  // Overlapped row entrances keep the cascade legible without making every
  // article wait for the previous one to finish completely.
  rowFadeInDurationMs: 150,
  rowFadeInOverlapPercent: 70,
  rowFadeInEasing: 'easeInOut',
  // Collapse is the exact temporal inverse of entrance: rows leave from top
  // to bottom before the glass panel moves. This must stay non-zero; zero
  // bypasses the transitionend gate and makes the panel appear to snap shut.
  rowFadeOutDurationMs: 180,
  rowFadeOutOverlapPercent: 70,
  rowFadeOutEasing: 'easeOut',
  panelCollapseFirstRowOverlapPercent: 50,
  // Start the spatial return in the same completion turn as the final row's
  // fade. Holding an empty glass surface here reads as a flicker or a brief
  // disappearance before the actual collapse, not as an intentional pause.
  panelCollapseDelayMs: 20,
  // Return the same surface to its compact height as the visual reverse of
  // its expansion.
  panelCollapseDurationMs: 560,
  panelCollapseEasing: 'easeInOut',
  // Leave a short beat for the now-visible short list before the CoverFlow
  // selection commits and moves behind it.
  listSettleDurationMs: 160,
} satisfies MobilePinnedArticleSectionConfig;

function normalizeEasing(
  value: unknown,
  fallback: MobilePinnedArticleSectionEasing,
): MobilePinnedArticleSectionEasing {
  if (typeof value !== 'string') return fallback;
  if (MOTION_EASING_KEYS.includes(value as MobilePinnedArticleSectionEasing)) {
    return value as MobilePinnedArticleSectionEasing;
  }
  // Keep previously persisted values functional while exposing only the
  // familiar names above going forward.
  const legacyEasings: Record<string, MobilePinnedArticleSectionEasing> = {
    standard: 'ease',
    expressive: 'easeOut',
    viscous: 'easeOut',
    gentle: 'easeOut',
    gaussian: 'easeInOut',
  };
  return legacyEasings[value] ?? fallback;
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
    carouselGutterX: CAROUSEL_GUTTER_X_TOKENS.includes(base.carouselGutterX)
      ? base.carouselGutterX
      : DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.carouselGutterX,
    listHeightPercent: 100 - carouselHeightPercent,
    panelOpacity: clamp(base.panelOpacity, 0, 1),
    peekHeightSvh: clamp(base.peekHeightSvh, 4, 24),
    peekOutlineModeEnabled: base.peekOutlineModeEnabled === true,
    peekFocusRangeSvh: clamp(base.peekFocusRangeSvh, 4, 100),
    scrollEffortMultiplier: clamp(base.scrollEffortMultiplier, 0.5, 2),
    scrollDrivenNavigationEnabled: base.scrollDrivenNavigationEnabled === true,
    fullListPresentation: base.fullListPresentation === 'cardFlip'
      ? 'cardFlip'
      : 'glassPanel',
    expandedListPaddingTop: EXPANDED_LIST_PADDING_TOP_TOKENS.includes(base.expandedListPaddingTop)
      ? base.expandedListPaddingTop
      : DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.expandedListPaddingTop,
    expandedListPaddingRight: EXPANDED_LIST_PADDING_RIGHT_TOKENS.includes(base.expandedListPaddingRight)
      ? base.expandedListPaddingRight
      : DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.expandedListPaddingRight,
    expandedListPaddingBottom: EXPANDED_LIST_PADDING_BOTTOM_TOKENS.includes(base.expandedListPaddingBottom)
      ? base.expandedListPaddingBottom
      : DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.expandedListPaddingBottom,
    expandedListPaddingLeft: EXPANDED_LIST_PADDING_LEFT_TOKENS.includes(base.expandedListPaddingLeft)
      ? base.expandedListPaddingLeft
      : DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.expandedListPaddingLeft,
    expandedListBackgroundColor: typeof base.expandedListBackgroundColor === 'string'
      ? base.expandedListBackgroundColor.trim()
      : '',
    expandedListBackgroundOpacity: clamp(base.expandedListBackgroundOpacity, 0, 1),
    expandedListBackdropBlurPx: Math.round(clamp(base.expandedListBackdropBlurPx, 0, 40)),
    expandedCarouselBehindOpacity: clamp(base.expandedCarouselBehindOpacity, 0, 1),
    expandedForcesMaxBackgroundDarken: base.expandedForcesMaxBackgroundDarken !== false,
    panelExpandDurationMs: Math.round(clamp(base.panelExpandDurationMs, 0, 1000)),
    panelExpandEasing: normalizeEasing(
      base.panelExpandEasing, DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.panelExpandEasing,
    ),
    panelExpandFirstRowOverlapPercent: Math.round(
      clamp(base.panelExpandFirstRowOverlapPercent, 0, 100),
    ),
    rowFadeInDelayMs: Math.round(clamp(base.rowFadeInDelayMs, 0, 1000)),
    rowFadeInDurationMs: Math.round(clamp(base.rowFadeInDurationMs, 0, 1000)),
    rowFadeInOverlapPercent: Math.round(clamp(base.rowFadeInOverlapPercent, 0, 100)),
    rowFadeInEasing: normalizeEasing(
      base.rowFadeInEasing, DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.rowFadeInEasing,
    ),
    rowFadeOutDurationMs: Math.round(clamp(base.rowFadeOutDurationMs, 0, 1000)),
    rowFadeOutOverlapPercent: Math.round(clamp(base.rowFadeOutOverlapPercent, 0, 100)),
    rowFadeOutEasing: normalizeEasing(
      base.rowFadeOutEasing, DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.rowFadeOutEasing,
    ),
    panelCollapseFirstRowOverlapPercent: Math.round(
      clamp(base.panelCollapseFirstRowOverlapPercent, 0, 100),
    ),
    panelCollapseDelayMs: Math.round(clamp(base.panelCollapseDelayMs, 0, 1000)),
    panelCollapseDurationMs: Math.round(clamp(base.panelCollapseDurationMs, 0, 1000)),
    panelCollapseEasing: normalizeEasing(
      base.panelCollapseEasing, DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.panelCollapseEasing,
    ),
    listSettleDurationMs: Math.round(clamp(base.listSettleDurationMs, 0, 1000)),
  };
}
