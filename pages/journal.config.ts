import {
  DEFAULT_ABOUT_TIMELINE_CONFIG,
  normalizeAboutTimelineConfig,
  type AboutTimelineConfig,
} from '../experiences/about/components/AboutTimeline.config'
import {
  DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG,
  normalizeAboutMobileAccordionConfig,
  type AboutMobileAccordionConfig,
} from '../experiences/about/components/AboutMobileAccordion.config'
import { DEFAULT_EDITORIAL_ACCORDION_ITEM_CONFIG } from '../experiences/about/components/EditorialAccordionItem.config'
import { normalizeTailwindToken, type TailwindTokenValue } from '../components/Panel/config/tailwindFields'
import { DEFAULT_CHRONOLOGY_TIMELINE_CONFIG, type ChronologyTimelineConfig } from '../components/ChronologyTimeline/ChronologyTimeline.config'
import {
  DEFAULT_ARTICLE_FILTER_CONFIG,
  normalizeArticleFilterConfig,
  type ArticleFilterConfig,
} from '../experiences/journal/components/ArticleFilter/ArticleFilter.config'
import {
  DEFAULT_CARD_APPEARANCE_CONFIG,
  normalizeCardAppearanceConfig,
  type CardAppearanceConfig,
} from '../experiences/abstract/components/Card/config/appearance'
import {
  normalizePolymorphicLayoutConfig,
  type PolymorphicLayoutConfig,
} from '../experiences/abstract/components/PolymorphicLayout.config'
import { POST_LAB_POLYMORPHIC_LAYOUT_CONFIG } from '../experiences/abstract/components/PolymorphicLayout.pageConfigs'

// Full field-for-field parity with /posts-lab's own instance
// (POST_LAB_POLYMORPHIC_LAYOUT_CONFIG, experiences/abstract/components/
// PolymorphicLayout.pageConfigs.ts) — both pages share wideColumnSide:
// 'right' already, so unlike /about (whose narrow/wide columns are
// mirrored relative to journal's), no field-name translation is needed
// here; every field below is a direct copy of posts-lab's own resolved
// value, not a re-derivation. This is a one-time value copy (spread at
// module load), not a live link — a future change to posts-lab's own
// instance won't retroactively change journal's; re-sync explicitly if
// parity should be kept going forward.
export const JOURNAL_POLYMORPHIC_LAYOUT_CONFIG: PolymorphicLayoutConfig = {
  ...POST_LAB_POLYMORPHIC_LAYOUT_CONFIG,
  narrowColumnContentContainer: 'bounded',
  // Operator-reported: a large blank gap between the header and the first
  // article on mobile/tablet. Root cause — POST_LAB_POLYMORPHIC_LAYOUT_CONFIG
  // never overrides wideColumnContentPaddingTop/-Wide, so journal inherited
  // DEFAULT_POLYMORPHIC_LAYOUT_CONFIG's own 'pt-0'/'md:pt-14' (56px at
  // tablet). /about's own ABOUT_POLYMORPHIC_LAYOUT_CONFIG (which also
  // single-column-stacks at md, same precedent narrowColumnWidthTierMd
  // below already follows) instead sets 'pt-7'/'md:pt-0' — copied verbatim
  // here so mobile/tablet content placement matches /about's exactly. Lg
  // (desktop) is left to journal's own existing 'lg:pt-5' — out of this
  // mobile/tablet-only ask.
  wideColumnContentPaddingTop: 'pt-7',
  wideColumnContentPaddingTopWide: 'md:pt-0',
  // Bug fix (operator-reported, 2026-10-01: tablet gap persisted after the
  // padding fix above): SplitColumnPageShell.tsx gives EACH column its own
  // independent marginTop: measuredHeaderHeightPx whenever that column's
  // own *ColumnHeaderBehavior is 'pushDown' — correct when columns sit in
  // parallel side-by-side tracks, but a double header-clearance push when
  // they're stacked in the same track (narrowColumnWidthTierMd: 'stacked'
  // below + stackedColumnOrder 'narrowFirst': narrow pushes down first,
  // then wide pushed down AGAIN on top of that). Measured live: ~144px
  // duplicated. Same wideColumnHeaderBehavior/'pushDown' +
  // narrowColumnHeaderBehavior/'float' pairing ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG
  // already ships for the identical reason — only the wide column (which
  // has real content at every tier) needs the clearance; the narrow
  // column/intro is the one that's empty/hidden at mobile+tablet by
  // default (DEFAULT_JOURNAL_NARROW_COLUMN_CONTENT_CONFIG.enabled/-Wide).
  narrowColumnHeaderBehavior: 'float',
  wideColumnContentPaddingLeftLg: 'lg:pl-5',
  wideColumnContentPaddingTopLg: 'lg:pt-5',
  wideColumnContentPaddingBottomLg: 'lg:pb-20',

  narrowColumnContentPaddingBottom: 'pb-0',

  // Preserve Journal's mobile art direction, while matching /abstract's
  // desktop background recipe exactly at tablet (Wide) and desktop (Lg).
  // This deliberately excludes wordmarkGradient* and layout/surface fields:
  // they are independent visual systems, not background-gradient inputs.
  scrollGradientBaseHue: 200,
  scrollGradientBaseHueWide: 202,
  scrollGradientLightnessMin: 77,
  scrollGradientLightnessMinWide: 72,
  scrollGradientChromaMin: 70,
  scrollGradientChromaMinWide: 40,
  scrollGradientMode: 'center-bright',
  scrollGradientModeWide: 'center-bright',
  scrollGradientCenterStretch: 0.8,
  scrollGradientCenterStretchWide: 1,
  scrollGradientInterpolation: 'srgb',
  scrollGradientInterpolationWide: 'oklab',
  scrollGradientCompositor: 'enhanced',
  scrollGradientCompositorWide: 'enhanced',
  scrollGradientLightRadiusPercent: 60,
  scrollGradientLightRadiusPercentWide: 50,
  scrollGradientLightAspectRatio: 4,
  scrollGradientLightAspectRatioWide: 4,
  scrollGradientExtentPercent: 400,
  scrollGradientExtentPercentWide: 224,
  scrollGradientSmoothness: 4,
  scrollGradientSmoothnessWide: 4,
  scrollGradientDitherAmount: 0.051,
  scrollGradientDitherAmountWide: 0.069,
  scrollGradientDitherScale: 2.2,
  scrollGradientDitherScaleWide: 2.5,
  scrollGradientInkColor: '#c68080',
  scrollGradientViewportRangeVh: 10,
  scrollGradientViewportRangeVhWide: 10,
  scrollGradientMaxDarken: 0,
  scrollGradientMaxDarkenWide: 0,
  scrollGradientLegibilityTargetRatio: 3,
  scrollGradientLegibilityTargetRatioWide: 5.5,
  scrollGradientDarkInkSaturation: 2,
  scrollGradientDarkInkSaturationWide: 2,
  scrollGradientDarkInkOpacityMultiplier: 1,
  scrollGradientDarkInkOpacityMultiplierWide: 1,
  // scrollGradientFocalHorizontal/-LightHiddenPercent/-LightFalloff were
  // already identical across all three tiers before this pass (POST_LAB
  // never overrides their Lg siblings, so all three fall through to
  // DEFAULT_POLYMORPHIC_LAYOUT_CONFIG's own 'left'/50/1) — restated
  // explicitly here, at every tier, rather than left as an un-stated
  // inherited default, so this block is the one place that shows the
  // complete, current gradient recipe for all three breakpoints together.
  scrollGradientFocalHorizontal: 'center',
  scrollGradientFocalHorizontalWide: 'right',
  scrollGradientLightHiddenPercent: 60,
  scrollGradientLightHiddenPercentWide: 70,
  scrollGradientLightFalloff: 1.1,
  scrollGradientLightFalloffWide: 0.8,

  scrollGradientStopsWide: 9,
  scrollGradientMixSamplesWide: 25,
  scrollGradientDitherSeedWide: 100000,
  scrollGradientDarkenOnScrollEnabledWide: false,
  scrollGradientLightInkOnLightBackgroundContrastToleranceWide: 0.4,

  scrollGradientBaseHueLg: 202,
  scrollGradientHueSchemeLg: 'dual-complementary',
  scrollGradientLightnessMinLg: 72,
  scrollGradientChromaMinLg: 40,
  scrollGradientModeLg: 'center-bright',
  scrollGradientStopsLg: 9,
  scrollGradientVarianceLg: 1,
  scrollGradientCenterStretchLg: 1,
  scrollGradientSeedLg: 59452,
  scrollGradientCompositorLg: 'enhanced',
  scrollGradientFocalHorizontalLg: 'center',
  scrollGradientLightHiddenPercentLg: 70,
  scrollGradientLightRadiusPercentLg: 50,
  scrollGradientLightAspectRatioLg: 4,
  scrollGradientLightFalloffLg: 0.8,
  scrollGradientMixSamplesLg: 25,
  scrollGradientInterpolationLg: 'oklab',
  scrollGradientExtentPercentLg: 224,
  scrollGradientSmoothnessLg: 4,
  scrollGradientDitherEnabledLg: true,
  scrollGradientDitherAmountLg: 0.069,
  scrollGradientDitherScaleLg: 2.5,
  scrollGradientDitherSeedLg: 100000,
  scrollGradientInkColorLg: '#c68080',
  scrollGradientViewportRangeVhLg: 10,
  scrollGradientMaxDarkenLg: 0,
  scrollGradientDarkenOnScrollEnabledLg: false,
  scrollGradientLegibilityTargetRatioLg: 5.5,
  scrollGradientDarkInkSaturationLg: 2,
  scrollGradientDarkInkOpacityMultiplierLg: 1,
  scrollGradientLightInkOnLightBackgroundContrastToleranceLg: 0.5,
  scrollGradientNarrowColumnVariantEnabledLg: true,
  scrollGradientNarrowColumnSaturationLg: 1,
  scrollGradientNarrowColumnDarknessLg: 0,

  wordmarkGradientCenterStretch: 0.1,


  wideColumnTransparentWide: true,

  narrowColumnContentPaddingTop: 'pt-5',

  narrowColumnContentWidth: 'max-w-[80%]',

  narrowColumnContentPaddingBottomLg: 'lg:pb-0',

  // Keep the masthead's established outer-edge placement in the page-owned
  // defaults so every shared Polymorphic Layout control remains editable.
  headerLeftSegmentAlignWide: 'md:justify-start',
  headerLeftSegmentAlignLg: 'lg:justify-start',
  headerLeftInnerAlignWide: 'md:justify-start',
  headerLeftInnerAlignLg: 'lg:justify-start',
  headerLeftContentWidthWide: 'md:max-w-percent-100',
  headerLeftContentWidthLg: 'lg:max-w-percent-90',
  headerLeftContentPaddingRightWide: 'md:pr-0',
  headerLeftContentPaddingRightLg: 'lg:pr-0',
  headerRightSegmentAlignWide: 'md:justify-end',
  headerRightSegmentAlignLg: 'lg:justify-end',
  headerRightInnerAlignWide: 'md:justify-end',
  headerRightInnerAlignLg: 'lg:justify-end',

  narrowColumnContentPaddingTopLg: 'lg:pt-9',

  narrowColumnContentWidthLg: 'lg:max-w-[70%]',

  // Operator ask (2026-10-01): tablet keeps mobile's own single-column
  // stacked composition instead of POST_LAB's inherited (DEFAULT_
  // POLYMORPHIC_LAYOUT_CONFIG's own) 38/62 split at md — 'stacked' is the
  // literal "no split, both columns render at their natural 100% width"
  // tier (PolymorphicLayout.config.ts's own PolymorphicLayoutRatioTier doc
  // comment), the same value the base/mobile tier already resolves to
  // whenever narrowColumnWidthTierMd is left unset. Only the md tier
  // changes — narrowColumnWidthTierLg is untouched, so desktop keeps its
  // own existing side-by-side composition.
  narrowColumnWidthTierMd: 'stacked',

  narrowColumnContentPaddingTopWide: 'md:pt-0',

  wideColumnContentPaddingLeftWide: 'md:pl-3',

  headerScrollBehaviorWide: 'static',
}

// Full parity with /about's own timeline (DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG,
// pages/about.config.ts) for every field the shared "Timeline" panel exposes
// — same base + the same 17 overrides that page applies, plus one more
// (rowDescriptionShortViewportHideEnabled) that's a deliberate DIVERGENCE
// from /about, not parity: that field's own default (true) exists for
// /about's fixed-height, overflow-hidden left column, which journal's own
// timeline never sits inside (it scrolls normally, in the ordinary page
// flow) — so journal has no clipping risk to guard against and opts out,
// keeping descriptions visible at every viewport height (operator-reported,
// 2026-09-23: descriptions vanishing on phones with a short visible browser
// viewport, with nothing there actually at risk of clipping).
// `description`/`descriptionWide`/`descriptionLg` (the lead-in copy above
// the rows, one field per breakpoint tier) are the other deliberate
// exception: it's page content (about's own bio lead-in sentence), not
// styling, so journal keeps its own empty value at every tier rather than
// showing about's copy on the journal index. All three tiers need their own
// override, not just the base one — AboutTimeline.tsx only skips rendering
// the lead-in <p> (and the padding it reserves) when EVERY tier's own text
// is empty; leaving descriptionWide/descriptionLg unset left them silently
// inheriting DEFAULT_ABOUT_TIMELINE_CONFIG's own bio sentence, which then
// genuinely rendered on the journal page from 768px up, and — since that
// satisfied the "at least one tier has text" check — reserved the lead-in's
// full padding at every width, including mobile, where the actually-visible
// tier (`description`, base) was correctly empty but the box around it
// wasn't (operator-reported, 2026-09-23, screenshot evidence: an empty box
// with real height above the first timeline row).
// CSS `text-wrap`'s full keyword set — not a Tailwind theme scale (no
// spacing/fontSize-style resolved values to generate from, and this
// property has no first-class Tailwind utility at all on this repo's
// Tailwind 3.3.1, only reachable via the arbitrary-property `[text-wrap:*]`
// syntax already in AboutMobileAccordionItem.tsx's own contentTextClassName()
// helper) — a plain, hand-written enum is the correct, intentional model
// here (createTailwindFieldFactory/normalizeTailwindToken are for resolved-
// theme utility families, not bare CSS keyword properties).
export type JournalAccordionTextWrap = 'wrap' | 'nowrap' | 'balance' | 'pretty' | 'stable'
const JOURNAL_ACCORDION_TEXT_WRAP_VALUES: ReadonlyArray<JournalAccordionTextWrap> = [
  'wrap', 'nowrap', 'balance', 'pretty', 'stable',
]

export type JournalTimelineConfig = AboutTimelineConfig & {
  accordionLinksEnabled: boolean
  accordionItemGap: TailwindTokenValue<'gap'>
  // Bug fix (operator-reported, 2026-10-01): the font-size/description-
  // padding-top fields that used to live here were unconditionally applied
  // in pages/journal.tsx as headerFontSizeClassName/contentFontSizeClassName/
  // contentPaddingTopClassName overrides — which fully shadowed the newer
  // "Article item" panel's own contentFontSizeClassName*/itemContentPaddingTop*
  // (JOURNAL_ARTICLE_ACCORDION_ITEM_PANEL, articleAccordionItemConfig) at
  // every breakpoint, making that panel's knobs appear disconnected.
  // Removed here rather than left dead: 'custom' mode now simply falls
  // through to articleAccordionItemConfig's own fields (same AboutMobileAccordionConfig
  // shape /about's own accordion rows use — one size for both title and
  // description, matching that component's real model instead of
  // duplicating a second, competing typography system next to it).
  // accordionTitleFontWeight* survives below because AboutMobileAccordionConfig
  // has no fontWeight field at all — not a duplicate, a genuine addition.
  accordionTextStyleSource: 'intro' | 'custom'
  accordionTitleFontWeight: TailwindTokenValue<'fontWeight'>
  accordionTitleFontWeightWide: TailwindTokenValue<'fontWeight', 'md'>
  accordionTitleFontWeightLg: TailwindTokenValue<'fontWeight', 'lg'>
  accordionTitleOpacity: number
  accordionDescriptionOpacity: number
  accordionTitleLineHeight: number
  accordionDescriptionLineHeight: number
  // New capability (operator ask, 2026-10-01): bold/**emphasis** words in
  // an article's description can take an explicit color instead of
  // inheriting the row's own ink at emphasisOpacity (today's only
  // behavior) — porting AboutMobileAccordionItem's own newly-additive
  // contentEmphasisColorOverride prop (experiences/about/components/
  // AboutMobileAccordionItem.tsx), itself a thin pass-through to
  // helpers/textEmphasis.tsx's existing emphasisColorOverride parameter.
  // 'inherit' (default) is byte-identical to before this field existed.
  accordionEmphasisColorMode: 'inherit' | 'custom'
  accordionEmphasisCustomColor: string
}

// Operator ask (2026-10-02): "Article item" is the one live panel actually
// bound to the wide-column article rows (pages/journal.tsx's own
// articleAccordionItemConfig) — journal-only additions like text-wrap below
// belong on ITS OWN config type, not bolted onto JournalTimelineConfig's
// "Article links" group (a second, competing panel for the same rows —
// exactly the shadowing bug already fixed once for font size/padding).
// Extends the shared AboutMobileAccordionConfig (not edited directly — that
// type is shared with /about's own accordion and Abstract's hero item)
// rather than replacing it.
export type JournalArticleAccordionItemConfig = AboutMobileAccordionConfig & {
  titleTextWrap: JournalAccordionTextWrap
  titleTextWrapWide: JournalAccordionTextWrap
  titleTextWrapLg: JournalAccordionTextWrap
  descriptionTextWrap: JournalAccordionTextWrap
  descriptionTextWrapWide: JournalAccordionTextWrap
  descriptionTextWrapLg: JournalAccordionTextWrap
}

// Operator ask (2026-10-01): journal's article-link items must look exactly
// like /about's own tablet accordion content (about.tsx passes
// DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG straight through, unmodified, as
// aboutMobileAccordionConfig's own initial state — so "about's look" IS
// this shared default, not a page-owned override to chase). Every field
// below that used to diverge from it (previewMinHeight, affordancePadding*,
// itemContentPadding*) is removed so this spreads through untouched.
// headerTextWrapEnabled is the one deliberate, named exception: About's own
// false default is correct for its short career-timeline captions, but
// journal's header is a full article title, which must never truncate —
// a content-correctness need, not a stylistic choice, so it stays `true`.
// The marker (AboutBulletMarker/chevron) and the about's own list-level
// bottom divider (innerBorder*, only ever applied by AboutMobileAccordion's
// own wrapper) are the other two explicitly-requested exceptions — neither
// needs a field change here: pages/journal.tsx already passes
// affordanceVisible={false} on every article item, and journal's own
// hand-rolled <ul> never renders AboutMobileAccordion's wrapper or its
// divide-y border in the first place.
//
// titleTextWrap*/descriptionTextWrap* (operator ask, 2026-10-02): the
// shared contentTextClassName() helper (AboutMobileAccordionItem.tsx)
// always applies `[text-wrap:balance]` to both the header and content text
// — CSS balanced wrapping deliberately redistributes line breaks to even
// out line lengths, which can pull a word to the next line even though it
// fits on the current one (operator-reported, screenshot evidence). 'wrap'
// at every tier restores plain greedy wrapping, the behavior already
// established as correct for these longer article rows.
export const DEFAULT_JOURNAL_ACCORDION_ITEM_CONFIG: JournalArticleAccordionItemConfig = {
  ...DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG,
  headerTextWrapEnabled: true,

  // Bug fix (operator-reported, 2026-10-01, screenshot evidence): desktop
  // article text was rendering near-illegibly small. contentFontSizeClassNameLg
  // had drifted to 'lg:text-4xs' (an extreme-end token clearly disproportionate
  // to mobile's own 'text-sm' here) — removed so desktop inherits
  // DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG's own 'lg:text-lg' default instead,
  // consistent with this panel's established "match /about's own accordion
  // content" direction (DEFAULT_JOURNAL_ACCORDION_ITEM_CONFIG's own doc
  // comment above). contentFontSizeClassName (mobile, 'text-sm') is left
  // untouched — not what was reported broken.
  contentFontSizeClassName: 'text-sm',

  // Bug fix (operator-reported twice, screenshot evidence both times): same
  // base-only-zeroed gap as affordancePaddingY below, on the X axis — only
  // the base/mobile tier was ever zeroed here, so Wide/Lg silently fell
  // through to the shared AboutMobileAccordion default (md:px-7/lg:px-7,
  // 28px), indenting the title's own clickable header relative to the
  // category tag (which has no left inset of its own), misaligning the
  // two at tablet/desktop specifically. Zeroed at every tier to match the
  // base tier's own existing value. itemContentPaddingLeft/-Right
  // (derivePaddingXSide in pages/journal.tsx) derive straight from this
  // same field, so the description text's own left edge moves with it too
  // — title, description, and category tag all flush-left together now.
  affordancePaddingX: 'px-0',
  affordancePaddingXWide: 'md:px-0',
  affordancePaddingXLg: 'lg:px-0',

  // Keep the title flush at every tier; reading time follows the title
  // inline, while the category tag follows the description.
  affordancePaddingY: 'py-0',
  affordancePaddingYWide: 'md:py-0',
  affordancePaddingYLg: 'lg:py-0',

  titleTextWrap: 'pretty',
  titleTextWrapWide: 'pretty',
  titleTextWrapLg: 'stable',
  descriptionTextWrap: 'pretty',
  descriptionTextWrapWide: 'pretty',
  descriptionTextWrapLg: 'balance',


  itemContentPaddingBottom: 'pb-0',
  itemContentPaddingBottomWide: 'md:pb-2',
}

export function normalizeJournalArticleAccordionItemConfig(
  config: Partial<JournalArticleAccordionItemConfig> | undefined,
): JournalArticleAccordionItemConfig {
  const D = DEFAULT_JOURNAL_ACCORDION_ITEM_CONFIG
  const textWrap = (value: unknown, fallback: JournalAccordionTextWrap): JournalAccordionTextWrap => (
    JOURNAL_ACCORDION_TEXT_WRAP_VALUES.includes(value as JournalAccordionTextWrap)
      ? value as JournalAccordionTextWrap : fallback
  )
  return {
    ...normalizeAboutMobileAccordionConfig(config),
    titleTextWrap: textWrap(config?.titleTextWrap, D.titleTextWrap),
    titleTextWrapWide: textWrap(config?.titleTextWrapWide, D.titleTextWrapWide),
    titleTextWrapLg: textWrap(config?.titleTextWrapLg, D.titleTextWrapLg),
    descriptionTextWrap: textWrap(config?.descriptionTextWrap, D.descriptionTextWrap),
    descriptionTextWrapWide: textWrap(config?.descriptionTextWrapWide, D.descriptionTextWrapWide),
    descriptionTextWrapLg: textWrap(config?.descriptionTextWrapLg, D.descriptionTextWrapLg),
  }
}

export const DEFAULT_JOURNAL_INTRO_ACCORDION_ITEM_CONFIG: AboutMobileAccordionConfig = {
  ...DEFAULT_EDITORIAL_ACCORDION_ITEM_CONFIG,
}

// Abstract's default narrow-column ink multiplier. Keep the introduction's
// role opacity hierarchy visually aligned with its shared editorial item.
export const JOURNAL_INTRO_INK_OPACITY_MULTIPLIER = 0.73

const JOURNAL_TIMELINE_BASE_CONFIG: AboutTimelineConfig = normalizeAboutTimelineConfig({
  ...DEFAULT_ABOUT_TIMELINE_CONFIG,
  rowDescriptionShortViewportHideEnabled: false,
  rowGap: 'gap-10',
  markerVisible: false,
  markerSizeClassName: 'w-4 h-4',
  markerColorMode: 'text',
  markerCustomColor: '#000000',
  hoverMarkerOpacity: 0.4,
  markerIdleOpacity: 0.18,
  markerActiveOpacity: 1,
  markerGradientEnabled: false,
  rowTitleMinContrastActive: 6,
  rowTitleMinContrastInactive: 4.5,
  rowDescriptionMinContrastActive: 4,
  rowDescriptionMinContrastInactive: 4.2,
  descriptionOpacity: 0.49,
  rowAppendixEnabled: true,
  rowAppendixOpacity: 0.93,
  rowAppendixRevealDelayMs: 340,
  rowAppendixSeparator: '',
  paddingTopLgClassName: 'lg:pt-0',
  marginTopLgClassName: 'lg:mt-0',
  description: '',
  descriptionWide: '',
  descriptionLg: '',
  maxWidthClassName: 'max-w-2xl',
  maxWidthWideClassName: 'md:max-w-2xl',
  // Bug fix (operator-reported, 2026-10-01, screenshot evidence): the
  // article-link list (pages/journal.tsx's own <ul>, accordionLinksEnabled
  // mode) shares this same maxWidth*ClassName trio with the AboutTimeline
  // dot-rail fallback render path below, which was tuned for that narrower
  // row layout — at desktop, where the wide column is genuinely wide
  // (narrowColumnWidthTierLg still '38/62' from POST_LAB_POLYMORPHIC_LAYOUT_CONFIG),
  // 'lg:max-w-xl' (576px) left a large, clearly-visible unused gap to the
  // column's own right edge. Widened to this field's own largest accepted
  // token (MAX_WIDTH_LG_OPTIONS, components/tailwindTypographyScale.ts —
  // no 'none'/unbounded option exists on this legacy scale) so the list
  // actually uses the column's available width.
  maxWidthLgClassName: 'lg:max-w-3xl',
  maxActiveRows: 0,
  rowAppendixFontSizeClassName: 'text-xs',
  rowAppendixFontSizeWideClassName: 'md:text-xs',
  rowAppendixFontSizeLgClassName: 'lg:text-xs',

  markerShape: 'page',

  paddingTopClassName: 'pt-7',

  rowAppendixForceVisible: true,
  rowAppendixForceVisibleWide: true,
  rowAppendixForceVisibleLg: true,

  rowAppendixForceLineBreak: true,
  rowAppendixPaddingTopClassName: 'pt-1.5',
  rowAppendixPaddingBottomClassName: 'pb-3',

  // Timeline motion config copied from /about's own instance (operator ask,
  // 2026-09-23: "Copy the motion config from the timeline from about.tsx to
  // the journal.tsx" — pages/about.config.ts's own
  // DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG). hoverDelayMs/transitionDurationMs/
  // transitionEasing/introItemStaggerMs/introItemOverlapMs already matched
  // DEFAULT_ABOUT_TIMELINE_CONFIG's own values before this (both pages
  // inherited the same untouched defaults) — restated explicitly here
  // anyway so this block shows the complete, current motion recipe in one
  // place rather than leaving half of it an unstated inherited default.
  // introDurationMs/introEasing are the two fields that actually differ:
  // About's own quicker, linear intro reveal (150ms/'linear') replaces
  // journal's own inherited 340ms/'gentle'.
  hoverDelayMs: 150,
  transitionDurationMs: 550,
  transitionEasing: 'gentle',
  introDurationMs: 150,
  introEasing: 'linear',
  introItemStaggerMs: 0,
  introItemOverlapMs: 80,

  paddingLeftLgClassName: 'lg:pl-12',

  rowAppendixForceLineBreakLg: true,

  rowAppendixForceLineBreakWide: true,
})

export const DEFAULT_JOURNAL_TIMELINE_CONFIG: JournalTimelineConfig = {
  ...JOURNAL_TIMELINE_BASE_CONFIG,
  accordionLinksEnabled: true,
  accordionItemGap: 'gap-5',
  // 'custom' (not 'intro'): articles must look like /about's own
  // AboutMobileAccordionConfig-driven tablet content specifically — 'intro'
  // would instead couple article typography to the narrow-column intro's
  // own independent EditorialAccordionItem preset (DEFAULT_EDITORIAL_
  // ACCORDION_ITEM_CONFIG), which is a deliberately different visual system
  // and out of this task's scope to also change.
  accordionTextStyleSource: 'custom',
  // Font size and description top-spacing are no longer duplicated here —
  // 'custom' mode now falls straight through to articleAccordionItemConfig's
  // own contentFontSizeClassName*/itemContentPaddingTop* (the live
  // "Article item" panel), which is itself a direct copy of
  // DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG (see DEFAULT_JOURNAL_ACCORDION_ITEM_CONFIG's
  // own doc comment). accordionTitleFontWeight* survives below — About has
  // no fontWeight field at all, so this isn't a duplicate of anything.
  accordionTitleFontWeight: 'font-medium',
  accordionTitleFontWeightWide: 'md:font-normal',
  accordionTitleFontWeightLg: 'lg:font-normal',
  accordionTitleOpacity: 0.73,
  accordionDescriptionOpacity: 0.4745,
  accordionTitleLineHeight: 1.625,
  accordionDescriptionLineHeight: 1.625,
  accordionEmphasisColorMode: 'inherit',
  accordionEmphasisCustomColor: '#000000',

  rowTitleFontWeightLgClassName: 'lg:font-normal',
  rowTitleFontWeightActiveLgClassName: 'lg:font-normal',
}

export const DEFAULT_JOURNAL_CHRONOLOGY_CONFIG: ChronologyTimelineConfig = {
  ...DEFAULT_CHRONOLOGY_TIMELINE_CONFIG,

  enabled: true,
  yearPlacement: 'inward',
  yearPlacementMd: 'outward',
  yearPlacementLg: 'outward',
  yearDarkInkSaturation: 2,
  yearFontSize: 'text-sm',
  yearFontSizeMd: 'md:text-xl',
  yearFontSizeLg: 'lg:text-base',

  showMonths: true,

  monthPlacement: 'inward',
  monthPlacementMd: 'inward',
  monthPlacementLg: 'inward',

  monthDarkInkSaturation: 2,
  monthDarkInkOpacityMultiplier: 0.34,
  yearFontFamily: 'font-sans',
  yearFontWeight: 'font-normal',

  yearDotSize: 10,

  monthFontSize: 'text-sm',
  monthFontSizeMd: 'md:text-sm',
  monthFontSizeLg: 'lg:text-sm',
  monthFontFamily: 'font-sans',
  monthFontWeight: 'font-normal',
  monthDotSize: 5,

  yearPaddingX: 'px-2',
  yearPaddingXMd: 'md:px-4',
  yearPaddingXLg: 'lg:px-4',
  // Restored (operator-reported regression, 2026-10-04): this is the month
  // label's own dot-to-text rail-edge gap, same mechanism as yearPaddingX
  // above — briefly migrated into the new article-group padding fields by
  // mistake, which dropped the gap entirely instead of relocating it. The
  // article-group padding (monthPaddingTop/Right/Bottom/Left, below the
  // monthNameFormat override) is additive and separate, not a replacement.
  monthPaddingX: 'px-2',
  monthPaddingXMd: 'md:px-4',
  monthPaddingXLg: 'lg:px-4',

  monthNameFormat: 'short',

  // Bug fix (operator-reported, screenshot evidence 2026-10-02): this page's
  // inward year/month placement previously rode ChronologyTimeline.module.css's
  // own hardcoded inward-mode lane widths (min(12rem, 42vw) mobile, 14rem
  // tablet/desktop) meant to leave room for the inward label text — far more
  // than the short month/year labels here actually need, producing the big
  // dead gap between the dated rail and the article content. Now that the
  // gap is this component's own configurable contentGap*, set it to the
  // smaller width this page's actual label sizes require.
  contentGap: 5,
  contentGapMd: 13.75,
  contentGapLg: 13.75,

  yearHoverFadeDurationMs: 440,
  yearHoverFadeDelayMs: 180,
  yearHoverFadeEasing: 'ease-in-out',

  yearHoverFadeEnabled: false,

  trackOpacityLg: 0.2,

  trackOpacityMd: 0.38,

  trackOpacity: 0.38,

  trackWidth: 0.5,
  trackWidthLg: 0.75,

  trackWidthMd: 0.25,

  yearDarkInkOpacityMultiplier: 0.34,
  yearLightInkTolerance: 3.5,
  yearMinContrastRatio: 1,

  monthLightInkTolerance: 3.5,
  monthMinContrastRatio: 1,

  monthNameFormatLg: 'full',

  monthPaddingBottomLg: 'lg:pb-10',

  monthPaddingBottom: 'pb-10',
}

export function normalizeJournalTimelineConfig(config: Partial<JournalTimelineConfig> | undefined): JournalTimelineConfig {
  return {
    ...normalizeAboutTimelineConfig(config),
    accordionLinksEnabled: config?.accordionLinksEnabled === true,
    accordionItemGap: normalizeTailwindToken({
      utility: 'gap', breakpoint: 'base', value: config?.accordionItemGap,
      fallback: DEFAULT_JOURNAL_TIMELINE_CONFIG.accordionItemGap,
    }),
    accordionTextStyleSource: config?.accordionTextStyleSource === 'custom' ? 'custom' : 'intro',
    accordionTitleFontWeight: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'base', value: config?.accordionTitleFontWeight,
      fallback: DEFAULT_JOURNAL_TIMELINE_CONFIG.accordionTitleFontWeight,
    }),
    accordionTitleFontWeightWide: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'md', value: config?.accordionTitleFontWeightWide,
      fallback: DEFAULT_JOURNAL_TIMELINE_CONFIG.accordionTitleFontWeightWide,
    }),
    accordionTitleFontWeightLg: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'lg', value: config?.accordionTitleFontWeightLg,
      fallback: DEFAULT_JOURNAL_TIMELINE_CONFIG.accordionTitleFontWeightLg,
    }),
    accordionTitleOpacity: typeof config?.accordionTitleOpacity === 'number' && Number.isFinite(config.accordionTitleOpacity)
      ? Math.max(0, Math.min(1, config.accordionTitleOpacity)) : DEFAULT_JOURNAL_TIMELINE_CONFIG.accordionTitleOpacity,
    accordionDescriptionOpacity: typeof config?.accordionDescriptionOpacity === 'number' && Number.isFinite(config.accordionDescriptionOpacity)
      ? Math.max(0, Math.min(1, config.accordionDescriptionOpacity)) : DEFAULT_JOURNAL_TIMELINE_CONFIG.accordionDescriptionOpacity,
    accordionTitleLineHeight: typeof config?.accordionTitleLineHeight === 'number' && Number.isFinite(config.accordionTitleLineHeight)
      ? Math.max(1, Math.min(2.5, config.accordionTitleLineHeight)) : DEFAULT_JOURNAL_TIMELINE_CONFIG.accordionTitleLineHeight,
    accordionDescriptionLineHeight: typeof config?.accordionDescriptionLineHeight === 'number' && Number.isFinite(config.accordionDescriptionLineHeight)
      ? Math.max(1, Math.min(2.5, config.accordionDescriptionLineHeight)) : DEFAULT_JOURNAL_TIMELINE_CONFIG.accordionDescriptionLineHeight,
    accordionEmphasisColorMode: config?.accordionEmphasisColorMode === 'custom' ? 'custom' : 'inherit',
    accordionEmphasisCustomColor: typeof config?.accordionEmphasisCustomColor === 'string' && config.accordionEmphasisCustomColor.length > 0
      ? config.accordionEmphasisCustomColor
      : DEFAULT_JOURNAL_TIMELINE_CONFIG.accordionEmphasisCustomColor,
  }
}

export const DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG: CardAppearanceConfig = normalizeCardAppearanceConfig({
  ...DEFAULT_CARD_APPEARANCE_CONFIG,
  activeTextOpacity: 0.85,
})

// New capability (operator ask, 2026-10-01): an opt-in show/hide for the
// narrow column's introduction as a whole, segregated per breakpoint
// (enabled/enabledWide/enabledLg — same base/Wide/Lg boolean-trio
// convention PolymorphicLayout.config.ts's own scrollGradientEnabledWide/
// -Lg, wideColumnClearsFloatingHeaderWide/-Lg, etc. already use, rather
// than one flag applied uniformly at every width), plus an independent
// opt-in for just its title (the short `headline` EditorialAccordionItem
// renders as its own header — see pages/journal.tsx's narrowColumn
// render), and the same title/description typography shape the "Article
// links" group above already exposes (fontSize per breakpoint, title-only
// fontWeight, description-only paddingTop, opacity, lineHeight) — tabbed
// by breakpoint here instead of flat breakpoint-suffixed fields, matching
// EDITORIAL_ACCORDION_ITEM_FIELDS's own MOBILE/TABLET/DESKTOP tabs
// (experiences/about/components/EditorialAccordionItem.panel.ts).
//
// titleOpacity/descriptionOpacity default to 1 (a pass-through multiplier)
// rather than replacing the page's existing ink-derived introTitleOpacity/
// introDescriptionOpacity (narrowColumnTypography.*Opacity *
// JOURNAL_INTRO_INK_OPACITY_MULTIPLIER) — same relationship
// JOURNAL_INTRO_INK_OPACITY_MULTIPLIER itself already has to the raw
// narrowColumnTypography opacity, so an operator dials contrast down
// further without losing the page's live, scroll-reactive ink. Font size/
// weight defaults below are a direct copy of DEFAULT_JOURNAL_INTRO_ACCORDION_ITEM_CONFIG's
// own contentFontSizeClassName*/leading-relaxed (1.625) so turning this
// panel on does not itself change anything already on the page.
export type JournalNarrowColumnContentConfig = {
  enabled: boolean
  enabledWide: boolean
  enabledLg: boolean
  titleEnabled: boolean
  // Bug fix (operator-reported, 2026-10-01): the title/description fields
  // below used to be unconditionally applied as this item's headerFontSize-/
  // contentFontSizeClassName etc. overrides — which shadowed the
  // "Introduction accordion item" panel's own contentFontSizeClassName*
  // (introAccordionItemConfig) at EVERY breakpoint, not just mobile, since
  // pages/journal.tsx always passed a fully-specified 3-breakpoint override
  // string regardless of this field. Same 'intro' | 'custom' pattern the
  // "Article links" group (JournalTimelineConfig.accordionTextStyleSource)
  // already uses for the identical two-panels-own-the-same-text conflict.
  // 'introduction' (default) restores the Introduction panel's own knobs;
  // 'custom' opts into this panel's independent title/description sizing.
  typographySource: 'introduction' | 'custom'
  titleFontSize: TailwindTokenValue<'fontSize'>
  titleFontSizeWide: TailwindTokenValue<'fontSize', 'md'>
  titleFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>
  titleFontWeight: TailwindTokenValue<'fontWeight'>
  titleFontWeightWide: TailwindTokenValue<'fontWeight', 'md'>
  titleFontWeightLg: TailwindTokenValue<'fontWeight', 'lg'>
  titleOpacity: number
  titleLineHeight: number
  descriptionFontSize: TailwindTokenValue<'fontSize'>
  descriptionFontSizeWide: TailwindTokenValue<'fontSize', 'md'>
  descriptionFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>
  descriptionPaddingTop: TailwindTokenValue<'paddingTop'>
  descriptionPaddingTopWide: TailwindTokenValue<'paddingTop', 'md'>
  descriptionPaddingTopLg: TailwindTokenValue<'paddingTop', 'lg'>
  descriptionOpacity: number
  descriptionLineHeight: number
}

export const DEFAULT_JOURNAL_NARROW_COLUMN_CONTENT_CONFIG: JournalNarrowColumnContentConfig = {
  enabled: false,
  enabledWide: false,
  enabledLg: true,
  titleEnabled: false,
  typographySource: 'introduction',
  titleFontSize: 'text-lg',
  titleFontSizeWide: 'md:text-base',
  titleFontSizeLg: 'lg:text-sm',
  titleFontWeight: 'font-normal',
  titleFontWeightWide: 'md:font-normal',
  titleFontWeightLg: 'lg:font-medium',
  titleOpacity: 1,
  titleLineHeight: 1.625,
  descriptionFontSize: 'text-lg',
  descriptionFontSizeWide: 'md:text-base',
  descriptionFontSizeLg: 'lg:text-sm',
  descriptionPaddingTop: 'pt-0',
  descriptionPaddingTopWide: 'md:pt-0',
  descriptionPaddingTopLg: 'lg:pt-0',
  descriptionOpacity: 1,
  descriptionLineHeight: 1.625,
}

export function normalizeJournalNarrowColumnContentConfig(
  config: Partial<JournalNarrowColumnContentConfig> | undefined,
): JournalNarrowColumnContentConfig {
  const D = DEFAULT_JOURNAL_NARROW_COLUMN_CONTENT_CONFIG
  return {
    enabled: config?.enabled !== false,
    enabledWide: config?.enabledWide !== false,
    enabledLg: config?.enabledLg !== false,
    titleEnabled: config?.titleEnabled !== false,
    typographySource: config?.typographySource === 'custom' ? 'custom' : 'introduction',
    titleFontSize: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'base', value: config?.titleFontSize, fallback: D.titleFontSize,
    }),
    titleFontSizeWide: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'md', value: config?.titleFontSizeWide, fallback: D.titleFontSizeWide,
    }),
    titleFontSizeLg: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'lg', value: config?.titleFontSizeLg, fallback: D.titleFontSizeLg,
    }),
    titleFontWeight: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'base', value: config?.titleFontWeight, fallback: D.titleFontWeight,
    }),
    titleFontWeightWide: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'md', value: config?.titleFontWeightWide, fallback: D.titleFontWeightWide,
    }),
    titleFontWeightLg: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'lg', value: config?.titleFontWeightLg, fallback: D.titleFontWeightLg,
    }),
    titleOpacity: typeof config?.titleOpacity === 'number' && Number.isFinite(config.titleOpacity)
      ? Math.max(0, Math.min(1, config.titleOpacity)) : D.titleOpacity,
    titleLineHeight: typeof config?.titleLineHeight === 'number' && Number.isFinite(config.titleLineHeight)
      ? Math.max(1, Math.min(2.5, config.titleLineHeight)) : D.titleLineHeight,
    descriptionFontSize: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'base', value: config?.descriptionFontSize, fallback: D.descriptionFontSize,
    }),
    descriptionFontSizeWide: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'md', value: config?.descriptionFontSizeWide, fallback: D.descriptionFontSizeWide,
    }),
    descriptionFontSizeLg: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'lg', value: config?.descriptionFontSizeLg, fallback: D.descriptionFontSizeLg,
    }),
    descriptionPaddingTop: normalizeTailwindToken({
      utility: 'paddingTop', breakpoint: 'base', value: config?.descriptionPaddingTop, fallback: D.descriptionPaddingTop,
    }),
    descriptionPaddingTopWide: normalizeTailwindToken({
      utility: 'paddingTop', breakpoint: 'md', value: config?.descriptionPaddingTopWide, fallback: D.descriptionPaddingTopWide,
    }),
    descriptionPaddingTopLg: normalizeTailwindToken({
      utility: 'paddingTop', breakpoint: 'lg', value: config?.descriptionPaddingTopLg, fallback: D.descriptionPaddingTopLg,
    }),
    descriptionOpacity: typeof config?.descriptionOpacity === 'number' && Number.isFinite(config.descriptionOpacity)
      ? Math.max(0, Math.min(1, config.descriptionOpacity)) : D.descriptionOpacity,
    descriptionLineHeight: typeof config?.descriptionLineHeight === 'number' && Number.isFinite(config.descriptionLineHeight)
      ? Math.max(1, Math.min(2.5, config.descriptionLineHeight)) : D.descriptionLineHeight,
  }
}

export type JournalArticleFilterConfig = ArticleFilterConfig
export const normalizeJournalArticleFilterConfig = normalizeArticleFilterConfig

export const DEFAULT_JOURNAL_ARTICLE_FILTER_CONFIG: ArticleFilterConfig = {
  ...DEFAULT_ARTICLE_FILTER_CONFIG,

  layoutDirectionLg: 'horizontal',

  spaceBeforeClassName: 'mt-0',

  gapClassName: 'gap-2.5',
  fontSizeLg: 'lg:text-xs',

  maxCategories: 20,

  dockMinScale: 0.8,
  dockMaxScale: 1.6,
}

export type JournalChipAppearanceConfig = {
  tintColor: string
  backgroundOpacity: number
  textOpacity: number
  contrastSensitivity: number
  borderOpacity: number
  hoverTintColor: string
  hoverBackgroundOpacity: number
  hoverTextOpacity: number
  hoverContrastSensitivity: number
  hoverBorderOpacity: number
  borderWidth: TailwindTokenValue<'borderWidth'>
  paddingX: TailwindTokenValue<'paddingX'>
  paddingY: TailwindTokenValue<'paddingY'>
  textTracking: TailwindTokenValue<'letterSpacing'>
  articleTagTintColor: string
  articleTagBackgroundOpacity: number
  articleTagTextOpacity: number
  articleTagContrastSensitivity: number
  articleTagBorderOpacity: number
  articleTagBorderWidth: TailwindTokenValue<'borderWidth'>
  articleTagPaddingX: TailwindTokenValue<'paddingX'>
  articleTagPaddingY: TailwindTokenValue<'paddingY'>
  articleTagTextTracking: TailwindTokenValue<'letterSpacing'>
  articleTagFontSize: TailwindTokenValue<'fontSize'>
}

export const DEFAULT_JOURNAL_CHIP_APPEARANCE_CONFIG: JournalChipAppearanceConfig = {
  tintColor: '#6192b8',
  backgroundOpacity: 0,
  textOpacity: 1,
  contrastSensitivity: 0.61,
  borderOpacity: 0.15,
  hoverTintColor: '#fffbeb',
  hoverBackgroundOpacity: 0.9,
  hoverTextOpacity: 0.9,
  hoverContrastSensitivity: 0.8,
  hoverBorderOpacity: 0,
  borderWidth: 'border-2',
  paddingX: 'px-5',
  paddingY: 'py-2',
  textTracking: 'tracking-widest',
  articleTagTintColor: '#fffbeb',
  articleTagBackgroundOpacity: 1,
  articleTagTextOpacity: 0.9,
  articleTagContrastSensitivity: 0.8,
  articleTagBorderOpacity: 0,
  articleTagBorderWidth: 'border-2',
  articleTagPaddingX: 'px-3',
  articleTagPaddingY: 'py-1',
  articleTagTextTracking: 'tracking-widest',
  articleTagFontSize: 'text-3xs',
}

export function normalizeJournalChipAppearanceConfig(
  config: Partial<JournalChipAppearanceConfig> | undefined,
): JournalChipAppearanceConfig {
  const D = DEFAULT_JOURNAL_CHIP_APPEARANCE_CONFIG
  const opacity = (value: unknown, fallback: number) => (
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : fallback
  )
  return {
    tintColor: typeof config?.tintColor === 'string' && /^#[0-9a-f]{6}$/i.test(config.tintColor)
      ? config.tintColor : D.tintColor,
    backgroundOpacity: opacity(config?.backgroundOpacity, D.backgroundOpacity),
    textOpacity: opacity(config?.textOpacity, D.textOpacity),
    contrastSensitivity: opacity(config?.contrastSensitivity, D.contrastSensitivity),
    borderOpacity: opacity(config?.borderOpacity, D.borderOpacity),
    hoverTintColor: typeof config?.hoverTintColor === 'string' && /^#[0-9a-f]{6}$/i.test(config.hoverTintColor)
      ? config.hoverTintColor : D.hoverTintColor,
    hoverBackgroundOpacity: opacity(config?.hoverBackgroundOpacity, D.hoverBackgroundOpacity),
    hoverTextOpacity: opacity(config?.hoverTextOpacity, D.hoverTextOpacity),
    hoverContrastSensitivity: opacity(config?.hoverContrastSensitivity, D.hoverContrastSensitivity),
    hoverBorderOpacity: opacity(config?.hoverBorderOpacity, D.hoverBorderOpacity),
    borderWidth: normalizeTailwindToken({
      utility: 'borderWidth', breakpoint: 'base', value: config?.borderWidth, fallback: D.borderWidth,
    }),
    paddingX: normalizeTailwindToken({
      utility: 'paddingX', breakpoint: 'base', value: config?.paddingX, fallback: D.paddingX,
    }),
    paddingY: normalizeTailwindToken({
      utility: 'paddingY', breakpoint: 'base', value: config?.paddingY, fallback: D.paddingY,
    }),
    textTracking: normalizeTailwindToken({
      utility: 'letterSpacing', breakpoint: 'base', value: config?.textTracking, fallback: D.textTracking,
    }),
    articleTagTintColor: typeof config?.articleTagTintColor === 'string' && /^#[0-9a-f]{6}$/i.test(config.articleTagTintColor)
      ? config.articleTagTintColor : D.articleTagTintColor,
    articleTagBackgroundOpacity: opacity(config?.articleTagBackgroundOpacity, D.articleTagBackgroundOpacity),
    articleTagTextOpacity: opacity(config?.articleTagTextOpacity, D.articleTagTextOpacity),
    articleTagContrastSensitivity: opacity(config?.articleTagContrastSensitivity, D.articleTagContrastSensitivity),
    articleTagBorderOpacity: opacity(config?.articleTagBorderOpacity, D.articleTagBorderOpacity),
    articleTagBorderWidth: normalizeTailwindToken({
      utility: 'borderWidth', breakpoint: 'base', value: config?.articleTagBorderWidth, fallback: D.articleTagBorderWidth,
    }),
    articleTagPaddingX: normalizeTailwindToken({
      utility: 'paddingX', breakpoint: 'base', value: config?.articleTagPaddingX, fallback: D.articleTagPaddingX,
    }),
    articleTagPaddingY: normalizeTailwindToken({
      utility: 'paddingY', breakpoint: 'base', value: config?.articleTagPaddingY, fallback: D.articleTagPaddingY,
    }),
    articleTagTextTracking: normalizeTailwindToken({
      utility: 'letterSpacing', breakpoint: 'base', value: config?.articleTagTextTracking, fallback: D.articleTagTextTracking,
    }),
    articleTagFontSize: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'base', value: config?.articleTagFontSize, fallback: D.articleTagFontSize,
    }),
  }
}
