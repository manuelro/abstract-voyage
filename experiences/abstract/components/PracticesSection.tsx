import { colord } from 'colord';
import type { CSSProperties } from 'react';
import type { EditorialQuoteConfig } from './Quote/editorialConfig';
import type { QuoteHeadingAppearanceConfig } from './Quote/quotePartsConfig';
import { tailwindTokenCssValue, type TailwindTokenValue } from '../../../components/Panel/config/tailwindFields';
import { tailwindSpacingTokenToPx } from '../../../components/tailwindSpacingScale';
import { useBreakpointTier } from '../../../components/useBreakpointTier';
import { useMeasuredElementRect } from '../../../components/useMeasuredElementRect';
import { MinimalModeText } from './AbstractPostDock/components/MinimalModeText';
import { PracticeCard } from './PracticeCard';
import {
  DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
  resolvePracticesColumnCount,
  type PracticesSectionLayoutConfig,
} from './PracticesSection.config';

// Every field below is copy, not config -- authored in content/practices.md
// (helpers/practicesContent.server.ts), not this component's own
// PracticesSectionLayoutConfig. An empty string hides that element entirely
// (see the render below); non-text fields (practices, cta.href) remain
// required since they have no "hidden" rendering short of dropping the
// whole item/link.
export type PracticesSectionContent = {
  eyebrow: string;
  heading: string;
  introduction: string;
  /** Optional line under the introduction, above the practices grid. */
  subtext: string;
  practices: Array<{ title: string; description: string }>;
  delivery: { heading: string; text: string };
  industry: { label: string; title: string; text: string };
  cta: { label: string; href: string };
};

type Props = {
  content: PracticesSectionContent;
  /** Accepted for call-site compatibility (wall.tsx). The practice cards now
   * render directly here rather than via EditorialQuote, so these are no longer
   * consumed; kept to avoid changing the shared call site. */
  quoteConfig?: EditorialQuoteConfig;
  headingAppearance?: QuoteHeadingAppearanceConfig;
  inkColor: string;
  layout?: PracticesSectionLayoutConfig;
};

export function PracticesSection({ content, inkColor, layout = DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG }: Props) {
  const { ref: gridRef, rect: gridRect } = useMeasuredElementRect<HTMLDivElement>();
  const { tier } = useBreakpointTier();

  // Resolve the active-tier gap tokens to px once, and reuse the column-gap px
  // for the width->count math so the rendered grid and the count agree
  // (SSR/first paint falls back to the mobile tokens and a single column).
  const columnGapToken = tier === 'lg' ? layout.columnGapLg : tier === 'md' ? layout.columnGapMd : layout.columnGap;
  const rowGapToken = tier === 'lg' ? layout.rowGapLg : tier === 'md' ? layout.rowGapMd : layout.rowGap;
  const columnGapPx = tailwindSpacingTokenToPx(columnGapToken, 48);
  const rowGapPx = tailwindSpacingTokenToPx(rowGapToken, 48);

  const columnCount = resolvePracticesColumnCount(gridRect?.width ?? 0, columnGapPx, layout);

  const separatorColor = layout.separatorColorMode === 'inherit' ? inkColor : layout.separatorColor;
  const separatorCss = `${tailwindTokenCssValue('borderWidth', 'base', layout.separatorWidth)} solid ${colord(separatorColor).alpha(layout.separatorOpacityPercent / 100).toRgbString()}`;
  // Offset the content away from a drawn rule so it does not crowd the glyphs,
  // matching the old per-item `mt-6` / `border-t` spacing.
  const CONTENT_OFFSET = '1.5rem';

  const headerMaxWidthCss = tailwindTokenCssValue('maxWidth', 'base', layout.headerMaxWidth);
  // Shared body-paragraph measure, resolved for the active tier and applied
  // directly on each paragraph (a wrapper max-width does not reliably reach the
  // <p>, which is why industry.text was previously uncapped).
  const paragraphMaxWidthCss = tier === 'lg'
    ? tailwindTokenCssValue('maxWidth', 'lg', layout.paragraphMaxWidthLg)
    : tier === 'md'
      ? tailwindTokenCssValue('maxWidth', 'md', layout.paragraphMaxWidthMd)
      : tailwindTokenCssValue('maxWidth', 'base', layout.paragraphMaxWidth);
  const fontSizeCss = (
    base: TailwindTokenValue<'fontSize'>,
    md: TailwindTokenValue<'fontSize', 'md'>,
    lg: TailwindTokenValue<'fontSize', 'lg'>,
  ) => tier === 'lg'
    ? tailwindTokenCssValue('fontSize', 'lg', lg)
    : tier === 'md'
      ? tailwindTokenCssValue('fontSize', 'md', md)
      : tailwindTokenCssValue('fontSize', 'base', base);
  const labelFontSize = fontSizeCss(layout.labelFontSize, layout.labelFontSizeMd, layout.labelFontSizeLg);
  const sectionTitleFontSize = fontSizeCss(layout.sectionTitleFontSize, layout.sectionTitleFontSizeMd, layout.sectionTitleFontSizeLg);
  const subsectionTitleFontSize = fontSizeCss(layout.subsectionTitleFontSize, layout.subsectionTitleFontSizeMd, layout.subsectionTitleFontSizeLg);
  const leadFontSize = fontSizeCss(layout.leadFontSize, layout.leadFontSizeMd, layout.leadFontSizeLg);
  const bodyFontSize = fontSizeCss(layout.bodyFontSize, layout.bodyFontSizeMd, layout.bodyFontSizeLg);
  const ctaFontSize = fontSizeCss(layout.ctaFontSize, layout.ctaFontSizeMd, layout.ctaFontSizeLg);
  const subtextFontSize = fontSizeCss(layout.subtextFontSize, layout.subtextFontSizeMd, layout.subtextFontSizeLg);
  // Shared title/body opacity, with separate styling for marked phrases.
  const titleOpacity = layout.titleOpacityPercent / 100;
  const contentOpacity = layout.contentOpacityPercent / 100;
  // Keep the panel's Content opacity as the baseline for every paragraph.
  // Emphasis reaches full opacity at the approved default, but still fades to
  // zero when Content is zero. A parent opacity would cap highlighted spans.
  const emphasisOpacity = Math.min(
    1,
    contentOpacity / (DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG.contentOpacityPercent / 100),
  ) * layout.emphasisOpacityPercent / 100;
  const emphasisFontWeight = tailwindTokenCssValue('fontWeight', 'base', layout.emphasisFontWeight);
  // Title typography now driven by config (replaces the hardcoded global serif
  // + `font-semibold` className). sectionTitle covers "The Practice" and the
  // delivery heading; subsectionTitle covers each card title and the proof title.
  const sectionTitleFontFamily = tailwindTokenCssValue('fontFamily', 'base', layout.sectionTitleFontFamily);
  const sectionTitleFontWeight = tailwindTokenCssValue('fontWeight', 'base', layout.sectionTitleFontWeight);
  const subsectionTitleFontFamily = tailwindTokenCssValue('fontFamily', 'base', layout.subsectionTitleFontFamily);
  const subsectionTitleFontWeight = tailwindTokenCssValue('fontWeight', 'base', layout.subsectionTitleFontWeight);
  // Section vertical padding for the active tier. The top side is the gap below
  // the hero quote above "The Practice"; the bottom side is the gap below.
  const sectionPaddingTopCss = tier === 'lg'
    ? tailwindTokenCssValue('paddingTop', 'lg', layout.sectionPaddingTopLg)
    : tier === 'md'
      ? tailwindTokenCssValue('paddingTop', 'md', layout.sectionPaddingTopMd)
      : tailwindTokenCssValue('paddingTop', 'base', layout.sectionPaddingTop);
  const sectionPaddingBottomCss = tier === 'lg'
    ? tailwindTokenCssValue('paddingBottom', 'lg', layout.sectionPaddingBottomLg)
    : tier === 'md'
      ? tailwindTokenCssValue('paddingBottom', 'md', layout.sectionPaddingBottomMd)
      : tailwindTokenCssValue('paddingBottom', 'base', layout.sectionPaddingBottom);
  const marginTopCss = (
    base: TailwindTokenValue<'marginTop'>,
    md: TailwindTokenValue<'marginTop', 'md'>,
    lg: TailwindTokenValue<'marginTop', 'lg'>,
  ) => tier === 'lg'
    ? tailwindTokenCssValue('marginTop', 'lg', lg)
    : tier === 'md'
      ? tailwindTokenCssValue('marginTop', 'md', md)
      : tailwindTokenCssValue('marginTop', 'base', base);
  const titleGroupGapCss = marginTopCss(layout.titleGroupGap, layout.titleGroupGapMd, layout.titleGroupGapLg);
  const gridToDividerGapCss = marginTopCss(layout.gridToDividerGap, layout.gridToDividerGapMd, layout.gridToDividerGapLg);
  const dividerToDetailsGapCss = marginTopCss(layout.dividerToDetailsGap, layout.dividerToDetailsGapMd, layout.dividerToDetailsGapLg);
  const industryGapCss = marginTopCss(layout.industryGap, layout.industryGapMd, layout.industryGapLg);
  const ctaGapCss = marginTopCss(layout.ctaGap, layout.ctaGapMd, layout.ctaGapLg);
  const subtextStyle: CSSProperties = {
    maxWidth: paragraphMaxWidthCss,
    fontSize: subtextFontSize,
    fontFamily: tailwindTokenCssValue('fontFamily', 'base', layout.subtextFontFamily),
    fontWeight: tailwindTokenCssValue('fontWeight', 'base', layout.subtextFontWeight),
    lineHeight: tailwindTokenCssValue('lineHeight', 'base', layout.subtextLineHeight),
    letterSpacing: tailwindTokenCssValue('letterSpacing', 'base', layout.subtextLetterSpacing),
    textTransform: tailwindTokenCssValue('textTransform', 'base', layout.subtextTextTransform) as CSSProperties['textTransform'],
    opacity: contentOpacity,
    paddingTop: tailwindTokenCssValue('paddingTop', 'base', layout.subtextPaddingTop),
    paddingRight: tailwindTokenCssValue('paddingRight', 'base', layout.subtextPaddingRight),
    paddingBottom: tailwindTokenCssValue('paddingBottom', 'base', layout.subtextPaddingBottom),
    paddingLeft: tailwindTokenCssValue('paddingLeft', 'base', layout.subtextPaddingLeft),
  };

  const hasDelivery = Boolean(content.delivery.heading || content.delivery.text);
  const hasIndustry = Boolean(content.industry.label || content.industry.title || content.industry.text);

  return (
    <section
      data-practices-section=""
      aria-labelledby={content.heading ? 'practices-heading' : undefined}
      aria-label={content.heading ? undefined : 'Practices'}
      className="w-full text-left"
      style={{ color: inkColor, paddingTop: sectionPaddingTopCss, paddingBottom: sectionPaddingBottomCss }}
    >
      {/* No width cap or centering wrapper here: the content fills the banner
          quote's own content box, whose horizontal padding is owned by the
          EditorialQuote/Quote config (bottomBannerConfig.ts), not hardcoded. */}
      <header style={{ maxWidth: headerMaxWidthCss }}>
        {content.eyebrow ? <p className="font-medium uppercase tracking-[0.2em]" style={{ fontSize: labelFontSize, opacity: titleOpacity }}>{content.eyebrow}</p> : null}
        {content.heading ? (
          <h2 id="practices-heading" tabIndex={-1} className="leading-snug tracking-tight" style={{ color: inkColor, fontSize: sectionTitleFontSize, fontFamily: sectionTitleFontFamily, fontWeight: sectionTitleFontWeight, opacity: titleOpacity, scrollMarginTop: 'clamp(6rem, 12vh, 9rem)' }}>
            {content.heading}
          </h2>
        ) : null}
        {content.introduction ? (
          <p className="mt-6 leading-relaxed" style={{ maxWidth: paragraphMaxWidthCss, fontSize: leadFontSize, opacity: contentOpacity }}>{content.introduction}</p>
        ) : null}
        {content.subtext ? <p style={subtextStyle}>{content.subtext}</p> : null}
      </header>

      <div
        ref={gridRef}
        className="grid"
        style={{
          marginTop: titleGroupGapCss,
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          columnGap: `${columnGapPx}px`,
          rowGap: `${rowGapPx}px`,
        }}
      >
        {content.practices.map((practice, index) => {
          const row = Math.floor(index / columnCount);
          const col = index % columnCount;
          const drawRowRule = layout.practiceDividersEnabled && layout.separatorStyle !== 'none' && row > 0;
          const drawColumnRule = layout.practiceDividersEnabled && layout.separatorStyle === 'vertical-and-row' && col > 0;
          const cellStyle: CSSProperties = {
            borderTop: drawRowRule ? separatorCss : undefined,
            borderLeft: drawColumnRule ? separatorCss : undefined,
            paddingTop: drawRowRule ? CONTENT_OFFSET : undefined,
            paddingLeft: drawColumnRule ? CONTENT_OFFSET : undefined,
          };
          return <PracticeCard
            key={practice.title}
            title={practice.title}
            text={practice.description}
            inkColor={inkColor}
            layout={layout}
            style={cellStyle}
          />;
        })}
      </div>

      {layout.sectionDividerEnabled && (hasDelivery || hasIndustry) ? (
        <div data-practices-section-divider="" aria-hidden="true" className="border-t border-current opacity-20" style={{ marginTop: gridToDividerGapCss }} />
      ) : null}

      {/* Differentiator: a full-width band (answers the question the four cards
          raise, "why one person across all four?"). Promoted from the former
          equal half-column so it reads as its own moment. */}
      {hasDelivery ? (
        <div style={{ marginTop: layout.sectionDividerEnabled ? dividerToDetailsGapCss : gridToDividerGapCss }}>
          {content.delivery.heading ? <h3 className="leading-snug tracking-tight" style={{ color: inkColor, fontSize: sectionTitleFontSize, fontFamily: sectionTitleFontFamily, fontWeight: sectionTitleFontWeight, opacity: titleOpacity }}>{content.delivery.heading}</h3> : null}
          {content.delivery.text ? <MinimalModeText
            presentation="inherit"
            text={content.delivery.text}
            dimOpacity={contentOpacity}
            emphasisOpacity={emphasisOpacity}
            highlightedWordFontWeight={emphasisFontWeight}
            className="mt-5 leading-relaxed"
            style={{ maxWidth: paragraphMaxWidthCss, fontSize: leadFontSize }}
          /> : null}
        </div>
      ) : null}

      {/* Proof: subordinate to the differentiator (narrower measure, smaller
          title) so the reader can tell the offer/differentiator from the
          credibility note. */}
      {hasIndustry ? (
        <div style={{ marginTop: hasDelivery ? industryGapCss : layout.sectionDividerEnabled ? dividerToDetailsGapCss : gridToDividerGapCss }}>
          {content.industry.label ? <p className="font-medium uppercase tracking-[0.18em]" style={{ fontSize: labelFontSize, opacity: titleOpacity }}>{content.industry.label}</p> : null}
          {content.industry.title ? <h3 className="mt-3 leading-snug tracking-tight" style={{ color: inkColor, fontSize: subsectionTitleFontSize, fontFamily: subsectionTitleFontFamily, fontWeight: subsectionTitleFontWeight, opacity: titleOpacity }}>{content.industry.title}</h3> : null}
          {content.industry.text ? <p className="mt-4 leading-relaxed" style={{ maxWidth: paragraphMaxWidthCss, fontSize: bodyFontSize, opacity: contentOpacity }}>{content.industry.text}</p> : null}
        </div>
      ) : null}

      {/* Ask: an isolated, button-grade affordance (von Restorff isolation +
          Fitts). Full-width in the thumb zone on mobile, intrinsic width md+. */}
      {content.cta.label ? (
        <div style={{ marginTop: ctaGapCss }}>
          <a
            href={content.cta.href}
            className="inline-flex w-full items-center justify-center rounded-md border border-current px-6 py-3 font-medium opacity-100 transition-opacity duration-200 hover:opacity-70 focus-visible:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 md:w-auto"
            style={{ minHeight: '48px', fontSize: ctaFontSize }}
          >
            {content.cta.label}
          </a>
        </div>
      ) : null}
    </section>
  );
}
