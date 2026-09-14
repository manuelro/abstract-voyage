import { clamp } from '../../../../helpers/clamp';
import {
  PADDING_X_OPTIONS,
  PADDING_Y_OPTIONS,
  type PaddingXClass,
  type PaddingYClass,
} from '../../../../components/tailwindSpacingScale';
import type { CtaButtonMotionEasing } from '../../../../components/CtaButton/config/registered';

// Same shared named-easing catalog CtaButton/AboutTimeline/Panel/CardStack
// etc. all already draw from (CTA_BUTTON_MOTION_EASINGS,
// components/CtaButton/config/registered.ts) — no bespoke cubic-bezier
// tuples here, so the settings panel can render these as ordinary
// `kind: 'enum'` fields instead of hiding untunable raw numbers.
const MOTION_EASING_KEYS: readonly CtaButtonMotionEasing[] = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle', 'gaussian',
];

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
  /** STAGE-04 — ms for the panel's own open transition (height 0 -> the
   * expanded percent). Decoupled from panelCollapseDurationMs below — the
   * two used to share one duration/CSS var despite being visually and
   * semantically distinct motions (opening vs. closing). */
  panelExpandDurationMs: number;
  /** STAGE-04 — named easing (CTA_BUTTON_MOTION_EASINGS) for the panel's own
   * open transition, independent of panelCollapseEasing. */
  panelExpandEasing: CtaButtonMotionEasing;
  /** STAGE-04/05 boundary — ms held after the panel's own open transition
   * has genuinely finished (confirmed via its real `transitionend`, not a
   * duration guess) before the first row starts fading in. 0 = rows start
   * the instant the panel finishes opening. */
  rowFadeInDelayMs: number;
  /** STAGE-05 — ms for ONE row's own opacity fade-in (no scale/transform).
   * There is no separate stagger field: the cascade is a strict chain
   * reaction — row N starts exactly when row N-1 finishes (delay = N *
   * rowFadeInDurationMs) — so this single number fully determines both an
   * individual row's fade and the whole cascade's total length
   * (rowCount * rowFadeInDurationMs). */
  rowFadeInDurationMs: number;
  /** STAGE-05 — named easing (CTA_BUTTON_MOTION_EASINGS) for each row's
   * fade-in, independent of rowFadeOutEasing — entrance and leaving are two
   * distinct motions and may want different curves. */
  rowFadeInEasing: CtaButtonMotionEasing;
  /** STAGE-06 — ms for ONE row's own opacity fade-out once a row is tapped
   * to select a different article (no scale/transform). Applies to every
   * row currently on screen — all of them stay at their own original
   * position while fading; the underlying row order is swapped to the
   * final selection only once every row is fully invisible. Chain reaction,
   * same mechanism as rowFadeInDurationMs: row N starts fading out exactly
   * when row N-1 finishes, item 1 first, the LAST row last — its own real
   * `transitionend` is what gates STAGE-07 (the panel starting to close),
   * not a computed duration. */
  rowFadeOutDurationMs: number;
  /** STAGE-06 — named easing (CTA_BUTTON_MOTION_EASINGS) for each row's
   * fade-out, independent of rowFadeInEasing. */
  rowFadeOutEasing: CtaButtonMotionEasing;
  /** STAGE-06/07 boundary — ms held after the LAST row's fade-out has
   * genuinely finished (confirmed via its real `transitionend`) before the
   * panel starts closing. 0 = the panel starts closing the instant the last
   * row disappears. */
  panelCollapseDelayMs: number;
  /** STAGE-07 — ms for the panel's own close transition: after selecting an
   * article (and panelCollapseDelayMs has elapsed), the whole panel fades
   * out (opacity 1 -> 0) rather than visibly shrinking, then fades back in
   * (opacity 0 -> 1) once the final short list is ready to reveal. This
   * same duration also governs the carousel card behind the panel fading
   * back to full opacity, so both halves of that motion stay in sync, and
   * is reused as the wait before the deferred CoverFlow translate fires.
   * Directly drives the real CSS transition (styles.module.css's
   * `.panel`/`.carousel` — via --mobile-pinned-panel-collapse-ms), not just
   * a JS-side timer. */
  panelCollapseDurationMs: number;
  /** STAGE-07 — named easing (CTA_BUTTON_MOTION_EASINGS) for the panel's own
   * close transition, independent of panelExpandEasing. Also used for the
   * short list's own post-collapse settle cross-fade (listSettleDurationMs
   * below) — that settle is triggered by the same closePanel() call that
   * starts this close transition, so the two read as one motion. */
  panelCollapseEasing: CtaButtonMotionEasing;
  /** Ms for the collapsed short list's own post-settle fade/slide-in
   * whenever its windowed selection changes — an always-on feature
   * independent of the expand/collapse sequence above (it also fires on
   * plain short-list taps and carousel swipes), left untouched by this
   * config's expand/collapse simplification. Paired with
   * panelCollapseEasing (see that field's own doc comment). */
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
  expandedListBackgroundOpacity: 1,
  expandedListBackdropBlurPx: 32,
  expandedCarouselBehindOpacity: 0.5,
  expandedForcesMaxBackgroundDarken: true,
  panelExpandDurationMs: 1000,
  // 'expressive' resolves to cubic-bezier(0.22, 1, 0.36, 1) — the exact
  // curve every one of these four fields already used as a raw tuple.
  panelExpandEasing: 'expressive',
  rowFadeInDelayMs: 200,
  rowFadeInDurationMs: 740,
  rowFadeInEasing: 'expressive',
  rowFadeOutDurationMs: 930,
  rowFadeOutEasing: 'expressive',
  panelCollapseDelayMs: 480,
  panelCollapseDurationMs: 1000,
  panelCollapseEasing: 'expressive',
  listSettleDurationMs: 300,
} satisfies MobilePinnedArticleSectionConfig;

function normalizeEasing(
  value: CtaButtonMotionEasing,
  fallback: CtaButtonMotionEasing,
): CtaButtonMotionEasing {
  return MOTION_EASING_KEYS.includes(value) ? value : fallback;
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
    panelExpandDurationMs: Math.round(clamp(base.panelExpandDurationMs, 0, 1000)),
    panelExpandEasing: normalizeEasing(
      base.panelExpandEasing, DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.panelExpandEasing,
    ),
    rowFadeInDelayMs: Math.round(clamp(base.rowFadeInDelayMs, 0, 1000)),
    rowFadeInDurationMs: Math.round(clamp(base.rowFadeInDurationMs, 0, 1000)),
    rowFadeInEasing: normalizeEasing(
      base.rowFadeInEasing, DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.rowFadeInEasing,
    ),
    rowFadeOutDurationMs: Math.round(clamp(base.rowFadeOutDurationMs, 0, 1000)),
    rowFadeOutEasing: normalizeEasing(
      base.rowFadeOutEasing, DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.rowFadeOutEasing,
    ),
    panelCollapseDelayMs: Math.round(clamp(base.panelCollapseDelayMs, 0, 1000)),
    panelCollapseDurationMs: Math.round(clamp(base.panelCollapseDurationMs, 0, 1000)),
    panelCollapseEasing: normalizeEasing(
      base.panelCollapseEasing, DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG.panelCollapseEasing,
    ),
    listSettleDurationMs: Math.round(clamp(base.listSettleDurationMs, 0, 1000)),
  };
}
