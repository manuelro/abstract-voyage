'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AbstractPostDock,
  type AbstractPostDockHueInfluenceConfig,
  type AbstractPostDockLayoutConfig,
  type AbstractPostDockPaletteConfig,
  type LiquidSliderConfig,
} from '../AbstractPostDock';
import type { SliderContentSlide } from '../../../../helpers/postContent';
import type { AbstractJournalLabCollectionView } from './config/presentation';
import type { AbstractJournalLabCollectionSliderConfig } from './config/slider';

/**
 * Narrow/touch-device rendering for the 'slider' layoutMode — deliberately
 * the exact same dock component `pages/about.tsx` already uses for its own
 * narrow/touch sections (`AbstractPostDock`, `variant="embedded"`,
 * `narrowDetectionSource="viewport"`, which internally renders
 * `AbstractDeckSwiper`), rather than the bespoke Swiper drag surface
 * `CardSlider.tsx` builds for wide/pointer devices. `dragTiltEnabled={false}`
 * and `hologramConfig={{ enabled: false }}` turn off the deck's own
 * drag-coupled card tilt and hover-hologram gradient response — both are
 * pointer/hover-oriented flourishes that don't read as intentional on a
 * touch device the way they do under a mouse.
 *
 * Trade-off, and why it's unavoidable rather than an oversight: unlike
 * `CardSlider.tsx` (which reuses `AbstractJournalLabFlipCard`/
 * `AbstractJournalLabHueFadeCard` via an injectable `renderCard` callback,
 * so the "Journal / labs transition" config genuinely drives it),
 * `AbstractPostDock` renders its own cards internally with no such
 * injection point — reusing it here means giving up the per-card
 * flip/hue-fade transition for narrow devices specifically. A plain
 * opacity cross-fade (reusing the presentation config's own
 * `contentFadeDurationMs`/`fadeEasing` — not a new, parallel duration
 * field) keeps a view switch from being a jarring instant swap, without
 * pretending to replicate a transition this component has no way to hook.
 */
export type AbstractJournalLabCollectionNarrowDeckSliderProps = {
  activeView: AbstractJournalLabCollectionView;
  slides: SliderContentSlide[];
  sliderConfig: AbstractJournalLabCollectionSliderConfig;
  layoutConfig: AbstractPostDockLayoutConfig;
  paletteConfig: AbstractPostDockPaletteConfig;
  hueInfluenceConfig: AbstractPostDockHueInfluenceConfig;
  gradientConfig: LiquidSliderConfig;
  contentFadeDurationMs: number;
  contentFadeEasingCss: string;
  prefersReducedMotion: boolean;
};

export function AbstractJournalLabCollectionNarrowDeckSlider({
  activeView,
  slides,
  sliderConfig,
  layoutConfig,
  paletteConfig,
  hueInfluenceConfig,
  gradientConfig,
  contentFadeDurationMs,
  contentFadeEasingCss,
  prefersReducedMotion,
}: AbstractJournalLabCollectionNarrowDeckSliderProps) {
  const cappedCount = sliderConfig.narrowGroupSize * sliderConfig.groupCount;
  const cappedSlides = useMemo(
    () => slides.slice(0, cappedCount),
    [slides, cappedCount],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [contentVisible, setContentVisible] = useState(true);
  const [displayedView, setDisplayedView] =
    useState<AbstractJournalLabCollectionView>(activeView);
  const fadeTimerRef = useRef(0);

  useEffect(() => {
    if (activeView === displayedView) return undefined;
    if (prefersReducedMotion) {
      setDisplayedView(activeView);
      setActiveIndex(0);
      setContentVisible(true);
      return undefined;
    }
    setContentVisible(false);
    fadeTimerRef.current = window.setTimeout(() => {
      fadeTimerRef.current = 0;
      setDisplayedView(activeView);
      setActiveIndex(0);
      setContentVisible(true);
    }, contentFadeDurationMs);
    return () => {
      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = 0;
      }
    };
  }, [activeView, displayedView, prefersReducedMotion, contentFadeDurationMs]);

  const viewAllThreshold = sliderConfig.narrowViewAllThreshold;
  const progress = cappedSlides.length > 1
    ? activeIndex / (cappedSlides.length - 1)
    : 0;
  const viewAllVisible = progress >= viewAllThreshold;
  const viewAllHref = displayedView === 'labs' ? '/labs' : null;

  if (cappedSlides.length === 0) return null;

  return (
    <div
      className={sliderConfig.bottomSpacingClass}
      style={{
        opacity: contentVisible ? 1 : 0,
        transition: prefersReducedMotion
          ? 'none'
          : `opacity ${contentFadeDurationMs}ms ${contentFadeEasingCss}`,
      }}
    >
      <AbstractPostDock
        items={cappedSlides}
        config={gradientConfig}
        paletteConfig={paletteConfig}
        hueInfluenceConfig={hueInfluenceConfig}
        layoutConfig={layoutConfig}
        hologramConfig={{ enabled: false }}
        dragTiltEnabled={false}
        variant="embedded"
        narrowDetectionSource="viewport"
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />
      {viewAllHref && viewAllVisible ? (
        <Link
          href={viewAllHref}
          className="mt-4 inline-block text-xs font-medium text-gray-500 transition-colors hover:text-gray-300"
        >
          View all →
        </Link>
      ) : null}
    </div>
  );
}

export default AbstractJournalLabCollectionNarrowDeckSlider;
