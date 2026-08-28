import { useMemo, useState } from 'react';
import { clamp } from '../../../../../helpers/clamp';
import { MD_BREAKPOINT_PX } from '../../../../../components/breakpoints';
import { useIsomorphicLayoutEffect } from './browserState';
import { SLIDE_COUNT, type LiquidSliderConfig, type SliderSlide } from '../config/legacy';

export function createSlide(index: number): SliderSlide {
  const title = [
    'Viscous Field',
    'Chromatic Pull',
    'Delayed Bloom',
    'Elastic Drift',
    'Soft Momentum',
    'Liquid Vector',
    'Inertial Glow',
    'Field Wake',
    'Settling Light',
  ][index];

  return {
    id: index + 1,
    slug: `fallback-${index + 1}`,
    label: `${index + 1}`.padStart(2, '0'),
    title,
    excerpt: 'A liquid gradient response study using direction, velocity, and release momentum.',
    topic: 'Motion',
    date: 'Prototype',
    readingTime: '1 min read',
    href: '#',
    externalUrl: null,
    forceExternalNavigation: false,
    seed: (index * 0.113 + 0.07) % 1,
    hueOffset: (index - 4) * 0.012,
    variationBias: Math.sin(index * 0.8) * 0.018,
    offsetX: Math.sin(index * 0.62) * 0.08,
    offsetY: Math.cos(index * 0.74) * 0.07,
    accent: `hsl(${150 + index * 23} 88% 72%)`,
  };
}

export const FALLBACK_SLIDES = Array.from({ length: SLIDE_COUNT }, (_, index) => createSlide(index));

export type SliderViewportSize = {
  width: number;
  height: number;
  rem: number;
};

// Deterministic fallback used on the server AND as the client's initial state, so the
// first client render matches the SSR HTML (clean hydration) and the mount effect below
// produces a real state change → a re-render that patches the layout to the true size.
// (React 18 does not repair inline-style mismatches during hydration on its own.)
export const FALLBACK_VIEWPORT_SIZE: SliderViewportSize = { width: 1440, height: 900, rem: 16 };

export function getViewportSize(): SliderViewportSize {
  if (typeof window === 'undefined') {
    return FALLBACK_VIEWPORT_SIZE;
  }

  const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  const documentWidth = document.documentElement.clientWidth || window.innerWidth;
  const visualViewport = window.visualViewport;
  const visualWidth = visualViewport?.width ?? window.innerWidth;
  const visualHeight = visualViewport?.height ?? window.innerHeight;

  return {
    width: Math.max(1, Math.round(Math.min(window.innerWidth, documentWidth, visualWidth))),
    height: Math.max(1, Math.round(visualHeight)),
    rem: Number.isFinite(rootFontSize) ? rootFontSize : 16,
  };
}

export function useSliderViewportSize() {
  // Start from the deterministic fallback so SSR and the first client render agree.
  const [size, setSize] = useState<SliderViewportSize>(FALLBACK_VIEWPORT_SIZE);

  useIsomorphicLayoutEffect(() => {
    // Measure synchronously before paint so the real (device) size is applied on the
    // first commit — this is the state change that forces the layout off the fallback.
    setSize(getViewportSize());

    let frame = 0;
    const update = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setSize(getViewportSize());
      });
    };

    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return size;
}

export function resolveSliderLayout(config: LiquidSliderConfig, viewport: SliderViewportSize) {
  const { width, height, rem } = viewport;
  // MD_BREAKPOINT_PX (components/breakpoints.ts) — this file's own "narrow"
  // threshold is the same shared md breakpoint everywhere else in this
  // codebase, not a separately-hardcoded 768 (see PLAN-CENTRALIZED-
  // BREAKPOINTS-RESPONSIVE-CARD-STACK.md). 1680/1180 below stay local —
  // genuinely bespoke to this slider, not part of the md/lg system.
  const narrow = width < MD_BREAKPOINT_PX;
  const visible = width >= 1680
    ? clamp(config.layoutVisibleWide, 1.5, 3)
    : width >= 1180
      ? clamp(config.layoutVisibleDesktop, 1.25, 2.5)
      : width >= MD_BREAKPOINT_PX
        ? clamp(config.layoutVisibleTablet, 1.1, 1.75)
        : clamp(config.layoutVisibleNarrow, 1, 1.35);
  const aspectWidth = narrow ? 3 : 4;
  const aspectHeight = narrow ? 4 : 3;
  const stagePaddingRem = narrow ? 0 : clamp(config.layoutStagePaddingRem, 0, 4);
  const gapRem = narrow ? 0 : clamp(config.layoutSlideGapRem, 0.75, 4);
  const stagePaddingPx = stagePaddingRem * rem;
  const gapPx = gapRem * rem;
  const widthByDensity = (width - stagePaddingPx * 2 - gapPx * Math.max(0, visible - 1)) / visible;
  const widthByHeight = (height - stagePaddingPx * 2) * aspectWidth / aspectHeight;
  const slideWidth = narrow
    ? Math.max(220, Math.min(width, widthByDensity))
    : Math.max(220, Math.min(widthByDensity, widthByHeight));

  return {
    aspectWidth,
    aspectHeight,
    aspectRatio: `${aspectWidth} / ${aspectHeight}`,
    gap: `${gapRem}rem`,
    stagePadding: `${stagePaddingRem}rem`,
    stagePaddingPx,
    slideWidth,
    slideHeight: slideWidth * aspectHeight / aspectWidth,
    visible,
  };
}

export function useSliderVisualMetrics(config: LiquidSliderConfig) {
  const viewport = useSliderViewportSize();
  const layout = useMemo(
    () => resolveSliderLayout(config, viewport),
    [config, viewport],
  );
  const excerptLines = Math.round(clamp(config.typographyExcerptLines, 0, 5));

  return {
    viewport,
    layout,
    excerptLines,
  };
}
