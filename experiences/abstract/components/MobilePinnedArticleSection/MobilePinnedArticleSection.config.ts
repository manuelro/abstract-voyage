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
  /** The opt-in alternative to the expanded glass panel. `cardFlip` rotates
   * the active carousel surface 190 degrees and renders the full list on its
   * reverse face; `glassPanel` preserves the established bottom-sheet view. */
  fullListPresentation: MobilePinnedArticleListPresentation;
  /** Horizontal inset applied to the row list while expanded, as a Tailwind
   * spacing token (e.g. `px-6`). */
  expandedListPaddingX: ExpandedListPaddingX;
  /** Vertical inset applied to the row list while expanded, as a Tailwind
   * spacing token (e.g. `py-0`). */
  expandedListPaddingY: ExpandedListPaddingY;
  /** Overrides the panel's background color while expanded. Empty string
   * inherits the collapsed panel's own color (`panelColor` prop). */
  expandedListBackgroundColor: string;
  /** Opacity of the expanded panel's *background color layer*, not the panel
   * element. Kept below 1 by default so the always-on backdrop blur remains
   * visible while the persistent surface resizes; opening and closing animate
   * height only and never animate the panel element's `opacity`. */
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
  /** STAGE-06 — ms for ONE row's own opacity fade-out when the full list
   * closes (selection, Escape, or backdrop; no scale/transform). Applies to
   * every row currently on screen — all stay at their original position
   * while fading. Chain reaction, same mechanism as rowFadeInDurationMs:
   * row N starts exactly when row N-1 finishes, item 1 first, the LAST row
   * last — its own real `transitionend` gates STAGE-07 (panel closing), not
   * a computed duration. */
  rowFadeOutDurationMs: number;
  /** STAGE-06 — named easing (CTA_BUTTON_MOTION_EASINGS) for each row's
   * fade-out, independent of rowFadeInEasing. */
  rowFadeOutEasing: CtaButtonMotionEasing;
  /** STAGE-06/07 boundary — ms held after the LAST row's fade-out has
   * genuinely finished (confirmed via its real `transitionend`) before the
   * panel starts closing. 0 = the panel starts closing the instant the last
   * row disappears. */
  panelCollapseDelayMs: number;
  /** STAGE-07 — ms for the panel's own close transition: only after the last
   * row has faded does the persistent glass surface return to its compact
   * height (or the card rotate to its front face). This should normally mirror
   * panelExpandDurationMs, so opening and closing are one reversible spatial
   * motion. The same duration governs the carousel card behind it returning
   * to full opacity and is the wait before the deferred CoverFlow translate.
   * It directly drives the real CSS transition (`.panel`/`.carousel` via
   * --mobile-pinned-panel-collapse-ms), not just a JS-side timer. */
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
  fullListPresentation: 'glassPanel',
  expandedListPaddingX: 'px-14',
  expandedListPaddingY: 'py-7',
  expandedListBackgroundColor: '',
  // An opaque color layer would conceal the backdrop completely, making a
  // configured blur indistinguishable from no blur. This is background paint
  // alpha only — the panel element itself stays fully opaque throughout both
  // directions of its height-only motion.
  expandedListBackgroundOpacity: 0.72,
  expandedListBackdropBlurPx: 32,
  expandedCarouselBehindOpacity: 0.5,
  expandedForcesMaxBackgroundDarken: true,
  // The persistent surface's top edge travels from the compact-list boundary
  // to the expanded boundary. Give that distance enough time to register as
  // one object growing upward; `gaussian` centers velocity in the travel.
  panelExpandDurationMs: 800,
  // `gaussian` is a symmetric ease-in-out curve, appropriate for a large
  // change in the surface's visible height.
  panelExpandEasing: 'gaussian',
  // A short settle beat makes the completed surface legible before its
  // content starts, without turning an intentional sequence into a pause.
  rowFadeInDelayMs: 80,
  // Rows are a strict chain: this is both each row's fade duration and the
  // gap before the next row begins. 110ms is long enough to read as a true
  // cascade while keeping a six-row list below three quarters of a second.
  rowFadeInDurationMs: 110,
  rowFadeInEasing: 'gaussian',
  // Collapse is the exact temporal inverse of entrance: rows leave from top
  // to bottom before the glass panel moves. This must stay non-zero; zero
  // bypasses the transitionend gate and makes the panel appear to snap shut.
  rowFadeOutDurationMs: 110,
  rowFadeOutEasing: 'gaussian',
  // Start the spatial return in the same completion turn as the final row's
  // fade. Holding an empty glass surface here reads as a flicker or a brief
  // disappearance before the actual collapse, not as an intentional pause.
  panelCollapseDelayMs: 0,
  // Return the same surface to its compact height as the visual reverse of
  // its expansion.
  panelCollapseDurationMs: 1000,
  panelCollapseEasing: 'gaussian',
  // Leave a short beat for the now-visible short list before the CoverFlow
  // selection commits and moves behind it.
  listSettleDurationMs: 160,
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
    fullListPresentation: base.fullListPresentation === 'cardFlip'
      ? 'cardFlip'
      : 'glassPanel',
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
