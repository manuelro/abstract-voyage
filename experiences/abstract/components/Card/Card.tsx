import type { HueFadeCardProps } from '../AbstractJournalLabCollection';
import { AbstractJournalLabHueFadeCard } from '../AbstractJournalLabCollection';
import type { CardAppearanceConfig } from './config/appearance';

/** Central card surface used by Abstract's CoverFlow. The underlying
 * ArticleCard remains the shared information-card primitive; this adapter
 * centralizes the Abstract-specific gradient/neutral surface contract and
 * keeps its appearance config separate from stack geometry. */
export type CardProps = Omit<HueFadeCardProps, 'stackPresentation'> & {
  appearanceConfig?: CardAppearanceConfig;
  stackPresentation?: HueFadeCardProps['stackPresentation'];
};

export function Card({ appearanceConfig, stackPresentation, ...props }: CardProps) {
  const resolvedStackPresentation = appearanceConfig && stackPresentation
    ? {
      ...stackPresentation,
      headerOpacity: appearanceConfig.activeHeaderOpacity,
      textOpacity: appearanceConfig.activeTextOpacity,
      transitionDurationMs: appearanceConfig.stepTiltDurationMs,
      transitionEasingCss: stackPresentation.transitionEasingCss,
      gradientRevealDurationMs: appearanceConfig.neighborGradientRevealDurationMs,
      gradientRevealEasingCss: stackPresentation.gradientRevealEasingCss,
      gradientRevealBlurPx: appearanceConfig.neighborGradientRevealBlurPx,
      shadowFadeDurationMs: appearanceConfig.neighborShadowFadeDurationMs,
      shadowFadeEasingCss: stackPresentation.shadowFadeEasingCss,
      ctaHoverDurationMs: appearanceConfig.ctaHoverDurationMs,
      ctaHoverEasingCss: stackPresentation.ctaHoverEasingCss,
      ctaHoverDelayMs: appearanceConfig.ctaHoverDelayMs,
      frameMode: appearanceConfig.neighborFrameMode,
    }
    : stackPresentation;

  return (
    <AbstractJournalLabHueFadeCard
      {...props}
      stackPresentation={resolvedStackPresentation}
    />
  );
}
