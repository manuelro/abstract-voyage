import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config';
import {
  DEFAULT_ABOUT_TIMELINE_CONFIG,
  type AboutTimelineConfig,
} from '../experiences/about/components/AboutTimeline.config';
import {
  DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG,
  type AboutMobileAccordionConfig,
} from '../experiences/about/components/AboutMobileAccordion.config';
import type {
  BorderTopWidthClass,
  GapClass,
  MarginTopClass,
  PaddingBottomClass,
  PaddingTopClass,
  PaddingXClass,
  PaddingYClass,
} from '../components/tailwindSpacingScale';
import {
  BORDER_TOP_WIDTH_OPTIONS,
  GAP_OPTIONS,
  MARGIN_TOP_OPTIONS,
  PADDING_BOTTOM_OPTIONS,
  PADDING_TOP_OPTIONS,
  PADDING_X_OPTIONS,
  PADDING_Y_OPTIONS,
} from '../components/tailwindSpacingScale';
import type {
  FontSizeClass,
  FontWeightClass,
} from '../components/tailwindTypographyScale';
import {
  FONT_SIZE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
} from '../components/tailwindTypographyScale';

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
  enabled: true,
  enabledWide: true,
  enabledLg: true,
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
} satisfies AbstractNarrowColumnStackConfig;

const PRESENTATION_MODES: ReadonlyArray<AbstractPagePresentationMode> = ['splitColumn', 'classic'];
const STACK_HORIZONTAL_ALIGNMENTS: ReadonlyArray<AbstractNarrowColumnStackHorizontalAlign> = [
  'start', 'center', 'end', 'stretch',
];
const STACK_VERTICAL_ALIGNMENTS: ReadonlyArray<AbstractNarrowColumnStackVerticalAlign> = [
  'start', 'center', 'end',
];
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
const FOOTER_PADDING_Y_CLASSES = PADDING_Y_OPTIONS.map(option => option.value);
const FOOTER_PADDING_X_CLASSES = PADDING_X_OPTIONS.map(option => option.value);
const FOOTER_PADDING_TOP_CLASSES = PADDING_TOP_OPTIONS.map(option => option.value);
const FOOTER_PADDING_BOTTOM_CLASSES = PADDING_BOTTOM_OPTIONS.map(option => option.value);
const FOOTER_MARGIN_TOP_CLASSES = MARGIN_TOP_OPTIONS.map(option => option.value);
const FOOTER_GAP_CLASSES = GAP_OPTIONS.map(option => option.value);
const FOOTER_BORDER_TOP_WIDTH_CLASSES = BORDER_TOP_WIDTH_OPTIONS.map(option => option.value);
const FOOTER_BORDER_COLOR_MODES: ReadonlyArray<AbstractFooterConfig['pageLinkBorderColorMode']> = [
  'derived', 'custom',
];
const FOOTER_FONT_SIZE_CLASSES = FONT_SIZE_OPTIONS.map(option => option.value);
const FOOTER_FONT_WEIGHT_CLASSES = FONT_WEIGHT_OPTIONS.map(option => option.value);

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
    sectionPaddingYClassName: token(
      base.sectionPaddingYClassName,
      FOOTER_PADDING_Y_CLASSES,
      D.sectionPaddingYClassName,
    ),
    pageItemGapClassName: token(base.pageItemGapClassName, FOOTER_GAP_CLASSES, D.pageItemGapClassName),
    pageItemPaddingYClassName: token(
      base.pageItemPaddingYClassName,
      FOOTER_PADDING_Y_CLASSES,
      D.pageItemPaddingYClassName,
    ),
    pageItemPaddingXClassName: token(
      base.pageItemPaddingXClassName,
      FOOTER_PADDING_X_CLASSES,
      D.pageItemPaddingXClassName,
    ),
    pageTitlePaddingBottomClassName: token(
      base.pageTitlePaddingBottomClassName,
      FOOTER_PADDING_BOTTOM_CLASSES,
      D.pageTitlePaddingBottomClassName,
    ),
    pageTitleFontSizeClassName: token(
      base.pageTitleFontSizeClassName,
      FOOTER_FONT_SIZE_CLASSES,
      D.pageTitleFontSizeClassName,
    ),
    pageTitleFontWeightClassName: token(
      base.pageTitleFontWeightClassName,
      FOOTER_FONT_WEIGHT_CLASSES,
      D.pageTitleFontWeightClassName,
    ),
    pageDescriptionMarginTopClassName: token(
      base.pageDescriptionMarginTopClassName,
      FOOTER_MARGIN_TOP_CLASSES,
      D.pageDescriptionMarginTopClassName,
    ),
    pageDescriptionPaddingTopClassName: token(
      base.pageDescriptionPaddingTopClassName,
      FOOTER_PADDING_TOP_CLASSES,
      D.pageDescriptionPaddingTopClassName,
    ),
    pageDescriptionFontSizeClassName: token(
      base.pageDescriptionFontSizeClassName,
      FOOTER_FONT_SIZE_CLASSES,
      D.pageDescriptionFontSizeClassName,
    ),
    pageDescriptionFontWeightClassName: token(
      base.pageDescriptionFontWeightClassName,
      FOOTER_FONT_WEIGHT_CLASSES,
      D.pageDescriptionFontWeightClassName,
    ),
    pageLinkBulletEnabled: Boolean(base.pageLinkBulletEnabled),
    pageLinkBorderEnabled: Boolean(base.pageLinkBorderEnabled),
    pageLinkBorderWidthClassName: token(
      base.pageLinkBorderWidthClassName,
      FOOTER_BORDER_TOP_WIDTH_CLASSES,
      D.pageLinkBorderWidthClassName,
    ),
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
    topBorderWidthClassName: token(
      base.topBorderWidthClassName,
      FOOTER_BORDER_TOP_WIDTH_CLASSES,
      D.topBorderWidthClassName,
    ),
    topBorderColorMode: token(base.topBorderColorMode, FOOTER_TOP_BORDER_COLOR_MODES, D.topBorderColorMode),
    topBorderColor: nonEmptyText(base.topBorderColor, D.topBorderColor),
    topBorderSurfaceOffset: clampRange(base.topBorderSurfaceOffset, -1, 1, D.topBorderSurfaceOffset),
    topBorderOpacity: clampRange(base.topBorderOpacity, 0, 1, D.topBorderOpacity),
    contactSpaceBeforeClassName: token(
      base.contactSpaceBeforeClassName,
      FOOTER_MARGIN_TOP_CLASSES,
      D.contactSpaceBeforeClassName,
    ),
    contactFontSizeClassName: token(
      base.contactFontSizeClassName,
      FOOTER_FONT_SIZE_CLASSES,
      D.contactFontSizeClassName,
    ),
    contactFontWeightClassName: token(
      base.contactFontWeightClassName,
      FOOTER_FONT_WEIGHT_CLASSES,
      D.contactFontWeightClassName,
    ),
    contactEmailEnabled: Boolean(base.contactEmailEnabled),
    contactText: text(base.contactText, D.contactText),
    wordmarkSpaceBeforeClassName: token(
      base.wordmarkSpaceBeforeClassName,
      FOOTER_MARGIN_TOP_CLASSES,
      D.wordmarkSpaceBeforeClassName,
    ),
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
// Re-exported here unchanged so no other consumer of this file's own
// ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG import needs to change.
export { ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG } from '../experiences/abstract/components/PolymorphicLayout.pageConfigs';

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
export const DEFAULT_ABSTRACT_TIMELINE_CONFIG: AboutTimelineConfig = {
  ...DEFAULT_ABOUT_TIMELINE_CONFIG,
  maxWidthClassName: 'max-w-prose',
  maxWidthWideClassName: 'md:max-w-lg',
  maxWidthLgClassName: 'lg:max-w-lg',
  paddingTopClassName: 'pt-5',
  paddingRightClassName: 'pr-10',
  paddingLeftClassName: 'pl-4',
  rowGap: 'gap-3',
  markerSizeClassName: 'w-2.5 h-2.5',
  markerColorMode: 'text',
  markerCustomColor: '#6c6b94',
  hoverMarkerOpacity: 0.4,
  markerIdleOpacity: 0.31,
  markerActiveOpacity: 0.55,
  markerGradientEnabled: false,
  rowTitleFontSizeClassName: 'text-xs',
  rowTitleFontSizeWideClassName: 'md:text-sm',
  rowTitleFontSizeLgClassName: 'lg:text-sm',
  rowTitleLineHeightClassName: 'leading-[1.6]',
  rowTitleFontWeightClassName: 'font-normal',
  rowTitleFontWeightWideClassName: 'md:font-normal',
  rowTitleFontWeightLgClassName: 'lg:font-normal',
  rowTitleFontWeightClassNameActive: 'font-normal',
  rowTitleFontWeightActiveWideClassName: 'md:font-normal',
  rowTitleFontWeightActiveLgClassName: 'lg:font-normal',
  rowTitleMinContrastActive: 7.6,
  rowTitleMinContrastInactive: 3.5,
  rowTitleOpacityInactive: 0.32,
  rowDescriptionMinContrastActive: 4,
  rowDescriptionMinContrastInactive: 2.7,
  description: 'Essays',
  descriptionVisible: false,
  descriptionFontSizeClassName: 'text-sm',
  alignment: 'left',
  alignmentWide: 'right',
  alignmentLg: 'right',
  descriptionOpacity: 0.61,
  descriptionPaddingBottomLgClassName: 'lg:pb-7',
  rowAppendixEnabled: false,
  rowAppendixRevealDelayMs: 340,
  rowAppendixSeparator: '⋅',
  paddingTopLgClassName: 'lg:pt-7',
  marginTopLgClassName: 'lg:mt-0',
};

const VERTICAL_ALIGN_WIDE_BY_BASE: Record<
  PolymorphicLayoutConfig['wideColumnContentVerticalAlign'],
  PolymorphicLayoutConfig['wideColumnContentVerticalAlignWide']
> = {
  'justify-start': 'md:justify-start',
  'justify-center': 'md:justify-center',
  'justify-end': 'md:justify-end',
};

const VERTICAL_ALIGN_LG_BY_BASE: Record<
  PolymorphicLayoutConfig['wideColumnContentVerticalAlign'],
  PolymorphicLayoutConfig['wideColumnContentVerticalAlignLg']
> = {
  'justify-start': 'lg:justify-start',
  'justify-center': 'lg:justify-center',
  'justify-end': 'lg:justify-end',
};

/**
 * Keeps /abstract's two genuinely "All sizes" vertical-alignment controls
 * honest. PolymorphicLayout stores explicit md/lg values because those
 * tiers can be tuned independently. That also means a base edit cannot
 * cascade through CSS: the always-present breakpoint classes mask it
 * immediately. When the operator edits base vertical alignment, this page
 * deliberately updates its two breakpoint siblings in the same state
 * transaction. A later edit in the Tablet/Desktop tab can still diverge
 * either tier independently.
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
  let resolved = next;

  if (next.wideColumnContentVerticalAlign !== previous.wideColumnContentVerticalAlign) {
    resolved = {
      ...resolved,
      wideColumnContentVerticalAlignWide:
        VERTICAL_ALIGN_WIDE_BY_BASE[next.wideColumnContentVerticalAlign],
      wideColumnContentVerticalAlignLg:
        VERTICAL_ALIGN_LG_BY_BASE[next.wideColumnContentVerticalAlign],
    };
  }
  if (next.narrowColumnContentVerticalAlign !== previous.narrowColumnContentVerticalAlign) {
    resolved = {
      ...resolved,
      narrowColumnContentVerticalAlignWide:
        VERTICAL_ALIGN_WIDE_BY_BASE[next.narrowColumnContentVerticalAlign],
      narrowColumnContentVerticalAlignLg:
        VERTICAL_ALIGN_LG_BY_BASE[next.narrowColumnContentVerticalAlign],
    };
  }

  return resolved;
}

// Page-owned instance of AboutMobileAccordionConfig (experiences/about/
// components/AboutMobileAccordion.config.ts) — AbstractEditorialHero's own
// accordionItemPresentationEnabled reuses AboutMobileAccordionItem verbatim
// (see that config field's own doc comment), and this is the config that
// reuse is tuned from. Same "page-owned copy of a shared component default,
// panel-writable independently" shape as DEFAULT_ABSTRACT_TIMELINE_CONFIG
// above — /about's own real mobile accordion keeps writing to
// DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG through its own panel untouched;
// this page gets its own independent instance so a panel edit here (e.g.
// hiding the open indicator, retuning font size) never retunes /about's
// real accordion, and vice versa (the exact class of bug
// ABOUT_DEFAULT_DOCK_PALETTE_CONFIG's own doc comment, about.config.ts,
// already documents and fixes for a different scope).
// headerTextWrapEnabled: true (diverges from the shared default's `false`)
// — this presentation's "header" is a full editorial headline, not a short
// excerpt; clipping it to one line would defeat the entire point of reusing
// this component here.
export const DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG: AboutMobileAccordionConfig = {
  ...DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG,
  contentFontSizeClassName: 'text-lg',
  headerTextWrapEnabled: true,
  affordancePaddingX: 'px-0',
  affordancePaddingY: 'py-0',
};
