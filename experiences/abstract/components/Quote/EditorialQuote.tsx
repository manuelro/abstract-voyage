import Link from 'next/link';
import { colord } from 'colord';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { LG_BREAKPOINT_PX, MD_BREAKPOINT_PX } from '../../../../components/breakpoints';
import { tailwindTokenCssValue, translateTailwindTokenBreakpoint } from '../../../../components/Panel/config/tailwindFields';
import type { TailwindTokenValue } from '../../../../components/Panel/config/tailwindFields';
import { siteSans, siteSerif } from '../../../../components/siteFonts';
import { stripEmphasisMarkup } from '../../../../helpers/textEmphasis';
import type { CtaButtonConfig } from '../../../../components/CtaButton/config/registered';
import { Quote, type QuoteCoverFlowGradient, type QuoteProps } from './Quote';
import { withStableGradientDeck } from './quoteGradientDeck';
import { DEFAULT_EDITORIAL_QUOTE_CONFIGS, normalizeEditorialQuoteConfig, resolveEditorialInk, type EditorialQuoteConfig, type EditorialVariant } from './editorialConfig';
import { quoteSourceHeadingGapStyle } from './config';
import {
  DEFAULT_QUOTE_HEADING_APPEARANCE, DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE,
  normalizeQuoteHeadingAppearance, normalizeQuoteSourceLinkAppearance,
  type QuoteHeadingAppearanceConfig, type QuoteSourceLinkAppearanceConfig,
} from './quotePartsConfig';
import styles from './EditorialQuote.module.css';
import { formatQuoteSourceHeading } from './sourceHeading';

export type EditorialQuoteSource = {
  key: string; title: string; period: string; destination: string; text: string;
  ariaLabel?: string; linkAriaLabel?: string;
};

type Props = {
  source: EditorialQuoteSource;
  variant: EditorialVariant;
  config: EditorialQuoteConfig;
  /** Shared paragraph typography and emphasis overrides for this quote. */
  textAppearance?: QuoteProps['textAppearance'];
  /** Shared, app-wide heading/link look & feel. Defaulted so every call site
   * need not pass them, but the lab/wall pass the live shared design so editing
   * the heading/link once updates every quote. */
  headingAppearance?: QuoteHeadingAppearanceConfig;
  linkAppearance?: QuoteSourceLinkAppearanceConfig;
  coverFlowGradient?: QuoteCoverFlowGradient;
  cardHeightToWidthRatio?: number;
  liftPhysics?: CtaButtonConfig;
  deferGradientUntilVisible?: boolean;
  children?: ReactNode;
  sourceHeadingAs?: 'h3' | 'p';
  minHeight?: CSSProperties['minHeight'];
  constrainInlinePadding?: boolean;
  /** Overrides the fixed gap (EditorialQuote.module.css's .item
   * padding-block-start, 0.5rem) between a visible top rule and this
   * quote's own content. Wall-only (WallQuoteItem.tsx): lets the quote
   * below a top rule absorb half of the quote above it's own
   * quoteGapEnabled breathing room, so the rule sits at an equal distance
   * from both instead of all the extra space landing only above it. Has no
   * effect when the top rule itself is disabled. */
  topRuleContentGapOverridePx?: number;
};

function padding(a: { paddingTop: string; paddingRight: string; paddingBottom: string; paddingLeft: string }) {
  return [a.paddingTop, a.paddingRight, a.paddingBottom, a.paddingLeft].join(' ');
}

function partFontFamily(value: TailwindTokenValue<'fontFamily'>): string {
  const variable = tailwindTokenCssValue('fontFamily', 'base', value);
  const fallback = value === 'font-serif'
    ? `${siteSerif.style.fontFamily}, Georgia, serif`
    : `${siteSans.style.fontFamily}, Arial, sans-serif`;
  // A quote can be mounted outside the app font-variable wrapper (for
  // example in an isolated preview). Keep the generated token as the primary
  // family and supply its actual next/font face if that variable is absent.
  return variable.replace(/\)$/, `, ${fallback})`);
}

export function EditorialQuote({
  source, variant, config, textAppearance, headingAppearance, linkAppearance, coverFlowGradient, cardHeightToWidthRatio, liftPhysics, deferGradientUntilVisible, children, minHeight, constrainInlinePadding, topRuleContentGapOverridePx, sourceHeadingAs = 'h3',
}: Props) {
  const value = normalizeEditorialQuoteConfig(config, variant);
  const sharedHeadingLook = normalizeQuoteHeadingAppearance(headingAppearance ?? DEFAULT_QUOTE_HEADING_APPEARANCE);
  // Practice's editorial preset lives here, so every page renders the same
  // heading. Explicit shared and per-type edits still take precedence.
  const headingLook = variant === 'practice'
    ? { ...sharedHeadingLook,
        size: sharedHeadingLook.size === DEFAULT_QUOTE_HEADING_APPEARANCE.size
          ? DEFAULT_EDITORIAL_QUOTE_CONFIGS.practice.sourceHeadingFontSize : sharedHeadingLook.size,
        opacityPercent: sharedHeadingLook.opacityPercent === DEFAULT_QUOTE_HEADING_APPEARANCE.opacityPercent
          ? DEFAULT_EDITORIAL_QUOTE_CONFIGS.practice.sourceHeadingOpacityPercent : sharedHeadingLook.opacityPercent,
        textTransform: sharedHeadingLook.textTransform === DEFAULT_QUOTE_HEADING_APPEARANCE.textTransform
          ? DEFAULT_EDITORIAL_QUOTE_CONFIGS.practice.sourceHeadingTextTransform : sharedHeadingLook.textTransform,
        tracking: sharedHeadingLook.tracking === DEFAULT_QUOTE_HEADING_APPEARANCE.tracking
          ? DEFAULT_EDITORIAL_QUOTE_CONFIGS.practice.sourceHeadingTracking : sharedHeadingLook.tracking,
        paddingBottom: sharedHeadingLook.paddingBottom === DEFAULT_QUOTE_HEADING_APPEARANCE.paddingBottom
          ? 'pb-0' as const : sharedHeadingLook.paddingBottom }
    : sharedHeadingLook;
  // Shared heading appearance remains the default for every editorial type.
  // A per-type base Quote edit takes precedence once its value differs from
  // that type's preset.
  const headingPreset = DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant];
  const headingSize = value.sourceHeadingFontSize === headingPreset.sourceHeadingFontSize
    ? headingLook.size : value.sourceHeadingFontSize;
  // headingLook (the shared heading scope) only carries one, base-tier size --
  // it predates the responsive md:/lg: tiers QuoteSurfaceConfig.
  // sourceHeadingFontSize(Md/Lg) added. Uncustomized md:/lg: slots re-derive
  // the SAME shared token at that breakpoint (translateTailwindTokenBreakpoint,
  // the exact helper config.ts's own pinQuoteConfigToTier uses for this), so
  // the shared size still reads uniformly across every viewport by default;
  // only an explicit per-type edit away from that type's own preset breaks
  // that uniformity, same precedence rule as headingSize above.
  const headingSizeMd = value.sourceHeadingFontSizeMd === headingPreset.sourceHeadingFontSizeMd
    ? translateTailwindTokenBreakpoint('fontSize', 'base', 'md', headingLook.size, value.sourceHeadingFontSizeMd)
    : value.sourceHeadingFontSizeMd;
  const headingSizeLg = value.sourceHeadingFontSizeLg === headingPreset.sourceHeadingFontSizeLg
    ? translateTailwindTokenBreakpoint('fontSize', 'base', 'lg', headingLook.size, value.sourceHeadingFontSizeLg)
    : value.sourceHeadingFontSizeLg;
  const headingOpacity = value.sourceHeadingOpacityPercent === headingPreset.sourceHeadingOpacityPercent
    ? headingLook.opacityPercent : value.sourceHeadingOpacityPercent;
  const headingTransform = value.sourceHeadingTextTransform === headingPreset.sourceHeadingTextTransform
    ? headingLook.textTransform : value.sourceHeadingTextTransform;
  const headingTracking = value.sourceHeadingTracking === headingPreset.sourceHeadingTracking
    ? headingLook.tracking : value.sourceHeadingTracking;
  const linkLook = normalizeQuoteSourceLinkAppearance(linkAppearance ?? DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE);
  const inheritedInk = resolveEditorialInk(value);
  const headingColor = headingLook.colorMode === 'inherit' ? inheritedInk : headingLook.color;
  const linkColor = linkLook.colorMode === 'inherit' ? inheritedInk : linkLook.color;
  const rootRef = useRef<HTMLElement | null>(null);
  const [adaptiveSizePx, setAdaptiveSizePx] = useState<number | null>(null);
  useEffect(() => {
    if (!value.enabled || !value.adaptiveTypeEnabled) { setAdaptiveSizePx(null); return undefined; }
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = 0;
    let active = true;
    const measure = () => {
      const figure = root.querySelector('figure');
      const paragraph = root.querySelector('blockquote p');
      if (!figure || !paragraph) return;
      const tier = window.innerWidth >= LG_BREAKPOINT_PX ? 'lg' : window.innerWidth >= MD_BREAKPOINT_PX ? 'md' : 'base';
      const sizeToken = tier === 'lg' ? value.textSizeLg : tier === 'md' ? value.textSizeMd : value.textSize;
      const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const referencePx = Number.parseFloat(tailwindTokenCssValue('fontSize', tier, sizeToken)) * rootSize;
      const minimumPx = Math.min(referencePx, Number.parseFloat(tailwindTokenCssValue('fontSize', 'base', value.adaptiveMinSize)) * rootSize);
      const figureStyle = getComputedStyle(figure);
      const textStyle = getComputedStyle(paragraph);
      const width = Math.max(1, figure.getBoundingClientRect().width - Number.parseFloat(figureStyle.paddingLeft) - Number.parseFloat(figureStyle.paddingRight));
      const probe = document.createElement('div');
      Object.assign(probe.style, {
        position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden', pointerEvents: 'none',
        boxSizing: 'border-box', width: `${width}px`, maxWidth: `${value.measureCh}ch`,
        fontFamily: textStyle.fontFamily, fontWeight: textStyle.fontWeight,
        textTransform: textStyle.textTransform,
        letterSpacing: textStyle.letterSpacing, lineHeight: tailwindTokenCssValue('lineHeight', 'base', value.leading),
        overflowWrap: textStyle.overflowWrap, wordBreak: textStyle.wordBreak, hyphens: textStyle.hyphens,
      });
      probe.style.setProperty('text-wrap', textStyle.getPropertyValue('text-wrap'));
      probe.textContent = stripEmphasisMarkup(source.text);
      document.body.appendChild(probe);
      let size = referencePx;
      while (size > minimumPx) {
        probe.style.fontSize = `${size}px`;
        const lineHeight = Number.parseFloat(getComputedStyle(probe).lineHeight) || size * 1.35;
        const lines = Math.max(1, Math.round(probe.getBoundingClientRect().height / lineHeight));
        if (lines <= value.adaptiveMaxLines) break;
        size = Math.max(minimumPx, size - 2);
      }
      probe.remove();
      const next = size < referencePx ? size : null;
      setAdaptiveSizePx(previous => previous === next ? previous : next);
      root.dataset.editorialAdaptiveSize = next === null ? 'base' : String(next);
    };
    const schedule = () => { if (active) { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); } };
    schedule();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(root);
    window.addEventListener('resize', schedule);
    if (document.fonts) void document.fonts.ready.then(schedule);
    return () => { active = false; observer?.disconnect(); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame); };
  }, [source.text, value.enabled, value.adaptiveTypeEnabled, value.adaptiveMinSize, value.adaptiveMaxLines, value.textSize, value.textSizeMd, value.textSizeLg, value.textTransform, value.measureCh, value.leading]);
  if (!value.enabled) return null;
  const quoteConfig = {
    ...value,
    text: source.text,
  };
  const headingText = value.sourceHeadingText || formatQuoteSourceHeading(source.title, source.period, value.headingShowTitle, value.headingShowPeriod);
  const HeadingTag = sourceHeadingAs;
  const heading = value.headingEnabled && headingText ? (
    <HeadingTag data-quote-source-heading="" className={[styles.heading, padding(headingLook), headingSize, headingSizeMd, headingSizeLg].join(' ')} style={{
      color: headingColor,
      letterSpacing: tailwindTokenCssValue('letterSpacing', 'base', headingTracking),
      fontFamily: partFontFamily(headingLook.fontFamily),
      fontWeight: tailwindTokenCssValue('fontWeight', 'base', headingLook.fontWeight),
      textTransform: tailwindTokenCssValue('textTransform', 'base', headingTransform) as CSSProperties['textTransform'],
      opacity: headingOpacity / 100,
      textAlign: value.headingAlign,
      ...quoteSourceHeadingGapStyle(value, value.headingPlacement === 'after' || value.headingPlacement === 'inside-bottom' ? 'after' : 'before'),
    }}>{headingText}</HeadingTag>
  ) : null;
  const icon = linkLook.icon === 'none' ? null : (
    <span aria-hidden="true" style={{ fontSize: tailwindTokenCssValue('fontSize', 'base', linkLook.iconSize) }}>
      {linkLook.icon === 'arrow-right' ? '→' : '↗'}
    </span>
  );
  const link = value.linkEnabled ? (
    <div className={styles.linkRow} style={{ textAlign: value.linkAlign }}>
      <Link href={source.destination} prefetch={false} aria-label={source.linkAriaLabel ?? `${value.linkLabel} — ${source.title} on About`} className={[styles.link, padding(linkLook)].join(' ')} style={{
        color: linkColor,
        fontSize: tailwindTokenCssValue('fontSize', 'base', linkLook.size),
        fontFamily: partFontFamily(linkLook.fontFamily),
        fontWeight: tailwindTokenCssValue('fontWeight', 'base', linkLook.fontWeight),
        letterSpacing: tailwindTokenCssValue('letterSpacing', 'base', linkLook.tracking),
        gap: tailwindTokenCssValue('gap', 'base', linkLook.iconGap),
      }}>
        {linkLook.iconPlacement === 'before' ? icon : null}
        <span>{value.linkLabel}</span>
        {linkLook.iconPlacement === 'after' ? icon : null}
      </Link>
    </div>
  ) : null;
  // Surface backdrop by mode. A GRADIENT surface uses the gradient's own base
  // color (typically dark) so BOTH render modes read correctly: unified paints
  // the live mesh over it (loaded look unchanged; the pre-load/no-deck fallback
  // now matches the mesh instead of flashing a light box), and the CSS fallback
  // -- which paints the text itself with a light-ish card gradient and draws NO
  // surface of its own -- finally has a legible dark backdrop instead of light
  // gradient ink on a light box. solidBackgroundColor/solidTextColor stay the
  // SOLID-mode surface; none/palette keep today's behavior.
  const surfaceStyle: CSSProperties =
    value.backgroundMode === 'gradient'
      ? { backgroundColor: value.gradientInkBaseColor, position: 'relative', zIndex: 1 }
      : value.backgroundMode === 'solid'
        ? { backgroundColor: value.solidBackgroundColor, color: value.solidTextColor, position: 'relative', zIndex: 1 }
        : { color: value.solidTextColor };
  const innerQuote = (
    <Quote
      config={quoteConfig}
      textAppearance={textAppearance}
      cardHeightToWidthRatio={cardHeightToWidthRatio}
      minHeight={minHeight}
      constrainInlinePadding={constrainInlinePadding}
      fontSizeOverridePx={value.adaptiveTypeEnabled ? adaptiveSizePx ?? undefined : undefined}
      coverFlowGradient={withStableGradientDeck(coverFlowGradient)}
      liftPhysics={liftPhysics}
      deferGradientUntilVisible={deferGradientUntilVisible}
      sourceHeading={value.headingPlacement === 'inside-top' ? heading : null}
      beforeContent={value.linkPlacement === 'inside-top' ? link : null}
      afterContent={<>{value.headingPlacement === 'inside-bottom' ? heading : null}{value.linkPlacement === 'inside-bottom' ? link : null}</>}
      style={variant === 'practice' ? {
        ...surfaceStyle,
        // A practice quote can sit inside the banner's gradient ink layer.
        // Give its body the practice ink, so the outer layer's descendant
        // selector does not tint it with the banner's foreground color.
        '--gradient-ink-foreground': value.solidTextColor,
      } as CSSProperties : surfaceStyle}
    >{variant === 'featured' ? children : null}</Quote>
  );
  return (
    <article
      ref={rootRef}
      className={styles.item}
      data-editorial-variant={variant}
      data-editorial-background={value.backgroundMode}
      aria-label={source.ariaLabel ?? `About: ${source.title}${source.period ? `, ${source.period}` : ''}`}
      style={{
        borderTop: value.topRuleEnabled ? `${tailwindTokenCssValue('borderWidth', 'base', value.topRuleWidth)} solid ${colord(value.topRuleColor).alpha(value.topRuleOpacityPercent / 100).toRgbString()}` : 'none',
        ...(value.topRuleEnabled && topRuleContentGapOverridePx !== undefined
          ? { paddingBlockStart: topRuleContentGapOverridePx } : {}),
      }}
    >
      {value.headingPlacement === 'before' ? heading : null}
      {value.linkPlacement === 'before' ? link : null}
      {innerQuote}
      {value.headingPlacement === 'after' ? heading : null}
      {value.linkPlacement === 'after' ? link : null}
    </article>
  );
}
