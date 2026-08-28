'use client';

import type { CSSProperties, MutableRefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperClass } from 'swiper';
import type { MagnificationDockDimmingEasing } from '../../../../../components/MagnificationDock';
import { clamp } from '../../../../../helpers/clamp';
import ArticleCard from '../../../../../components/ArticleCard';
import { DEFAULT_CTA_BUTTON_CONFIG } from '../../../../../components/CtaButton/config/registered';
import type { PointerProximityState } from '../../../../../components/proximity/usePointerProximity';
import {
  computeMagnificationDockDeckRevealOrder,
  computeMagnificationDockRevealSchedule,
} from '../../../../../helpers/magnificationDockRevealMath';
import { createCssEasingFunction } from '../../../../../helpers/cubicBezierEasing';
import type {
  AbstractPostDockGradientPerformanceConfig,
  AbstractPostDockHologramConfig,
  AbstractPostDockLayoutConfig,
} from '../config/registered';
import { resolveAbstractPostDockGradientActivity } from '../helpers/gradientActivity';
import { stripEmphasisMarkup } from '../../../../../helpers/textEmphasis';
import { useIsomorphicLayoutEffect } from '../hooks/browserState';
import type { useLiquidSliderMotion } from '../hooks/motion';
import {
  LiquidGradientAdapter,
  type DeckPaletteState,
} from './GradientRenderer';
import type { LiquidSliderConfig, SliderSlide } from '../config/legacy';
import styles from '../styles.module.css';

// Same tilt-physics constants ScatterCard's own hover tilt (and its mount
// "excite" pulse) already use — the deck's drag-coupled tilt below reuses
// them too, so touch and pointer read as the same physical scale rather than
// a separately-tuned "mobile tilt strength".
const CTA = DEFAULT_CTA_BUTTON_CONFIG;

// Tolerance around f=0/f=1 ("true rest") for the drag-coupled tilt signal —
// see its use in applyDeckPose for why this exists.
const REST_F_EPSILON = 0.08;

// Depth easing for the deck's dimming (same curves the dock uses).
export function easeDeckDimmingDistance(value: number, easing: MagnificationDockDimmingEasing) {
  const x = Math.min(1, Math.max(0, value));
  if (easing === 'linear') return x;
  if (easing === 'expo') return 1 - Math.pow(1 - x, 3);
  return x * x * (3 - 2 * x);
}

/*
 * AbstractDeckSwiper — the narrow/touch card deck, driven by Swiper.
 *
 * Direct manipulation first: the card under the finger moves 1:1 with the drag.
 * Forward swipes visibly slide the active card off to the left (over the deck),
 * revealing the next card beneath; backward swipes slide the previous card back
 * in from the left, on top. At either end the whole deck rubber-bands (spring =
 * "no more items"). Commit/cancel are Swiper's snap transitions with the
 * project's easing and duration.
 *
 * Spatial model (travelling anchor): at item 1 the card is left-aligned with the
 * pending tail fanned on the right; as the user progresses the anchor travels so
 * the card ends right-aligned at the last item, past cards resting off-canvas
 * left with golden right-edge peeks — the stack context migrates right → left.
 * Tail slivers are golden-ratio spaced (decay φ⁻¹), sized so N span the free
 * region (real count when fewer), full card height, dimmed with the dock's own
 * depth curve.
 *
 * Drag-coupled tilt + hologram: the same signal that drives the pose above
 * (the two cards currently interpolating between rest positions) also feeds
 * a `rotateY` tilt and the card's own hover-hologram gradient response
 * (`hologramConfig` — see AbstractPostDockHologramConfig), so a swipe reads
 * as a physical, light-catching card rather than a flat rectangle sliding
 * sideways. This is a separate, touch-native signal — desktop's mouse-
 * proximity tilt system (usePointerProximity) still excludes touch pointers
 * entirely; the deck derives its own from the drag itself instead.
 */
export function AbstractDeckSwiper({
  slides,
  config,
  motion,
  activeIndex,
  setActiveIndex,
  cardWidthPx,
  containerWidthPx,
  dimmingMaxOpacity,
  transitionEasingCss,
  revealEasingCss,
  prefersReducedMotion,
  isDockSettled,
  detailsVisibleIndex,
  onSwipeStateChange,
  gradientPerformanceConfig,
  isDockVisible,
  isDocumentVisible,
  dockActiveItemBoxShadow,
  paletteStates = null,
  layoutConfig,
  hologramConfig,
  dragTiltEnabled = true,
}: {
  slides: SliderSlide[];
  config: LiquidSliderConfig;
  motion: ReturnType<typeof useLiquidSliderMotion>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  cardWidthPx: number;
  containerWidthPx: number;
  dimmingMaxOpacity: number;
  transitionEasingCss: string;
  revealEasingCss: string;
  prefersReducedMotion: boolean;
  isDockSettled: boolean;
  detailsVisibleIndex: number | null;
  onSwipeStateChange: (swiping: boolean) => void;
  gradientPerformanceConfig: AbstractPostDockGradientPerformanceConfig;
  isDockVisible: boolean;
  isDocumentVisible: boolean;
  dockActiveItemBoxShadow?: string;
  paletteStates?: Array<DeckPaletteState> | null;
  /** Card corner radius (layoutConfig.cardRadius) — reused verbatim from
   * scattered mode's own knob, see ArticleCard's className below. */
  layoutConfig: AbstractPostDockLayoutConfig;
  /** Drives the drag-coupled tilt/gradient response — see the file's own
   * top-of-file comment and applyDeckPose's hologram signal derivation. */
  hologramConfig: AbstractPostDockHologramConfig;
  /** Opt-out of the drag-coupled rotateY tilt on the card itself (the
   * hologram gradient response above is controlled independently by
   * `hologramConfig.enabled`). Defaults to `true`, preserving every
   * existing consumer's behavior unchanged — narrow/touch embeds that want
   * a flatter, non-tilting card (e.g. AbstractJournalLabCollection's
   * slider layoutMode) pass `false` explicitly. */
  dragTiltEnabled?: boolean;
}) {
  const swiperRef = useRef<SwiperClass | null>(null);
  const initialSlideRef = useRef(activeIndex);
  // Last-written z/dim per slide so the pose only touches the DOM on change.
  const poseCacheRef = useRef<{ z: string[]; dim: string[] }>({ z: [], dim: [] });
  const introLayerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const introOffsetsRef = useRef<number[]>([]);
  // One per slide, lazily created/reused (never recreated on re-render) —
  // handed straight to LiquidGradientAdapter's own hologramInteraction prop,
  // read on its rAF loop; see applyDeckPose for what writes into these.
  const hologramInteractionRefs = useRef<Array<MutableRefObject<PointerProximityState>>>([]);
  const getHologramInteractionRef = (index: number): MutableRefObject<PointerProximityState> => {
    const existing = hologramInteractionRefs.current[index];
    if (existing) return existing;
    const created: MutableRefObject<PointerProximityState> = { current: { proximity: 0, x: 0, y: 0 } };
    hologramInteractionRefs.current[index] = created;
    return created;
  };
  const introFrameRef = useRef(0);
  const introActiveRef = useRef(false);
  const lastIntroConfigSignatureRef = useRef<string | null>(null);
  const introLayoutSizeRef = useRef({ cardWidthPx, containerWidthPx });
  const [swiperReady, setSwiperReady] = useState(false);
  const [mobileIntroComplete, setMobileIntroComplete] = useState(
    prefersReducedMotion || !config.dockRevealEnabled,
  );

  const speedMs = prefersReducedMotion
    ? 0
    : Math.round(clamp(config.dockSwipeSettleMs, 120, 1200));

  // Live layout/config snapshot so Swiper's per-frame listeners read fresh
  // values without re-subscribing.
  const deckLayoutRef = useRef({
    count: 0,
    cardW: 1,
    containerW: 1,
    tailN: 5,
    decay: 0.618,
    dimEnabled: true,
    dimMax: 0.5,
    dimPower: 1,
    dimEasing: 'soft' as MagnificationDockDimmingEasing,
    easingCss: 'ease',
    speedMs: 560,
    prefersReducedMotion: false,
    tiltEnabled: true,
  });
  deckLayoutRef.current = {
    count: slides.length,
    cardW: Math.max(1, cardWidthPx),
    containerW: Math.max(1, containerWidthPx),
    tailN: Math.round(clamp(config.dockDeckTailCount, 1, 8)),
    decay: clamp(config.dockDeckDecay, 0.4, 0.95),
    dimEnabled: config.dockDistanceDimmingEnabled,
    dimMax: Math.max(0, Math.min(1, dimmingMaxOpacity)),
    dimPower: clamp(config.dockDistanceDimmingPower, 0.1, 4),
    dimEasing: config.dockDistanceDimmingEasing,
    easingCss: transitionEasingCss,
    speedMs,
    tiltEnabled: dragTiltEnabled,
    prefersReducedMotion,
  };

  // The deck pose as a pure function of Swiper's CONTINUOUS progress.
  //
  // Direct-manipulation contract: the card the user touches moves 1:1 with the
  // finger. That works because a card's rest-to-rest displacement across one
  // index step is ≈ one card width: the ACTIVE card rests at the travelling
  // anchor, PENDING cards rest tucked beneath it (golden slivers past its right
  // edge), and PAST cards rest OFF-CANVAS LEFT with golden right-edge peeks. So
  // a forward swipe visibly slides the touched card off to the left (over the
  // deck), revealing the next card beneath; a backward swipe slides the previous
  // card back in from the left (on top). The pose is a linear blend between the
  // two adjacent integer rest poses at the drag fraction — exact finger mapping,
  // and Swiper's release transition animates the same blend for commit/cancel.
  // floor(a) keys the z-order, which automatically keeps the moving card on top
  // in BOTH directions. Edge overshoot (already resistance-damped by Swiper)
  // shifts the whole deck — the "no more items" spring.
  const applyDeckPose = useCallback((swiper: SwiperClass) => {
    const layout = deckLayoutRef.current;
    if (!layout.count || !swiper.slides?.length) return;
    const freeW = Math.max(0, layout.containerW - layout.cardW);
    const lastIndex = layout.count - 1;
    const rawProgress = Number.isFinite(swiper.progress) ? swiper.progress : 0;
    const aRaw = lastIndex > 0 ? rawProgress * lastIndex : 0;
    const a = clamp(aRaw, 0, lastIndex);
    // Overshoot in card-width px (resistance-damped upstream): whole-deck rubber.
    const rubberShiftPx = -(aRaw - a) * layout.cardW;
    const i0 = Math.min(Math.max(Math.floor(a), 0), Math.max(0, lastIndex - 1));
    const i1 = Math.min(i0 + 1, lastIndex);
    const f = lastIndex > 0 ? clamp(a - i0, 0, 1) : 0;

    const ratio = layout.decay;
    const base = freeW > 0
      ? (freeW * (1 - ratio)) / (1 - Math.pow(ratio, layout.tailN))
      : 0;
    const cumulative = (depth: number) => {
      if (depth <= 0 || base <= 0) return 0;
      let acc = 0;
      let step = base;
      for (let j = 0; j < Math.min(depth, 12); j += 1) {
        acc += step;
        step *= ratio;
      }
      return acc;
    };
    const anchor = (k: number) => (lastIndex > 0 ? (k / lastIndex) * freeW : 0);
    // Rest x of card i when card k is active.
    const restX = (k: number, i: number) => {
      const depth = i - k;
      if (depth === 0) return anchor(k);
      if (depth > 0) return anchor(k) + cumulative(depth); // pending: tucked under, right slivers
      return -layout.cardW + cumulative(-depth); // past: off-canvas left, right-edge peeks
    };
    const maxDim = Math.max(1, layout.tailN);
    const dimFor = (k: number, i: number) => {
      if (!layout.dimEnabled) return 0;
      const absDepth = Math.abs(i - k);
      return (
        Math.pow(
          easeDeckDimmingDistance(Math.min(absDepth / maxDim, 1), layout.dimEasing),
          layout.dimPower,
        ) * layout.dimMax
      );
    };
    const grid = swiper.slidesGrid;

    const cache = poseCacheRef.current;
    swiper.slides.forEach((slideEl, index) => {
      const el = slideEl as HTMLElement;
      const targetX =
        restX(i0, index)
        + (restX(i1, index) - restX(i0, index)) * f
        + rubberShiftPx
        + (introOffsetsRef.current[index] ?? 0);
      const naturalX = grid?.[index] ?? index * layout.cardW;
      el.style.transform = `translate3d(${(targetX - naturalX).toFixed(2)}px, 0, 0)`;
      // z keyed on floor(a): forward drags keep the outgoing card on top while
      // it slides off; backward drags put the returning card on top. Exact at
      // rest (f = 0). Written only on change — per-frame z churn forces WebKit
      // to re-resolve stacking contexts mid-gesture (compositing instability).
      const z = String(Math.max(1, layout.count + 2 - Math.abs(index - i0)));
      if (cache.z[index] !== z) {
        cache.z[index] = z;
        el.style.zIndex = z;
      }
      const dim = (
        dimFor(i0, index) + (dimFor(i1, index) - dimFor(i0, index)) * f
      ).toFixed(4);
      if (cache.dim[index] !== dim) {
        cache.dim[index] = dim;
        el.style.setProperty('--abstract-dock-dimming-opacity', dim);
      }

      // Drag-coupled tilt/hologram signal: only the two cards actually
      // interpolating right now (i0 leaving, i1 arriving) get a nonzero
      // value — f sits at exactly 0 or 1 at true rest (including resting on
      // the very last item, where f lands on 1, not 0). In practice Swiper's
      // measured `progress` rarely lands on the mathematically-clean
      // fraction exactly (sub-pixel drift from the container's measured
      // width) — verified live, resting cards showed a residual ~0.06 `f`
      // instead of 0 — so a strict `f > 0 && f < 1` check leaves rested
      // cards with a faint permanent tilt instead of settling flat. REST_F_EPSILON
      // absorbs that drift while staying well under any real drag gesture.
      const isMidGesture = f > REST_F_EPSILON && f < 1 - REST_F_EPSILON;
      const signedProgress = !isMidGesture
        ? 0
        : index === i0 ? -f
        : index === i1 ? f
        : 0;
      const hologramInteraction = getHologramInteractionRef(index);
      if (layout.prefersReducedMotion) {
        hologramInteraction.current.proximity = 0;
        hologramInteraction.current.x = 0;
        hologramInteraction.current.y = 0;
      } else {
        hologramInteraction.current.x = signedProgress;
        hologramInteraction.current.y = 0;
        hologramInteraction.current.proximity = Math.min(1, Math.abs(signedProgress));
      }
      // Written to the intro-layer wrapper, never slideEl itself — slideEl's
      // own transform is already owned by the translate3d write above, and
      // the wrapper otherwise never carries a transform once its mount
      // intro finishes.
      const introLayer = introLayerRefs.current[index];
      if (introLayer) {
        introLayer.style.transform = layout.tiltEnabled && CTA.tiltEnabled && !layout.prefersReducedMotion
          ? `perspective(${CTA.tiltPerspectivePx}px) rotateY(${(signedProgress * CTA.tiltMaxDegrees).toFixed(3)}deg)`
          : '';
      }
    });
  }, []);

  // Mirror Swiper's transition timing per slide: 0ms while the finger is down
  // (pose tracks the drag 1:1), the snap speed + project easing on release.
  const applyDeckTransition = useCallback((swiper: SwiperClass, durationMs: number) => {
    const layout = deckLayoutRef.current;
    const ms = Math.max(0, durationMs);
    for (const slideEl of swiper.slides) {
      const el = slideEl as HTMLElement;
      el.style.transitionProperty = 'transform';
      el.style.transitionDuration = `${ms}ms`;
      el.style.transitionTimingFunction = layout.easingCss;
    }
    // The intro-layer wrapper's own rotateY (see applyDeckPose) mirrors the
    // same clock — 0ms while dragging, the snap speed/easing on release —
    // so it eases back to flat in lockstep with the translate3d snap above.
    for (const layer of introLayerRefs.current) {
      if (!layer) continue;
      layer.style.transitionProperty = 'transform';
      layer.style.transitionDuration = `${ms}ms`;
      layer.style.transitionTimingFunction = layout.easingCss;
    }
    // Dimming overlays ease with the same clock (0 while dragging).
    swiper.el?.style.setProperty('--abstract-dock-motion-ms', `${ms}ms`);
  }, []);

  const handleSwiper = useCallback((swiper: SwiperClass) => {
    swiperRef.current = swiper;
    applyDeckTransition(swiper, 0);
    applyDeckPose(swiper);
    setSwiperReady(true);
  }, [applyDeckPose, applyDeckTransition]);

  const finishMobileIntro = useCallback(() => {
    if (introFrameRef.current) {
      window.cancelAnimationFrame(introFrameRef.current);
      introFrameRef.current = 0;
    }
    introActiveRef.current = false;
    introOffsetsRef.current = Array.from({ length: slides.length }, () => 0);
    introLayerRefs.current.forEach(layer => {
      layer?.style.setProperty('--abstract-mobile-intro-opacity', '1');
    });
    const swiper = swiperRef.current;
    if (swiper && !swiper.destroyed) {
      applyDeckTransition(swiper, 0);
      applyDeckPose(swiper);
    }
    setMobileIntroComplete(true);
  }, [applyDeckPose, applyDeckTransition, slides.length]);

  const introConfigSignature = [
    config.dockRevealMode,
    config.dockRevealOverlapMs,
    config.dockRevealFirstDelayMs,
    config.dockRevealDurationMs,
    config.dockRevealStaggerMs,
    config.dockRevealEasing,
    config.dockRevealDistribution,
    config.dockRevealCadenceAmount,
    config.dockRevealOffsetXVw,
  ].join('|');

  // An in-flight intro is tied to the measured deck geometry. If that geometry
  // changes (rotation, browser chrome resize, panel resize), resolve the cards
  // to their final pose before paint rather than restarting from a stale offset.
  useIsomorphicLayoutEffect(() => {
    const previous = introLayoutSizeRef.current;
    introLayoutSizeRef.current = { cardWidthPx, containerWidthPx };
    if (
      introActiveRef.current
      && (previous.cardWidthPx !== cardWidthPx
        || previous.containerWidthPx !== containerWidthPx)
    ) {
      finishMobileIntro();
    }
  }, [cardWidthPx, containerWidthPx, finishMobileIntro]);

  useIsomorphicLayoutEffect(() => {
    if (!swiperReady) return;
    const swiper = swiperRef.current;
    if (!swiper || swiper.destroyed || slides.length === 0) return;

    const previousSignature = lastIntroConfigSignatureRef.current;
    const configChanged =
      previousSignature !== null && previousSignature !== introConfigSignature;
    lastIntroConfigSignatureRef.current = introConfigSignature;
    const shouldAnimate =
      !prefersReducedMotion && (config.dockRevealEnabled || configChanged);

    if (!shouldAnimate) {
      finishMobileIntro();
      return;
    }

    if (introFrameRef.current) {
      window.cancelAnimationFrame(introFrameRef.current);
      introFrameRef.current = 0;
    }

    const introOrder = computeMagnificationDockDeckRevealOrder({
      itemCount: slides.length,
      activeIndex: swiper.activeIndex,
      tailCount: Math.round(clamp(config.dockDeckTailCount, 1, 8)),
    });
    const schedule = computeMagnificationDockRevealSchedule({
      itemCount: introOrder.length,
      staggerMs: config.dockRevealStaggerMs,
      durationMs: config.dockRevealDurationMs,
      overlapMs: config.dockRevealOverlapMs,
      mode: config.dockRevealMode,
      distribution: config.dockRevealDistribution,
      cadenceAmount: config.dockRevealCadenceAmount,
    });
    const rankByIndex = new Map(introOrder.map((index, rank) => [index, rank]));
    const entryOffsetPx =
      Math.max(1, introLayoutSizeRef.current.containerWidthPx)
      * config.dockRevealOffsetXVw / 100;
    const easing = createCssEasingFunction(revealEasingCss);
    const startDelayMs = Math.max(0, config.dockRevealFirstDelayMs);

    introActiveRef.current = true;
    setMobileIntroComplete(false);
    introOffsetsRef.current = Array.from({ length: slides.length }, (_, index) => (
      rankByIndex.has(index) ? entryOffsetPx : 0
    ));
    introLayerRefs.current.forEach((layer, index) => {
      layer?.style.setProperty(
        '--abstract-mobile-intro-opacity',
        rankByIndex.has(index) ? '0' : '1',
      );
    });
    applyDeckTransition(swiper, 0);
    applyDeckPose(swiper);

    let timelineStartMs = 0;
    const stepIntro = (now: number) => {
      introFrameRef.current = 0;
      if (!introActiveRef.current || swiper.destroyed) return;
      if (!timelineStartMs) timelineStartMs = now + startDelayMs;
      let complete = true;

      introOrder.forEach((slideIndex, rank) => {
        const timing = schedule[rank];
        if (!timing) return;
        const elapsedMs = now - timelineStartMs - timing.startMs;
        const progress = timing.durationMs <= 0
          ? (elapsedMs >= 0 ? 1 : 0)
          : clamp(elapsedMs / timing.durationMs, 0, 1);
        const easedProgress = easing(progress);
        introOffsetsRef.current[slideIndex] = entryOffsetPx * (1 - easedProgress);
        introLayerRefs.current[slideIndex]?.style.setProperty(
          '--abstract-mobile-intro-opacity',
          easedProgress.toFixed(4),
        );
        if (progress < 1) complete = false;
      });

      applyDeckPose(swiper);
      if (complete) {
        finishMobileIntro();
      } else {
        introFrameRef.current = window.requestAnimationFrame(stepIntro);
      }
    };

    introFrameRef.current = window.requestAnimationFrame(stepIntro);
    return () => {
      introActiveRef.current = false;
      if (introFrameRef.current) {
        window.cancelAnimationFrame(introFrameRef.current);
        introFrameRef.current = 0;
      }
    };
  }, [
    applyDeckPose,
    applyDeckTransition,
    config.dockDeckTailCount,
    config.dockRevealCadenceAmount,
    config.dockRevealDistribution,
    config.dockRevealDurationMs,
    config.dockRevealEnabled,
    config.dockRevealFirstDelayMs,
    config.dockRevealMode,
    config.dockRevealOffsetXVw,
    config.dockRevealOverlapMs,
    config.dockRevealStaggerMs,
    finishMobileIntro,
    introConfigSignature,
    prefersReducedMotion,
    revealEasingCss,
    slides.length,
    swiperReady,
  ]);

  // Keep Swiper in sync with externally clamped/changed indices.
  useEffect(() => {
    const swiper = swiperRef.current;
    if (swiper && !swiper.destroyed && swiper.activeIndex !== activeIndex) {
      swiper.slideTo(activeIndex, speedMs);
    }
  }, [activeIndex, speedMs]);

  // Re-apply the pose when layout/knobs change while idle.
  useIsomorphicLayoutEffect(() => {
    const swiper = swiperRef.current;
    if (swiper && !swiper.destroyed) applyDeckPose(swiper);
  }, [
    applyDeckPose,
    cardWidthPx,
    containerWidthPx,
    config.dockDeckTailCount,
    config.dockDeckDecay,
    config.dockDistanceDimmingEnabled,
    dimmingMaxOpacity,
    slides.length,
  ]);

  const tailN = Math.round(clamp(config.dockDeckTailCount, 1, 8));

  return (
    <Swiper
      onSwiper={handleSwiper}
      className={`${styles.dock} ${isDockSettled ? styles.dockSettled : ''}`}
      aria-label="Post deck"
      slidesPerView="auto"
      spaceBetween={0}
      virtualTranslate
      watchSlidesProgress
      speed={speedMs}
      threshold={6}
      longSwipesRatio={clamp(config.dockSwipeCommitPct, 0.1, 0.9)}
      longSwipesMs={280}
      shortSwipes
      resistanceRatio={0.45}
      followFinger
      simulateTouch
      grabCursor
      touchStartPreventDefault={false}
      initialSlide={initialSlideRef.current}
      onTouchStart={finishMobileIntro}
      onSetTranslate={applyDeckPose}
      onProgress={applyDeckPose}
      onSetTransition={(swiper, duration) =>
        applyDeckTransition(swiper, typeof duration === 'number' ? duration : speedMs)
      }
      onSliderFirstMove={() => onSwipeStateChange(true)}
      onTouchEnd={() => onSwipeStateChange(false)}
      onSlideChange={swiper => setActiveIndex(swiper.activeIndex)}
      style={{
        width: '100%',
        height: '100%',
        overflowX: 'hidden',
        overflowY: 'visible',
        '--abstract-dock-shadow': dockActiveItemBoxShadow ?? 'none',
        '--abstract-dock-motion-ms': '0ms',
      } as CSSProperties}
    >
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        const gradientActivity = resolveAbstractPostDockGradientActivity({
          config: gradientPerformanceConfig,
          isActive,
          isDockVisible,
          isDocumentVisible,
        });
        return (
          <SwiperSlide
            key={slide.slug}
            // Gives the ::before shadow overlay (styles.module.css, keyed
            // off this element's own [data-magnification-dock-index]) a
            // real border-radius to inherit — its shadow would otherwise
            // project from this element's own square box regardless of how
            // rounded the card content inside it is, visible as a dark
            // square wedge poking past the rounded corner into the peek gap.
            className={layoutConfig.cardRadius}
            data-magnification-dock-index={index}
            data-active={isActive ? 'true' : 'false'}
            data-revealed={mobileIntroComplete ? 'true' : 'false'}
            aria-roledescription="slide"
            aria-label={`${stripEmphasisMarkup(slide.title)} slide ${index + 1} of ${slides.length}`}
            style={{
              width: `${Math.round(cardWidthPx)}px`,
              height: '100%',
              willChange: 'transform',
            } as CSSProperties}
          >
            {/* Reveal fades on an inner wrapper so the slide's imperative
                transform transitions never race the opacity stagger. Also
                carries the drag-coupled rotateY tilt (see applyDeckPose) and
                the card corner radius — rounding this wrapper (not just
                ArticleCard) keeps the sibling dimming scrim below clipped to
                the same rounded shape instead of bleeding square corners
                past it. */}
            <div
              ref={node => {
                introLayerRefs.current[index] = node;
              }}
              className={layoutConfig.cardRadius}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                willChange: 'transform',
                '--abstract-mobile-intro-opacity': mobileIntroComplete ? 1 : 0,
                opacity: 'var(--abstract-mobile-intro-opacity)',
              } as CSSProperties}
            >
              <ArticleCard
                title={stripEmphasisMarkup(slide.title)}
                excerpt={slide.excerpt}
                topic={slide.topic}
                date={slide.date}
                readingTime={slide.readingTime}
                href={slide.href}
                externalUrl={slide.externalUrl}
                forceExternalNavigation={slide.forceExternalNavigation}
                seed={slide.seed}
                excerptLines={1}
                aspectRatio="fill"
                typographyScale="dock"
                contentInsetRem={config.dockContentInsetRem}
                contentInsetWideRem={config.dockContentInsetWideRem}
                detailsVisible={isActive && mobileIntroComplete && detailsVisibleIndex === index}
                className={layoutConfig.cardRadius}
                background={Math.abs(index - activeIndex) <= tailN + 1 ? (
                  <LiquidGradientAdapter
                    slide={slide}
                    motion={motion}
                    config={config}
                    activity={gradientActivity}
                    palette={paletteStates?.[index] ?? null}
                    hologramConfig={hologramConfig}
                    hologramInteraction={getHologramInteractionRef(index)}
                  />
                ) : null}
              />
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 bg-black ${styles.dimmingOverlay}`}
              />
            </div>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
