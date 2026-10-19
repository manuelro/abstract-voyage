import {
  normalizeTailwindToken,
  type TailwindTokenValue,
} from '../../../components/Panel/config/tailwindFields';

/**
 * Layout capability for the wall's PracticesSection: how many columns the
 * practices grid resolves to (driven by a target column width + min/max bounds,
 * mirroring the wall feed's own width->count logic), the per-breakpoint column
 * and row gaps, and the separators drawn between items/columns.
 *
 * Every token-backed field uses the generated Tailwind field system
 * (TailwindTokenValue + normalizeTailwindToken), per AGENTS.md. Continuous px
 * measurements (target/min/max width) and counts stay plain numbers.
 */

export type PracticesSeparatorStyle = 'none' | 'between-items' | 'vertical-and-row';
export type PracticesSeparatorColorMode = 'inherit' | 'custom';

export type PracticesSectionLayoutConfig = {
  /** Width cap for the header block (eyebrow + heading), a sibling of the
   * practices grid below -- not the banner quote's own measure (see that
   * block's own doc comment in PracticesSection.tsx). Was hardcoded
   * `max-w-4xl`. */
  headerMaxWidth: TailwindTokenValue<'maxWidth'>;
  /** Shared max-width (measure) for the four body paragraphs: introduction,
   * subtext, delivery text, industry text. Per breakpoint, applied directly on
   * each paragraph. NOT ch/prose -- `ch` (the "0" width) overcounts in this
   * font, so `max-w-prose` (65ch) renders ~85 chars, past the 45-75 optimum; a
   * rem cap lands nearer the ideal. Replaces the former `introductionMaxWidth`
   * (which only capped the intro and left the other paragraphs uncapped). */
  paragraphMaxWidth: TailwindTokenValue<'maxWidth'>;
  paragraphMaxWidthMd: TailwindTokenValue<'maxWidth', 'md'>;
  paragraphMaxWidthLg: TailwindTokenValue<'maxWidth', 'lg'>;
  /** Measure (in ch) for the practice card body text, per breakpoint. Overrides
   * the card EditorialQuote's own `measureCh` so the card text fills its grid
   * column instead of capping narrower than the column (the empty-gutter the
   * 34ch default produced). Clamped 16-90 to match the quote measureCh range. */
  practiceCardMeasureCh: number;
  practiceCardMeasureChMd: number;
  practiceCardMeasureChLg: number;
  /** Vertical padding of the whole section, per breakpoint. The TOP side owns
   * the complete space between the hero quote above and the section's first
   * title ("The Practice"); the bottom side is the space below the section.
   * (Horizontal padding is owned by the banner quote,
   * not here, so only the vertical sides are exposed.) */
  sectionPaddingTop: TailwindTokenValue<'paddingTop'>;
  sectionPaddingTopMd: TailwindTokenValue<'paddingTop', 'md'>;
  sectionPaddingTopLg: TailwindTokenValue<'paddingTop', 'lg'>;
  sectionPaddingBottom: TailwindTokenValue<'paddingBottom'>;
  sectionPaddingBottomMd: TailwindTokenValue<'paddingBottom', 'md'>;
  sectionPaddingBottomLg: TailwindTokenValue<'paddingBottom', 'lg'>;
  /** Gap from the title/introduction/subtext group to the practices grid.
   * This was `mt-14 md:mt-20` on the grid. */
  titleGroupGap: TailwindTokenValue<'marginTop'>;
  titleGroupGapMd: TailwindTokenValue<'marginTop', 'md'>;
  titleGroupGapLg: TailwindTokenValue<'marginTop', 'lg'>;
  /** Vertical transitions between the practices grid, dividing rule,
   * delivery, industry proof, and CTA. Separate values preserve their
   * existing visual hierarchy while allowing each gap to be tuned. */
  gridToDividerGap: TailwindTokenValue<'marginTop'>;
  gridToDividerGapMd: TailwindTokenValue<'marginTop', 'md'>;
  gridToDividerGapLg: TailwindTokenValue<'marginTop', 'lg'>;
  dividerToDetailsGap: TailwindTokenValue<'marginTop'>;
  dividerToDetailsGapMd: TailwindTokenValue<'marginTop', 'md'>;
  dividerToDetailsGapLg: TailwindTokenValue<'marginTop', 'lg'>;
  industryGap: TailwindTokenValue<'marginTop'>;
  industryGapMd: TailwindTokenValue<'marginTop', 'md'>;
  industryGapLg: TailwindTokenValue<'marginTop', 'lg'>;
  ctaGap: TailwindTokenValue<'marginTop'>;
  ctaGapMd: TailwindTokenValue<'marginTop', 'md'>;
  ctaGapLg: TailwindTokenValue<'marginTop', 'lg'>;
  /** Opacity (0-100) shared by every title and subtitle: the section title,
   * practice and delivery/industry titles, eyebrow, and industry label.
   * One knob, so all heading-level text dims together. */
  titleOpacityPercent: number;
  /** Base opacity (0-100) for body copy. At the default emphasis setting,
   * highlighted phrases are stronger at intermediate values; 0 hides all copy. */
  contentOpacityPercent: number;
  /** Weight for highlighted phrases in practice and delivery copy. */
  emphasisFontWeight: TailwindTokenValue<'fontWeight'>;
  /** Highlight opacity at the default Content opacity. Content opacity still
   * scales emphasis, so setting Content to 0 hides every phrase. */
  emphasisOpacityPercent: number;
  /** Font sizes follow the existing visual hierarchy. Each tier resolves its
   * own token so a tablet value cannot be overridden by a desktop class. */
  labelFontSize: TailwindTokenValue<'fontSize'>;
  labelFontSizeMd: TailwindTokenValue<'fontSize', 'md'>;
  labelFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>;
  sectionTitleFontSize: TailwindTokenValue<'fontSize'>;
  sectionTitleFontSizeMd: TailwindTokenValue<'fontSize', 'md'>;
  sectionTitleFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>;
  subsectionTitleFontSize: TailwindTokenValue<'fontSize'>;
  subsectionTitleFontSizeMd: TailwindTokenValue<'fontSize', 'md'>;
  subsectionTitleFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>;
  /** Font family/weight for the section titles ("The Practice", delivery
   * heading) and the subsection titles (each practice card title, industry
   * title). These replace the former hardcoded global serif + `font-semibold`
   * className, so the headings' typeface and weight are now operator-tunable.
   * One family/weight per title tier, applied across every breakpoint. */
  sectionTitleFontFamily: TailwindTokenValue<'fontFamily'>;
  sectionTitleFontWeight: TailwindTokenValue<'fontWeight'>;
  subsectionTitleFontFamily: TailwindTokenValue<'fontFamily'>;
  subsectionTitleFontWeight: TailwindTokenValue<'fontWeight'>;
  leadFontSize: TailwindTokenValue<'fontSize'>;
  leadFontSizeMd: TailwindTokenValue<'fontSize', 'md'>;
  leadFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>;
  bodyFontSize: TailwindTokenValue<'fontSize'>;
  bodyFontSizeMd: TailwindTokenValue<'fontSize', 'md'>;
  bodyFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>;
  ctaFontSize: TailwindTokenValue<'fontSize'>;
  ctaFontSizeMd: TailwindTokenValue<'fontSize', 'md'>;
  ctaFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>;
  /** Preferred column width; the count driver, like the wall's cardWidthPx. */
  columnTargetWidthPx: number;
  /** A resolved column narrower than this reduces the count. */
  minColumnWidthPx: number;
  /** A resolved column wider than this adds a column (up to maxColumnCount). */
  maxColumnWidthPx: number;
  /** Hard ceiling on the resolved column count (practices has four items). */
  maxColumnCount: number;
  columnGap: TailwindTokenValue<'gap'>;
  columnGapMd: TailwindTokenValue<'gap', 'md'>;
  columnGapLg: TailwindTokenValue<'gap', 'lg'>;
  rowGap: TailwindTokenValue<'gap'>;
  rowGapMd: TailwindTokenValue<'gap', 'md'>;
  rowGapLg: TailwindTokenValue<'gap', 'lg'>;
  /** Draw the rule between the practice cards and the delivery/industry text. */
  sectionDividerEnabled: boolean;
  /** Draw configured separators between practice cards in the grid. */
  practiceDividersEnabled: boolean;
  /**
   * none          — no separators.
   * between-items — a horizontal rule between rows only (never above the first
   *                 row nor below the last); when the count resolves to 1 this
   *                 is the "stacked" look the brief describes.
   * vertical-and-row — the above plus a vertical rule between columns within a
   *                 row (the "row of four / square of four" grid look).
   */
  separatorStyle: PracticesSeparatorStyle;
  separatorWidth: TailwindTokenValue<'borderWidth'>;
  /** 'inherit' uses the section's own ink color (the old `border-current`);
   * 'custom' uses `separatorColor`. */
  separatorColorMode: PracticesSeparatorColorMode;
  separatorColor: string;
  separatorOpacityPercent: number;

  /** Typography/padding for the optional subtext line rendered under the
   * header block -- the line's own copy (content.subtext) is authored in
   * content/practices.md, not here; this is style only. Empty copy hides
   * the element regardless of these settings. */
  subtextFontSize: TailwindTokenValue<'fontSize'>;
  subtextFontSizeMd: TailwindTokenValue<'fontSize', 'md'>;
  subtextFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>;
  subtextFontFamily: TailwindTokenValue<'fontFamily'>;
  subtextFontWeight: TailwindTokenValue<'fontWeight'>;
  subtextLineHeight: TailwindTokenValue<'lineHeight'>;
  subtextLetterSpacing: TailwindTokenValue<'letterSpacing'>;
  subtextTextTransform: TailwindTokenValue<'textTransform'>;
  subtextPaddingTop: TailwindTokenValue<'paddingTop'>;
  subtextPaddingRight: TailwindTokenValue<'paddingRight'>;
  subtextPaddingBottom: TailwindTokenValue<'paddingBottom'>;
  subtextPaddingLeft: TailwindTokenValue<'paddingLeft'>;
};

// Defaults produce the approved 2x2 layout: 1 column on mobile, 2 on
// tablet/desktop. maxColumnCount is capped at 2 so four items can never
// resolve to an odd 3 (which orphans the 4th card and breaks the grid's
// symmetry); see PLAN-PRACTICES-SECTION-LAYOUT-TYPOGRAPHY.md section 2.
export const DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG: PracticesSectionLayoutConfig = {
  headerMaxWidth: 'max-w-3xl',
  // Body paragraphs: full width on mobile, capped at a readable ~64-char
  // measure on tablet/desktop (max-w-xl = 36rem, not prose/65ch which renders
  // ~85 chars in this font). This is the paragraph-width fix.
  paragraphMaxWidth: 'max-w-full',
  paragraphMaxWidthMd: 'md:max-w-xl',
  paragraphMaxWidthLg: 'lg:max-w-xl',
  // Card body measure: fill the grid column (60ch exceeds the ~46-char column,
  // so the column becomes the real measure) instead of the old 34ch cap that
  // left an empty gutter.
  practiceCardMeasureCh: 60,
  practiceCardMeasureChMd: 60,
  practiceCardMeasureChLg: 62,
  // Top spacing controls the full gap below the hero; bottom spacing controls
  // the gap above the footer.
  sectionPaddingTop: 'pt-16',
  sectionPaddingTopMd: 'md:pt-16',
  sectionPaddingTopLg: 'lg:pt-20',
  sectionPaddingBottom: 'pb-0',
  sectionPaddingBottomMd: 'md:pb-0',
  sectionPaddingBottomLg: 'lg:pb-20',
  titleGroupGap: 'mt-5',
  titleGroupGapMd: 'md:mt-5',
  titleGroupGapLg: 'lg:mt-5',
  gridToDividerGap: 'mt-20',
  gridToDividerGapMd: 'md:mt-20',
  gridToDividerGapLg: 'lg:mt-20',
  dividerToDetailsGap: 'mt-20',
  dividerToDetailsGapMd: 'md:mt-20',
  dividerToDetailsGapLg: 'lg:mt-20',
  industryGap: 'mt-10',
  industryGapMd: 'md:mt-10',
  industryGapLg: 'lg:mt-10',
  ctaGap: 'mt-20',
  ctaGapMd: 'md:mt-20',
  ctaGapLg: 'lg:mt-20',
  // Shared title/body opacity; emphasis has its own weight and opacity ceiling.
  titleOpacityPercent: 100,
  contentOpacityPercent: 65,
  emphasisFontWeight: 'font-normal',
  emphasisOpacityPercent: 100,
  labelFontSize: 'text-xs',
  labelFontSizeMd: 'md:text-xs',
  labelFontSizeLg: 'lg:text-xs',
  sectionTitleFontSize: 'text-2xl',
  sectionTitleFontSizeMd: 'md:text-3xl',
  sectionTitleFontSizeLg: 'lg:text-3xl',
  subsectionTitleFontSize: 'text-xl',
  subsectionTitleFontSizeMd: 'md:text-2xl',
  subsectionTitleFontSizeLg: 'lg:text-2xl',
  // Preserve the current look: headings inherited `font-serif` globally and
  // `font-semibold` from their className.
  sectionTitleFontFamily: 'font-sans',
  sectionTitleFontWeight: 'font-light',
  subsectionTitleFontFamily: 'font-sans',
  subsectionTitleFontWeight: 'font-normal',
  leadFontSize: 'text-base',
  leadFontSizeMd: 'md:text-lg',
  leadFontSizeLg: 'lg:text-lg',
  bodyFontSize: 'text-base',
  bodyFontSizeMd: 'md:text-base',
  bodyFontSizeLg: 'lg:text-base',
  ctaFontSize: 'text-base',
  ctaFontSizeMd: 'md:text-base',
  ctaFontSizeLg: 'lg:text-base',
  columnTargetWidthPx: 465,
  minColumnWidthPx: 385,
  maxColumnWidthPx: 625,
  maxColumnCount: 2,
  columnGap: 'gap-12',
  columnGapMd: 'md:gap-10',
  columnGapLg: 'lg:gap-10',
  rowGap: 'gap-0',
  rowGapMd: 'md:gap-0',
  rowGapLg: 'lg:gap-5',
  sectionDividerEnabled: false,
  practiceDividersEnabled: false,
  separatorStyle: 'between-items',
  separatorWidth: 'border',
  separatorColorMode: 'custom',
  separatorColor: '#324092',
  separatorOpacityPercent: 20,

  subtextFontSize: 'text-sm',
  subtextFontSizeMd: 'md:text-sm',
  subtextFontSizeLg: 'lg:text-sm',
  subtextFontFamily: 'font-sans',
  subtextFontWeight: 'font-normal',
  subtextLineHeight: 'leading-relaxed',
  subtextLetterSpacing: 'tracking-normal',
  subtextTextTransform: 'normal-case',
  subtextPaddingTop: 'pt-6',
  subtextPaddingRight: 'pr-0',
  subtextPaddingBottom: 'pb-0',
  subtextPaddingLeft: 'pl-0',
};

const HEX = /^#[0-9a-f]{6}$/i;
function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX.test(value) ? value : fallback;
}
function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.min(max, Math.max(min, value)))
    : fallback;
}
function gap<B extends 'base' | 'md' | 'lg'>(
  breakpoint: B, value: unknown, fallback: TailwindTokenValue<'gap', B>,
): TailwindTokenValue<'gap', B> {
  return normalizeTailwindToken({ utility: 'gap', breakpoint, value, fallback });
}
function marginTop<B extends 'base' | 'md' | 'lg'>(
  breakpoint: B, value: unknown, fallback: TailwindTokenValue<'marginTop', B>,
): TailwindTokenValue<'marginTop', B> {
  return normalizeTailwindToken({ utility: 'marginTop', breakpoint, value, fallback });
}
function fontSize<B extends 'base' | 'md' | 'lg'>(
  breakpoint: B, value: unknown, fallback: TailwindTokenValue<'fontSize', B>,
): TailwindTokenValue<'fontSize', B> {
  return normalizeTailwindToken({ utility: 'fontSize', breakpoint, value, fallback });
}

export function normalizePracticesSectionLayoutConfig(
  value: Partial<PracticesSectionLayoutConfig> | undefined,
  fallback: PracticesSectionLayoutConfig = DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
): PracticesSectionLayoutConfig {
  const separatorStyle: PracticesSeparatorStyle =
    value?.separatorStyle === 'none' || value?.separatorStyle === 'vertical-and-row'
      ? value.separatorStyle
      : value?.separatorStyle === 'between-items'
        ? 'between-items'
        : fallback.separatorStyle;
  return {
    headerMaxWidth: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'base', value: value?.headerMaxWidth, fallback: fallback.headerMaxWidth }),
    paragraphMaxWidth: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'base', value: value?.paragraphMaxWidth, fallback: fallback.paragraphMaxWidth }),
    paragraphMaxWidthMd: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'md', value: value?.paragraphMaxWidthMd, fallback: fallback.paragraphMaxWidthMd }),
    paragraphMaxWidthLg: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'lg', value: value?.paragraphMaxWidthLg, fallback: fallback.paragraphMaxWidthLg }),
    practiceCardMeasureCh: num(value?.practiceCardMeasureCh, fallback.practiceCardMeasureCh, 16, 90),
    practiceCardMeasureChMd: num(value?.practiceCardMeasureChMd, fallback.practiceCardMeasureChMd, 16, 90),
    practiceCardMeasureChLg: num(value?.practiceCardMeasureChLg, fallback.practiceCardMeasureChLg, 16, 90),
    sectionPaddingTop: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'base', value: value?.sectionPaddingTop, fallback: fallback.sectionPaddingTop }),
    sectionPaddingTopMd: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'md', value: value?.sectionPaddingTopMd, fallback: fallback.sectionPaddingTopMd }),
    sectionPaddingTopLg: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'lg', value: value?.sectionPaddingTopLg, fallback: fallback.sectionPaddingTopLg }),
    sectionPaddingBottom: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'base', value: value?.sectionPaddingBottom, fallback: fallback.sectionPaddingBottom }),
    sectionPaddingBottomMd: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'md', value: value?.sectionPaddingBottomMd, fallback: fallback.sectionPaddingBottomMd }),
    sectionPaddingBottomLg: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'lg', value: value?.sectionPaddingBottomLg, fallback: fallback.sectionPaddingBottomLg }),
    titleGroupGap: normalizeTailwindToken({ utility: 'marginTop', breakpoint: 'base', value: value?.titleGroupGap, fallback: fallback.titleGroupGap }),
    titleGroupGapMd: normalizeTailwindToken({ utility: 'marginTop', breakpoint: 'md', value: value?.titleGroupGapMd, fallback: fallback.titleGroupGapMd }),
    titleGroupGapLg: normalizeTailwindToken({ utility: 'marginTop', breakpoint: 'lg', value: value?.titleGroupGapLg, fallback: fallback.titleGroupGapLg }),
    gridToDividerGap: marginTop('base', value?.gridToDividerGap, fallback.gridToDividerGap),
    gridToDividerGapMd: marginTop('md', value?.gridToDividerGapMd, fallback.gridToDividerGapMd),
    gridToDividerGapLg: marginTop('lg', value?.gridToDividerGapLg, fallback.gridToDividerGapLg),
    dividerToDetailsGap: marginTop('base', value?.dividerToDetailsGap, fallback.dividerToDetailsGap),
    dividerToDetailsGapMd: marginTop('md', value?.dividerToDetailsGapMd, fallback.dividerToDetailsGapMd),
    dividerToDetailsGapLg: marginTop('lg', value?.dividerToDetailsGapLg, fallback.dividerToDetailsGapLg),
    industryGap: marginTop('base', value?.industryGap, fallback.industryGap),
    industryGapMd: marginTop('md', value?.industryGapMd, fallback.industryGapMd),
    industryGapLg: marginTop('lg', value?.industryGapLg, fallback.industryGapLg),
    ctaGap: marginTop('base', value?.ctaGap, fallback.ctaGap),
    ctaGapMd: marginTop('md', value?.ctaGapMd, fallback.ctaGapMd),
    ctaGapLg: marginTop('lg', value?.ctaGapLg, fallback.ctaGapLg),
    titleOpacityPercent: num(value?.titleOpacityPercent, fallback.titleOpacityPercent, 0, 100),
    contentOpacityPercent: num(value?.contentOpacityPercent, fallback.contentOpacityPercent, 0, 100),
    emphasisFontWeight: normalizeTailwindToken({ utility: 'fontWeight', breakpoint: 'base', value: value?.emphasisFontWeight, fallback: fallback.emphasisFontWeight }),
    emphasisOpacityPercent: num(value?.emphasisOpacityPercent, fallback.emphasisOpacityPercent, 0, 100),
    labelFontSize: fontSize('base', value?.labelFontSize, fallback.labelFontSize),
    labelFontSizeMd: fontSize('md', value?.labelFontSizeMd, fallback.labelFontSizeMd),
    labelFontSizeLg: fontSize('lg', value?.labelFontSizeLg, fallback.labelFontSizeLg),
    sectionTitleFontSize: fontSize('base', value?.sectionTitleFontSize, fallback.sectionTitleFontSize),
    sectionTitleFontSizeMd: fontSize('md', value?.sectionTitleFontSizeMd, fallback.sectionTitleFontSizeMd),
    sectionTitleFontSizeLg: fontSize('lg', value?.sectionTitleFontSizeLg, fallback.sectionTitleFontSizeLg),
    subsectionTitleFontSize: fontSize('base', value?.subsectionTitleFontSize, fallback.subsectionTitleFontSize),
    subsectionTitleFontSizeMd: fontSize('md', value?.subsectionTitleFontSizeMd, fallback.subsectionTitleFontSizeMd),
    subsectionTitleFontSizeLg: fontSize('lg', value?.subsectionTitleFontSizeLg, fallback.subsectionTitleFontSizeLg),
    sectionTitleFontFamily: normalizeTailwindToken({ utility: 'fontFamily', breakpoint: 'base', value: value?.sectionTitleFontFamily, fallback: fallback.sectionTitleFontFamily }),
    sectionTitleFontWeight: normalizeTailwindToken({ utility: 'fontWeight', breakpoint: 'base', value: value?.sectionTitleFontWeight, fallback: fallback.sectionTitleFontWeight }),
    subsectionTitleFontFamily: normalizeTailwindToken({ utility: 'fontFamily', breakpoint: 'base', value: value?.subsectionTitleFontFamily, fallback: fallback.subsectionTitleFontFamily }),
    subsectionTitleFontWeight: normalizeTailwindToken({ utility: 'fontWeight', breakpoint: 'base', value: value?.subsectionTitleFontWeight, fallback: fallback.subsectionTitleFontWeight }),
    leadFontSize: fontSize('base', value?.leadFontSize, fallback.leadFontSize),
    leadFontSizeMd: fontSize('md', value?.leadFontSizeMd, fallback.leadFontSizeMd),
    leadFontSizeLg: fontSize('lg', value?.leadFontSizeLg, fallback.leadFontSizeLg),
    bodyFontSize: fontSize('base', value?.bodyFontSize, fallback.bodyFontSize),
    bodyFontSizeMd: fontSize('md', value?.bodyFontSizeMd, fallback.bodyFontSizeMd),
    bodyFontSizeLg: fontSize('lg', value?.bodyFontSizeLg, fallback.bodyFontSizeLg),
    ctaFontSize: fontSize('base', value?.ctaFontSize, fallback.ctaFontSize),
    ctaFontSizeMd: fontSize('md', value?.ctaFontSizeMd, fallback.ctaFontSizeMd),
    ctaFontSizeLg: fontSize('lg', value?.ctaFontSizeLg, fallback.ctaFontSizeLg),
    columnTargetWidthPx: num(value?.columnTargetWidthPx, fallback.columnTargetWidthPx, 160, 900),
    minColumnWidthPx: num(value?.minColumnWidthPx, fallback.minColumnWidthPx, 120, 900),
    maxColumnWidthPx: num(value?.maxColumnWidthPx, fallback.maxColumnWidthPx, 160, 1200),
    maxColumnCount: num(value?.maxColumnCount, fallback.maxColumnCount, 1, 4),
    columnGap: gap('base', value?.columnGap, fallback.columnGap),
    columnGapMd: gap('md', value?.columnGapMd, fallback.columnGapMd),
    columnGapLg: gap('lg', value?.columnGapLg, fallback.columnGapLg),
    rowGap: gap('base', value?.rowGap, fallback.rowGap),
    rowGapMd: gap('md', value?.rowGapMd, fallback.rowGapMd),
    rowGapLg: gap('lg', value?.rowGapLg, fallback.rowGapLg),
    sectionDividerEnabled: typeof value?.sectionDividerEnabled === 'boolean' ? value.sectionDividerEnabled : fallback.sectionDividerEnabled,
    practiceDividersEnabled: typeof value?.practiceDividersEnabled === 'boolean' ? value.practiceDividersEnabled : fallback.practiceDividersEnabled,
    separatorStyle,
    separatorWidth: normalizeTailwindToken({ utility: 'borderWidth', breakpoint: 'base', value: value?.separatorWidth, fallback: fallback.separatorWidth }),
    separatorColorMode: value?.separatorColorMode === 'custom' ? 'custom' : value?.separatorColorMode === 'inherit' ? 'inherit' : fallback.separatorColorMode,
    separatorColor: color(value?.separatorColor, fallback.separatorColor),
    separatorOpacityPercent: num(value?.separatorOpacityPercent, fallback.separatorOpacityPercent, 0, 100),

    subtextFontSize: fontSize('base', value?.subtextFontSize, fallback.subtextFontSize),
    subtextFontSizeMd: fontSize('md', value?.subtextFontSizeMd, fallback.subtextFontSizeMd),
    subtextFontSizeLg: fontSize('lg', value?.subtextFontSizeLg, fallback.subtextFontSizeLg),
    subtextFontFamily: normalizeTailwindToken({ utility: 'fontFamily', breakpoint: 'base', value: value?.subtextFontFamily, fallback: fallback.subtextFontFamily }),
    subtextFontWeight: normalizeTailwindToken({ utility: 'fontWeight', breakpoint: 'base', value: value?.subtextFontWeight, fallback: fallback.subtextFontWeight }),
    subtextLineHeight: normalizeTailwindToken({ utility: 'lineHeight', breakpoint: 'base', value: value?.subtextLineHeight, fallback: fallback.subtextLineHeight }),
    subtextLetterSpacing: normalizeTailwindToken({ utility: 'letterSpacing', breakpoint: 'base', value: value?.subtextLetterSpacing, fallback: fallback.subtextLetterSpacing }),
    subtextTextTransform: normalizeTailwindToken({ utility: 'textTransform', breakpoint: 'base', value: value?.subtextTextTransform, fallback: fallback.subtextTextTransform }),
    subtextPaddingTop: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'base', value: value?.subtextPaddingTop, fallback: fallback.subtextPaddingTop }),
    subtextPaddingRight: normalizeTailwindToken({ utility: 'paddingRight', breakpoint: 'base', value: value?.subtextPaddingRight, fallback: fallback.subtextPaddingRight }),
    subtextPaddingBottom: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'base', value: value?.subtextPaddingBottom, fallback: fallback.subtextPaddingBottom }),
    subtextPaddingLeft: normalizeTailwindToken({ utility: 'paddingLeft', breakpoint: 'base', value: value?.subtextPaddingLeft, fallback: fallback.subtextPaddingLeft }),
  };
}

/**
 * Resolve the column count from the measured container width, mirroring the
 * wall feed's width->count approach (floor division by target+gap), then
 * clamping so each resolved column stays within [min, max] and the count never
 * exceeds maxColumnCount. SSR / pre-measurement callers pass width 0 and get 1.
 */
export function resolvePracticesColumnCount(
  containerWidthPx: number,
  columnGapPx: number,
  config: PracticesSectionLayoutConfig,
): number {
  if (!Number.isFinite(containerWidthPx) || containerWidthPx <= 0) return 1;
  const gapPx = Math.max(0, columnGapPx);
  const target = Math.max(1, config.columnTargetWidthPx);
  const ceiling = Math.max(1, config.maxColumnCount);
  const columnWidth = (count: number) => (containerWidthPx - (count - 1) * gapPx) / count;

  let count = Math.max(1, Math.floor((containerWidthPx + gapPx) / (target + gapPx)));
  count = Math.min(count, ceiling);
  // Add columns while each would still be wider than the max (never past the ceiling).
  while (count < ceiling && columnWidth(count) > config.maxColumnWidthPx) count += 1;
  // Drop columns while each would be narrower than the min (never below one).
  while (count > 1 && columnWidth(count) < config.minColumnWidthPx) count -= 1;
  return count;
}
