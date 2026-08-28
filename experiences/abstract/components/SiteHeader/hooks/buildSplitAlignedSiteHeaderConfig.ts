import { SPLIT_ALIGNED_NAV_CONTENT_GAP_PX, type SiteHeaderConfig } from '../config/registered';

/**
 * The one real implementation of "turn on split-aligned nav, pin the
 * shared navContentGapPx explicitly" — near-identical override object
 * constructed independently on about.tsx, contact.tsx, and
 * posts-lab/[slug].tsx before this helper existed (PLAN-DEDUPLICATE-PAGE-
 * SHELL-LOGIC.md §4). `overrides` layers on top for a page's own
 * additional needs (e.g. contact.tsx/posts-lab's own
 * navAlignedToPageContainer: false).
 */
export function buildSplitAlignedSiteHeaderConfig(
  base: SiteHeaderConfig,
  overrides?: Partial<SiteHeaderConfig>,
): SiteHeaderConfig {
  return {
    ...base,
    navAlignedToSplitEnabled: true,
    navContentGapPx: SPLIT_ALIGNED_NAV_CONTENT_GAP_PX,
    ...overrides,
  };
}
