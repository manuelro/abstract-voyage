'use client';

import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { clamp } from '../../../helpers/clamp';
import {
  DEFAULT_ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG,
  normalizeAbstractPostDockPaletteConfig,
  normalizeAbstractPostDockHueInfluenceConfig,
  type AbstractPostDockGradientPerformanceConfig,
  type AbstractPostDockHueInfluenceConfig,
  type AbstractPostDockHologramConfig,
  type AbstractPostDockIntroductionConfig,
  type AbstractPostDockLayoutConfig,
  type AbstractPostDockPaletteConfig,
} from './AbstractPostDock/config/registered';
import { useLiquidSliderMotion } from './AbstractPostDock/hooks/motion';
import { AbstractPostDockView } from './AbstractPostDock/components/View';
import {
  DEFAULT_LIQUID_SLIDER_CONFIG,
  type LiquidSliderConfig,
  type SliderSlide,
} from './AbstractPostDock/config/legacy';

export type {
  AbstractPostDockGradientPerformanceConfig,
  AbstractPostDockHueInfluenceConfig,
  AbstractPostDockIntroductionConfig,
  AbstractPostDockPaletteConfig,
  AbstractPostDockLayoutConfig,
  AbstractPostDockHologramConfig,
} from './AbstractPostDock/config/registered';
export type { LiquidSliderConfig } from './AbstractPostDock/config/legacy';
export { DEFAULT_LIQUID_SLIDER_CONFIG } from './AbstractPostDock/config/legacy';
export type {
  GradientOutputTreatment,
  GradientMetalLuminanceOutputTreatment,
} from './AbstractPostDock/config/outputTreatment';
export {
  DEFAULT_GRADIENT_OUTPUT_TREATMENT,
} from './AbstractPostDock/config/outputTreatment';
export type { DeckPaletteState } from './AbstractPostDock/components/GradientRenderer';
export { LiquidGradientAdapter } from './AbstractPostDock/components/GradientRenderer';
export type { LiquidSliderMotion } from './AbstractPostDock/hooks/motion';

export type AbstractPostDockProps = {
  items: SliderSlide[];
  config?: LiquidSliderConfig;
  introductionConfig?: Partial<AbstractPostDockIntroductionConfig>;
  gradientPerformanceConfig?: Partial<AbstractPostDockGradientPerformanceConfig>;
  paletteConfig?: Partial<AbstractPostDockPaletteConfig>;
  hueInfluenceConfig?: Partial<AbstractPostDockHueInfluenceConfig>;
  layoutConfig?: Partial<AbstractPostDockLayoutConfig>;
  hologramConfig?: Partial<AbstractPostDockHologramConfig>;
  /** Minimal mode's background — linked live to the Editorial Hero's own
   * surface color, not an independent value. */
  editorialSurfaceColor?: string;
  variant?: 'showcase' | 'embedded';
  /** Narrow/touch-device detection defaults to the dock's own measured
   * container width ('container') — correct whenever that container spans
   * (near enough) the full viewport by design, true of both the showcase
   * variant and every existing embedded usage to date. Set 'viewport' only
   * when hosting the dock in a column deliberately narrower than the
   * viewport even on desktop (e.g. a fixed-percentage split layout) — there,
   * the container width would misclassify an ordinary desktop browsing
   * context as a narrow/touch device. */
  narrowDetectionSource?: 'container' | 'viewport';
  /** Below this viewport/container width, the dock switches into its
   * narrow/touch presentation — see AbstractPostDockView's own doc comment.
   * Defaults to 1180 (the dock's own original threshold), unchanged for
   * every existing consumer. */
  narrowBreakpointPx?: number;
  /** Controlled active-slide index — omit for the component's own internal
   * state (every existing consumer). Supply together with
   * onActiveIndexChange when a page wants to drive navigation externally
   * (e.g. a custom prev/next control rendered outside the dock itself). */
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  /** Opt-out of the narrow/touch deck's drag-coupled rotateY card tilt —
   * see AbstractDeckSwiper's own doc comment. Defaults to `true`, unchanged
   * for every existing consumer (this page's own JOURNAL dock, pages/about.tsx,
   * pages/slider.tsx); AbstractJournalLabCollection's slider layoutMode is
   * the first caller to pass `false`. Only affects deck mode (narrow/touch);
   * the wide scattered layout never tilted. */
  dragTiltEnabled?: boolean;
  /** Gaussian pan curve, proximity morph only (useGaussianProximityMorph) —
   * see AbstractPostDockView's own doc comment. null/absent (every existing
   * consumer) forwards straight through as no-op. */
  gaussianProximityOffsetXRefs?: ReadonlyArray<MutableRefObject<number> | null> | null;
  gaussianProximityDomRefs?: ReadonlyArray<((element: HTMLDivElement | null) => void) | null> | null;
};

export function AbstractPostDock({
  items,
  config: suppliedConfig,
  introductionConfig,
  gradientPerformanceConfig,
  paletteConfig,
  hueInfluenceConfig,
  layoutConfig,
  hologramConfig,
  editorialSurfaceColor,
  variant = 'showcase',
  narrowDetectionSource = 'container',
  narrowBreakpointPx,
  activeIndex: controlledActiveIndex,
  onActiveIndexChange,
  dragTiltEnabled = true,
  gaussianProximityOffsetXRefs,
  gaussianProximityDomRefs,
}: AbstractPostDockProps) {
  const config = suppliedConfig ?? DEFAULT_LIQUID_SLIDER_CONFIG;
  const [internalActiveIndex, setInternalActiveIndex] = useState(
    () => Math.min(7, Math.max(0, items.length - 1)),
  );
  const activeIndex = controlledActiveIndex ?? internalActiveIndex;
  const setActiveIndex = useCallback((next: number) => {
    setInternalActiveIndex(next);
    onActiveIndexChange?.(next);
  }, [onActiveIndexChange]);
  const resolvedConfig = useMemo<LiquidSliderConfig>(() => ({
    ...config,
    ...(introductionConfig ? {
      dockRevealEnabled: introductionConfig.enabled ?? config.dockRevealEnabled,
      dockRevealMode: introductionConfig.mode ?? config.dockRevealMode,
      dockRevealOverlapMs: introductionConfig.overlapMs ?? config.dockRevealOverlapMs,
      dockRevealFirstDelayMs: introductionConfig.firstDelayMs ?? config.dockRevealFirstDelayMs,
      dockRevealDurationMs: introductionConfig.durationMs ?? config.dockRevealDurationMs,
      dockRevealStaggerMs: introductionConfig.staggerMs ?? config.dockRevealStaggerMs,
      dockRevealEasing: introductionConfig.easing ?? config.dockRevealEasing,
      dockRevealDistribution: introductionConfig.distribution ?? config.dockRevealDistribution,
      dockRevealCadenceAmount: introductionConfig.cadenceAmount ?? config.dockRevealCadenceAmount,
      dockRevealOffsetXVw: introductionConfig.offsetXVw ?? config.dockRevealOffsetXVw,
      dockRevealOffsetYPercent: introductionConfig.offsetYPercent ?? config.dockRevealOffsetYPercent,
    } : {}),
  }), [config, introductionConfig]);
  const resolvedGradientPerformanceConfig = useMemo<
    AbstractPostDockGradientPerformanceConfig | undefined
  >(() => {
    if (gradientPerformanceConfig) {
      return {
        ...DEFAULT_ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_CONFIG,
        ...gradientPerformanceConfig,
      };
    }

    // Preserve the standalone slider's existing device-specific tuning until
    // its legacy panel is migrated. The public dock default is unified.
    return suppliedConfig
      ? undefined
      : DEFAULT_ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_CONFIG;
  }, [gradientPerformanceConfig, suppliedConfig]);
  const motion = useLiquidSliderMotion(resolvedConfig);

  useEffect(() => {
    setInternalActiveIndex(previous => clamp(previous, 0, Math.max(0, items.length - 1)));
  }, [items.length]);

  const resolvedPaletteConfig = useMemo(
    () => normalizeAbstractPostDockPaletteConfig(paletteConfig),
    [paletteConfig],
  );
  const resolvedHueInfluenceConfig = useMemo(
    () => normalizeAbstractPostDockHueInfluenceConfig(
      hueInfluenceConfig ?? DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
    ),
    [hueInfluenceConfig],
  );

  const resolvedLayoutConfig = useMemo<AbstractPostDockLayoutConfig>(() => ({
    ...DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG,
    ...layoutConfig,
  }), [layoutConfig]);

  const resolvedHologramConfig = useMemo<AbstractPostDockHologramConfig>(() => ({
    ...DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG,
    ...hologramConfig,
  }), [hologramConfig]);

  return (
    <AbstractPostDockView
      slides={items}
      config={resolvedConfig}
      gradientPerformanceConfig={resolvedGradientPerformanceConfig}
      paletteConfig={resolvedPaletteConfig}
      hueInfluenceConfig={resolvedHueInfluenceConfig}
      layoutConfig={resolvedLayoutConfig}
      hologramConfig={resolvedHologramConfig}
      editorialSurfaceColor={editorialSurfaceColor}
      motion={motion}
      activeIndex={activeIndex}
      setActiveIndex={setActiveIndex}
      embedded={variant === 'embedded'}
      narrowDetectionSource={narrowDetectionSource}
      narrowBreakpointPx={narrowBreakpointPx}
      externallyControlledActiveIndex={controlledActiveIndex !== undefined ? activeIndex : null}
      dragTiltEnabled={dragTiltEnabled}
      gaussianProximityOffsetXRefs={gaussianProximityOffsetXRefs}
      gaussianProximityDomRefs={gaussianProximityDomRefs}
    />
  );
}
