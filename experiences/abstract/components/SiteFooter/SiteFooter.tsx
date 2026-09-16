'use client';

import { useRef, type CSSProperties } from 'react';
import { FiEdit3 } from 'react-icons/fi';

import { PageContainer } from '../../../../components/PageContainer';
import type { PageSurfaceConfig } from '../../../../components/PageSurface.config';
import Logo from '../Logo';
import type { WordmarkConfig } from '../SiteHeader/config/wordmark';
import type {
  SiteHeaderDesktopLogoWidth,
  SiteHeaderLogoWidth,
} from '../SiteHeader/config/registered';
import type { AboutMobileAccordionConfig } from '../../../about/components/AboutMobileAccordion.config';
import { AboutMobileAccordionItem } from '../../../about/components/AboutMobileAccordionItem';
import { DEFAULT_LIQUID_SLIDER_CONFIG } from '../AbstractPostDock';
import { useLiquidSliderMotion } from '../AbstractPostDock/hooks/motion';
import { deriveSurfaceColor } from '../../../../helpers/surfaceColorDerivation';
import { usePrefersReducedMotion } from '../../../../helpers/usePrefersReducedMotion';
import type { SliderContentSlide } from '../../../../helpers/postContent';
import type { SvgStop } from '../../../../helpers/gradientMath';
import type { AbstractFooterConfig } from '../../../../pages/abstract.config';
import {
  buildScrollAdaptiveInkColor,
  buildScrollAdaptiveInkStops,
  useScrollAdaptiveInk,
} from '../useScrollAdaptiveInk';

export type SiteFooterProps = {
  config: AbstractFooterConfig;
  editorHref?: string;
  accordionItemConfig: AboutMobileAccordionConfig;
  pageSurfaceConfig: PageSurfaceConfig;
  wordmarkConfig: WordmarkConfig;
  wordmarkStops: SvgStop[];
  wordmarkWidthClassName: SiteHeaderLogoWidth;
  wordmarkDesktopWidthClassName: SiteHeaderDesktopLogoWidth;
  scrollGradientDarkenViewportRangeVh?: number;
  scrollGradientDarkenTauMs?: number;
  scrollGradientOriginColor?: string;
  scrollGradientMaxDarken?: number;
  /** The shared scroll-gradient background's own darkest color — its
   * origin color (scrollGradientOriginColor) scaled toward black by its own
   * configured maxDarken, the SAME endpoint PolymorphicScrollGradientBackground
   * itself settles to at full darken (pages/abstract.tsx's own
   * mobileArticleListBackgroundDarkened computes this identically). Read by
   * config.backgroundMode/topBorderColorMode's own 'gradientDarkest' option
   * below. Undefined wherever the caller has no scroll-gradient background
   * at all — both options fall back to the plain surface reference then. */
  scrollGradientDarkestColor?: string;
};

export function SiteFooter({
  config,
  editorHref,
  accordionItemConfig,
  pageSurfaceConfig,
  wordmarkConfig,
  wordmarkStops,
  wordmarkWidthClassName,
  wordmarkDesktopWidthClassName,
  scrollGradientDarkenViewportRangeVh,
  scrollGradientDarkenTauMs,
  scrollGradientOriginColor,
  scrollGradientMaxDarken,
  scrollGradientDarkestColor,
}: SiteFooterProps) {
  const footerRef = useRef<HTMLElement | null>(null);
  const accordionItemMotion = useLiquidSliderMotion(DEFAULT_LIQUID_SLIDER_CONFIG);
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!config.enabled) return null;

  const backgroundReferenceColor = config.backgroundMode === 'custom'
    ? config.backgroundColor
    : config.backgroundMode === 'gradientDarkest'
      ? scrollGradientDarkestColor ?? pageSurfaceConfig.color
      : pageSurfaceConfig.color;
  const opaqueBackgroundColor = config.backgroundMode === 'custom'
    ? config.backgroundColor
    : config.backgroundMode === 'surface'
      ? pageSurfaceConfig.color
      : config.backgroundMode === 'gradientDarkest'
        ? scrollGradientDarkestColor ?? pageSurfaceConfig.color
        : undefined;
  // backgroundOpacity is independent of backgroundMode (any of the three
  // painted modes can also read as translucent) — color-mix() toward
  // transparent rather than an rgba string, matching the border opacity
  // treatment below and every other opacity knob in this component.
  const backgroundColor = opaqueBackgroundColor && config.backgroundOpacity < 1
    ? `color-mix(in srgb, ${opaqueBackgroundColor} ${config.backgroundOpacity * 100}%, transparent)`
    : opaqueBackgroundColor;
  const baseTextColor = config.textColorMode === 'custom'
    ? config.textColor
    : deriveSurfaceColor(backgroundReferenceColor, config.textSurfaceOffset);
  const baseMutedTextColor = config.textColorMode === 'custom'
    ? config.descriptionColor
    : deriveSurfaceColor(backgroundReferenceColor, config.descriptionSurfaceOffset);
  useScrollAdaptiveInk({
    ref: footerRef,
    enabled: config.adaptiveInkEnabled,
    baseColor: baseTextColor,
    maxAmount: config.adaptiveInkMaxAmount,
    targetContrastRatio: config.adaptiveInkTargetContrastRatio,
    scrollGradientDarkenViewportRangeVh,
    scrollGradientDarkenTauMs,
    scrollGradientOriginColor,
    scrollGradientMaxDarken,
    returnToLightEnabled: config.backgroundReturnToLightEnabled,
    returnToLightRangeVh: config.backgroundReturnToLightRangeVh,
    returnToLightFinalDarken: config.backgroundReturnToLightFinalDarken,
  });
  const textColor = config.adaptiveInkEnabled
    ? buildScrollAdaptiveInkColor(baseTextColor, config.adaptiveInkMaxAmount)
    : baseTextColor;
  const mutedTextColor = config.adaptiveInkEnabled
    ? buildScrollAdaptiveInkColor(baseMutedTextColor, config.adaptiveInkMaxAmount)
    : baseMutedTextColor;
  const baseBorderColor = config.pageLinkBorderColorMode === 'custom'
    ? config.pageLinkBorderColor
    : deriveSurfaceColor(backgroundReferenceColor, config.pageLinkBorderSurfaceOffset);
  const borderColor = config.adaptiveInkEnabled && config.pageLinkBorderColorMode !== 'custom'
    ? buildScrollAdaptiveInkColor(baseBorderColor, config.adaptiveInkMaxAmount)
    : baseBorderColor;
  // Footer-level top border (the seam above the whole section) — a second,
  // independent border resolution alongside pageLinkBorder's own per-item
  // rule above, same 'derived'/adaptive-ink treatment plus a third
  // 'gradientDarkest' option: the shared scroll-gradient's own darkest
  // color verbatim (no offset — it's already an extreme, not a surface to
  // nudge away from), letting the top edge read as "this gradient's own
  // edge" even when config.backgroundMode uses a different mode.
  const baseTopBorderColor = config.topBorderColorMode === 'custom'
    ? config.topBorderColor
    : config.topBorderColorMode === 'gradientDarkest'
      ? scrollGradientDarkestColor ?? backgroundReferenceColor
      : deriveSurfaceColor(backgroundReferenceColor, config.topBorderSurfaceOffset);
  const topBorderColor = config.adaptiveInkEnabled && config.topBorderColorMode !== 'custom'
    ? buildScrollAdaptiveInkColor(baseTopBorderColor, config.adaptiveInkMaxAmount)
    : baseTopBorderColor;
  // Keep the wordmark in the same visual state as the footer copy. The
  // scroll-adaptive hook writes its progress to the footer itself, so each
  // CSS `color-mix()` below updates at paint time without re-rendering a
  // multi-stop SVG gradient on every scroll frame.
  const footerWordmarkStops = config.adaptiveInkEnabled
    ? buildScrollAdaptiveInkStops(wordmarkStops, config.adaptiveInkMaxAmount)
    : wordmarkStops;
  const footerStyle = {
    '--abstract-footer-bg': backgroundColor ?? 'transparent',
    '--abstract-footer-text': textColor,
    '--abstract-footer-muted': mutedTextColor,
  } as CSSProperties;

  const pages: Array<{
    enabled: boolean;
    href: string;
    slide: SliderContentSlide;
  }> = [
    {
      enabled: config.abstractEnabled,
      href: '/abstract',
      slide: buildFooterSlide(0, config.abstractTitle, config.abstractDescription, '/abstract'),
    },
    {
      enabled: config.aboutEnabled,
      href: '/about',
      slide: buildFooterSlide(1, config.aboutTitle, config.aboutDescription, '/about'),
    },
    {
      enabled: config.journalEnabled,
      href: '/journal',
      slide: buildFooterSlide(2, config.journalTitle, config.journalDescription, '/journal'),
    },
    {
      enabled: config.contactEnabled,
      href: '/contact',
      slide: buildFooterSlide(3, config.contactTitle, config.contactDescription, '/contact'),
    },
  ].filter(page => page.enabled);
  const footerAccordionItemConfig: AboutMobileAccordionConfig = {
    ...accordionItemConfig,
    previewMinHeight: 'min-h-8',
    affordancePaddingX: 'px-0',
    affordancePaddingY: 'py-0',
  };
  // Treat an empty/whitespace value as absent. This makes a partially saved
  // config harmless instead of rendering a misleading, empty mailto link.
  const contactEmail = config.contactText.trim();

  return (
    <footer
      ref={footerRef}
      data-scroll-gradient-return-anchor={config.backgroundReturnToLightEnabled ? 'true' : undefined}
      className={`relative z-10 overflow-hidden ${config.topBorderEnabled ? config.topBorderWidthClassName : 'border-t-0'}`}
      style={{
        ...footerStyle,
        backgroundColor,
        color: textColor,
        borderColor: config.topBorderEnabled
          ? `color-mix(in srgb, ${topBorderColor} ${config.topBorderOpacity * 100}%, transparent)`
          : 'transparent',
      }}
    >
      <PageContainer
        config={pageSurfaceConfig}
        className={`mx-auto ${config.sectionPaddingYClassName}`}
      >
        <nav aria-label={config.navigationLabel}>
          <div
            className={`grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] ${config.pageItemGapClassName}`}
          >
            {pages.map(page => (
              <div
                key={page.href}
                className={[
                  config.pageLinkBorderEnabled ? config.pageLinkBorderWidthClassName : 'border-t-0',
                  config.pageItemPaddingYClassName,
                  config.pageItemPaddingXClassName,
                ].join(' ')}
                style={{
                  borderColor: config.pageLinkBorderEnabled
                    ? `color-mix(in srgb, ${borderColor} ${config.pageLinkBorderOpacity * 100}%, transparent)`
                    : 'transparent',
                }}
              >
                <AboutMobileAccordionItem
                  slide={page.slide}
                  palette={null}
                  motion={accordionItemMotion}
                  gradientConfig={DEFAULT_LIQUID_SLIDER_CONFIG}
                  config={footerAccordionItemConfig}
                  textColor={textColor}
                  expanded
                  onToggle={() => {}}
                  dimOpacity={0.62}
                  emphasisOpacity={1}
                  prefersReducedMotion={prefersReducedMotion}
                  headerHref={page.href}
                  headerClassName={[
                    config.pageTitlePaddingBottomClassName,
                  ].join(' ')}
                  headerTextClassName={[
                    config.pageTitleFontSizeClassName,
                    config.pageTitleFontWeightClassName,
                  ].join(' ')}
                  contentClassName={[
                    config.pageDescriptionMarginTopClassName,
                    config.pageDescriptionPaddingTopClassName,
                  ].join(' ')}
                  contentTextClassName={[
                    config.pageDescriptionFontSizeClassName,
                    config.pageDescriptionFontWeightClassName,
                  ].join(' ')}
                  openIndicatorVisible={config.pageLinkBulletEnabled}
                />
              </div>
            ))}
          </div>
        </nav>

        {editorHref ? (
          <div className="mt-8 flex justify-center">
            <a
              href={editorHref}
              className="inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-sm underline decoration-current underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              aria-label="Open the local editorial workspace"
            >
              <FiEdit3 aria-hidden="true" className="h-4 w-4" />
              <span>Editor</span>
            </a>
          </div>
        ) : null}

        {config.contactEmailEnabled && contactEmail ? (
          <div
            className={[
              'text-center tracking-[0.14em]',
              config.contactSpaceBeforeClassName,
              config.contactFontSizeClassName,
              config.contactFontWeightClassName,
            ].join(' ')}
          >
            <a
              href={`mailto:${contactEmail}`}
              className="underline decoration-current underline-offset-4"
            >
              {contactEmail}
            </a>
          </div>
        ) : null}

        <div
          className={`flex justify-center ${config.wordmarkSpaceBeforeClassName}`}
          style={{ opacity: config.wordmarkOpacity }}
        >
          <div
            className={`${wordmarkWidthClassName} ${wordmarkDesktopWidthClassName} flex max-w-full shrink-0 items-center justify-center`}
            style={{ maxWidth: `${wordmarkConfig.maxWidthPx}px` }}
          >
            <Logo
              ariaLabel="Abstract Voyage"
              width="100%"
              stops={footerWordmarkStops}
              stopTransitionMs={wordmarkConfig.colorTransitionMs}
              introAnimate={wordmarkConfig.introEnabled}
              introInitialDelay={wordmarkConfig.introInitialDelayS}
              introStepDelay={wordmarkConfig.introStepDelayS}
              introDuration={wordmarkConfig.introDurationS}
              introEasing={wordmarkConfig.introEasing}
              introDirection={wordmarkConfig.introDirection}
              introScalePivot={wordmarkConfig.introScalePivot}
              introBloomEnabled={wordmarkConfig.introBloomEnabled}
              introBloomBase={wordmarkConfig.introBloomBase}
              introBloomPeak={wordmarkConfig.introBloomPeak}
              introBloomInitialDelay={wordmarkConfig.introBloomInitialDelayS}
              introBloomStepDelay={wordmarkConfig.introBloomStepDelayS}
            />
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}

function buildFooterSlide(
  id: number,
  title: string,
  description: string,
  href: string,
): SliderContentSlide {
  return {
    id,
    slug: href.replace(/^\//, '') || 'home',
    label: title,
    title: description,
    excerpt: title,
    topic: 'Footer',
    date: '',
    readingTime: '',
    href,
    externalUrl: null,
    forceExternalNavigation: false,
    seed: id,
    hueOffset: 0,
    variationBias: 0,
    offsetX: 0,
    offsetY: 0,
    accent: '#ffffff',
  };
}
