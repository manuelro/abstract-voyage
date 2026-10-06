import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config';
import { applyPolymorphicLayoutAllSizesUpdate } from '../experiences/abstract/components/PolymorphicLayout.allSizes';
import { ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG as SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG } from '../experiences/abstract/components/PolymorphicLayout.pageConfigs';
import {
  DEFAULT_ABOUT_TIMELINE_CONFIG,
  normalizeAboutTimelineConfig,
  type AboutTimelineConfig,
} from '../experiences/about/components/AboutTimeline.config';
import type { AboutMobileAccordionConfig } from '../experiences/about/components/AboutMobileAccordion.config';
import { DEFAULT_EDITORIAL_ACCORDION_ITEM_CONFIG } from '../experiences/about/components/EditorialAccordionItem.config';
import {
  DEFAULT_CARD_APPEARANCE_CONFIG,
  normalizeCardAppearanceConfig,
  type CardAppearanceConfig,
} from '../experiences/abstract/components/Card/config/appearance';
import {
  normalizeTailwindToken,
  type TailwindTokenValue,
} from '../components/Panel/config/tailwindFields';
import { DEFAULT_COVER_FLOW_CONFIG } from '../experiences/abstract/components/CoverFlow/CoverFlow.config';
import type { CtaButtonMotionEasing } from '../components/CtaButton/config/registered';

type BorderTopWidthClass = TailwindTokenValue<'borderTopWidth'>;
type GapClass = TailwindTokenValue<'gap'>;
type MarginTopClass = TailwindTokenValue<'marginTop'>;
type PaddingBottomClass = TailwindTokenValue<'paddingBottom'>;
type PaddingLeftClass = TailwindTokenValue<'paddingLeft'>;
type PaddingLeftClassMd = TailwindTokenValue<'paddingLeft', 'md'>;
type PaddingLeftClassLg = TailwindTokenValue<'paddingLeft', 'lg'>;
type PaddingTopClass = TailwindTokenValue<'paddingTop'>;
type PaddingXClass = TailwindTokenValue<'paddingX'>;
type PaddingYClass = TailwindTokenValue<'paddingY'>;
type FontSizeClass = TailwindTokenValue<'fontSize'>;
type FontWeightClass = TailwindTokenValue<'fontWeight'>;

export type AbstractPagePresentationMode = 'splitColumn' | 'classic';
export type AbstractNarrowColumnStackHorizontalAlign = 'start' | 'center' | 'end' | 'stretch';
export type AbstractNarrowColumnStackVerticalAlign = 'start' | 'center' | 'end';

/**
 * Page-owned settings for abstract.tsx's own top-level presentation choice
 * — not any single component's concern, so it gets its own small scope,
 * same pattern as about.config.ts's AboutPageLayoutConfig.
 */
export type AbstractPageLayoutConfig = {
  /** 'splitColumn' (default): the new SplitColumnLayout composition — a
   * single-column stacked hero in one column, a single-card
   * Articles/Labs preview in the other (PLAN-HOMEPAGE-IA-LAYOUT.md
   * Section 8.3-8.8). 'classic': today's presentation — the splitRow hero
   * plus the full AbstractJournalLabCollection tabbed section — kept fully
   * working as a live fallback, not just prior art. */
  presentationMode: AbstractPagePresentationMode;
};

export const DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG = {
  presentationMode: 'splitColumn',
} satisfies AbstractPageLayoutConfig;

/** Page-owned structure for the two content regions passed through
 * PolymorphicLayout's narrow-column slot. The region weights are expressed
 * as relative percentages so the pair always consumes the full available
 * height, even while an operator is editing one value independently. */
export type AbstractNarrowColumnStackConfig = {
  topRegionPercent: number;
  bottomRegionPercent: number;
  /** Visually swaps the top and bottom content regions while preserving the
   * named region's own size and alignment settings. The DOM order remains
   * top-then-bottom for stable keyboard and screen-reader navigation. */
  invertOrder: boolean;
  topHorizontalAlign: AbstractNarrowColumnStackHorizontalAlign;
  topVerticalAlign: AbstractNarrowColumnStackVerticalAlign;
  bottomHorizontalAlign: AbstractNarrowColumnStackHorizontalAlign;
  bottomVerticalAlign: AbstractNarrowColumnStackVerticalAlign;
  /** Tablet-only composition. Mobile and desktop continue to use the named
   * top/bottom regions above. */
  tabletFlow: 'vertical' | 'horizontal';
  tabletRegionOrder: 'heroFirst' | 'timelineFirst';
  tabletHeroWeight: number;
  tabletTimelineWeight: number;
  tabletHeroVerticalAlign: AbstractNarrowColumnStackVerticalAlign;
  tabletTimelineVerticalAlign: AbstractNarrowColumnStackVerticalAlign;
  /** Cross-axis alignment of the tablet horizontal pair's own grid row.
   * 'stretch' makes both the Hero and Timeline columns share the row's full
   * height, which is what actually gives tabletHeroVerticalAlign/
   * tabletTimelineVerticalAlign above room to move content within —
   * anything else (start/center/end) sizes each column to its own content
   * height first, so those two fields have no extra space to justify
   * within and read as a no-op. Reuses AbstractNarrowColumnStackHorizontalAlign
   * (not a new type) because it's the same start/center/end/stretch
   * `items-*` set already used for topHorizontalAlign/bottomHorizontalAlign
   * above, just applied to the tablet pair's cross axis instead. */
  tabletPairVerticalAlign: AbstractNarrowColumnStackHorizontalAlign;
};

export type AbstractTimelineContentOrder = 'newest' | 'oldest' | 'titleAsc' | 'titleDesc';

/** Page-owned content selection shared by Abstract's timeline and CoverFlow. */
export type AbstractTimelineContentConfig = {
  visibleItemCount: number;
  order: AbstractTimelineContentOrder;
};

export const DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG = {
  visibleItemCount: 10,
  order: 'newest',
} satisfies AbstractTimelineContentConfig;

/**
 * Single shared ink color for the mobile article list's own row text
 * (pages/abstract.tsx's `<AboutTimeline>` instance inside
 * MobilePinnedArticleSection's `renderList`) — operator ask: rather than
 * two independently-resolved, independently-tinted colors for active vs.
 * inactive rows (the previous behavior, sourced from
 * `resolveTypographyColors`'s own separate bodyColor/highlightColor
 * searches, each free to land on a different hue/lightness), one fixed
 * hue+saturation ink is resolved for contrast against the real background,
 * and active/inactive distinction is carried by OPACITY alone
 * (AboutTimeline's own existing bodyOpacityOverride/highlightOpacityOverride
 * — unchanged, not part of this config). `hue`/`saturation` are the ink's
 * own fixed identity, independent of whatever the background happens to
 * be — unlike `resolveContrastAwareTextColor`'s own hue-preserving search,
 * which derives h/s FROM the background itself. `minLightness`/
 * `minDarkness` bound how far the contrast search is allowed to push in
 * either direction — `minLightness` is the floor when resolving to a
 * light-leaning ink (never dimmer than this), `minDarkness` is the
 * equivalent floor on the DARK side (stored as "how much darkness is
 * guaranteed," converted to a lightness ceiling of `100 - minDarkness`
 * internally) — both prevent the search from drifting into a washed-out
 * middle-gray result even when the target contrast ratio could technically
 * be met there. See PLAN-MOBILE-ARTICLE-LIST-SHARED-INK.md.
 */
export type AbstractMobileArticleListInkConfig = {
  hue: number;
  saturation: number;
  minLightness: number;
  minDarkness: number;
  minContrastRatio: number;
};

export type AbstractFooterConfig = {
  enabled: boolean;
  /** Breakpoint-specific visibility: base/mobile, md/tablet, and lg/desktop. */
  enabledWide: boolean;
  enabledLg: boolean;
  navigationLabel: string;
  /** 'gradientDarkest' (opt-in): backgroundColor is ignored — the footer's
   * background instead tracks scrollGradientDarkestColor (SiteFooter.tsx's
   * own prop), the page's shared scroll-gradient background scaled toward
   * black by its own configured maxDarken. Lets the footer's surface read
   * as "the gradient, fully settled," matching whatever palette is
   * currently live instead of a flat, independently-picked color. */
  backgroundMode: 'transparent' | 'surface' | 'custom' | 'gradientDarkest';
  backgroundColor: string;
  /** Alpha applied to the resolved background color (surface/custom/
   * gradientDarkest) via color-mix() — independent of backgroundMode, so
   * any of those three can also read as a translucent tint over whatever
   * sits behind the footer, rather than only ever fully opaque or fully
   * absent ('transparent' mode). 1 (fully opaque) preserves prior
   * behavior for every existing config exactly. Moot for 'transparent'
   * mode, which paints nothing regardless. */
  backgroundOpacity: number;
  textColorMode: 'derived' | 'custom';
  textColor: string;
  descriptionColor: string;
  textSurfaceOffset: number;
  descriptionSurfaceOffset: number;
  adaptiveInkEnabled: boolean;
  adaptiveInkMaxAmount: number;
  adaptiveInkTargetContrastRatio: number;
  sectionPaddingYClassName: PaddingYClass;
  pageItemGapClassName: GapClass;
  pageItemPaddingYClassName: PaddingYClass;
  pageItemPaddingXClassName: PaddingXClass;
  pageTitlePaddingBottomClassName: PaddingBottomClass;
  pageTitleFontSizeClassName: FontSizeClass;
  pageTitleFontWeightClassName: FontWeightClass;
  pageDescriptionMarginTopClassName: MarginTopClass;
  pageDescriptionPaddingTopClassName: PaddingTopClass;
  pageDescriptionFontSizeClassName: FontSizeClass;
  pageDescriptionFontWeightClassName: FontWeightClass;
  pageLinkBulletEnabled: boolean;
  pageLinkBorderEnabled: boolean;
  pageLinkBorderWidthClassName: BorderTopWidthClass;
  pageLinkBorderColorMode: 'derived' | 'custom';
  pageLinkBorderColor: string;
  pageLinkBorderSurfaceOffset: number;
  pageLinkBorderOpacity: number;
  /** The footer section's own top edge — independent of pageLinkBorderEnabled
   * above (that one draws a rule above each individual nav item; this one
   * draws a single rule along the whole footer's top, the seam between the
   * footer and whatever content precedes it). */
  topBorderEnabled: boolean;
  topBorderWidthClassName: BorderTopWidthClass;
  /** 'derived': backgroundReferenceColor (the footer's own resolved
   * background) shifted by topBorderSurfaceOffset, same primitive
   * pageLinkBorderColorMode's own 'derived' uses. 'gradientDarkest'
   * (opt-in): scrollGradientDarkestColor verbatim (no offset) — the same
   * shared-gradient anchor backgroundMode's own 'gradientDarkest' option
   * reads, so the top border can read as "this gradient's own edge" even
   * when the footer's background itself uses a different mode. */
  topBorderColorMode: 'derived' | 'custom' | 'gradientDarkest';
  topBorderColor: string;
  topBorderSurfaceOffset: number;
  topBorderOpacity: number;
  contactSpaceBeforeClassName: MarginTopClass;
  contactFontSizeClassName: FontSizeClass;
  contactFontWeightClassName: FontWeightClass;
  contactEmailEnabled: boolean;
  contactText: string;
  wordmarkSpaceBeforeClassName: MarginTopClass;
  wordmarkOpacity: number;
  backgroundReturnToLightEnabled: boolean;
  backgroundReturnToLightRangeVh: number;
  backgroundReturnToLightFinalDarken: number;
  abstractEnabled: boolean;
  abstractTitle: string;
  abstractDescription: string;
  aboutEnabled: boolean;
  aboutTitle: string;
  aboutDescription: string;
  journalEnabled: boolean;
  journalTitle: string;
  journalDescription: string;
  contactEnabled: boolean;
  contactTitle: string;
  contactDescription: string;
};

export const DEFAULT_ABSTRACT_MOBILE_ARTICLE_LIST_INK_CONFIG = {
  // Matches the hue family the previous highlightColor search happened to
  // land on (a cool blue) — introducing this config is a close visual
  // match to today, not an arbitrary reset, until an operator retunes it.
  hue: 215,
  saturation: 45,
  minLightness: 88,
  minDarkness: 10,
  minContrastRatio: 4.5,
} satisfies AbstractMobileArticleListInkConfig;

export const DEFAULT_ABSTRACT_FOOTER_CONFIG = {
  enabled: false,
  enabledWide: false,
  enabledLg: false,
  navigationLabel: 'Footer navigation',
  backgroundMode: 'transparent',
  backgroundColor: '#f8fafc',
  backgroundOpacity: 0,
  textColorMode: 'derived',
  textColor: '#111827',
  descriptionColor: '#475569',
  textSurfaceOffset: -0.82,
  descriptionSurfaceOffset: -0.52,
  adaptiveInkEnabled: true,
  adaptiveInkMaxAmount: 0.75,
  adaptiveInkTargetContrastRatio: 3,
  sectionPaddingYClassName: 'py-20',
  pageItemGapClassName: 'gap-7',
  pageItemPaddingYClassName: 'py-0',
  pageItemPaddingXClassName: 'px-7',
  pageTitlePaddingBottomClassName: 'pb-0',
  pageTitleFontSizeClassName: 'text-sm',
  pageTitleFontWeightClassName: 'font-normal',
  pageDescriptionMarginTopClassName: 'mt-1',
  pageDescriptionPaddingTopClassName: 'pt-0',
  pageDescriptionFontSizeClassName: 'text-sm',
  pageDescriptionFontWeightClassName: 'font-normal',
  pageLinkBulletEnabled: false,
  pageLinkBorderEnabled: false,
  pageLinkBorderWidthClassName: 'border-t',
  pageLinkBorderColorMode: 'derived',
  pageLinkBorderColor: '#111827',
  pageLinkBorderSurfaceOffset: -0.35,
  pageLinkBorderOpacity: 0.28,
  topBorderEnabled: true,
  topBorderWidthClassName: 'border-t',
  topBorderColorMode: 'derived',
  topBorderColor: '#111827',
  topBorderSurfaceOffset: -0.77,
  topBorderOpacity: 0.25,
  contactSpaceBeforeClassName: 'mt-0',
  contactFontSizeClassName: 'text-sm',
  contactFontWeightClassName: 'font-normal',
  contactEmailEnabled: false,
  contactText: 'reach@abstract.voyage',
  wordmarkSpaceBeforeClassName: 'mt-40',
  wordmarkOpacity: 1,
  backgroundReturnToLightEnabled: true,
  backgroundReturnToLightRangeVh: 0.9,
  backgroundReturnToLightFinalDarken: 0,
  abstractEnabled: false,
  abstractTitle: 'Abstract',
  abstractDescription: 'A living index of work, writing, experiments, and interface systems.',
  aboutEnabled: true,
  aboutTitle: 'About',
  aboutDescription: 'Context on the person, practice, and decision-making behind the work.',
  journalEnabled: true,
  journalTitle: 'Journal',
  journalDescription: 'Long-form notes on software, teams, systems, and craft.',
  contactEnabled: true,
  contactTitle: 'Contact',
  contactDescription: 'A focused channel for starting a conversation or carrying a draft forward.',
} satisfies AbstractFooterConfig;

export const DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG = {
  topRegionPercent: 18,
  bottomRegionPercent: 62,
  invertOrder: false,
  topHorizontalAlign: 'stretch',
  topVerticalAlign: 'center',
  bottomHorizontalAlign: 'end',
  bottomVerticalAlign: 'end',
  tabletFlow: 'horizontal',
  tabletRegionOrder: 'heroFirst',
  tabletHeroWeight: 1,
  tabletTimelineWeight: 1,
  // 'start' + 'stretch' below (not the prior 'end'/'end') — operator ask:
  // the Hero's first line and the Timeline's first row should share one top
  // line, not one bottom line. 'stretch' on tabletPairVerticalAlign is what
  // makes these two fields able to move content at all (see that field's
  // own doc comment); 'start' on both pins each column's own first line to
  // that shared, stretched row's own top edge.
  tabletHeroVerticalAlign: 'start',
  tabletTimelineVerticalAlign: 'start',
  tabletPairVerticalAlign: 'stretch',
} satisfies AbstractNarrowColumnStackConfig;

const PRESENTATION_MODES: ReadonlyArray<AbstractPagePresentationMode> = ['splitColumn', 'classic'];
const STACK_HORIZONTAL_ALIGNMENTS: ReadonlyArray<AbstractNarrowColumnStackHorizontalAlign> = [
  'start', 'center', 'end', 'stretch',
];
const STACK_VERTICAL_ALIGNMENTS: ReadonlyArray<AbstractNarrowColumnStackVerticalAlign> = [
  'start', 'center', 'end',
];
const COVER_FLOW_TIMELINE_SLOT_POSITION_MODES: ReadonlyArray<AbstractCoverFlowTimelineSlotPositionMode> = [
  'free', 'snapLeft', 'snapRight', 'betweenActiveAndLeftNeighbor',
];
const COVER_FLOW_TIMELINE_SLOT_BACKGROUND_MODES: ReadonlyArray<AbstractCoverFlowTimelineSlotBackgroundMode> = [
  'flat', 'gradient',
];
const TIMELINE_LINK_COLOR_MODES: ReadonlyArray<AbstractTimelineLinkColorMode> = [
  'manual', 'deriveFromGradient',
];
const MOTION_EASINGS: ReadonlyArray<CtaButtonMotionEasing> = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle', 'gaussian',
];
const TABLET_STACK_FLOWS = ['vertical', 'horizontal'] as const;
const TABLET_STACK_REGION_ORDERS = ['heroFirst', 'timelineFirst'] as const;
const TIMELINE_CONTENT_ORDERS: ReadonlyArray<AbstractTimelineContentOrder> = [
  'newest', 'oldest', 'titleAsc', 'titleDesc',
];
const FOOTER_BACKGROUND_MODES: ReadonlyArray<AbstractFooterConfig['backgroundMode']> = [
  'transparent', 'surface', 'custom', 'gradientDarkest',
];
const FOOTER_TEXT_COLOR_MODES: ReadonlyArray<AbstractFooterConfig['textColorMode']> = ['derived', 'custom'];
const FOOTER_TOP_BORDER_COLOR_MODES: ReadonlyArray<AbstractFooterConfig['topBorderColorMode']> = [
  'derived', 'custom', 'gradientDarkest',
];
const FOOTER_BORDER_COLOR_MODES: ReadonlyArray<AbstractFooterConfig['pageLinkBorderColorMode']> = [
  'derived', 'custom',
];

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);
const clampRange = (value: number, min: number, max: number, fallback: number): number => (
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
);

export function normalizeAbstractPageLayoutConfig(
  config: Partial<AbstractPageLayoutConfig> | undefined,
): AbstractPageLayoutConfig {
  const base = { ...DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG, ...(config ?? {}) };
  return {
    presentationMode: token(
      base.presentationMode, PRESENTATION_MODES, DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG.presentationMode,
    ),
  };
}

const clampRegionPercent = (value: number, fallback: number): number => (
  Number.isFinite(value) ? Math.min(99, Math.max(1, value)) : fallback
);

export function normalizeAbstractNarrowColumnStackConfig(
  config: Partial<AbstractNarrowColumnStackConfig> | undefined,
): AbstractNarrowColumnStackConfig {
  const base = { ...DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG, ...(config ?? {}) };
  return {
    topRegionPercent: clampRegionPercent(
      base.topRegionPercent,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.topRegionPercent,
    ),
    bottomRegionPercent: clampRegionPercent(
      base.bottomRegionPercent,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.bottomRegionPercent,
    ),
    invertOrder: Boolean(base.invertOrder),
    topHorizontalAlign: token(
      base.topHorizontalAlign,
      STACK_HORIZONTAL_ALIGNMENTS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.topHorizontalAlign,
    ),
    topVerticalAlign: token(
      base.topVerticalAlign,
      STACK_VERTICAL_ALIGNMENTS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.topVerticalAlign,
    ),
    bottomHorizontalAlign: token(
      base.bottomHorizontalAlign,
      STACK_HORIZONTAL_ALIGNMENTS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.bottomHorizontalAlign,
    ),
    bottomVerticalAlign: token(
      base.bottomVerticalAlign,
      STACK_VERTICAL_ALIGNMENTS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.bottomVerticalAlign,
    ),
    tabletFlow: token(
      base.tabletFlow,
      TABLET_STACK_FLOWS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.tabletFlow,
    ),
    tabletRegionOrder: token(
      base.tabletRegionOrder,
      TABLET_STACK_REGION_ORDERS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.tabletRegionOrder,
    ),
    tabletHeroWeight: clampRegionPercent(
      base.tabletHeroWeight,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.tabletHeroWeight,
    ),
    tabletTimelineWeight: clampRegionPercent(
      base.tabletTimelineWeight,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.tabletTimelineWeight,
    ),
    tabletHeroVerticalAlign: token(
      base.tabletHeroVerticalAlign,
      STACK_VERTICAL_ALIGNMENTS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.tabletHeroVerticalAlign,
    ),
    tabletTimelineVerticalAlign: token(
      base.tabletTimelineVerticalAlign,
      STACK_VERTICAL_ALIGNMENTS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.tabletTimelineVerticalAlign,
    ),
    tabletPairVerticalAlign: token(
      base.tabletPairVerticalAlign,
      STACK_HORIZONTAL_ALIGNMENTS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.tabletPairVerticalAlign,
    ),
  };
}

const COVER_FLOW_TIMELINE_SLOT_ASPECT_RATIO_MIN = 0.2;
const COVER_FLOW_TIMELINE_SLOT_ASPECT_RATIO_MAX = 5;

export function normalizeAbstractCoverFlowTimelineSlotConfig(
  config: Partial<AbstractCoverFlowTimelineSlotConfig> | undefined,
): AbstractCoverFlowTimelineSlotConfig {
  const D = DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG;
  const base = { ...D, ...(config ?? {}) };
  const nonEmptyText = (value: unknown, fallback: string) => (
    typeof value === 'string' && value.trim() ? value : fallback
  );

  return {
    enabledMd: Boolean(base.enabledMd),
    enabledLg: Boolean(base.enabledLg),
    aspectRatioMd: clampRange(
      base.aspectRatioMd,
      COVER_FLOW_TIMELINE_SLOT_ASPECT_RATIO_MIN,
      COVER_FLOW_TIMELINE_SLOT_ASPECT_RATIO_MAX,
      D.aspectRatioMd,
    ),
    aspectRatioLg: clampRange(
      base.aspectRatioLg,
      COVER_FLOW_TIMELINE_SLOT_ASPECT_RATIO_MIN,
      COVER_FLOW_TIMELINE_SLOT_ASPECT_RATIO_MAX,
      D.aspectRatioLg,
    ),
    widthPercentMd: clampRange(base.widthPercentMd, 5, 100, D.widthPercentMd),
    widthPercentLg: clampRange(base.widthPercentLg, 5, 100, D.widthPercentLg),
    positionModeMd: token(
      base.positionModeMd, COVER_FLOW_TIMELINE_SLOT_POSITION_MODES, D.positionModeMd,
    ),
    positionModeLg: token(
      base.positionModeLg, COVER_FLOW_TIMELINE_SLOT_POSITION_MODES, D.positionModeLg,
    ),
    xPercentMd: clampRange(base.xPercentMd, 0, 100, D.xPercentMd),
    xPercentLg: clampRange(base.xPercentLg, 0, 100, D.xPercentLg),
    minLeftInsetClassName: normalizeTailwindToken({
      utility: 'paddingLeft', breakpoint: 'base', value: base.minLeftInsetClassName,
      fallback: D.minLeftInsetClassName,
    }),
    minLeftInsetClassNameMd: normalizeTailwindToken({
      utility: 'paddingLeft', breakpoint: 'md', value: base.minLeftInsetClassNameMd,
      fallback: D.minLeftInsetClassNameMd,
    }),
    minLeftInsetClassNameLg: normalizeTailwindToken({
      utility: 'paddingLeft', breakpoint: 'lg', value: base.minLeftInsetClassNameLg,
      fallback: D.minLeftInsetClassNameLg,
    }),
    alignToTopWordmarkMd: base.alignToTopWordmarkMd === true,
    alignToTopWordmarkLg: base.alignToTopWordmarkLg === true,
    verticalAlignMd: token(base.verticalAlignMd, STACK_VERTICAL_ALIGNMENTS, D.verticalAlignMd),
    verticalAlignLg: token(base.verticalAlignLg, STACK_VERTICAL_ALIGNMENTS, D.verticalAlignLg),
    backgroundMode: token(base.backgroundMode, COVER_FLOW_TIMELINE_SLOT_BACKGROUND_MODES, D.backgroundMode),
    backgroundModeMd: token(base.backgroundModeMd ?? base.backgroundMode, COVER_FLOW_TIMELINE_SLOT_BACKGROUND_MODES, D.backgroundModeMd),
    backgroundModeLg: token(base.backgroundModeLg ?? base.backgroundMode, COVER_FLOW_TIMELINE_SLOT_BACKGROUND_MODES, D.backgroundModeLg),
    backgroundColor: nonEmptyText(base.backgroundColor, D.backgroundColor),
    backgroundColorMd: nonEmptyText(base.backgroundColorMd ?? base.backgroundColor, D.backgroundColorMd),
    backgroundColorLg: nonEmptyText(base.backgroundColorLg ?? base.backgroundColor, D.backgroundColorLg),
    backgroundOpacity: clampRange(base.backgroundOpacity, 0, 1, D.backgroundOpacity),
    backgroundOpacityMd: clampRange(base.backgroundOpacityMd ?? base.backgroundOpacity, 0, 1, D.backgroundOpacityMd),
    backgroundOpacityLg: clampRange(base.backgroundOpacityLg ?? base.backgroundOpacity, 0, 1, D.backgroundOpacityLg),
    backdropBlurPx: clampRange(base.backdropBlurPx, 0, 64, D.backdropBlurPx),
    backdropBlurPxMd: clampRange(base.backdropBlurPxMd ?? base.backdropBlurPx, 0, 64, D.backdropBlurPxMd),
    backdropBlurPxLg: clampRange(base.backdropBlurPxLg ?? base.backdropBlurPx, 0, 64, D.backdropBlurPxLg),
    backgroundGradientColorEnd: nonEmptyText(
      base.backgroundGradientColorEnd, D.backgroundGradientColorEnd,
    ),
    backgroundGradientColorEndMd: nonEmptyText(base.backgroundGradientColorEndMd ?? base.backgroundGradientColorEnd, D.backgroundGradientColorEndMd),
    backgroundGradientColorEndLg: nonEmptyText(base.backgroundGradientColorEndLg ?? base.backgroundGradientColorEnd, D.backgroundGradientColorEndLg),
    backgroundGradientAngleDeg: clampLoop360(
      base.backgroundGradientAngleDeg, D.backgroundGradientAngleDeg,
    ),
    backgroundGradientAngleDegMd: clampLoop360(base.backgroundGradientAngleDegMd ?? base.backgroundGradientAngleDeg, D.backgroundGradientAngleDegMd),
    backgroundGradientAngleDegLg: clampLoop360(base.backgroundGradientAngleDegLg ?? base.backgroundGradientAngleDeg, D.backgroundGradientAngleDegLg),
    backgroundGradientScale: clampRange(
      base.backgroundGradientScale, 10, 400, D.backgroundGradientScale,
    ),
    backgroundGradientScaleMd: clampRange(base.backgroundGradientScaleMd ?? base.backgroundGradientScale, 10, 400, D.backgroundGradientScaleMd),
    backgroundGradientScaleLg: clampRange(base.backgroundGradientScaleLg ?? base.backgroundGradientScale, 10, 400, D.backgroundGradientScaleLg),
    adaptiveTextInkEnabledMd: base.adaptiveTextInkEnabledMd === true,
    adaptiveTextInkEnabledLg: base.adaptiveTextInkEnabledLg === true,
    adaptiveTextInkDarkInkSaturationMd: clampRange(
      base.adaptiveTextInkDarkInkSaturationMd, 0, 2, D.adaptiveTextInkDarkInkSaturationMd,
    ),
    adaptiveTextInkDarkInkSaturationLg: clampRange(
      base.adaptiveTextInkDarkInkSaturationLg, 0, 2, D.adaptiveTextInkDarkInkSaturationLg,
    ),
    adaptiveTextInkDarkInkOpacityMultiplierMd: clampRange(
      base.adaptiveTextInkDarkInkOpacityMultiplierMd, 0.2, 1,
      D.adaptiveTextInkDarkInkOpacityMultiplierMd,
    ),
    adaptiveTextInkDarkInkOpacityMultiplierLg: clampRange(
      base.adaptiveTextInkDarkInkOpacityMultiplierLg, 0.2, 1,
      D.adaptiveTextInkDarkInkOpacityMultiplierLg,
    ),
    adaptiveTextInkLightInkToleranceMd: clampRange(
      base.adaptiveTextInkLightInkToleranceMd, 0, 20, D.adaptiveTextInkLightInkToleranceMd,
    ),
    adaptiveTextInkLightInkToleranceLg: clampRange(
      base.adaptiveTextInkLightInkToleranceLg, 0, 20, D.adaptiveTextInkLightInkToleranceLg,
    ),
    minWidth: clampRange(base.minWidth, 0, 2000, D.minWidth),
    minWidthMd: clampRange(base.minWidthMd ?? base.minWidth, 0, 2000, D.minWidthMd),
    minWidthLg: clampRange(base.minWidthLg ?? base.minWidth, 0, 2000, D.minWidthLg),
    tiltEnabled: Boolean(base.tiltEnabled),
    scrollWindowActiveScrollDurationMsMd: Number.isFinite(base.scrollWindowActiveScrollDurationMsMd)
      ? Math.min(2000, Math.max(0, Math.round(base.scrollWindowActiveScrollDurationMsMd)))
      : D.scrollWindowActiveScrollDurationMsMd,
    scrollWindowActiveScrollDurationMsLg: Number.isFinite(base.scrollWindowActiveScrollDurationMsLg)
      ? Math.min(2000, Math.max(0, Math.round(base.scrollWindowActiveScrollDurationMsLg)))
      : D.scrollWindowActiveScrollDurationMsLg,
    scrollWindowActiveScrollEasingMd: token(
      base.scrollWindowActiveScrollEasingMd, MOTION_EASINGS, D.scrollWindowActiveScrollEasingMd,
    ),
    scrollWindowActiveScrollEasingLg: token(
      base.scrollWindowActiveScrollEasingLg, MOTION_EASINGS, D.scrollWindowActiveScrollEasingLg,
    ),
    scrollWindowActiveScrollDelayMsMd: Number.isFinite(base.scrollWindowActiveScrollDelayMsMd)
      ? Math.min(2000, Math.max(0, Math.round(base.scrollWindowActiveScrollDelayMsMd)))
      : D.scrollWindowActiveScrollDelayMsMd,
    scrollWindowActiveScrollDelayMsLg: Number.isFinite(base.scrollWindowActiveScrollDelayMsLg)
      ? Math.min(2000, Math.max(0, Math.round(base.scrollWindowActiveScrollDelayMsLg)))
      : D.scrollWindowActiveScrollDelayMsLg,
  };
}

export function normalizeAbstractTimelineLinkColorConfig(
  config: Partial<AbstractTimelineLinkColorConfig> | undefined,
): AbstractTimelineLinkColorConfig {
  const D = DEFAULT_ABSTRACT_TIMELINE_LINK_COLOR_CONFIG;
  const base = { ...D, ...(config ?? {}) };
  const nonEmptyText = (value: unknown, fallback: string) => (
    typeof value === 'string' && value.trim() ? value : fallback
  );

  return {
    enabled: Boolean(base.enabled),
    enabledMobile: Boolean(base.enabledMobile),
    colorModeMobile: token(base.colorModeMobile, TIMELINE_LINK_COLOR_MODES, D.colorModeMobile),
    textColorMobile: nonEmptyText(base.textColorMobile, D.textColorMobile),
    textColorActiveMobile: nonEmptyText(base.textColorActiveMobile, D.textColorActiveMobile),
    darkInkSaturationMobile: clampRange(base.darkInkSaturationMobile, 0, 2, D.darkInkSaturationMobile),
    darkInkOpacityMultiplierMobile: clampRange(base.darkInkOpacityMultiplierMobile, 0.2, 1, D.darkInkOpacityMultiplierMobile),
    lightInkToleranceMobile: clampRange(base.lightInkToleranceMobile, 0, 20, D.lightInkToleranceMobile),
    colorModeMd: token(base.colorModeMd, TIMELINE_LINK_COLOR_MODES, D.colorModeMd),
    colorModeLg: token(base.colorModeLg, TIMELINE_LINK_COLOR_MODES, D.colorModeLg),
    backgroundColorMd: nonEmptyText(base.backgroundColorMd, D.backgroundColorMd),
    backgroundColorLg: nonEmptyText(base.backgroundColorLg, D.backgroundColorLg),
    textColorMd: nonEmptyText(base.textColorMd, D.textColorMd),
    textColorLg: nonEmptyText(base.textColorLg, D.textColorLg),
    backgroundColorActiveMd: nonEmptyText(base.backgroundColorActiveMd, D.backgroundColorActiveMd),
    backgroundColorActiveLg: nonEmptyText(base.backgroundColorActiveLg, D.backgroundColorActiveLg),
    textColorActiveMd: nonEmptyText(base.textColorActiveMd, D.textColorActiveMd),
    textColorActiveLg: nonEmptyText(base.textColorActiveLg, D.textColorActiveLg),
    darkInkSaturationMd: clampRange(base.darkInkSaturationMd, 0, 2, D.darkInkSaturationMd),
    darkInkSaturationLg: clampRange(base.darkInkSaturationLg, 0, 2, D.darkInkSaturationLg),
    darkInkOpacityMultiplierMd: clampRange(
      base.darkInkOpacityMultiplierMd, 0.2, 1, D.darkInkOpacityMultiplierMd,
    ),
    darkInkOpacityMultiplierLg: clampRange(
      base.darkInkOpacityMultiplierLg, 0.2, 1, D.darkInkOpacityMultiplierLg,
    ),
    lightInkToleranceMd: clampRange(base.lightInkToleranceMd, 0, 20, D.lightInkToleranceMd),
    lightInkToleranceLg: clampRange(base.lightInkToleranceLg, 0, 20, D.lightInkToleranceLg),
    activeSurfaceOffsetMd: clampRange(base.activeSurfaceOffsetMd, -1, 1, D.activeSurfaceOffsetMd),
    activeSurfaceOffsetLg: clampRange(base.activeSurfaceOffsetLg, -1, 1, D.activeSurfaceOffsetLg),
  };
}

export function normalizeAbstractTimelineContentConfig(
  config: Partial<AbstractTimelineContentConfig> | undefined,
): AbstractTimelineContentConfig {
  const base = { ...DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG, ...(config ?? {}) };
  return {
    visibleItemCount: Number.isFinite(base.visibleItemCount)
      ? Math.min(100, Math.max(1, Math.round(base.visibleItemCount)))
      : DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG.visibleItemCount,
    order: token(base.order, TIMELINE_CONTENT_ORDERS, DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG.order),
  };
}

const clampLoop360 = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

export function normalizeAbstractMobileArticleListInkConfig(
  config: Partial<AbstractMobileArticleListInkConfig> | undefined,
): AbstractMobileArticleListInkConfig {
  const D = DEFAULT_ABSTRACT_MOBILE_ARTICLE_LIST_INK_CONFIG;
  const base = { ...D, ...(config ?? {}) };
  return {
    hue: clampLoop360(base.hue, D.hue),
    saturation: clampRange(base.saturation, 0, 100, D.saturation),
    minLightness: clampRange(base.minLightness, 0, 100, D.minLightness),
    minDarkness: clampRange(base.minDarkness, 0, 100, D.minDarkness),
    minContrastRatio: clampRange(base.minContrastRatio, 1, 21, D.minContrastRatio),
  };
}

export function normalizeAbstractFooterConfig(
  config: Partial<AbstractFooterConfig> | undefined,
): AbstractFooterConfig {
  const D = DEFAULT_ABSTRACT_FOOTER_CONFIG;
  const base = { ...D, ...(config ?? {}) };
  const text = (value: unknown, fallback: string) => (
    typeof value === 'string' ? value : fallback
  );
  const nonEmptyText = (value: unknown, fallback: string) => (
    typeof value === 'string' && value.trim() ? value : fallback
  );

  return {
    enabled: base.enabled !== false,
    enabledWide: base.enabledWide !== false,
    enabledLg: base.enabledLg !== false,
    navigationLabel: nonEmptyText(base.navigationLabel, D.navigationLabel),
    backgroundMode: token(base.backgroundMode, FOOTER_BACKGROUND_MODES, D.backgroundMode),
    backgroundColor: nonEmptyText(base.backgroundColor, D.backgroundColor),
    backgroundOpacity: clampRange(base.backgroundOpacity, 0, 1, D.backgroundOpacity),
    textColorMode: token(base.textColorMode, FOOTER_TEXT_COLOR_MODES, D.textColorMode),
    textColor: nonEmptyText(base.textColor, D.textColor),
    descriptionColor: nonEmptyText(base.descriptionColor, D.descriptionColor),
    textSurfaceOffset: clampRange(base.textSurfaceOffset, -1, 1, D.textSurfaceOffset),
    descriptionSurfaceOffset: clampRange(
      base.descriptionSurfaceOffset, -1, 1, D.descriptionSurfaceOffset,
    ),
    adaptiveInkEnabled: Boolean(base.adaptiveInkEnabled),
    adaptiveInkMaxAmount: clampRange(base.adaptiveInkMaxAmount, 0, 1, D.adaptiveInkMaxAmount),
    adaptiveInkTargetContrastRatio: clampRange(
      base.adaptiveInkTargetContrastRatio, 0, 21, D.adaptiveInkTargetContrastRatio,
    ),
    sectionPaddingYClassName: normalizeTailwindToken({
      utility: 'paddingY', breakpoint: 'base', value: base.sectionPaddingYClassName,
      fallback: D.sectionPaddingYClassName,
    }),
    pageItemGapClassName: normalizeTailwindToken({
      utility: 'gap', breakpoint: 'base', value: base.pageItemGapClassName,
      fallback: D.pageItemGapClassName,
    }),
    pageItemPaddingYClassName: normalizeTailwindToken({
      utility: 'paddingY', breakpoint: 'base', value: base.pageItemPaddingYClassName,
      fallback: D.pageItemPaddingYClassName,
    }),
    pageItemPaddingXClassName: normalizeTailwindToken({
      utility: 'paddingX', breakpoint: 'base', value: base.pageItemPaddingXClassName,
      fallback: D.pageItemPaddingXClassName,
    }),
    pageTitlePaddingBottomClassName: normalizeTailwindToken({
      utility: 'paddingBottom', breakpoint: 'base', value: base.pageTitlePaddingBottomClassName,
      fallback: D.pageTitlePaddingBottomClassName,
    }),
    pageTitleFontSizeClassName: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'base', value: base.pageTitleFontSizeClassName,
      fallback: D.pageTitleFontSizeClassName,
    }),
    pageTitleFontWeightClassName: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'base', value: base.pageTitleFontWeightClassName,
      fallback: D.pageTitleFontWeightClassName,
    }),
    pageDescriptionMarginTopClassName: normalizeTailwindToken({
      utility: 'marginTop', breakpoint: 'base', value: base.pageDescriptionMarginTopClassName,
      fallback: D.pageDescriptionMarginTopClassName,
    }),
    pageDescriptionPaddingTopClassName: normalizeTailwindToken({
      utility: 'paddingTop', breakpoint: 'base', value: base.pageDescriptionPaddingTopClassName,
      fallback: D.pageDescriptionPaddingTopClassName,
    }),
    pageDescriptionFontSizeClassName: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'base', value: base.pageDescriptionFontSizeClassName,
      fallback: D.pageDescriptionFontSizeClassName,
    }),
    pageDescriptionFontWeightClassName: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'base', value: base.pageDescriptionFontWeightClassName,
      fallback: D.pageDescriptionFontWeightClassName,
    }),
    pageLinkBulletEnabled: Boolean(base.pageLinkBulletEnabled),
    pageLinkBorderEnabled: Boolean(base.pageLinkBorderEnabled),
    pageLinkBorderWidthClassName: normalizeTailwindToken({
      utility: 'borderTopWidth', breakpoint: 'base', value: base.pageLinkBorderWidthClassName,
      fallback: D.pageLinkBorderWidthClassName,
    }),
    pageLinkBorderColorMode: token(
      base.pageLinkBorderColorMode,
      FOOTER_BORDER_COLOR_MODES,
      D.pageLinkBorderColorMode,
    ),
    pageLinkBorderColor: nonEmptyText(base.pageLinkBorderColor, D.pageLinkBorderColor),
    pageLinkBorderSurfaceOffset: clampRange(
      base.pageLinkBorderSurfaceOffset,
      -1,
      1,
      D.pageLinkBorderSurfaceOffset,
    ),
    pageLinkBorderOpacity: clampRange(base.pageLinkBorderOpacity, 0, 1, D.pageLinkBorderOpacity),
    topBorderEnabled: Boolean(base.topBorderEnabled),
    topBorderWidthClassName: normalizeTailwindToken({
      utility: 'borderTopWidth', breakpoint: 'base', value: base.topBorderWidthClassName,
      fallback: D.topBorderWidthClassName,
    }),
    topBorderColorMode: token(base.topBorderColorMode, FOOTER_TOP_BORDER_COLOR_MODES, D.topBorderColorMode),
    topBorderColor: nonEmptyText(base.topBorderColor, D.topBorderColor),
    topBorderSurfaceOffset: clampRange(base.topBorderSurfaceOffset, -1, 1, D.topBorderSurfaceOffset),
    topBorderOpacity: clampRange(base.topBorderOpacity, 0, 1, D.topBorderOpacity),
    contactSpaceBeforeClassName: normalizeTailwindToken({
      utility: 'marginTop', breakpoint: 'base', value: base.contactSpaceBeforeClassName,
      fallback: D.contactSpaceBeforeClassName,
    }),
    contactFontSizeClassName: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'base', value: base.contactFontSizeClassName,
      fallback: D.contactFontSizeClassName,
    }),
    contactFontWeightClassName: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'base', value: base.contactFontWeightClassName,
      fallback: D.contactFontWeightClassName,
    }),
    contactEmailEnabled: Boolean(base.contactEmailEnabled),
    contactText: text(base.contactText, D.contactText),
    wordmarkSpaceBeforeClassName: normalizeTailwindToken({
      utility: 'marginTop', breakpoint: 'base', value: base.wordmarkSpaceBeforeClassName,
      fallback: D.wordmarkSpaceBeforeClassName,
    }),
    wordmarkOpacity: clampRange(base.wordmarkOpacity, 0, 1, D.wordmarkOpacity),
    backgroundReturnToLightEnabled: Boolean(base.backgroundReturnToLightEnabled),
    backgroundReturnToLightRangeVh: clampRange(
      base.backgroundReturnToLightRangeVh, 0.1, 4, D.backgroundReturnToLightRangeVh,
    ),
    backgroundReturnToLightFinalDarken: clampRange(
      base.backgroundReturnToLightFinalDarken, 0, 1, D.backgroundReturnToLightFinalDarken,
    ),
    abstractEnabled: Boolean(base.abstractEnabled),
    abstractTitle: nonEmptyText(base.abstractTitle, D.abstractTitle),
    abstractDescription: text(base.abstractDescription, D.abstractDescription),
    aboutEnabled: Boolean(base.aboutEnabled),
    aboutTitle: nonEmptyText(base.aboutTitle, D.aboutTitle),
    aboutDescription: text(base.aboutDescription, D.aboutDescription),
    journalEnabled: Boolean(base.journalEnabled),
    journalTitle: nonEmptyText(base.journalTitle, D.journalTitle),
    journalDescription: text(base.journalDescription, D.journalDescription),
    contactEnabled: Boolean(base.contactEnabled),
    contactTitle: nonEmptyText(base.contactTitle, D.contactTitle),
    contactDescription: text(base.contactDescription, D.contactDescription),
  };
}

// PLAN-POLYMORPHIC-LAYOUT-PAGE-CONFIG-PARITY.md: relocated to
// experiences/abstract/components/PolymorphicLayout.pageConfigs.ts, co-located
// with /about's and /posts-lab's own instances next to the shared type they're
// all instances of (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's own "Round 1"
// ruling — see that file's own doc comment for the full per-field reasoning).
//
// No longer a bare re-export (operator ask, 2026-09-23: journal's mobile/
// tablet gradient recipe copied onto this page too — pages/journal.config.ts's
// and pages/about.config.ts's own matching comments). Own page-owned object
// literal now, spreading the shared pageConfigs.ts instance and overriding
// its base (mobile) and Wide (tablet) gradient fields. Tablet layout now
// mirrors mobile as well; /abstract's desktop (Lg) recipe is untouched.
// pages/abstract.panel.ts's own
// ABSTRACT_POLYMORPHIC_LAYOUT_PANEL targetFile/targetSymbol were re-pointed
// at this literal to match — see that scope's own doc comment for why a
// stale target silently breaks Update diff (the exact bug
// PolymorphicLayout.pageConfigs.test.ts's own guard now catches for any
// page in this family).
export const ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG: PolymorphicLayoutConfig = {
  ...SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG,
  // Both tablet and desktop are the mobile composition at a wider canvas:
  // one stacked flow, an in-flow header, and the same full-bleed carousel/
  // gradient surface. Every structural/alignment field below is mirrored
  // Wide->Lg with the identical value, so desktop reuses tablet's exact
  // composition rather than silently falling back to the shared config's
  // classic side-by-side desktop values (that mismatch — Lg still carrying
  // the old 38/62 split's alignment/padding/header values while
  // narrowColumnWidthTierLg had already been flipped to 'stacked' — was
  // the root cause of desktop's stacked layout reading as broken/
  // overlapping instead of matching tablet). scrollGradient* fields are the
  // deliberate exception: desktop keeps its own separate art direction,
  // per that block's own comment below.
  narrowColumnWidthTierMd: 'stacked',
  stackedColumnOrderWide: 'wideFirst',
  stackedViewportPartitionEnabledWide: true,
  stackedWideColumnViewportPercentWide: 62,
  narrowColumnWidthTierLg: 'stacked',
  stackedViewportPartitionEnabledLg: true,
  stackedWideColumnViewportPercentLg: 62,
  splitBandWidthTierWide: 'stacked',
  splitBandWidthTierLg: 'stacked',
  headerScrollBehaviorWide: 'static',
  headerScrollBehaviorLg: 'static',
  narrowColumnClearsFloatingHeaderWide: false,
  narrowColumnClearsFloatingHeaderLg: false,
  wideColumnTransparentWide: true,
  wideColumnCustomColorWide: '#d7d7e5',

  narrowColumnContentAlignWide: 'items-start',
  narrowColumnContentAlignLg: 'items-start',
  narrowColumnContentWidthWide: 'md:max-w-[70%]',
  narrowColumnContentWidthLg: 'auto',
  narrowColumnTextAlignWide: 'md:text-left',
  narrowColumnTextAlignLg: 'lg:text-left',
  narrowColumnContentVerticalAlignWide: 'md:justify-start',
  narrowColumnContentVerticalAlignLg: 'lg:justify-end',
  narrowColumnContentPaddingLeftWide: 'md:pl-20',
  narrowColumnContentPaddingLeftLg: 'lg:pl-14',
  narrowColumnContentPaddingBottomWide: 'md:pb-0',
  narrowColumnContentPaddingBottomLg: 'lg:pb-20',
  wideColumnContentWidthWide: 'auto',
  wideColumnContentWidthLg: 'auto',
  // The stacked carousel has no outer padding on mobile/tablet. Express
  // that in the shared config so the panel can change any side at runtime.
  wideColumnContentPaddingTop: 'pt-0',
  wideColumnContentPaddingRight: 'pr-0',
  wideColumnContentPaddingBottom: 'pb-0',
  wideColumnContentPaddingLeft: 'pl-0',
  wideColumnContentPaddingLeftWide: 'md:pl-0',
  wideColumnContentPaddingLeftLg: 'lg:pl-7',
  wideColumnContentPaddingRightWide: 'md:pr-0',
  wideColumnContentPaddingRightLg: 'lg:pr-7',
  wideColumnContentPaddingTopWide: 'md:pt-0',
  wideColumnContentPaddingTopLg: 'lg:pt-0',
  wideColumnContentPaddingBottomWide: 'md:pb-0',
  wideColumnContentPaddingBottomLg: 'lg:pb-7',

  headerLeftSegmentAlignWide: 'md:justify-start',
  headerLeftSegmentAlignLg: 'lg:justify-start',
  headerRightSegmentAlignWide: 'md:justify-end',
  headerRightSegmentAlignLg: 'lg:justify-end',
  headerRightSegmentVerticalAlignWide: 'md:items-center',
  headerRightSegmentVerticalAlignLg: 'lg:items-center',
  headerLeftContentWidthWide: 'md:max-w-percent-90',
  headerLeftContentWidthLg: 'lg:max-w-percent-90',
  headerRightContentWidthWide: 'md:max-w-percent-80',
  headerRightContentWidthLg: 'lg:max-w-percent-80',
  headerLeftInnerAlignWide: 'md:justify-start',
  headerLeftInnerAlignLg: 'lg:justify-start',
  headerLeftContentPaddingTopWide: 'md:pt-0',
  headerLeftContentPaddingTopLg: 'lg:pt-0',
  headerLeftContentPaddingRightWide: 'md:pr-0',
  headerLeftContentPaddingRightLg: 'lg:pr-0',
  headerRightContentPaddingLeftWide: 'md:pl-0',
  headerRightContentPaddingLeftLg: 'lg:pl-0',

  // The mobile and tablet scroll-gradient recipes below are deliberately
  // paired field-for-field; keep their palette, compositor, and darkening
  // in sync while Lg retains its separate desktop art direction.
  scrollGradientBaseHue: 200,
  scrollGradientBaseHueWide: 200,
  scrollGradientLightnessMin: 30,
  scrollGradientLightnessMinWide: 30,
  scrollGradientChromaMin: 30,
  scrollGradientChromaMinWide: 30,
  scrollGradientMode: 'center-bright',
  scrollGradientModeWide: 'center-bright',
  scrollGradientCenterStretch: 0,
  scrollGradientCenterStretchWide: 0,
  scrollGradientInterpolation: 'oklab',
  scrollGradientInterpolationWide: 'oklab',
  scrollGradientCompositor: 'enhanced',
  scrollGradientCompositorWide: 'enhanced',
  scrollGradientLightRadiusPercent: 99,
  scrollGradientLightRadiusPercentWide: 99,
  scrollGradientLightAspectRatio: 3.2,
  scrollGradientLightAspectRatioWide: 3.2,
  scrollGradientExtentPercent: 180,
  scrollGradientExtentPercentWide: 180,
  scrollGradientSmoothness: 4,
  scrollGradientSmoothnessWide: 4,
  scrollGradientDitherAmount: 0.069,
  scrollGradientDitherAmountWide: 0.051,
  scrollGradientDitherScale: 2.5,
  scrollGradientDitherScaleWide: 2.2,
  scrollGradientInkColor: '#c68080',
  scrollGradientInkColorWide: '#c68080',
  scrollGradientViewportRangeVh: 0.5,
  scrollGradientViewportRangeVhWide: 10,
  scrollGradientMaxDarken: 0.47,
  scrollGradientMaxDarkenWide: 0,
  scrollGradientLegibilityTargetRatio: 5.5,
  scrollGradientLegibilityTargetRatioWide: 5.5,
  scrollGradientDarkInkSaturation: 2,
  scrollGradientDarkInkSaturationWide: 2,
  scrollGradientDarkInkOpacityMultiplier: 0.73,
  scrollGradientDarkInkOpacityMultiplierWide: 0.73,
  scrollGradientFocalHorizontal: 'center',
  scrollGradientFocalHorizontalWide: 'center',
  scrollGradientLightHiddenPercent: 70,
  scrollGradientLightHiddenPercentWide: 70,
  scrollGradientLightFalloff: 1.3,
  scrollGradientLightFalloffWide: 1.3,

  headerRightInnerAlignWide: 'md:justify-end',
  headerRightInnerAlignLg: 'lg:justify-end',

  wideColumnContentAlignWide: 'items-center',
  wideColumnContentAlignLg: 'items-center',
  wideColumnContentVerticalAlignWide: 'md:justify-center',
  wideColumnContentVerticalAlignLg: 'lg:justify-center',

  narrowColumnContentPaddingRightWide: 'md:pr-0',
  narrowColumnContentPaddingRightLg: 'lg:pr-0',
  narrowColumnContentPaddingTopWide: 'md:pt-14',
  narrowColumnContentPaddingTopLg: 'lg:pt-0',

  scrollGradientFocalHorizontalLg: 'right',
  scrollGradientLightHiddenPercentLg: 70,
  scrollGradientLightRadiusPercentLg: 50,
  scrollGradientLightAspectRatioLg: 4,
  scrollGradientLightFalloffLg: 0.8,
  scrollGradientInterpolationLg: 'oklab',
  scrollGradientExtentPercentLg: 224,

  scrollGradientLightnessMinLg: 72,
  scrollGradientChromaMinLg: 40,
  scrollGradientCenterStretchLg: 1,
  scrollGradientDarkenOnScrollEnabledLg: false,

  scrollGradientDarkInkOpacityMultiplierLg: 0.73,
  scrollGradientLightInkOnLightBackgroundContrastToleranceLg: 1.2,
  scrollGradientHueSchemeLg: 'dual-complementary',

  scrollGradientDarkInkSaturationLg: 2,

  scrollGradientLightInkOnLightBackgroundContrastToleranceWide: 1.2,
  scrollGradientDarkenOnScrollEnabledWide: false,

  wordmarkGradientLightnessMinWide: 26,

  scrollGradientLightInkOnLightBackgroundContrastTolerance: 1.2,
  wordmarkGradientBaseHue: 215,
  wordmarkGradientLightnessMin: 33,
  wordmarkGradientChromaMin: 33,
  wordmarkGradientMode: 'side-bright',
  wordmarkGradientStops: 22,
  wordmarkGradientVariance: 1,
  wordmarkGradientCenterStretch: 0.3,
  wordmarkGradientSeed: 50,

  scrollGradientStops: 22,

  scrollGradientDarkenOnScrollEnabled: true,

  scrollGradientStopsWide: 22,
  scrollGradientStopsLg: 9,
  scrollGradientLegibilityTargetRatioLg: 5.5,

  scrollGradientBaseHueLg: 202,
  scrollGradientDitherSeedLg: 100000,

  scrollGradientMixSamplesLg: 25,
};

/**
 * The desktop (Lg) field values ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG above
 * overrides away from SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG's own
 * defaults — desktop's classic 38/62 split-column composition (a real
 * side-by-side grid, Hero+Timeline positioned via AbstractNarrowColumnStack's
 * own top/bottom regions, CoverFlow occupying the wide column beside it).
 *
 * abstractCoverFlowTimelineSlotConfig.enabledLg (pages/abstract.tsx) is what
 * actually moves the Timeline into CoverFlow's own track and is the whole
 * reason narrowColumnWidthTierLg/splitBandWidthTierLg etc. were flipped to
 * 'stacked' above in the first place — so when an operator switches that
 * slot off, this full desktop composition must revert too, or the page ends
 * up in the worst of both states: still stacked/full-width (this file's own
 * static Lg values), but with nowhere for the Timeline to render except a
 * bare, unstyled block at the very bottom of the narrow column, and the
 * Hero no longer positioned the way the classic split ever placed it
 * (BUG report, 2026-09-26 — the "legacy layout is lost" screenshot).
 *
 * Sourced verbatim from SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG's own Lg
 * fields — the exact values this page used at every one of these fields
 * before the stacked/full-width composition existed — rather than a second,
 * independently hand-typed set of magic strings that could silently drift
 * from that shared config's own truth. Only lists fields whose Lg value
 * genuinely differs between the two compositions (several, e.g.
 * narrowColumnContentVerticalAlignLg/wideColumnContentPaddingTopLg, already
 * coincide and need no entry here — see this file's own inline comments
 * beside each ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG override above for which).
 * scrollGradient* fields are deliberately absent: desktop keeps its own art
 * direction regardless of composition, per that block's own comment.
 */
export const ABSTRACT_POLYMORPHIC_LAYOUT_LEGACY_DESKTOP_OVERRIDES = {
  narrowColumnWidthTierLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnWidthTierLg,
  splitBandWidthTierLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.splitBandWidthTierLg,
  // 'fixed', not 'static' — SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG's own
  // Lg default. A 'static' header (only correct for the stacked composition,
  // which sizes its own row with an explicit height) skips
  // SplitColumnPageShell's own marginTop compensation for a 'pushDown'
  // column; the legacy split row only sets a min-height, so without that
  // marginTop it silently grew 144px (the header's own height) past the
  // viewport — the exact page-level scroll + off-center CoverFlow card
  // reported live, confirmed by diffing against 00badec (the last commit
  // before this page's own header override existed).
  headerScrollBehaviorLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.headerScrollBehaviorLg,
  narrowColumnClearsFloatingHeaderLg:
    SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnClearsFloatingHeaderLg,
  narrowColumnContentAlignLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentAlignLg,
  narrowColumnContentWidthLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentWidthLg,
  narrowColumnTextAlignLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnTextAlignLg,
  narrowColumnContentPaddingBottomLg:
    SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingBottomLg,
  narrowColumnContentPaddingRightLg:
    SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingRightLg,
  wideColumnContentWidthLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentWidthLg,
  wideColumnContentPaddingLeftLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingLeftLg,
  wideColumnContentPaddingRightLg:
    SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingRightLg,
  wideColumnContentPaddingBottomLg:
    SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingBottomLg,
  wideColumnContentAlignLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentAlignLg,
  headerLeftSegmentAlignLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftSegmentAlignLg,
  headerRightSegmentAlignLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.headerRightSegmentAlignLg,
  headerLeftContentWidthLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentWidthLg,
  headerRightContentWidthLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentWidthLg,
  headerLeftInnerAlignLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftInnerAlignLg,
  headerLeftContentPaddingRightLg:
    SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingRightLg,
  headerRightContentPaddingLeftLg:
    SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingLeftLg,
  headerRightInnerAlignLg: SHARED_ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG.headerRightInnerAlignLg,
} satisfies Partial<PolymorphicLayoutConfig>;

/** desktopCoverFlowTimelineSlotEnabled: mirrors
 * abstractCoverFlowTimelineSlotConfig.enabledLg (pages/abstract.tsx) —
 * true (default): the stacked/full-width composition authored directly on
 * ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG above, byte-identical to passing that
 * config straight through. false: ABSTRACT_POLYMORPHIC_LAYOUT_LEGACY_DESKTOP_
 * OVERRIDES layered on top, restoring the classic split-column desktop
 * composition that toggle's own OFF state actually renders content for. */
export function resolveAbstractPolymorphicLayoutConfigForDesktopMode(
  config: PolymorphicLayoutConfig,
  desktopCoverFlowTimelineSlotEnabled: boolean,
): PolymorphicLayoutConfig {
  return desktopCoverFlowTimelineSlotEnabled
    ? config
    : { ...config, ...ABSTRACT_POLYMORPHIC_LAYOUT_LEGACY_DESKTOP_OVERRIDES };
}

// /abstract's own default for the shared AboutTimeline component (see
// experiences/abstract/components/AbstractTimeline.panel.ts's own doc
// comment) — full parity with /about's own timeline
// (DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG, pages/about.config.ts) for every
// field the shared "Timeline" panel exposes: same base
// (DEFAULT_ABOUT_TIMELINE_CONFIG) + the same overrides that page applies.
// `description` is the one deliberate exception: it's page content (a
// lead-in sentence), not styling, so /abstract keeps its own copy instead of
// about's bio-page sentence. Re-exported under its own symbol so the panel's
// "copy to source" tooling has a real, page-specific target to write into
// once an operator diverges this page's own values, without ever touching
// /about's.
export type AbstractTimelineConfig = AboutTimelineConfig & {
  /** Pull down from the top of the expanded mobile list to close it. */
  mobileExpandedDragDownEnabled: boolean;
  /** Vertical travel required before a downward release closes the list. */
  mobileExpandedDragDownThresholdPx: number;
};

export const DEFAULT_ABSTRACT_TIMELINE_CONFIG: AbstractTimelineConfig = {
  ...DEFAULT_ABOUT_TIMELINE_CONFIG,
  maxWidthClassName: 'max-w-prose',
  maxWidthWideClassName: 'md:max-w-lg',
  maxWidthLgClassName: 'lg:max-w-lg',
  paddingTopClassName: 'pt-5',
  paddingRightClassName: 'pr-8',
  paddingLeftClassName: 'pl-4',
  rowGap: 'gap-3',
  scrollWindowVisibleCount: 3,
  scrollWindowVisibleCountWide: 5,
  scrollWindowVisibleCountLg: 5,
  toolbarPaddingTopClassName: 'pt-0', toolbarPaddingRightClassName: 'pr-0', toolbarPaddingBottomClassName: 'pb-5', toolbarPaddingLeftClassName: 'pl-0',
  toolbarPaddingTopWideClassName: 'md:pt-0', toolbarPaddingRightWideClassName: 'md:pr-0', toolbarPaddingBottomWideClassName: 'md:pb-0', toolbarPaddingLeftWideClassName: 'md:pl-0',
  toolbarPaddingTopLgClassName: 'lg:pt-0', toolbarPaddingRightLgClassName: 'lg:pr-0', toolbarPaddingBottomLgClassName: 'lg:pb-0', toolbarPaddingLeftLgClassName: 'lg:pl-0',
  toolbarActionFontSizeClassName: 'text-sm',
  toolbarActionFontSizeWideClassName: 'md:text-xs',
  toolbarActionFontSizeLgClassName: 'lg:text-xs',
  // The shared Timeline defaults these window controls off. /abstract's
  // CoverFlow-track timeline explicitly opts in for its tablet/desktop
  // windowed list; mobile has no windowed Timeline in this composition.
  // Keep every field literal here: this scope's complete config-update
  // payload can then round-trip each breakpoint setting into this page's
  // own source rather than finding it only through the shared spread.
  scrollWindowCounterEnabled: true,
  scrollWindowCounterEnabledWide: true,
  scrollWindowCounterEnabledLg: true,
  scrollWindowArrowsEnabled: true,
  scrollWindowArrowsEnabledWide: true,
  scrollWindowArrowsEnabledLg: true,
  scrollWindowArrowsNavigateTimeline: true,
  scrollWindowArrowsNavigateTimelineWide: true,
  scrollWindowArrowsNavigateTimelineLg: true,
  scrollWindowArrowsNavigateEntireList: true,
  scrollWindowArrowsNavigateEntireListWide: true,
  scrollWindowArrowsNavigateEntireListLg: true,
  scrollWindowControlsPosition: 'top',
  scrollWindowControlsPositionWide: 'bottom',
  scrollWindowControlsPositionLg: 'bottom',
  markerSizeClassName: 'w-2.5 h-2.5',
  markerColorMode: 'text',
  markerCustomColor: '#6c6b94',
  hoverMarkerOpacity: 0.3,
  markerIdleOpacity: 0,
  markerActiveOpacity: 0.9,
  markerGradientEnabled: false,
  rowTitleFontSizeClassName: 'text-xs',
  rowTitleFontSizeWideClassName: 'md:text-xs',
  rowTitleFontSizeLgClassName: 'lg:text-sm',
  rowTitleLineHeightClassName: 'leading-[1.6]',
  rowTitleFontWeightClassName: 'font-normal',
  rowTitleFontWeightWideClassName: 'md:font-normal',
  rowTitleFontWeightLgClassName: 'lg:font-normal',
  rowTitleFontWeightClassNameActive: 'font-normal',
  rowTitleFontWeightActiveWideClassName: 'md:font-normal',
  rowTitleFontWeightActiveLgClassName: 'lg:font-normal',
  rowTitleMinContrastActive: 21,
  rowTitleMinContrastInactive: 5.5,
  rowTitleOpacityInactive: 0.65,
  rowDescriptionMinContrastActive: 5.6,
  rowDescriptionMinContrastInactive: 4,
  description: 'Essays & Time',
  descriptionVisible: false,
  descriptionIndentMatchesMarkerLane: false,
  descriptionFontSizeClassName: 'text-base',
  alignment: 'left',
  alignmentWide: 'left',
  alignmentLg: 'left',
  descriptionOpacity: 1,
  descriptionPaddingBottomLgClassName: 'lg:pb-7',
  rowAppendixEnabled: false,
  rowAppendixRevealDelayMs: 340,
  rowAppendixSeparator: '⋅',
  paddingTopLgClassName: 'lg:pt-8',
  marginTopLgClassName: 'lg:mt-0',
  // Starts with the page-wide introduction gate used by the main nav and
  // hero; each article row follows in a quiet, readable stagger.
  introEnabled: false,
  introDelayMs: 0,
  introDurationMs: 150,
  introEasing: 'linear',
  introItemStaggerMs: 0,
  // The next desktop row begins 83ms before the prior row resolves
  // (380ms duration + 137ms gap - 220ms overlap), giving the sequence a
  // continuous cascade without obscuring its reading order.
  introItemOverlapMs: 80,

  paddingTopWideClassName: 'md:pt-5',

  paddingRightWideClassName: 'md:pr-5',

  paddingLeftWideClassName: 'md:pl-5',

  rowDescriptionFontSizeWideClassName: 'md:text-base',

  rowTitleLineHeightWideClassName: 'md:leading-normal',

  paddingRightLgClassName: 'lg:pr-5',
  paddingBottomLgClassName: 'lg:pb-5',
  paddingLeftLgClassName: 'lg:pl-5',
  descriptionPaddingTopLgClassName: 'lg:pt-0',
  descriptionPaddingLeftLgClassName: 'lg:pl-8',

  paddingBottomWideClassName: 'md:pb-5',
  descriptionPaddingBottomWideClassName: 'md:pb-5',
  descriptionFontSizeWideClassName: 'md:text-sm',

  descriptionPaddingBottomClassName: 'pb-5',

  descriptionMarginTopClassName: 'mt-3',

  descriptionMinContrast: 7.5,

  transitionEasing: 'viscous',
  mobileExpandedDragDownEnabled: true,
  mobileExpandedDragDownThresholdPx: 96,
};

export function normalizeAbstractTimelineConfig(
  config: Partial<AbstractTimelineConfig> | undefined,
): AbstractTimelineConfig {
  return {
    ...normalizeAboutTimelineConfig(config),
    mobileExpandedDragDownEnabled: config?.mobileExpandedDragDownEnabled !== false,
    mobileExpandedDragDownThresholdPx: Math.round(clampRange(
      config?.mobileExpandedDragDownThresholdPx
        ?? DEFAULT_ABSTRACT_TIMELINE_CONFIG.mobileExpandedDragDownThresholdPx,
      32, 240, DEFAULT_ABSTRACT_TIMELINE_CONFIG.mobileExpandedDragDownThresholdPx,
    )),
  };
}

/**
 * The desktop (Lg) field values DEFAULT_ABSTRACT_TIMELINE_CONFIG above is
 * tuned to — description caption visible, left-aligned, generous top/side
 * padding — are tuned for the Timeline's CoverFlow-track placement (a
 * small, tightly-bounded figure inset into the carousel), the one
 * abstractCoverFlowTimelineSlotConfig.enabledLg actually turns on. The SAME
 * config object also renders the classic narrow-column bottom placement
 * (AbstractNarrowColumnStack's own `bottom` region) whenever that toggle is
 * off — a real column-width box with an entirely different budget, not a
 * small inset figure. Sized for one placement, this drifts wrong for the
 * other exactly the way ABSTRACT_POLYMORPHIC_LAYOUT_LEGACY_DESKTOP_OVERRIDES'
 * own doc comment above describes for the column geometry itself (BUG
 * report, 2026-09-26: page-level vertical scroll + an off-center CoverFlow
 * card the classic placement never had, traced to this same config/
 * composition mismatch, confirmed by diffing against 00badec).
 *
 * alignmentLg/descriptionOpacity/paddingTopLgClassName are restored to their
 * own exact pre-regression literal values (verified live against commit
 * 00badec69b45af3fac7f6fea91dfa77471bb4128, the last commit before the
 * CoverFlow-track placement's desktop tuning began) rather than
 * DEFAULT_ABOUT_TIMELINE_CONFIG's own generic base default — /abstract
 * already diverged from that base for these three before any of this
 * existed (alignmentLg: 'right', not the base 'left'), so the component
 * default is not what "pre-regression" actually means for them. The
 * remaining fields below never had an /abstract-level override at
 * 00badec at all, so DEFAULT_ABOUT_TIMELINE_CONFIG's own base default IS
 * their correct pre-regression value. Non-Lg-tiered fields (rowGap,
 * descriptionVisible, hover/marker opacities) aren't included here: they're
 * shared across every breakpoint/placement (mobile list, tablet, both
 * desktop compositions) with no per-tier variant to split on, so reverting
 * them here would also silently change mobile/tablet — out of scope for a
 * Lg-only toggle.
 */
export const ABSTRACT_TIMELINE_LEGACY_DESKTOP_OVERRIDES = {
  alignmentLg: 'right',
  descriptionOpacity: 0.61,
  paddingTopLgClassName: 'lg:pt-7',
  paddingRightLgClassName: DEFAULT_ABOUT_TIMELINE_CONFIG.paddingRightLgClassName,
  paddingBottomLgClassName: DEFAULT_ABOUT_TIMELINE_CONFIG.paddingBottomLgClassName,
  paddingLeftLgClassName: DEFAULT_ABOUT_TIMELINE_CONFIG.paddingLeftLgClassName,
  descriptionPaddingTopLgClassName: DEFAULT_ABOUT_TIMELINE_CONFIG.descriptionPaddingTopLgClassName,
  descriptionPaddingLeftLgClassName: DEFAULT_ABOUT_TIMELINE_CONFIG.descriptionPaddingLeftLgClassName,
} satisfies Partial<AboutTimelineConfig>;

/** desktopCoverFlowTimelineSlotEnabled: mirrors
 * abstractCoverFlowTimelineSlotConfig.enabledLg (pages/abstract.tsx), the
 * exact same toggle resolveAbstractPolymorphicLayoutConfigForDesktopMode
 * above keys on. true (default): DEFAULT_ABSTRACT_TIMELINE_CONFIG's own
 * CoverFlow-track-tuned values, byte-identical to passing that config
 * straight through. false: ABSTRACT_TIMELINE_LEGACY_DESKTOP_OVERRIDES
 * layered on top, restoring the classic placement's own pre-regression Lg
 * values. */
export function resolveAbstractTimelineConfigForDesktopMode(
  config: AboutTimelineConfig,
  desktopCoverFlowTimelineSlotEnabled: boolean,
): AboutTimelineConfig {
  return desktopCoverFlowTimelineSlotEnabled
    ? config
    : { ...config, ...ABSTRACT_TIMELINE_LEGACY_DESKTOP_OVERRIDES };
}

/**
 * Keeps the shared panel's mobile vertical-alignment controls effective at
 * every width. Explicit md/lg classes otherwise mask a base edit. The
 * shared updater changes those siblings in one state transaction; a later
 * Tablet/Desktop edit can still diverge independently.
 *
 * Column background color used to get this same base-to-Wide/Lg cascade
 * treatment too, but that was the wrong fix for the wrong problem: color
 * source (colorSource) is now a genuinely tiered field in its own right
 * (colorSourceWide/-Lg — see PolymorphicLayout.config.ts), so a base-tier
 * color edit no longer needs to be silently mirrored into higher tiers to
 * "take effect everywhere" — each tier has its own real source and color
 * value, set independently through its own tab, the same segregated
 * per-breakpoint shape headerSplitBandEnabled's own mode/color fields
 * already had. Cascading the base color into Wide/Lg here would instead
 * silently clobber a deliberately-diverged Tablet/Desktop color the moment
 * an operator touched the Mobile tab's own color — removed, not ported.
 */
export function applyAbstractPolymorphicLayoutAllSizesUpdate(
  previous: PolymorphicLayoutConfig,
  next: PolymorphicLayoutConfig,
): PolymorphicLayoutConfig {
  return applyPolymorphicLayoutAllSizesUpdate(previous, next);
}

// Abstract owns an independent, panel-writable instance of the shared
// editorial accordion preset. About's interactive accordion and Journal's
// introduction keep their own values.
// Page-owned instance of CardAppearanceConfig (experiences/abstract/
// components/Card/config/appearance.ts) — same "page-owned copy, panel-
// writable independently" shape as DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG
// below and DEFAULT_ABSTRACT_TIMELINE_CONFIG elsewhere in this file.
// pages/abstract.tsx previously read DEFAULT_CARD_APPEARANCE_CONFIG
// directly (see that file's own comment on why: the shared default's own
// neighbor-fill tuning was already correct for this page, so there was no
// need to diverge). PLAN-COVERFLOW-NEIGHBOR-COLOR-TRANSITION-SYNC.md is the
// first real divergence: CoverFlow's own default gaussian settle curve caps
// the ACTIVE/INCOMING card's position glide at 1290ms
// (CoverFlowConfig.gaussianSettleMaxDurationMs) regardless of how far a jump
// travels, but the three appearance-duration fields below defaulted to
// 180ms/500ms/500ms — each one finishes changing color/opacity/gradient
// treatment while the card still has a large fraction of its positional
// glide left to run, reading as a snap on a still-visibly-moving card
// (screenshot-reported, both directions — the card about to become
// active, and the card about to become inactive). Raised to 1350ms — above
// that 1290ms ceiling with a small margin, and within the (now 1400ms)
// normalizer ceiling those three fields share
// (SplitColumnCardPreview/config/stack.ts) — so under this page's own
// default gaussian curve, none of the three can mathematically finish
// before the position does, for any jump distance. journal.tsx's own
// DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG (pages/journal.config.ts) and the
// shared DEFAULT_CARD_APPEARANCE_CONFIG itself are untouched by this —
// this divergence is Abstract-specific.
export const DEFAULT_ABSTRACT_CARD_APPEARANCE_CONFIG: CardAppearanceConfig = normalizeCardAppearanceConfig({
  ...DEFAULT_CARD_APPEARANCE_CONFIG,
  stepTiltDurationMs: 1350,
  neighborGradientRevealDurationMs: 1350,
  neighborShadowFadeDurationMs: 1350,
});

export const DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG: AboutMobileAccordionConfig = {
  ...DEFAULT_EDITORIAL_ACCORDION_ITEM_CONFIG,
};

/**
 * Opt-in alternate presentation of the Timeline: instead of living in
 * AbstractNarrowColumnStack's own `bottom` slot (the existing tablet/desktop
 * placement, driven by tabletTimelineWeight/tabletTimelineVerticalAlign
 * above), the Timeline renders as a figure inside the CoverFlow's own track,
 * alongside the active card, matching the screenshot reference for this
 * feature. Mobile is out of scope — MobilePinnedArticleSection's own list
 * presentation already owns the Timeline there — so every geometry field is
 * tiered Md/Lg only, no untiered base fallback. `enabledMd`/`enabledLg`
 * gate each tier fully independently (an operator can run this placement on
 * tablet only, desktop only, both, or neither) — pages/abstract.tsx
 * suppresses the narrow-column stack's own bottom Timeline render on
 * whichever tier has this on, so only one timeline/tablist landmark exists
 * in the DOM at a time on that tier (same constraint PLAN-ABSTRACT-TABLET-
 * HERO-TIMELINE-COVERFLOW-ORDER.md already established for the hero/timeline
 * pair) — the tier this is off for keeps rendering the classic bottom
 * placement instead, never neither.
 * tiltEnabled reuses normalizedCtaButtonConfig verbatim for the actual
 * tilt/lift/scale magnitudes — "same config knobs as the card" per the
 * operator ask — this field only gates whether that shared physics engine
 * is attached at all, it holds no magnitude of its own.
 */
export type AbstractCoverFlowTimelineSlotPositionMode =
  'free' | 'snapLeft' | 'snapRight' | 'betweenActiveAndLeftNeighbor';

export type AbstractCoverFlowTimelineSlotBackgroundMode = 'flat' | 'gradient';

export type AbstractCoverFlowTimelineSlotConfig = {
  enabledMd: boolean;
  enabledLg: boolean;
  /** CSS `aspect-ratio` convention (width divided by height) — the
   * INVERSE of CoverFlowConfig.cardAspectRatio's own height/width
   * convention (see capCoverFlowCardSize's own `itemWidth = itemHeight /
   * cardAspectRatio`). Defaults below are seeded as
   * `1 / DEFAULT_COVER_FLOW_CONFIG.cardAspectRatio`, so the figure starts
   * out exactly the same shape as the CoverFlow card it sits beside, tiered
   * independently from that point on. */
  aspectRatioMd: number;
  aspectRatioLg: number;
  /** Scales the figure's own box (both width and height together, via CSS
   * width + aspect-ratio — never a `transform: scale()`) relative to the
   * CoverFlow track's own width. The AboutTimeline content inside lays out
   * at its own configured font sizes regardless of this value — growing or
   * shrinking the figure changes how much room that content has, never how
   * large it renders. */
  widthPercentMd: number;
  widthPercentLg: number;
  /** 'free' (default): positioned via xPercent below, same as today.
   * 'snapLeft'/'snapRight': the figure bleeds flush against that edge of
   * the CoverFlow's own visible track instead — xPercent is ignored while
   * either is active. Tilt/lift physics are force-disabled in both snapped
   * modes regardless of tiltEnabled below (a flush-mounted edge panel reads
   * as part of the track's own frame, not a free-floating hoverable card),
   * and the corner radius on the snapped edge (both corners on that side)
   * is forced to 0 so the figure's edge reads as flush/seamless against the
   * track boundary instead of visibly rounded-off mid-air.
   * 'betweenActiveAndLeftNeighbor': the figure's own center tracks the
   * midpoint of the live gap between the active card's left edge and its
   * left neighbor's right edge — measured from the real, rendered card
   * boxes every frame (AbstractCoverFlowTimelineSlot.tsx), so it stays
   * correct under any CoverFlow spacing/landing-mode configuration and
   * follows the cards smoothly through a drag, not just at rest. When the
   * active card has no left neighbor (index 0), the track's own left edge
   * substitutes for the missing neighbor's right edge. xPercent is ignored
   * here too; tilt/lift and corner radius are unaffected (same as 'free').
   * Exactly one of these four modes is ever active per tier — mutually
   * exclusive, not composable. */
  positionModeMd: AbstractCoverFlowTimelineSlotPositionMode;
  positionModeLg: AbstractCoverFlowTimelineSlotPositionMode;
  /** Horizontal position of the slot's own center within the CoverFlow
   * track, 0-100 — same "where in the X axis" convention as CoverFlow's own
   * activeCardLandingXPercent. Ignored while positionMode(Md/Lg) above is
   * not 'free'. */
  xPercentMd: number;
  xPercentLg: number;
  /** A lower bound for the figure's rendered left edge in free position
   * mode. Values come from the shared Tailwind padding-left scale, then are
   * resolved to CSS lengths at the CoverFlow track so spacing vocabulary is
   * consistent with the rest of the page. Base is stored for complete
   * responsive ownership; the track currently renders at Md/Lg only. */
  minLeftInsetClassName: PaddingLeftClass;
  minLeftInsetClassNameMd: PaddingLeftClassMd;
  minLeftInsetClassNameLg: PaddingLeftClassLg;
  /** Opt-in at tablet/desktop: aligns the Timeline figure's left edge to the
   * rendered top-segment wordmark. The minimum left inset remains a hard
   * viewport-safe floor. */
  alignToTopWordmarkMd: boolean;
  alignToTopWordmarkLg: boolean;
  verticalAlignMd: AbstractNarrowColumnStackVerticalAlign;
  verticalAlignLg: AbstractNarrowColumnStackVerticalAlign;
  /** 'flat': the figure's own face is a single solid backgroundColor, no
   * gradient math at all. 'gradient': a two-stop CSS linear-gradient from
   * backgroundColor to backgroundGradientColorEnd, angled/scaled by the two
   * fields below. The base value is mobile; Md/Lg override it at their
   * respective breakpoints. */
  backgroundMode: AbstractCoverFlowTimelineSlotBackgroundMode;
  backgroundModeMd: AbstractCoverFlowTimelineSlotBackgroundMode;
  backgroundModeLg: AbstractCoverFlowTimelineSlotBackgroundMode;
  backgroundColor: string;
  backgroundColorMd: string;
  backgroundColorLg: string;
  /** Opacity of only the figure's background layer. Timeline copy and
   * controls remain fully opaque; base/Md/Lg are independently authored. */
  backgroundOpacity: number;
  backgroundOpacityMd: number;
  backgroundOpacityLg: number;
  /** CSS backdrop-filter blur behind the figure's background layer in px.
   * 0 disables it. Base/Md/Lg are independently authored. */
  backdropBlurPx: number;
  backdropBlurPxMd: number;
  backdropBlurPxLg: number;
  /** The gradient's second color stop. Ignored while backgroundMode is
   * 'flat'. Independently authored rather than derived from backgroundColor
   * (an earlier version derived it via deriveSurfaceColor + a tint-offset
   * knob) — the operator asked to set both stops directly. */
  backgroundGradientColorEnd: string;
  backgroundGradientColorEndMd: string;
  backgroundGradientColorEndLg: string;
  /** CSS `linear-gradient()` angle, 0-360 (wraps). 150 matches this
   * feature's original hardcoded angle, so an unconfigured figure paints
   * identically to before this field existed. */
  backgroundGradientAngleDeg: number;
  backgroundGradientAngleDegMd: number;
  backgroundGradientAngleDegLg: number;
  /** Where along the gradient line backgroundGradientColorEnd reaches its
   * full, unmixed color, as a percent of the figure's own box (the second
   * stop's own CSS gradient position). 100 (default): stop2 lands exactly
   * at the box's far edge, the plain two-color gradient every gradient
   * defaults to. Below 100: stop2's pure color is reached before the edge,
   * so the remainder of the box paints flat in that color. Above 100: stop2
   * is pushed past the edge, so the box never reaches its pure color, only
   * ever a blend of the two — a wider, softer transition. */
  backgroundGradientScale: number;
  backgroundGradientScaleMd: number;
  backgroundGradientScaleLg: number;
  /** Opt-in only: derives Timeline copy from this figure's configured
   * background start color at the active tablet/desktop tier. */
  adaptiveTextInkEnabledMd: boolean;
  adaptiveTextInkEnabledLg: boolean;
  /** Mirrors PolymorphicLayout's restrained gradient-to-ink controls. */
  adaptiveTextInkDarkInkSaturationMd: number;
  adaptiveTextInkDarkInkSaturationLg: number;
  adaptiveTextInkDarkInkOpacityMultiplierMd: number;
  adaptiveTextInkDarkInkOpacityMultiplierLg: number;
  adaptiveTextInkLightInkToleranceMd: number;
  adaptiveTextInkLightInkToleranceLg: number;
  /** Minimum physical width of the Timeline figure in px. Base is mobile;
   * Md/Lg apply independently at their breakpoints. 0 leaves it unconstrained. */
  minWidth: number;
  minWidthMd: number;
  minWidthLg: number;
  tiltEnabled: boolean;
  /** How long (ms) the row list takes to smoothly scroll the newly-active
   * row back into view whenever drag/swipe (or click) navigation lands on a
   * row currently outside the visible window (AboutTimeline's own
   * scrollWindowActiveScrollDurationMs prop) — a real tween, not the
   * browser's own unconfigurable `scrollIntoView` smoothing. 0 jumps
   * instantly instead. Only meaningful alongside the Timeline panel's
   * Visible links setting (0 there means nothing ever scrolls). */
  scrollWindowActiveScrollDurationMsMd: number;
  scrollWindowActiveScrollDurationMsLg: number;
  /** Which of this codebase's shared motion curves that scroll eases
   * through (AboutTimeline's own scrollWindowActiveScrollEasing prop) —
   * same catalog/convention as CoverFlowConfig's own settle-motion easing
   * fields elsewhere in this file. */
  scrollWindowActiveScrollEasingMd: CtaButtonMotionEasing;
  scrollWindowActiveScrollEasingLg: CtaButtonMotionEasing;
  /** Holds the bring-into-view scroll above until this many ms after the
   * CoverFlow's own activeIndex changes (AboutTimeline's own
   * scrollWindowActiveScrollDelayMs prop) — that prop commits at drag
   * release, while the card's own settle glide keeps animating for a while
   * longer, so scrolling the list immediately reads as two independent
   * things moving at once. 0 (default): scrolls immediately. */
  scrollWindowActiveScrollDelayMsMd: number;
  scrollWindowActiveScrollDelayMsLg: number;
};

export const DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG = {
  enabledMd: true,
  enabledLg: true,
  aspectRatioMd: 0.85,
  aspectRatioLg: 0.8,
  widthPercentMd: 34,
  widthPercentLg: 16,
  positionModeMd: 'betweenActiveAndLeftNeighbor',
  positionModeLg: 'free',
  xPercentMd: 30,
  xPercentLg: 12,
  minLeftInsetClassName: 'pl-0',
  minLeftInsetClassNameMd: 'md:pl-0',
  minLeftInsetClassNameLg: 'lg:pl-12',
  alignToTopWordmarkMd: false,
  alignToTopWordmarkLg: true,
  verticalAlignMd: 'center',
  verticalAlignLg: 'center',
  backgroundMode: 'flat',
  backgroundModeMd: 'flat',
  backgroundModeLg: 'flat',
  backgroundColor: '#ffffff',
  backgroundColorMd: '#3671bf',
  backgroundColorLg: '#396689',
  backgroundOpacity: 1,
  backgroundOpacityMd: 0.85,
  backgroundOpacityLg: 0.65,
  backdropBlurPx: 64,
  backdropBlurPxMd: 23,
  backdropBlurPxLg: 23,
  backgroundGradientColorEnd: '#f4f6fb',
  backgroundGradientColorEndMd: '#f4f6fb',
  backgroundGradientColorEndLg: '#f4f6fb',
  backgroundGradientAngleDeg: 360,
  backgroundGradientAngleDegMd: 360,
  backgroundGradientAngleDegLg: 360,
  backgroundGradientScale: 170,
  backgroundGradientScaleMd: 170,
  backgroundGradientScaleLg: 170,
  adaptiveTextInkEnabledMd: false,
  adaptiveTextInkEnabledLg: true,
  adaptiveTextInkDarkInkSaturationMd: 2,
  adaptiveTextInkDarkInkSaturationLg: 0.7,
  adaptiveTextInkDarkInkOpacityMultiplierMd: 0.73,
  adaptiveTextInkDarkInkOpacityMultiplierLg: 1,
  adaptiveTextInkLightInkToleranceMd: 1.2,
  adaptiveTextInkLightInkToleranceLg: 0,
  minWidth: 0,
  minWidthMd: 255,
  minWidthLg: 300,
  tiltEnabled: true,
  scrollWindowActiveScrollDurationMsMd: 420,
  scrollWindowActiveScrollDurationMsLg: 420,
  scrollWindowActiveScrollEasingMd: 'standard',
  scrollWindowActiveScrollEasingLg: 'standard',
  scrollWindowActiveScrollDelayMsMd: 300,
  scrollWindowActiveScrollDelayMsLg: 300,
} satisfies AbstractCoverFlowTimelineSlotConfig;

export type AbstractTimelineLinkColorMode = 'manual' | 'deriveFromGradient';

/**
 * Opt-in background + text color treatment for each Timeline row's own
 * link/button ("chip" look) — /about's own AboutTimeline has never painted a
 * background behind a row; this is additive, off by default
 * (`enabled: false`), byte-identical to today until switched on.
 *
 * Hover and active/selected share ONE state ("hover/active") rather than
 * three independent ones — the same "hover and active read identically"
 * convention AboutTimeline's own existing title/description colors already
 * use internally (`isHoveredRow || selected`). The Table of Contents follows
 * the same interaction-color principle: its resting ink is the one color
 * identity, while its hover and current-section surfaces resolve that ink for
 * state-specific contrast instead of treating each state as a separate
 * palette.
 *
 * 'manual' (default): backgroundColor(Active)/textColor(Active) below, used
 * verbatim. 'deriveFromGradient': both colors are computed from the page's
 * own live background gradient instead, through
 * `resolveGradientColumnTypography` (PolymorphicLayout.narrowColumnTypography.ts)
 * — the exact same background→contrast-side→dark-ink-saturation-chroma
 * algorithm already used for the narrow/wide column's own unified text ink,
 * not a second, independently-tuned one. darkInkSaturation/
 * darkInkOpacityMultiplier/lightInkTolerance are that function's own three
 * knobs, named and bounded identically to their PolymorphicLayout panel
 * counterparts ("Dark ink saturation"/"Dark ink opacity"/"Light ink
 * tolerance"). activeSurfaceOffset is the one addition this link-specific
 * use needs beyond that shared function (which has no notion of a hover/
 * active state): a deriveSurfaceColor lighten/darken amount applied to the
 * SAME gradient-derived background for the hover/active chip, so it reads
 * as "lifted" relative to the resting chip — text is then re-resolved
 * against that adjusted background, not the resting one, so contrast holds
 * in both states.
 *
 * Tablet and desktop fields are tiered Md/Lg independently. Mobile has an
 * independent ink-only opt-in that applies only to the expanded article list
 * and derives against that list's panel surface. Mobile row backgrounds stay
 * transparent. The classic narrow-column
 * bottom placement reads the tiered values of its rendering breakpoint. The panel's
 * own "sync from tablet"/"sync from desktop" actions (pages/abstract.panel.ts)
 * copy one tier's complete color config onto the other on demand — the same
 * mechanism PolymorphicLayout.panel.ts's own
 * SYNC_COLORS_FROM_*_ACTION already uses for its column colors, not a new,
 * differently-behaved "keep permanently linked" toggle.
 */
export type AbstractTimelineLinkColorConfig = {
  enabled: boolean;
  enabledMobile: boolean;
  colorModeMobile: AbstractTimelineLinkColorMode;
  textColorMobile: string;
  textColorActiveMobile: string;
  darkInkSaturationMobile: number;
  darkInkOpacityMultiplierMobile: number;
  lightInkToleranceMobile: number;
  colorModeMd: AbstractTimelineLinkColorMode;
  colorModeLg: AbstractTimelineLinkColorMode;
  backgroundColorMd: string;
  backgroundColorLg: string;
  textColorMd: string;
  textColorLg: string;
  backgroundColorActiveMd: string;
  backgroundColorActiveLg: string;
  textColorActiveMd: string;
  textColorActiveLg: string;
  darkInkSaturationMd: number;
  darkInkSaturationLg: number;
  darkInkOpacityMultiplierMd: number;
  darkInkOpacityMultiplierLg: number;
  lightInkToleranceMd: number;
  lightInkToleranceLg: number;
  activeSurfaceOffsetMd: number;
  activeSurfaceOffsetLg: number;
};

export const DEFAULT_ABSTRACT_TIMELINE_LINK_COLOR_CONFIG = {
  enabled: false,
  enabledMobile: true,
  colorModeMobile: 'manual',
  textColorMobile: '#0f172a',
  textColorActiveMobile: '#0f172a',
  darkInkSaturationMobile: 0,
  darkInkOpacityMultiplierMobile: 1,
  lightInkToleranceMobile: 0,
  colorModeMd: 'manual',
  colorModeLg: 'manual',
  backgroundColorMd: 'transparent',
  backgroundColorLg: 'transparent',
  textColorMd: '#0f172a',
  textColorLg: '#0f172a',
  backgroundColorActiveMd: '#0f172a',
  backgroundColorActiveLg: '#0f172a',
  textColorActiveMd: '#ffffff',
  textColorActiveLg: '#ffffff',
  darkInkSaturationMd: 0,
  darkInkSaturationLg: 0,
  darkInkOpacityMultiplierMd: 0.29,
  darkInkOpacityMultiplierLg: 1,
  lightInkToleranceMd: 0,
  lightInkToleranceLg: 0,
  activeSurfaceOffsetMd: -0.03,
  activeSurfaceOffsetLg: -0.12,
} satisfies AbstractTimelineLinkColorConfig;
