import type { PolymorphicLayoutConfig } from '../PolymorphicLayout.config';
import type { SiteHeaderConfig } from './config/registered';

// Private copy, not imported from components/PolymorphicLayout.tsx — that
// module now imports buildEffectiveSiteHeaderConfig below (to keep its own
// call site as the one real implementation of the merge, not a duplicate),
// so importing joinClasses back from there would be a circular module
// dependency. Trivial and identical to PolymorphicLayout.tsx's own private
// copy; not worth a shared-utility file for 3 lines used by exactly two
// call sites that can't import each other.
function joinClasses(...classes: ReadonlyArray<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
/** Builds the header's own top content-container assembly —
 * headerContentLayoutOwnedByPage: true plus the four joined className
 * fields — from a page's own PolymorphicLayoutConfig instance, mirroring
 * pages/posts-lab/[slug].tsx's own former effectiveSiteHeaderConfig
 * exactly (now the one real implementation, not a page-local copy). Was
 * PolymorphicLayout.tsx's own private buildHeaderContentClassNames before
 * PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md §2.1 moved it here, unchanged,
 * alongside buildEffectiveSiteHeaderConfig below (the two were always one
 * conceptual unit — PolymorphicLayout.tsx's own former effectiveSiteHeaderConfig
 * merge). */
function buildHeaderContentClassNames(config: PolymorphicLayoutConfig) {
  return {
    headerLeftSegmentClassName: joinClasses(
      config.headerLeftSegmentAlign,
      config.headerLeftSegmentAlignWide,
      config.headerLeftSegmentAlignLg,
      config.headerLeftSegmentVerticalAlign,
      config.headerLeftSegmentVerticalAlignWide,
      config.headerLeftSegmentVerticalAlignLg,
    ),
    headerRightSegmentClassName: joinClasses(
      config.headerRightSegmentAlign,
      config.headerRightSegmentAlignWide,
      config.headerRightSegmentAlignLg,
      config.headerRightSegmentVerticalAlign,
      config.headerRightSegmentVerticalAlignWide,
      config.headerRightSegmentVerticalAlignLg,
    ),
    headerLeftContentClassName: joinClasses(
      config.headerLeftContentPaddingTop,
      config.headerLeftContentPaddingTopWide,
      config.headerLeftContentPaddingTopLg,
      config.headerLeftContentPaddingRight,
      config.headerLeftContentPaddingRightWide,
      config.headerLeftContentPaddingRightLg,
      config.headerLeftContentPaddingBottom,
      config.headerLeftContentPaddingBottomWide,
      config.headerLeftContentPaddingBottomLg,
      config.headerLeftContentPaddingLeft,
      config.headerLeftContentPaddingLeftWide,
      config.headerLeftContentPaddingLeftLg,
      config.headerLeftContentMarginTop,
      config.headerLeftContentMarginTopWide,
      config.headerLeftContentMarginTopLg,
      config.headerLeftContentMarginRight,
      config.headerLeftContentMarginRightWide,
      config.headerLeftContentMarginRightLg,
      config.headerLeftContentMarginBottom,
      config.headerLeftContentMarginBottomWide,
      config.headerLeftContentMarginBottomLg,
      config.headerLeftContentMarginLeft,
      config.headerLeftContentMarginLeftWide,
      config.headerLeftContentMarginLeftLg,
      config.headerLeftInnerAlign,
      config.headerLeftInnerAlignWide,
      config.headerLeftInnerAlignLg,
      config.headerLeftContentWidth !== 'auto' ? `w-full ${config.headerLeftContentWidth}` : '',
      config.headerLeftContentWidthWide !== 'auto' ? `w-full ${config.headerLeftContentWidthWide}` : '',
      config.headerLeftContentWidthLg !== 'auto' ? `w-full ${config.headerLeftContentWidthLg}` : '',
    ),
    headerRightContentClassName: joinClasses(
      config.headerRightContentPaddingTop,
      config.headerRightContentPaddingTopWide,
      config.headerRightContentPaddingTopLg,
      config.headerRightContentPaddingRight,
      config.headerRightContentPaddingRightWide,
      config.headerRightContentPaddingRightLg,
      config.headerRightContentPaddingBottom,
      config.headerRightContentPaddingBottomWide,
      config.headerRightContentPaddingBottomLg,
      config.headerRightContentPaddingLeft,
      config.headerRightContentPaddingLeftWide,
      config.headerRightContentPaddingLeftLg,
      config.headerRightContentMarginTop,
      config.headerRightContentMarginTopWide,
      config.headerRightContentMarginTopLg,
      config.headerRightContentMarginRight,
      config.headerRightContentMarginRightWide,
      config.headerRightContentMarginRightLg,
      config.headerRightContentMarginBottom,
      config.headerRightContentMarginBottomWide,
      config.headerRightContentMarginBottomLg,
      config.headerRightContentMarginLeft,
      config.headerRightContentMarginLeftWide,
      config.headerRightContentMarginLeftLg,
      config.headerRightInnerAlign,
      config.headerRightInnerAlignWide,
      config.headerRightInnerAlignLg,
      config.headerRightContentWidth !== 'auto' ? config.headerRightContentWidth : '',
      config.headerRightContentWidthWide !== 'auto' ? config.headerRightContentWidthWide : '',
      config.headerRightContentWidthLg !== 'auto' ? config.headerRightContentWidthLg : '',
    ),
  };
}

/**
 * Turns a page's own PolymorphicLayoutConfig header* fields (segment
 * alignment, content padding/margin/width, inner-align — dozens of
 * per-breakpoint-tiered fields, still owned by that config type unchanged,
 * per PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md's own non-negotiable "no config
 * schema changes" constraint) into the concrete SiteHeaderConfig
 * overrides that component actually reads. Was PolymorphicLayout.tsx's own
 * internal buildHeaderContentClassNames + effectiveSiteHeaderConfig merge
 * (`:212-295`/`:731-747` before this plan) — moved here so a page
 * constructing its own <SiteHeader> (via PolymorphicLayout's
 * `header` render-prop) can call the exact same logic PolymorphicLayout
 * used to run for it automatically, rather than losing it.
 * `PolymorphicLayout` itself now calls this too (not a second,
 * independently-drifting copy of the merge).
 *
 * Also folds in `SplitColumnPageShell.tsx`'s own former `splitBandSide`
 * override (`effectiveSiteHeaderConfig = { ...normalizedSiteHeaderConfig,
 * splitBandSide: normalizedSplitColumnLayoutConfig.wideColumnSide }`,
 * unconditionally applied by that component for every consumer before this
 * plan) — a gap this plan's own §1 audit missed (it only accounted for
 * `HeaderSlotProps`'s own fields, not this second, separate merge living
 * one level up). `SiteHeaderConfig.splitBandSide` and
 * `PolymorphicLayoutConfig.wideColumnSide` are structurally the same
 * 38%/62% choice, independently settable on two different config panels
 * ("Site header & navigation" and "Polymorphic Layout") — without this
 * override, editing one without the other would silently desync the
 * header's own split-band side from the body's real column layout, the
 * exact "two things that can silently drift" class of bug this codebase's
 * own history keeps flagging (see the original comment, preserved at
 * components/SplitColumnPageShell.tsx's own git history). Confirmed inert
 * today (every current PolymorphicLayout page's own default `splitBandSide`
 * and `wideColumnSide` both resolve to `'right'`), but not provably so
 * going forward — this override, not the page's own raw `splitBandSide`
 * field, is what makes that guarantee structural again.
 */
export function buildEffectiveSiteHeaderConfig(
  siteHeaderConfig: SiteHeaderConfig,
  polymorphicLayoutConfig: PolymorphicLayoutConfig,
): SiteHeaderConfig {
  return {
    ...siteHeaderConfig,
    headerContentLayoutOwnedByPage: true,
    // Unconditional, not a page-configurable field — buildHeaderContentClassNames
    // above always supplies a complete, config-driven headerLeftContentClassName
    // (including padding-right) for every PolymorphicLayout consumer, so the
    // legacy inline padding-right this flag gates (SiteHeader.tsx's
    // own logoAlignedToSplitEnabled + logoContentGapPaddingEnabled branch,
    // sourced from navContentGapPx) is never wanted alongside it — an inline
    // style always wins over a class regardless of specificity or the
    // class's own value, so leaving this page-configurable (as it briefly
    // was) makes it possible for a page to correctly set
    // headerLeftContentPaddingRight* and still see zero visible effect,
    // exactly the bug this line exists to make structurally impossible.
    logoContentGapPaddingEnabled: false,
    splitBandSide: polymorphicLayoutConfig.wideColumnSide,
    ...buildHeaderContentClassNames(polymorphicLayoutConfig),
  };
}
