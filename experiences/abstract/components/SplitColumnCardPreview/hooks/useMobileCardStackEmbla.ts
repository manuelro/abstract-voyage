import { useCallback, useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { SplitColumnCardStackConfig } from '../config/stack';

type EmblaOptions = NonNullable<Parameters<typeof useEmblaCarousel>[0]>;

export function resolveMobileCardStackEmblaOptions({
  active,
  config,
  prefersReducedMotion,
  alignOffsetPx = 0,
}: {
  active: boolean;
  config: Readonly<SplitColumnCardStackConfig>;
  prefersReducedMotion: boolean;
  alignOffsetPx?: number;
}): EmblaOptions {
  return {
    active,
    axis: 'x',
    // The viewport carries the measured left/right insets that center each
    // configured-width card. Compensate the left inset in Embla's snap origin
    // so the widened slide box does not accumulate an offset per index.
    align: () => alignOffsetPx,
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
    watchDrag: true,
    dragFree: config.mobileCarouselDragFree,
    skipSnaps: config.mobileCarouselSkipSnaps,
    loop: config.mobileCarouselLoop,
    duration: prefersReducedMotion ? 0 : config.mobileCarouselDuration,
  };
}

/** The only horizontal transform owner on touch-capable Card Stacks below
 * 768px. Every card remains one stable Embla slide from pointer-down through
 * settle; selection updates semantic state but never remounts an incoming
 * card or starts a second CSS transition. */
export function useMobileCardStackEmbla({
  active,
  itemCount,
  resetKey,
  config,
  prefersReducedMotion,
  alignOffsetPx,
  onSelect,
}: {
  active: boolean;
  itemCount: number;
  resetKey: string;
  config: Readonly<SplitColumnCardStackConfig>;
  prefersReducedMotion: boolean;
  alignOffsetPx: number;
  onSelect: (index: number) => void;
}) {
  const options = useMemo(() => resolveMobileCardStackEmblaOptions({
    active,
    config,
    prefersReducedMotion,
    alignOffsetPx,
  }), [active, config, prefersReducedMotion, alignOffsetPx]);
  const [viewportRef, emblaApi] = useEmblaCarousel(options);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(itemCount > 1);

  const syncSelection = useCallback(() => {
    if (!emblaApi || !active) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    onSelect(index);
  }, [active, emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || !active) return undefined;
    syncSelection();
    emblaApi.on('select', syncSelection);
    emblaApi.on('reInit', syncSelection);
    return () => {
      emblaApi.off('select', syncSelection);
      emblaApi.off('reInit', syncSelection);
    };
  }, [active, emblaApi, syncSelection]);

  useEffect(() => {
    if (!emblaApi || !active) return;
    emblaApi.scrollTo(0, true);
    syncSelection();
  }, [active, emblaApi, resetKey, syncSelection]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  // Jump directly to an arbitrary index — the external-control counterpart
  // to scrollPrev/scrollNext above, for a page-owned nav control driving
  // Card Stack's own selection from outside it (about-shared-card-stack-
  // adoption's own "no duplicate index state" requirement) rather than
  // duplicating Embla's step-by-step affordance.
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  return {
    viewportRef,
    ready: Boolean(emblaApi),
    snapCount: emblaApi?.scrollSnapList().length ?? 0,
    selectedIndex,
    canScrollPrev,
    canScrollNext,
    scrollPrev,
    scrollNext,
    scrollTo,
    runtimeConfig: {
      duration: options.duration,
      dragFree: options.dragFree,
      skipSnaps: options.skipSnaps,
      loop: options.loop,
      gap: config.mobileCarouselGap,
    },
  };
}
