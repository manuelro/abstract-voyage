import type { HueFadeCardProps } from '../AbstractJournalLabCollection';
import { AbstractJournalLabHueFadeCard } from '../AbstractJournalLabCollection';
import { resolveCardGradientInkTreatment, type CardAppearanceConfig } from './config/appearance';
import { tailwindTokenCssValue } from '../../../../components/Panel/config/tailwindFields';
import type { BreakpointTier } from '../../../../components/useBreakpointTier';

/** Central card surface used by Abstract's CoverFlow. The underlying
 * ArticleCard remains the shared information-card primitive; this adapter
 * centralizes the Abstract-specific gradient/neutral surface contract and
 * keeps its appearance config separate from stack geometry. */
export type CardProps = Omit<HueFadeCardProps, 'stackPresentation' | 'hideTopic' | 'hideReadingTime' | 'topicAsText'> & {
  appearanceConfig?: CardAppearanceConfig;
  appearanceBreakpointTier?: BreakpointTier;
  stackPresentation?: HueFadeCardProps['stackPresentation'];
};

export function Card({ appearanceConfig, appearanceBreakpointTier, stackPresentation, ...props }: CardProps) {
  const ink = appearanceConfig
    ? resolveCardGradientInkTreatment(appearanceConfig, appearanceBreakpointTier)
    : undefined;
  const resolvedStackPresentation = appearanceConfig && stackPresentation
    ? {
      ...stackPresentation,
      headerOpacity: appearanceConfig.activeHeaderOpacity,
      textOpacity: appearanceConfig.activeTextOpacity,
      scrimOpacity: stackPresentation.state === 'active'
        ? appearanceConfig.activeScrimOpacity
        : appearanceConfig.neighborScrimOpacity,
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
      invertedGradientInkEnabled: Boolean(ink),
      invertedGradientInkBackgroundColor: ink?.backgroundColor,
      invertedGradientInkBackgroundOpacity: ink?.backgroundOpacity,
      invertedGradientInkForegroundColor: ink?.foregroundColor,
      invertedGradientInkBlendMode: ink?.blendMode,
      invertedGradientInkActiveBorderEnabled: appearanceConfig.invertedGradientInkActiveBorderEnabled,
      invertedGradientInkActiveBorderWidthPx: tailwindTokenCssValue(
        'borderWidth',
        'base',
        appearanceConfig.invertedGradientInkActiveBorderWidth,
      ),
    }
    : stackPresentation;

  return (
    <AbstractJournalLabHueFadeCard
      {...props}
      hideTopic={Boolean(appearanceConfig?.hideTopicBelowWidthEnabled
        && props.cardWidthPx < appearanceConfig.hideTopicBelowWidthPx)}
      hideReadingTime={Boolean(appearanceConfig?.hideReadingTimeBelowWidthEnabled
        && props.cardWidthPx < appearanceConfig.hideReadingTimeBelowWidthPx)}
      topicAsText
      metadataFontSizeTokens={appearanceConfig ? {
        base: appearanceConfig.metadataFontSize,
        md: appearanceConfig.metadataFontSizeMd,
        lg: appearanceConfig.metadataFontSizeLg,
      } : undefined}
      contentPaddingTokens={appearanceConfig?.useTailwindContentPadding ? {
        top: appearanceConfig.contentPaddingTop,
        right: appearanceConfig.contentPaddingRight,
        bottom: appearanceConfig.contentPaddingBottom,
        left: appearanceConfig.contentPaddingLeft,
        topMd: appearanceConfig.contentPaddingTopMd,
        rightMd: appearanceConfig.contentPaddingRightMd,
        bottomMd: appearanceConfig.contentPaddingBottomMd,
        leftMd: appearanceConfig.contentPaddingLeftMd,
        topLg: appearanceConfig.contentPaddingTopLg,
        rightLg: appearanceConfig.contentPaddingRightLg,
        bottomLg: appearanceConfig.contentPaddingBottomLg,
        leftLg: appearanceConfig.contentPaddingLeftLg,
      } : undefined}
      stackPresentation={resolvedStackPresentation}
    />
  );
}
