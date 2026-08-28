'use client';

import { useMemo } from 'react';
import type { DeckPaletteState } from './GradientRenderer';
import type { LiquidSliderConfig } from '../config/legacy';
import type { LiquidSliderMotion } from '../hooks/motion';
import { AbstractPostDockScatterCard, type AbstractPostDockScatterCardReveal } from './ScatterCard';
import { resolveAbstractPostDockEasing, type AbstractPostDockLayoutConfig, type AbstractPostDockHologramConfig } from '../config/registered';
import { computeMagnificationDockRevealSchedule } from '../../../../../helpers/magnificationDockRevealMath';
import type { SliderContentSlide } from '../../../../../helpers/postContent';
import { resolveAbstractPostDockScatterLayout } from '../helpers/scatterLayout';

export type AbstractPostDockScatterProps = {
  items: SliderContentSlide[];
  motion: LiquidSliderMotion;
  config: LiquidSliderConfig;
  excerptLines: number;
  paletteStates: (DeckPaletteState | null)[] | null;
  layoutConfig: AbstractPostDockLayoutConfig;
  hologramConfig: AbstractPostDockHologramConfig;
  containerWidthPx: number;
  /** Minimal mode's background — linked live to the Editorial Hero's own
   * surface color, not an independent value. */
  editorialSurfaceColor?: string;
  prefersReducedMotion: boolean;
};

/**
 * Row-based placement, both distribution modes sharing one path:
 *
 * Cards are laid out row by row (however many fit the container's width per
 * row, same responsive computation as before). Within a row, each card sits
 * at its slot's center plus a *bounded* jitter in both axes — 'grid' just
 * sets that bound to zero; 'randomized' (default) opens it up to
 * `columnJitterPercent`/`rowJitterPercent` of the *safe* range, i.e. the gap
 * remaining after reserving room for the card's own worst-case rotated
 * footprint growth. That's what makes overlap structurally impossible
 * rather than merely checked-for: a jittered card can wander toward a
 * neighbour, but never far enough to reach it, at any rotation the config
 * allows. There's no rejection-sampling or fallback-scan left to run out of
 * luck the way a dart-throwing approach can.
 *
 * A row's own actual card count (not the row's full capacity) is what gets
 * centered horizontally, so a partial trailing row reads as a deliberate,
 * centered group instead of a full row with empty space on one side.
 */
function useScatterLayout(
  items: SliderContentSlide[],
  layoutConfig: AbstractPostDockLayoutConfig,
  containerWidthPx: number,
) {
  return useMemo(
    () => resolveAbstractPostDockScatterLayout({
      itemCount: items.length,
      layoutConfig,
      containerWidthPx,
    }),
    [items.length, layoutConfig, containerWidthPx],
  );
}

/**
 * Entrance timing for every card, computed once up front rather than per
 * card — same reveal math the slider/deck's own gaussian/inverse-gaussian
 * stagger already uses (`computeMagnificationDockRevealSchedule`, shared
 * verbatim, not reimplemented), just read off `config.dockReveal*` instead
 * of threaded through a separate prop, since `config` already carries those
 * fields for the slider path. Each card's own effect (in
 * AbstractPostDockScatterCard) turns its {startMs, durationMs} slot into the
 * actual rise/opacity/tilt/hologram animation — this hook only decides *when*.
 */
function useScatterReveal(
  itemCount: number,
  config: LiquidSliderConfig,
  offsetYPercent: number,
  prefersReducedMotion: boolean,
): AbstractPostDockScatterCardReveal[] {
  return useMemo(() => {
    const schedule = computeMagnificationDockRevealSchedule({
      itemCount,
      staggerMs: config.dockRevealStaggerMs,
      durationMs: config.dockRevealDurationMs,
      overlapMs: config.dockRevealOverlapMs,
      mode: config.dockRevealMode,
      distribution: config.dockRevealDistribution,
      cadenceAmount: config.dockRevealCadenceAmount,
    });
    const easingCss = resolveAbstractPostDockEasing(config.dockRevealEasing);
    const firstDelayMs = Math.max(0, config.dockRevealFirstDelayMs);
    return schedule.map(timing => ({
      enabled: config.dockRevealEnabled,
      prefersReducedMotion,
      startMs: firstDelayMs + timing.startMs,
      durationMs: timing.durationMs,
      easingCss,
      offsetYPercent,
    }));
  }, [
    itemCount,
    config.dockRevealEnabled,
    config.dockRevealStaggerMs,
    config.dockRevealDurationMs,
    config.dockRevealOverlapMs,
    config.dockRevealMode,
    config.dockRevealDistribution,
    config.dockRevealCadenceAmount,
    config.dockRevealEasing,
    config.dockRevealFirstDelayMs,
    offsetYPercent,
    prefersReducedMotion,
  ]);
}

export function AbstractPostDockScatter({
  items, motion, config, excerptLines,
  paletteStates, layoutConfig, hologramConfig, containerWidthPx, editorialSurfaceColor,
  prefersReducedMotion,
}: AbstractPostDockScatterProps) {
  const { cardWidthPx, cardHeightPx, positions, containerHeightPx, topPeekPx } = useScatterLayout(
    items,
    layoutConfig,
    containerWidthPx,
  );
  const reveals = useScatterReveal(
    items.length,
    config,
    config.dockRevealOffsetYPercent,
    prefersReducedMotion,
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: `${containerHeightPx}px`,
        // Pulls the whole field up so the first row can visibly extend past
        // its own top edge (into/behind the "WAY BACK" heading above it),
        // rather than relying on overflow:visible propagating correctly
        // through every ancestor — the box itself simply grows to include
        // that space. Shrinks total page height by the same amount, which
        // is expected: everything after this section sits that much closer.
        marginTop: topPeekPx > 0 ? `-${topPeekPx}px` : undefined,
      }}
    >
      {items.map((item, index) => {
        const position = positions[index];
        return (
          <AbstractPostDockScatterCard
            key={item.slug}
            slide={item}
            motion={motion}
            config={config}
            excerptLines={excerptLines}
            palette={paletteStates?.[index] ?? null}
            widthPx={cardWidthPx}
            heightPx={cardHeightPx}
            leftPx={position.leftPx}
            topPx={position.topPx}
            rotationDeg={position.rotationDeg}
            minimalModeEnabled={layoutConfig.minimalModeEnabled}
            descriptionVisible={layoutConfig.descriptionVisible}
            descriptionHoverReveal={layoutConfig.descriptionHoverReveal}
            hologramConfig={hologramConfig}
            editorialSurfaceColor={editorialSurfaceColor}
            cardRadius={layoutConfig.cardRadius}
            reveal={reveals[index]}
          />
        );
      })}
    </div>
  );
}

export default AbstractPostDockScatter;
