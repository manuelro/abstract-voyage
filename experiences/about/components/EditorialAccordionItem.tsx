import { useMemo } from 'react';
import { deriveSurfaceColor } from '../../../helpers/surfaceColorDerivation';
import { usePrefersReducedMotion } from '../../../helpers/usePrefersReducedMotion';
import { AboutMobileAccordionItem } from './AboutMobileAccordionItem';
import type { AboutMobileAccordionConfig } from './AboutMobileAccordion.config';

export function resolveEditorialAccordionInk(config: AboutMobileAccordionConfig, backgroundColor: string) {
  return config.textColorMode === 'custom'
    ? config.textCustomColor
    : deriveSurfaceColor(backgroundColor, config.textSurfaceOffset);
}

/** The static, expanded editorial use of About's shared accordion item. */
export function EditorialAccordionItem({
  headline,
  description,
  config,
  textColor,
  openIndicatorEnabled = false,
  dimOpacity,
  emphasisOpacity,
  headerClassName,
  headerTextClassName,
  headingLevel = 2,
}: {
  headline: string;
  description: string;
  config: AboutMobileAccordionConfig;
  textColor: string;
  openIndicatorEnabled?: boolean;
  dimOpacity: number;
  emphasisOpacity: number;
  headerClassName?: string;
  headerTextClassName?: string;
  headingLevel?: 1 | 2;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const effectiveConfig = useMemo(() => ({
    ...config,
    transitionMs: 0,
    contentSettleMs: 0,
    openIndicatorEnabled: config.openIndicatorEnabled && openIndicatorEnabled,
  }), [config, openIndicatorEnabled]);

  return (
    <AboutMobileAccordionItem
      slide={{ excerpt: headline, title: description }}
      config={effectiveConfig}
      textColor={textColor}
      expanded
      staticHeader
      staticHeadingLevel={headingLevel}
      affordanceVisible={effectiveConfig.openIndicatorEnabled}
      dimOpacity={dimOpacity}
      emphasisOpacity={emphasisOpacity}
      prefersReducedMotion={prefersReducedMotion}
      headerClassName={headerClassName}
      headerTextClassName={headerTextClassName}
    />
  );
}
