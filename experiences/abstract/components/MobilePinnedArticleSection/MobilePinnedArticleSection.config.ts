import { clamp } from '../../../../helpers/clamp';

export const MOBILE_PINNED_ARTICLE_SECTION_SCOPE_ID =
  'MobilePinnedArticleSection/layout' as const;

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
} satisfies MobilePinnedArticleSectionConfig;

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
  };
}
