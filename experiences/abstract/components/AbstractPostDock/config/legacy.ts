import type {
  MagnificationDockDimmingEasing,
  MagnificationDockRevealDistribution,
  MagnificationDockRevealMode,
} from '../../../../../components/MagnificationDock';
import type { SliderContentSlide } from '../../../../../helpers/postContent';
import {
  DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG,
  type AbstractPostDockEasingPreset,
} from './registered';
import type { MotionRuntimeState } from '../helpers/misc';

export type LiquidSliderMotionValues = {
  gradientX: number;
  gradientY: number;
  gradientAngle: number;
  gradientIntensity: number;
  gradientStretch: number;
  gradientDistortion: number;
  settlingIntensity: number;
  progress: number;
  direction: -1 | 0 | 1;
  velocity: number;
  isDragging: boolean;
};

export type LiquidSliderTuning = {
  enabled: boolean;
  maxDisplacement: number;
  maxVelocity: number;
  dragStiffness: number;
  dragDamping: number;
  releaseMomentum: number;
  releaseDecay: number;
  settleStiffness: number;
  settleDamping: number;
  angleGain: number;
  stretchGain: number;
  distortionGain: number;
  verticalDrift: number;
  intensityGain: number;
  snapThreshold: number;
  reducedMotionScale: number;
};

export type SliderGradientConfig = {
  backgroundColor: string;
  shaderColorVariation: number;
  shaderColorSaturation: number;
  shaderColorBrightness: number;
  shaderColorScale: number;
  shaderColorResolution: number;
  shaderColorRandomness: number;
  shaderColorSoftness: number;
  shaderColorVerticalRichness: number;
  shaderColorHueOffset: number;
  shaderColorMorph: number;
  shaderColorShimmer: number;
  shaderColorPulse: number;
  /** Compatibility-zero switch for journal-only source-field shaping. */
  shaderMeshGeometryEnabled: boolean;
  /** Additional amplitude applied to the existing domain warp (0..1). */
  shaderDomainCurveBoost: number;
  /** Additional amplitude applied to existing band phase coupling (0..1). */
  shaderBandCurveBoost: number;
  shaderSettledDriftEnabled: boolean;
  shaderSettledDriftSpeed: number;
  shaderSettledDriftAmount: number;
  shaderSettledDriftOrganic: number;
  /** Gaussian bell silhouette (about.tsx's gaussian pan-curve mode only,
   * v1 — see shaderSource.ts's own doc comment on the shader-side blend):
   * how soft/feathered the filled silhouette's own edge reads, in
   * normalized card-window units — NOT a line thickness, the mesh fills
   * the whole bell-shaped region, this only shapes its boundary. Inert
   * whenever shaderBellStrokeIntensity is 0. */
  shaderBellStrokeWidth: number;
  /** Blend strength of the bell silhouette, 0..1 — how strongly the area
   * outside the bell fades toward a desaturated/darkened version of the
   * mesh. 0 (the default everywhere except about.tsx's own gaussian-mode
   * override) is a complete no-op — every existing LiquidGradientAdapter
   * consumer is unaffected. */
  shaderBellStrokeIntensity: number;
  seed: number;
};

export type SliderEasingPreset = AbstractPostDockEasingPreset;
export type SliderDockPointerMode = 'hover' | 'pan' | 'hybrid';

export type SliderLayoutConfig = {
  layoutSlideGapRem: number;
  layoutStagePaddingRem: number;
  layoutVisibleNarrow: number;
  layoutVisibleTablet: number;
  layoutVisibleDesktop: number;
  layoutVisibleWide: number;
  layoutActiveScale: number;
  layoutInactiveScale: number;
  layoutScaleFalloff: number;
  layoutScaleDurationMs: number;
  layoutScaleEasing: SliderEasingPreset;
  layoutShadowStrength: number;
};

export type SliderTypographyConfig = {
  typographyMetaVisible: boolean;
  typographyContentWidthRem: number;
  typographyContentPaddingScale: number;
  typographyExcerptLines: number;
};

export type SliderNavigationConfig = {
  navigationWheelEnabled: boolean;
  navigationWheelSensitivity: number;
  navigationGestureThreshold: number;
  navigationSnapDuration: number;
  navigationWheelCooldownMs: number;
};

export type SliderDockConfig = {
  dockTransitionMs: number;
  dockContentSettleMs: number;
  dockRevealEnabled: boolean;
  dockRevealMode: MagnificationDockRevealMode;
  dockRevealOverlapMs: number;
  dockRevealFirstDelayMs: number;
  dockRevealDurationMs: number;
  dockRevealStaggerMs: number;
  dockRevealDistribution: MagnificationDockRevealDistribution;
  dockRevealCadenceAmount: number;
  dockRevealOffsetXVw: number;
  dockRevealOffsetYPercent: number;
  dockRevealEasing: SliderEasingPreset;
  dockTransitionEasing: SliderEasingPreset;
  dockActivePercent: number;
  dockMobilePeekRem: number;
  dockPointerStepPx: number;
  dockWheelStepPx: number;
  dockWheelLiquidGain: number;
  // Narrow/touch presentation: 'pager' = AbstractDeckPager — Swiper-driven,
  // fixed/centred anchor, exactly one card-width's symmetric peek on both
  // sides at every index. 'travel' = MagnificationDock's own progress-
  // anchored travelling presentation. 'deck' = AbstractDeckSwiper —
  // Swiper-driven too, but a travelling anchor (flush-left at the first
  // card, flush-right at the last) with a golden-ratio multi-card tail fan
  // only in the pending direction.
  dockMobileBehavior: 'pager' | 'travel' | 'deck';
  dockDeckDirection: 'ltr' | 'rtl';
  dockDeckStackPx: number;
  dockDeckDecay: number;
  dockDeckMaxSlivers: number;
  dockDeckTailCount: number;
  dockDeckBackHintPx: number;
  dockSwipeCommitPct: number;
  dockSwipeVelocity: number;
  dockSwipeSettleMs: number;
  dockCounterEnabled: boolean;
  dockDistanceDimmingEnabled: boolean;
  dockDistanceDimmingMaxOpacity: number;
  /** Floor of the dimming range — the item closest to active still bottoms
   * out here instead of the eased curve's own value at that distance. 0
   * (default) reproduces the original [0, max] range unchanged. */
  dockDistanceDimmingBaselineOpacity: number;
  dockNarrowDistanceDimmingMaxOpacity: number;
  dockDistanceDimmingPower: number;
  dockDistanceDimmingEasing: MagnificationDockDimmingEasing;
  dockShadowEnabled: boolean;
  dockShadowOpacity: number;
  dockShadowBlurPx: number;
  dockShadowSpreadPx: number;
  dockShadowOffsetXPx: number;
  dockShadowOffsetYPx: number;
  dockShadowColor: string;
  dockShadowDisableOnNarrow: boolean;
  /** Scales offsetX/offsetY/blur/spread (not color/opacity — same darkness,
   * shorter reach) for narrow presentations only. The desktop shadow values
   * are tuned for the scattered grid's generous 88-128px inter-card gaps;
   * unscaled, the same blur/offset reaches straight across the deck/pager's
   * much narrower ~16px peek gap and never fades out before the next card,
   * regardless of how correctly it's rounded to match the card underneath.
   * Same precedent as dockNarrowDistanceDimmingMaxOpacity: same mechanism,
   * a separately-tuned magnitude for the tighter narrow layout. */
  dockShadowNarrowScale: number;
  dockMobileActiveOnlyIdleDrift: boolean;
  dockDesktopActiveOnlyIdleDrift: boolean;
  dockContentInsetRem: number;
  dockContentInsetWideRem: number;
  dockMetadataTopAligned: boolean;
  dockCompactTitle: boolean;
  dockPanningEnabled: boolean;
  dockPanCursorEnabled: boolean;
  dockNaturalPanDirection: boolean;
  dockDesktopPointerMode: SliderDockPointerMode;
};

export type LiquidSliderConfig =
  LiquidSliderTuning &
  SliderGradientConfig &
  SliderLayoutConfig &
  SliderTypographyConfig &
  SliderNavigationConfig &
  SliderDockConfig;

export type SliderSlide = SliderContentSlide;

export const NEUTRAL_MOTION_VALUES: LiquidSliderMotionValues = {
  gradientX: 0,
  gradientY: 0,
  gradientAngle: 0,
  gradientIntensity: 0,
  gradientStretch: 1,
  gradientDistortion: 0,
  settlingIntensity: 0,
  progress: 0,
  direction: 0,
  velocity: 0,
  isDragging: false,
};

export const ZERO_MOTION_VELOCITY: MotionRuntimeState['velocity'] = {
  gradientX: 0,
  gradientY: 0,
  gradientAngle: 0,
  gradientIntensity: 0,
  gradientStretch: 0,
  gradientDistortion: 0,
  settlingIntensity: 0,
  progress: 0,
  velocity: 0,
};

export const DEFAULT_LIQUID_SLIDER_CONFIG: LiquidSliderConfig = {
  enabled: true,
  maxDisplacement: 72,
  maxVelocity: 3200,
  dragStiffness: 90,
  dragDamping: 9.5,
  releaseMomentum: 0.97,
  releaseDecay: 2.8,
  settleStiffness: 60,
  settleDamping: 2,
  angleGain: 40,
  stretchGain: 0.2,
  distortionGain: 1.6,
  verticalDrift: 1,
  intensityGain: 1.6,
  snapThreshold: 0.18,
  reducedMotionScale: 0.16,
  backgroundColor: '#ffffff',
  shaderColorVariation: 0.4,
  shaderColorSaturation: 0.95,
  shaderColorBrightness: 0.78,
  shaderColorScale: 0.5,
  shaderColorResolution: 1024,
  shaderColorRandomness: 1,
  shaderColorSoftness: 1,
  shaderColorVerticalRichness: 0,
  shaderColorHueOffset: 0.36,
  shaderColorMorph: 1.45,
  shaderColorShimmer: 1.5,
  shaderColorPulse: 0,
  shaderMeshGeometryEnabled: false,
  shaderDomainCurveBoost: 0,
  shaderBandCurveBoost: 0,
  shaderSettledDriftEnabled: true,
  shaderSettledDriftSpeed: 2,
  shaderSettledDriftAmount: 1,
  shaderSettledDriftOrganic: 1,
  shaderBellStrokeWidth: 0.05,
  shaderBellStrokeIntensity: 0,
  seed: 0.709,
  layoutSlideGapRem: 4,
  layoutStagePaddingRem: 4,
  layoutVisibleNarrow: 1.15,
  layoutVisibleTablet: 1.37,
  layoutVisibleDesktop: 1.93,
  layoutVisibleWide: 2.71,
  layoutActiveScale: 1,
  layoutInactiveScale: 0.9,
  layoutScaleFalloff: 1.05,
  layoutScaleDurationMs: 520,
  layoutScaleEasing: 'soft-expo',
  layoutShadowStrength: 0,
  typographyMetaVisible: true,
  typographyContentWidthRem: 56,
  typographyContentPaddingScale: 1,
  typographyExcerptLines: 3,
  navigationWheelEnabled: true,
  navigationWheelSensitivity: 0.88,
  navigationGestureThreshold: 76,
  navigationSnapDuration: 34,
  navigationWheelCooldownMs: 272,
  dockTransitionMs: 700,
  dockContentSettleMs: 0,
  dockRevealEnabled: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG.enabled,
  dockRevealMode: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG.mode,
  dockRevealOverlapMs: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG.overlapMs,
  dockRevealFirstDelayMs: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG.firstDelayMs,
  dockRevealDurationMs: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG.durationMs,
  dockRevealStaggerMs: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG.staggerMs,
  dockRevealDistribution: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG.distribution,
  dockRevealCadenceAmount: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG.cadenceAmount,
  dockRevealOffsetXVw: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG.offsetXVw,
  dockRevealOffsetYPercent: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG.offsetYPercent,
  dockRevealEasing: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG.easing,
  dockTransitionEasing: 'settle',
  dockActivePercent: 48,
  dockMobilePeekRem: 1,
  dockPointerStepPx: 40,
  dockWheelStepPx: 54,
  dockWheelLiquidGain: 1.35,
  dockMobileBehavior: 'pager',
  dockDeckTailCount: 5,
  dockDeckBackHintPx: 12,
  dockSwipeCommitPct: 0.32,
  dockSwipeVelocity: 0.5,
  dockSwipeSettleMs: 560,
  dockDeckDirection: 'ltr',
  dockDeckStackPx: 17,
  // Golden-ratio sliver spacing (φ⁻¹): each tail sliver is 61.8% of the previous.
  dockDeckDecay: 0.618,
  dockDeckMaxSlivers: 6,
  dockCounterEnabled: true,
  dockDistanceDimmingEnabled: true,
  dockDistanceDimmingMaxOpacity: 0.75,
  dockDistanceDimmingBaselineOpacity: 0,
  dockNarrowDistanceDimmingMaxOpacity: 0.36,
  dockDistanceDimmingPower: 0.25,
  dockDistanceDimmingEasing: 'soft',
  dockShadowEnabled: true,
  dockShadowOpacity: 0.7,
  dockShadowBlurPx: 96,
  dockShadowSpreadPx: 2,
  dockShadowOffsetXPx: 48,
  dockShadowOffsetYPx: -48,
  dockShadowColor: '#000000',
  dockShadowDisableOnNarrow: false,
  dockShadowNarrowScale: 0.15,
  dockMobileActiveOnlyIdleDrift: true,
  dockDesktopActiveOnlyIdleDrift: false,
  dockContentInsetRem: 2.5,
  dockContentInsetWideRem: 3,
  dockMetadataTopAligned: true,
  dockCompactTitle: true,
  dockPanningEnabled: true,
  dockPanCursorEnabled: true,
  dockNaturalPanDirection: true,
  dockDesktopPointerMode: 'hover',
};

export const SLIDE_COUNT = 9;
export const GRADIENT_LAYER_BLEED = 0.72;
export const GRADIENT_LAYER_SIZE = `${100 + GRADIENT_LAYER_BLEED * 200}%`;
// Hover-hologram: max gradient-space displacement at full tilt + full
// hologramOffsetGain, in the same raw units as LiquidSliderMotionValues'
// own gradientX/Y (compare LiquidSliderTuning's maxDisplacement default of
// 72) — gentler than a drag's momentary release spike since this is a
// sustained, hover-held displacement rather than a one-off flick.
export const HOLOGRAM_MAX_OFFSET_PX = 40;
