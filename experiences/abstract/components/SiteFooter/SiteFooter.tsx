'use client';

import { useRef, type CSSProperties } from 'react';

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
  useScrollAdaptiveInk,
} from '../useScrollAdaptiveInk';

export type SiteFooterProps = {
  config: AbstractFooterConfig;
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
};

export function SiteFooter({
  config,
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
}: SiteFooterProps) {
  const footerRef = useRef<HTMLElement | null>(null);
  const accordionItemMotion = useLiquidSliderMotion(DEFAULT_LIQUID_SLIDER_CONFIG);
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!config.enabled) return null;

  const backgroundReferenceColor = config.backgroundMode === 'custom'
    ? config.backgroundColor
    : pageSurfaceConfig.color;
  const backgroundColor = config.backgroundMode === 'custom'
    ? config.backgroundColor
    : config.backgroundMode === 'surface'
      ? pageSurfaceConfig.color
      : undefined;
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
  // Keep the wordmark in the same visual state as the footer copy. The
  // scroll-adaptive hook writes its progress to the footer itself, so each
  // CSS `color-mix()` below updates at paint time without re-rendering a
  // multi-stop SVG gradient on every scroll frame.
  const footerWordmarkStops = config.adaptiveInkEnabled
    ? wordmarkStops.map(stop => ({
      ...stop,
      color: buildScrollAdaptiveInkColor(stop.color, config.adaptiveInkMaxAmount),
    }))
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
      className="relative z-10 overflow-hidden"
      style={{ ...footerStyle, backgroundColor, color: textColor }}
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
