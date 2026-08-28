'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperClass } from 'swiper';
import { FreeMode } from 'swiper/modules';
import { clamp } from '../../../../helpers/clamp';
import { resolveAbstractPostDockEasing } from '../AbstractPostDock/config/registered';
import { useIsomorphicLayoutEffect } from '../AbstractPostDock/hooks/browserState';
import type {
  AbstractJournalLabFlipSlot,
  AbstractJournalLabFlipTiming,
} from './collectionLayout';
import type { AbstractJournalLabCollectionView } from './config/presentation';
import type { CardReveal } from '../AbstractJournalLabCollection';
import type { AbstractJournalLabCollectionSliderConfig } from './config/slider';
import styles from './styles.module.css';

// Comfortably exceeds useCardLiftPhysics's own worst-case vertical
// overshoot (proximityLiftPx up to 24px, plus proximityScale's symmetric
// height growth on a typical card) — see the horizontal-clip wrapper below
// for why this can't just be an `overflow-y: visible` override instead.
const HOVER_LIFT_CLIP_BUFFER_PX = 48;

// swiper.progress at rest (slide 0, no drag) is 0 exactly; a small epsilon
// absorbs floating-point drift from freeMode's own continuous animation.
const AT_REST_PROGRESS_EPSILON = 0.001;

/**
 * Opt-in ('slider' layoutMode) draggable card row for one active view
 * (articles or labs) — capped at `groupSize * groupCount` items, and a
 * "View all" reveal once the drag position crosses into the last group.
 *
 * Uses Swiper's own `freeMode` + `sticky`: continuous, physics-based free
 * dragging throughout the gesture, settling only once momentum actually
 * decays — and only ever to the single nearest card, never a multi-card
 * jump. That per-card granularity depends on `slidesPerGroup` staying at 1
 * (Swiper's own default): `sticky` snaps against `swiper.snapGrid`, and
 * Swiper's core only pushes a slide's position into `snapGrid` when
 * `index % slidesPerGroup === 0` (confirmed by reading
 * `node_modules/swiper/shared/swiper-core.mjs`'s `updateSlides`) — so a
 * `slidesPerGroup` above 1 would silently make only every Nth card a valid
 * rest position again. `wideGroupSize`/`narrowGroupSize`/`groupCount` still
 * fully apply to how many total cards are loaded and where the "View all"
 * progress threshold's conceptual "next group" sits — neither of those is
 * coupled to snap granularity.
 *
 * This component owns Swiper mechanics only (drag physics, viewport bleed,
 * "View all" threshold, the shared 3D perspective wrapper, the view-switch
 * cross-fade). It has no knowledge of card content, palettes, or the
 * flip/hue-fade transition — each slot is rendered by the parent's own
 * `renderCard`, the exact same per-slot renderer the 'grid' layoutMode
 * uses, driven by the exact same activeView/renderedView/colorView/
 * fadePhase/transitioning state. This is what keeps the Journal/labs
 * transition config (presentationMode, its timings/easings) genuinely in
 * effect in slider mode, instead of a second, simplified transition
 * invented just for this layout.
 */
export type AbstractJournalLabCollectionCardSliderProps = {
  activeView: AbstractJournalLabCollectionView;
  slots: AbstractJournalLabFlipSlot[];
  timings: AbstractJournalLabFlipTiming[];
  reveals: CardReveal[];
  renderCard: (
    slot: AbstractJournalLabFlipSlot,
    timing: AbstractJournalLabFlipTiming,
    reveal: CardReveal,
  ) => ReactNode;
  sliderConfig: AbstractJournalLabCollectionSliderConfig;
  cardWidthPx: number;
  cardHeightPx: number;
  cellStrideX: number;
  /** The same `--flip-perspective`/`--flip-perspective-origin-y`/
   * `--card-tilt-perspective` custom properties (and height/marginTop) the
   * 'grid' layoutMode's own `.field` wrapper carries — applied here too so
   * flip-mode's 3D rotation and hover-tilt render with the same camera. */
  fieldStyle: CSSProperties;
  dataProjectionPhase: 'flipping' | 'fading' | 'resting';
  transitioning: boolean;
  prefersReducedMotion: boolean;
};

export function useIsNarrowViewport(breakpointPx: number) {
  const [isNarrow, setIsNarrow] = useState(() => (
    typeof window === 'undefined' ? false : window.innerWidth < breakpointPx
  ));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setIsNarrow(window.innerWidth < breakpointPx);
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpointPx]);

  return isNarrow;
}

/** Distance from this element's natural (unbled) box to the viewport's own
 * left/right edges — measured on a non-bleeding placeholder so the bleed
 * wrapper below it can span the full viewport width while Swiper's
 * `slidesOffsetBefore`/`slidesOffsetAfter` keep the first resting cards
 * aligned with the page content above, exactly like the original centered
 * row. Re-measured on resize, mirroring the ResizeObserver-based
 * measurement pages/abstract.tsx already uses for this same content box.
 *
 * Returns `insets: null` until the very first measurement completes —
 * callers must not mount `<Swiper>` against a guessed/zero value. Swiper
 * bakes `slidesOffsetBefore` into its own internal `slidesGrid`/`snapGrid`
 * at construction time; if it were first created with an incorrect (e.g.
 * zero) offset and only corrected via a later prop update, the coordinate
 * system underneath it shifts without Swiper re-homing its current
 * position back to slide 0 — visually, slide 0 ends up mostly off-screen
 * and slide 1 sits where slide 0 should be, both on first paint and (since
 * the same stale internal grid persists) on any later "return to start."
 * Using `useIsomorphicLayoutEffect` (not `useEffect`) for the first
 * measurement means it resolves synchronously before the browser's first
 * paint, so gating on it costs one extra render pass, never a visible
 * flash of an unmeasured/placeholder state. */
function useViewportBleedInsets() {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [insets, setInsets] = useState<{ left: number; right: number } | null>(null);

  useIsomorphicLayoutEffect(() => {
    const element = measureRef.current;
    if (!element || typeof window === 'undefined') return undefined;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setInsets({
        left: Math.max(0, rect.left),
        right: Math.max(0, window.innerWidth - rect.right),
      });
    };
    measure();
    window.addEventListener('resize', measure, { passive: true });
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(measure);
    resizeObserver?.observe(element);
    return () => {
      window.removeEventListener('resize', measure);
      resizeObserver?.disconnect();
    };
  }, []);

  return { measureRef, insets };
}

export function AbstractJournalLabCollectionCardSlider({
  activeView,
  slots,
  timings,
  reveals,
  renderCard,
  sliderConfig,
  cardWidthPx,
  cardHeightPx,
  cellStrideX,
  fieldStyle,
  dataProjectionPhase,
  transitioning,
  prefersReducedMotion,
}: AbstractJournalLabCollectionCardSliderProps) {
  const isNarrow = useIsNarrowViewport(sliderConfig.narrowBreakpointPx);
  const groupSize = isNarrow ? sliderConfig.narrowGroupSize : sliderConfig.wideGroupSize;
  const viewAllThreshold = isNarrow
    ? sliderConfig.narrowViewAllThreshold
    : sliderConfig.wideViewAllThreshold;
  const cappedCount = groupSize * sliderConfig.groupCount;

  const cappedSlots = useMemo(() => slots.slice(0, cappedCount), [slots, cappedCount]);
  const viewAllHref = activeView === 'labs' ? '/labs' : null;

  const [viewAllVisible, setViewAllVisible] = useState(false);
  // Tracked imperatively (not via React state) so reading it at the moment
  // activeView changes never races a pending re-render. Read from
  // `progress` (a continuous float already updated every frame for the
  // View-all threshold below), not `activeIndex` — under `freeMode`,
  // `activeIndex` is a settle-time concept that may not track a
  // continuous drag frame-by-frame, while `progress` is confirmed live
  // throughout the whole gesture.
  const atRestRef = useRef(true);

  const applyProgress = useCallback((swiper: SwiperClass) => {
    const progress = Number.isFinite(swiper.progress) ? swiper.progress : 0;
    const crossed = progress >= viewAllThreshold;
    setViewAllVisible(previous => (previous === crossed ? previous : crossed));
    atRestRef.current = progress <= AT_REST_PROGRESS_EPSILON;
  }, [viewAllThreshold]);

  const applyTransitionEasing = useCallback((swiper: SwiperClass) => {
    const wrapperEl = swiper.wrapperEl as HTMLElement | undefined;
    if (!wrapperEl) return;
    wrapperEl.style.transitionTimingFunction =
      resolveAbstractPostDockEasing(sliderConfig.snapEasing);
  }, [sliderConfig.snapEasing]);

  const handleSwiper = useCallback((swiper: SwiperClass) => {
    applyTransitionEasing(swiper);
    applyProgress(swiper);
  }, [applyProgress, applyTransitionEasing]);

  const swiperInstanceRef = useRef<SwiperClass | null>(null);

  // Whole-slider cross-fade, only when switching Articles/Labs while the
  // slider is scrolled away from its rest position (an in-place flip/fade
  // on cards that are currently off past the viewport edge would otherwise
  // be invisible, then the slider would jump back to position 0 with no
  // transition at all). At rest, the per-card flip/hue-fade transition
  // (driven by the parent, via `renderCard`) is already enough on its own.
  const [containerVisible, setContainerVisible] = useState(true);
  const viewSwitchTimerRef = useRef(0);
  const previousViewRef = useRef(activeView);

  useEffect(() => {
    if (activeView === previousViewRef.current) return undefined;
    previousViewRef.current = activeView;
    const swiper = swiperInstanceRef.current;

    if (prefersReducedMotion || atRestRef.current || !swiper || swiper.destroyed) {
      if (swiper && !swiper.destroyed) swiper.slideTo(0, 0);
      setViewAllVisible(false);
      return undefined;
    }

    setContainerVisible(false);
    viewSwitchTimerRef.current = window.setTimeout(() => {
      viewSwitchTimerRef.current = 0;
      if (!swiper.destroyed) swiper.slideTo(0, 0);
      setViewAllVisible(false);
      setContainerVisible(true);
    }, sliderConfig.viewSwitchFadeDurationMs);

    return () => {
      if (viewSwitchTimerRef.current) {
        window.clearTimeout(viewSwitchTimerRef.current);
        viewSwitchTimerRef.current = 0;
      }
    };
  }, [activeView, prefersReducedMotion, sliderConfig.viewSwitchFadeDurationMs]);

  const { measureRef, insets } = useViewportBleedInsets();

  if (cappedSlots.length === 0) return null;

  const gapPx = Math.max(0, cellStrideX - cardWidthPx);
  const viewSwitchFadeEasingCss = resolveAbstractPostDockEasing(sliderConfig.viewSwitchFadeEasing);

  return (
    <div
      ref={measureRef}
      className={`w-full ${sliderConfig.bottomSpacingClass}`}
    >
      <div
        id="abstract-journal-lab-slider-panel"
        role="tabpanel"
        aria-busy={transitioning}
        aria-labelledby={
          activeView === 'labs' ? 'abstract-labs-tab' : 'abstract-articles-tab'
        }
        className={styles.field}
        data-active-view={activeView}
        data-transitioning={transitioning ? 'true' : 'false'}
        data-projection-phase={dataProjectionPhase}
        style={{
          ...fieldStyle,
          opacity: containerVisible ? 1 : 0,
          transition: prefersReducedMotion
            ? 'none'
            : `opacity ${sliderConfig.viewSwitchFadeDurationMs}ms ${viewSwitchFadeEasingCss}`,
        }}
      >
        {/* Bleeds to the true viewport edges regardless of this page's own
            centered/padded content box — `left: 50%` + `margin-left: -50vw`
            is computed off the viewport (vw units), not this element's
            ancestors, so it bleeds correctly no matter how the ancestor is
            padded or capped by a max-width. `slidesOffsetBefore`/`After`
            (measured from the non-bled placeholder above) keep the first
            resting cards aligned with the page content above, exactly like
            the original centered row. */}
        <div
          style={{
            position: 'relative',
            left: '50%',
            width: '100vw',
            marginLeft: '-50vw',
            // `flow-root` (not `overflow: hidden`) — establishes a block
            // formatting context so the clip wrapper's own negative-margin
            // buffer trick below can't collapse through this element and
            // shift the "View all" link that follows it, WITHOUT itself
            // clipping anything (unlike `overflow: hidden`, which would
            // clip the buffer's own overshoot right back out again at this
            // level, undoing the whole point of the buffer).
            display: 'flow-root',
          } as CSSProperties}
        >
          {/*
           * This — not the Swiper root itself — is the actual horizontal
           * clip boundary. `overflow-x: hidden` + `overflow-y: visible` on
           * the SAME element is a known CSS Overflow Module quirk: per
           * spec, when one axis is non-'visible', the other's 'visible'
           * value computes to 'auto' instead — which still clips anything
           * that doesn't fit, it just does so silently (no scrollbar
           * affordance on a box with no scroll container styling). That's
           * why the previous fix (mixed overflow-x/y directly on the
           * Swiper root) didn't actually stop the hover-lift clipping.
           * Fixed properly: `overflow: hidden` here is uniform (both axes
           * the same value — no quirk), with generous vertical padding so
           * the hover-lift's upward translate (useCardLiftPhysics,
           * proximityLiftPx up to 24px, plus proximityScale's symmetric
           * growth) never actually reaches this box's own edge. The
           * matching negative margin cancels the padding's own layout
           * footprint, so this buffer never shows up as extra spacing.
           *
           * That negative margin does mean this box's own painted area
           * visually overlaps the content above it (the tabs) by
           * HOVER_LIFT_CLIP_BUFFER_PX — normal-flow overlap from a negative
           * margin still paints (and hit-tests) on top of the earlier
           * sibling underneath it, so without `pointer-events: none` here,
           * this invisible buffer silently ate hover/click events over the
           * bottom slice of the tabs. `pointer-events: auto` is restored
           * explicitly on the actual interactive content below (the
           * Swiper/placeholder), which never extends into the buffer zone.
           */}
          <div
            style={{
              overflow: 'hidden',
              paddingTop: `${HOVER_LIFT_CLIP_BUFFER_PX}px`,
              paddingBottom: `${HOVER_LIFT_CLIP_BUFFER_PX}px`,
              marginTop: `-${HOVER_LIFT_CLIP_BUFFER_PX}px`,
              marginBottom: `-${HOVER_LIFT_CLIP_BUFFER_PX}px`,
              pointerEvents: 'none',
            } as CSSProperties}
          >
            {insets === null ? (
              // Not measured yet — see useViewportBleedInsets's own doc
              // comment for why Swiper must never mount against a guessed
              // offset. Reserves the same height so nothing else on the
              // page shifts once the real Swiper replaces this.
              <div style={{ width: '100%', height: `${cardHeightPx}px` }} />
            ) : (
              <Swiper
                onSwiper={swiper => {
                  swiperInstanceRef.current = swiper;
                  handleSwiper(swiper);
                }}
                modules={[FreeMode]}
                aria-label={activeView === 'articles' ? 'Articles slider' : 'Labs slider'}
                slidesPerView="auto"
                // Deliberately 1 (Swiper's own default), not `groupSize` —
                // see this component's own top-of-file doc comment for why
                // a higher value would silently make `sticky` skip most
                // cards.
                slidesPerGroup={1}
                spaceBetween={gapPx}
                slidesOffsetBefore={insets.left}
                slidesOffsetAfter={insets.right}
                resistanceRatio={clamp(sliderConfig.dragResistance, 0, 1)}
                speed={prefersReducedMotion ? 0 : sliderConfig.snapSpeedMs}
                freeMode={{
                  enabled: true,
                  sticky: true,
                  momentum: sliderConfig.dragMomentumEnabled,
                  momentumRatio: sliderConfig.dragMomentumRatio,
                  momentumVelocityRatio: sliderConfig.dragMomentumVelocityRatio,
                }}
                threshold={6}
                followFinger
                simulateTouch
                watchSlidesProgress
                grabCursor
                onProgress={applyProgress}
                onSetTranslate={applyProgress}
                onSlideChange={applyProgress}
                onSetTransition={applyTransitionEasing}
                style={{
                  width: '100%',
                  height: `${cardHeightPx}px`,
                  // Uniform (not mixed) — the outer wrapper above is the
                  // real clip boundary now, this stays fully unclipped so
                  // nothing here ever hits the "mixed axis computes to
                  // auto" quirk.
                  overflow: 'visible',
                  // Re-enables interaction — the parent buffer wrapper is
                  // `pointer-events: none` (see its own comment above).
                  pointerEvents: 'auto',
                } as CSSProperties}
              >
                {cappedSlots.map((slot, index) => {
                  const key = `${slot.article?.slug ?? 'empty'}:${slot.lab?.slug ?? 'empty'}`;
                  const timing = timings[index];
                  const reveal = reveals[index] ?? {
                    enabled: false,
                    startMs: 0,
                    durationMs: 0,
                    easingCss: '',
                    offsetYPercent: 0,
                  };

                  return (
                    <SwiperSlide
                      key={key}
                      aria-roledescription="slide"
                      style={{
                        position: 'relative',
                        width: `${cardWidthPx}px`,
                        height: `${cardHeightPx}px`,
                      } as CSSProperties}
                    >
                      {renderCard(slot, timing, reveal)}
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            )}
          </div>
        </div>
        {viewAllHref && viewAllVisible ? (
          <Link
            href={viewAllHref}
            className="mt-4 inline-block text-xs font-medium text-gray-500 transition-colors hover:text-gray-300"
          >
            View all →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default AbstractJournalLabCollectionCardSlider;
